import { useState, useEffect, useCallback, useMemo } from 'react';
import { addMonths, subMonths, format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { fetchNationalHolidays } from '../api/holidays';

const API_PROXY = '/api/dataverse-proxy';

export const useCalendar = () => {
    const [view, setView] = useState('year');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [holidays, setHolidays] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // --- ESTADOS COMERCIAIS ---
    const [organizacoes, setOrganizacoes] = useState([]);
    const [visitas, setVisitas] = useState([]);

    // --- ESTADOS DE WORKSPACE ---
    const [workspaces, setWorkspaces] = useState([]);
    const [activeWorkspaces, setActiveWorkspaces] = useState([]);

    const [filters, setFilters] = useState({ text: '', users: [], types: [] });
    const [user, setUser] = useState(() => localStorage.getItem('kairos_logged_user') || null);
    const [userRole, setUserRole] = useState(() => localStorage.getItem('kairos_user_role') || null);
    const [viewedUser, setViewedUser] = useState(() => localStorage.getItem('kairos_logged_user') || null);
    const [isValidatingSession, setIsValidatingSession] = useState(!!localStorage.getItem('kairos_logged_user'));
    const [allUsers, setAllUsers] = useState([]);
    const [eventTypes, setEventTypes] = useState(() => {
        const saved = localStorage.getItem('kairos_event_types');
        return saved ? JSON.parse(saved) : [{ id: '1', name: 'Tarefa', emoji: '📝' }, { id: '2', name: 'Reunião', emoji: '🤝' }];
    });

    const triggerAndroidNotification = (message) => {
        setNotification(message);
        setTimeout(() => setNotification(null), 3500);
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('kairos_logged_user');
        if (!storedUser) {
            setIsValidatingSession(false);
            return;
        }
        const validate = async () => {
            try {
                const filter = encodeURIComponent(`cr4a1_username eq '${storedUser}'`);
                const response = await fetch(`${API_PROXY}?table=cr4a1_usuarios_agendas&$filter=${filter}`);
                if (!response.ok) throw new Error(`API error: ${response.status}`);
                const data = await response.json();
                if (!data.value || data.value.length === 0) throw new Error('User not found');

                const freshRole = data.value[0]?.cr4a1_role;
                if (freshRole) {
                    setUserRole(freshRole);
                    localStorage.setItem('kairos_user_role', freshRole);
                }
            } catch (e) {
                console.warn('Sessão inválida:', e.message);
                localStorage.clear();
                setUser(null);
                setUserRole(null);
                setViewedUser(null);
            } finally {
                setIsValidatingSession(false);
            }
        };
        validate();
    }, []);

    const APP_VERSION = '1.0.2';

    useEffect(() => {
        const savedVersion = localStorage.getItem('kairos_version');
        if (savedVersion !== APP_VERSION) {
            localStorage.removeItem('kairos_events_cache');
            localStorage.removeItem('kairos_event_types');
            localStorage.setItem('kairos_version', APP_VERSION);
            window.location.reload();
        }
    }, []);

    useEffect(() => {
        const handleOnline = () => { setIsOnline(true); syncPendingQueue(); };
        const handleOffline = () => { setIsOnline(false); toast('Você está offline. Alterações serão salvas no dispositivo.', { icon: '✈️' }); };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const addToQueue = (task) => {
        const queue = JSON.parse(localStorage.getItem('kairos_sync_queue') || '[]');
        queue.push(task);
        localStorage.setItem('kairos_sync_queue', JSON.stringify(queue));
        toast('Salvo offline. Sincronizará automaticamente na volta da internet.', { icon: '☁️' });
    };

    const syncPendingQueue = async () => {
        const queue = JSON.parse(localStorage.getItem('kairos_sync_queue') || '[]');
        if (queue.length === 0) return;

        setIsSyncing(true);
        toast('Sincronizando dados pendentes com a nuvem...', { icon: '🔄' });

        const newQueue = [];
        let successCount = 0;

        for (const task of queue) {
            try {
                let url = `${API_PROXY}?table=cr4a1_agenda_kairoses`;
                if (task.method !== 'POST') url += `&id=${task.id}`;

                await fetch(url, {
                    method: task.method,
                    headers: { 'Content-Type': 'application/json' },
                    body: task.body ? JSON.stringify(task.body) : undefined
                });
                successCount++;
            } catch (err) {
                newQueue.push(task);
            }
        }

        localStorage.setItem('kairos_sync_queue', JSON.stringify(newQueue));
        setIsSyncing(false);
        if (successCount > 0) {
            toast.success(`${successCount} item(ns) sincronizado(s) com sucesso!`);
            fetchEvents();
        }
    };

    const fetchWorkspaces = useCallback(async () => {
        try {
            const filter = encodeURIComponent(`(cr4a1_criador_login eq '${user}') or (contains(cr4a1_membros_logins, '${user}'))`);
            const response = await fetch(`${API_PROXY}?table=cr4a1_calendarios_workspaceses&$filter=${filter}`);
            const data = await response.json();
            const wsList = data.value || [];
            setWorkspaces(wsList);

            if (activeWorkspaces.length === 0) {
                setActiveWorkspaces(wsList.map(w => w.cr4a1_calendarios_workspacesid));
            }
        } catch (error) { console.error('Erro ao buscar Workspaces:', error); }
    }, [user]);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await fetch(`${API_PROXY}?table=cr4a1_usuarios_agendas`);
            const data = await response.json();
            setAllUsers(data.value || []);
        } catch (error) { console.error('Erro ao buscar usuários:', error); }
    }, []);

    const fetchEventTypes = useCallback(async () => {
        try {
            const response = await fetch(`${API_PROXY}?table=cr4a1_tipos_eventoses`);
            if (response.ok) {
                const data = await response.json();
                if (data.value && data.value.length > 0) {
                    const formatted = data.value.map(t => ({
                        id: t.cr4a1_tipos_eventoid,
                        name: t.cr4a1_nome,
                        emoji: t.cr4a1_emoji
                    }));
                    setEventTypes(formatted);
                    localStorage.setItem('kairos_event_types', JSON.stringify(formatted));
                }
            }
        } catch (error) { console.log("Usando tipos locais"); }
    }, []);

    const fetchDadosComerciais = useCallback(async () => {
        try {
            const resOrgs = await fetch(`${API_PROXY}?table=cr4a1_echoe_organizacoes`);
            const dataOrgs = await resOrgs.json();
            setOrganizacoes(dataOrgs.value || []);

            const resVisitas = await fetch(`${API_PROXY}?table=cr4a1_echoe_visitas`);
            const dataVisitas = await resVisitas.json();
            setVisitas(dataVisitas.value || []);
        } catch (error) {
            console.error("Erro ao carregar dados comerciais:", error);
        }
    }, []);

    const fetchEvents = useCallback(async () => {
        if (workspaces.length === 0) {
            setEvents([]);
            return;
        }

        setLoading(true);
        try {
            if (!navigator.onLine) throw new Error('Offline');

            const wsFilter = workspaces.map(w => `cr4a1_workspace_id eq '${w.cr4a1_calendarios_workspacesid}'`).join(' or ');
            const response = await fetch(`${API_PROXY}?table=cr4a1_agenda_kairoses&$filter=${encodeURIComponent(wsFilter)}`);
            const data = await response.json();

            const mapped = (data.value || []).filter(e => !e.cr4a1_privado || e.cr4a1_user_login === user).map(e => {
                let localStart = e.cr4a1_data_inicio;
                if (e.cr4a1_data_inicio?.includes('Z')) {
                    const startObj = new Date(e.cr4a1_data_inicio);
                    localStart = format(startObj, 'yyyy-MM-dd');
                    e.cr4a1_hora_inicio = format(startObj, 'HH:mm');
                }
                return {
                    ...e,
                    cr4a1_data_inicio: localStart,
                    cr4a1_dia_inteiro: e.cr4a1_detalhes?.includes('[DIA_INTEIRO]'),
                    cr4a1_detalhes: e.cr4a1_detalhes?.replace('[DIA_INTEIRO]', '').trim(),
                    cr4a1_subtasks: e.cr4a1_subtasks || "[]"
                };
            });
            setEvents(mapped);
            localStorage.setItem('kairos_events_cache', JSON.stringify(mapped));
        } catch (error) {
            setEvents(JSON.parse(localStorage.getItem('kairos_events_cache') || '[]'));
        } finally { setLoading(false); }
    }, [workspaces, user]);

    useEffect(() => { fetchNationalHolidays(currentDate.getFullYear()).then(setHolidays); }, [currentDate.getFullYear()]);

    useEffect(() => {
        if (user) {
            fetchUsers();
            fetchEventTypes();
            fetchWorkspaces();
            fetchDadosComerciais(); // <-- Adicionado para carregar visitas e clientes ao logar
        }
    }, [user, fetchUsers, fetchEventTypes, fetchWorkspaces, fetchDadosComerciais]);

    useEffect(() => {
        if (user && workspaces.length > 0) {
            fetchEvents();
        }
    }, [fetchEvents, workspaces]);

    const filteredEvents = useMemo(() => {
        if (activeWorkspaces.length === 0) return [];
        return events.filter(event => {
            const matchesWorkspace = activeWorkspaces.includes(event.cr4a1_workspace_id);
            const matchesText = !filters.text || (event.cr4a1_titulo?.toLowerCase().includes(filters.text.toLowerCase())) || (event.cr4a1_detalhes?.toLowerCase().includes(filters.text.toLowerCase()));
            const matchesUser = filters.users.length === 0 || filters.users.includes(event.cr4a1_user_login);
            const matchesType = filters.types.length === 0 || filters.types.includes(event.cr4a1_tipo);
            return matchesWorkspace && matchesText && matchesUser && matchesType;
        });
    }, [events, filters, activeWorkspaces]);

    const toggleWorkspaceFilter = (wsId) => {
        setActiveWorkspaces(prev =>
            prev.includes(wsId) ? prev.filter(id => id !== wsId) : [...prev, wsId]
        );
    };

    const moveEvent = async (eventId, newDate) => {
        const event = events.find(e => e.cr4a1_agenda_kairosid === eventId);
        if (!event || (userRole !== 'SECRETARIA' && event.cr4a1_user_login !== user)) return;

        await updateEvent({
            ...event,
            startDate: newDate,
            endDate: newDate,
            title: event.cr4a1_titulo,
            startHour: event.cr4a1_hora_inicio,
            allDay: event.cr4a1_dia_inteiro,
            details: event.cr4a1_detalhes,
            targetUser: event.cr4a1_user_login,
            workspaceId: event.cr4a1_workspace_id,
            cr4a1_subtasks: event.cr4a1_subtasks
        });
    };

    const login = async (username, password) => {
        try {
            const filter = encodeURIComponent(`cr4a1_username eq '${username}' and cr4a1_password eq '${password}'`);
            const response = await fetch(`${API_PROXY}?table=cr4a1_usuarios_agendas&$filter=${filter}`);
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const data = await response.json();
            
            // Lógica unificada para papéis baseada na resposta da sua API
            const permissoesUsuario = data.value?.[0]?.cr4a1_role || 'COMUM';

            if (data.value && data.value.length === 1) {
                const userData = data.value[0];
                localStorage.setItem('kairos_logged_user', username);
                localStorage.setItem('kairos_user_role', permissoesUsuario);
                setUser(username);
                setUserRole(permissoesUsuario);
                setViewedUser(username);
                return { success: true };
            }
            return { success: false, reason: 'invalid_credentials' };
        } catch (error) {
            return { success: false, reason: 'connection_error' };
        }
    };

    const addEvent = async (eventData) => {
        const targetUser = eventData.targetUser || (userRole === 'SECRETARIA' ? viewedUser : user);
        const detailsField = eventData.allDay ? `[DIA_INTEIRO] ${eventData.details || ''}` : eventData.details;
        const generatedId = crypto.randomUUID();

        let utcStartDate = eventData.startDate;
        let utcEndDate = eventData.endDate;
        if (!eventData.allDay) {
            utcStartDate = new Date(`${eventData.startDate}T${eventData.startHour}:00`).toISOString();
            utcEndDate = new Date(`${eventData.endDate}T${eventData.endHour}:00`).toISOString();
        }

        const newEventDB = {
            cr4a1_event_id: generatedId,
            cr4a1_titulo: eventData.cr4a1_titulo,
            cr4a1_user_login: targetUser,
            cr4a1_data_inicio: utcStartDate,
            cr4a1_data_fim: utcEndDate,
            cr4a1_hora_inicio: eventData.allDay ? '00:00' : eventData.startHour,
            cr4a1_hora_fim: eventData.allDay ? '23:59' : eventData.endHour,
            cr4a1_tipo: eventData.type,
            cr4a1_detalhes: detailsField,
            cr4a1_subtasks: eventData.cr4a1_subtasks,
            cr4a1_privado: eventData.cr4a1_privado,
            cr4a1_arquivos: JSON.stringify(eventData.files || []),
            cr4a1_workspace_id: eventData.workspaceId
        };

        const optimisticEvent = {
            ...newEventDB,
            cr4a1_agenda_kairosid: generatedId,
            cr4a1_data_inicio: eventData.startDate,
            cr4a1_data_fim: eventData.endDate,
            cr4a1_dia_inteiro: eventData.allDay
        };
        setEvents(prev => [...prev, optimisticEvent]);

        if (!isOnline) { addToQueue({ method: 'POST', body: newEventDB }); return; }

        try {
            const response = await fetch(`${API_PROXY}?table=cr4a1_agenda_kairoses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEventDB)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Erro ao salvar no Dataverse');
            }

            fetchEvents();
        } catch (error) {
            toast.error(`Erro ao salvar: Verifique se o texto não é muito longo.`);
            console.error("Erro detalhado:", error);
            setEvents(prev => prev.filter(e => e.cr4a1_agenda_kairosid !== generatedId));
        }
    };

    const updateEvent = async (eventData) => {
        const id = eventData.cr4a1_agenda_kairosid;
        const detailsField = eventData.allDay ? `[DIA_INTEIRO] ${eventData.details || ''}` : eventData.details;

        let utcStartDate = eventData.startDate;
        let utcEndDate = eventData.endDate;
        if (!eventData.allDay) {
            utcStartDate = new Date(`${eventData.startDate}T${eventData.startHour}:00`).toISOString();
            utcEndDate = new Date(`${eventData.endDate}T${eventData.endHour}:00`).toISOString();
        }

        const updatedEventDB = {
            cr4a1_titulo: eventData.cr4a1_titulo,
            cr4a1_user_login: eventData.targetUser,
            cr4a1_data_inicio: utcStartDate,
            cr4a1_data_fim: utcEndDate,
            cr4a1_hora_inicio: eventData.allDay ? '00:00' : eventData.startHour,
            cr4a1_hora_fim: eventData.allDay ? '23:59' : eventData.endHour,
            cr4a1_tipo: eventData.type,
            cr4a1_detalhes: detailsField,
            cr4a1_subtasks: eventData.cr4a1_subtasks,
            cr4a1_privado: eventData.cr4a1_privado,
            cr4a1_arquivos: JSON.stringify(eventData.files || []),
            cr4a1_workspace_id: eventData.workspaceId
        };

        if (!isOnline) { addToQueue({ method: 'PATCH', id: id, body: updatedEventDB }); return; }

        try {
            const response = await fetch(`${API_PROXY}?table=cr4a1_agenda_kairoses&id=${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedEventDB)
            });

            if (!response.ok) throw new Error('Falha na resposta do servidor');

            fetchEvents();
        } catch (error) {
            toast.error("Erro ao atualizar. O texto pode estar excedendo o limite da coluna.");
            addToQueue({ method: 'PATCH', id: id, body: updatedEventDB });
        }
    };

    const deleteEvent = async (id, owner) => {
        const finalId = (typeof id === 'object') ? id.cr4a1_agenda_kairosid : id;
        const finalOwner = (typeof id === 'object') ? id.cr4a1_user_login : owner;

        if (userRole !== 'SECRETARIA' && finalOwner !== user) { toast.error("Permissão negada."); return; }

        setEvents(prev => prev.filter(e => e.cr4a1_agenda_kairosid !== finalId));

        if (!isOnline) { addToQueue({ method: 'DELETE', id: finalId }); return; }

        try {
            await fetch(`${API_PROXY}?table=cr4a1_agenda_kairoses&id=${finalId}`, { method: 'DELETE' });
            fetchEvents();
        } catch (error) { addToQueue({ method: 'DELETE', id: finalId }); }
    };

    const addEventType = async (name, emoji) => {
        try {
            const tempId = crypto.randomUUID();
            const newType = { id: tempId, name: name, emoji: emoji };

            setEventTypes(prev => {
                const updated = [...prev, newType];
                localStorage.setItem('kairos_event_types', JSON.stringify(updated));
                return updated;
            });

            await fetch(`${API_PROXY}?table=cr4a1_tipos_eventoses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cr4a1_nome: name, cr4a1_emoji: emoji })
            });

            fetchEventTypes();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao adicionar tipo de evento");
        }
    };

    const deleteEventType = async (id) => {
        try {
            await fetch(`${API_PROXY}?table=cr4a1_tipos_eventoses&id=${id}`, { method: 'DELETE' });
            fetchEventTypes();
        } catch (error) { console.error(error); }
    };

    const updateUserColor = async (userId, newColor) => {
        try {
            await fetch(`${API_PROXY}?table=cr4a1_usuarios_agendas&id=${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cr4a1_cor: newColor })
            });
            fetchUsers();
        } catch (error) { toast.error("Erro ao atualizar cor"); }
    };

    const getEventsForDay = (day) => {
        const targetDate = format(day, 'yyyy-MM-dd');
        return filteredEvents.filter(event => targetDate >= event.cr4a1_data_inicio && targetDate <= event.cr4a1_data_fim);
    };

    const updateWhatsApp = async (userId, phone) => {
        try {
            const cleanPhone = phone.replace(/\D/g, '');

            await fetch(`${API_PROXY}?table=cr4a1_usuarios_agendas&id=${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cr4a1_whatsapp: cleanPhone })
            });

            toast.success("WhatsApp atualizado!");
            fetchUsers();
        } catch (error) {
            toast.error("Erro ao atualizar WhatsApp");
        }
    };

    const updateUnit = async (userId, unit) => {
        try {
            const response = await fetch(`${API_PROXY}?table=cr4a1_usuarios_agendas&id=${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cr4a1_unidade: unit })
            });

            if (response.ok) {
                setAllUsers(prev => prev.map(u => u.cr4a1_usuarios_agendaid === userId ? { ...u, cr4a1_unidade: unit } : u));
                toast.success(`Unidade ${unit} configurada!`);
            } else {
                throw new Error('Falha no Dataverse');
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar unidade.");
        }
    };

    const addWorkspace = async (wsData) => {
        try {
            const newWS = {
                cr4a1_nome: wsData.nome,
                cr4a1_tipo_workspace: wsData.tipo,
                cr4a1_cor_hex: wsData.cor,
                cr4a1_criador_login: user,
                cr4a1_membros_logins: wsData.tipo === 'PESSOAL' ? user : wsData.membros
            };

            const response = await fetch(`${API_PROXY}?table=cr4a1_calendarios_workspaceses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newWS)
            });

            if (response.ok) {
                toast.success("Workspace criado com sucesso!");
                if (typeof fetchWorkspaces === 'function') await fetchWorkspaces();
            } else {
                toast.error("Erro ao criar Workspace.");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const updateWorkspace = async (wsId, wsData) => {
        try {
            const updatedWS = {
                cr4a1_nome: wsData.nome,
                cr4a1_tipo_workspace: wsData.tipo,
                cr4a1_cor_hex: wsData.cor,
                cr4a1_membros_logins: wsData.tipo === 'PESSOAL' ? user : wsData.membros
            };

            const response = await fetch(`${API_PROXY}?table=cr4a1_calendarios_workspaceses&id=${wsId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedWS)
            });

            if (response.ok) {
                toast.success("Workspace atualizado com sucesso!");
                if (typeof fetchWorkspaces === 'function') await fetchWorkspaces();
            } else {
                toast.error("Erro ao atualizar Workspace.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro ao atualizar Workspace.");
        }
    };

    const updateProfile = async (userId, profileData) => {
        try {
            const formattedBirthday = profileData.aniversario ? `${profileData.aniversario}T12:00:00Z` : null;

            const response = await fetch(`${API_PROXY}?table=cr4a1_usuarios_agendas&id=${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cr4a1_nome_exibicao: profileData.nomeExibicao,
                    cr4a1_foto: profileData.foto,
                    cr4a1_aniversario: formattedBirthday
                })
            });

            if (response.ok) {
                setAllUsers(prev => prev.map(u => u.cr4a1_usuarios_agendaid === userId ?
                    { ...u, cr4a1_nome_exibicao: profileData.nomeExibicao, cr4a1_foto: profileData.foto, cr4a1_aniversario: formattedBirthday } : u
                ));
                toast.success("Perfil atualizado!");
            } else {
                throw new Error("Erro na API Gateway");
            }
        } catch (error) {
            toast.error("Erro ao atualizar perfil.");
            console.error(error);
        }
    };

    const addVisitas = async (visitasArray) => {
        try {
            const requests = visitasArray.map(visita =>
                fetch(`${API_PROXY}?table=cr4a1_echoe_visitases`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(visita)
                })
            );
            await Promise.all(requests);
            await fetchDadosComerciais();
        } catch (error) {
            console.error("Erro ao gravar lote de visitas:", error);
            throw error;
        }
    };

    const updateVisitas = async (visitaData) => {
        try {
            await fetch(`${API_PROXY}?table=cr4a1_echoe_visitases&id=${visitaData.cr4a1_visita_id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(visitaData)
            });
            setVisitas(prevVisitas =>
                prevVisitas.map(v =>
                    v.cr4a1_visita_id === visitaData.cr4a1_visita_id ? visitaData : v
                )
            );
        } catch (error) {
            console.error("Erro ao atualizar visita:", error);
            throw error;
        }
    };

    return {
        view, setView, currentDate, setCurrentDate, user, userRole, viewedUser, setViewedUser,
        allUsers, eventTypes, addEventType, deleteEventType, notification,
        updateUserColor, login, logout: () => { localStorage.clear(); window.location.reload(); },
        loading, isValidatingSession, holidays, events, addEvent, updateEvent, getEventsForDay, deleteEvent,
        filters, setFilters, filteredEvents,
        isOnline, isSyncing, updateWhatsApp, addWorkspace, updateWorkspace,
        updateUnit, updateProfile,
        workspaces, activeWorkspaces, toggleWorkspaceFilter,
        organizacoes, visitas, addVisitas, updateVisitas,
        next: () => setCurrentDate(addMonths(currentDate, 1)), prev: () => setCurrentDate(subMonths(currentDate, 1))
    };
};