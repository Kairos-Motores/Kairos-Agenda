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
    
    // Estados de Conectividade
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

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

    // Validação de Sessão Inicial
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

    // ==========================================
    // MOTOR OFFLINE E SINCRONIZAÇÃO DE FILA
    // ==========================================
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

    // ==========================================
    // BUSCA DE DADOS E CONVERSÃO DE FUSO HORÁRIO
    // ==========================================
    const fetchUsers = useCallback(async () => {
        try {
            const response = await fetch(`${API_PROXY}?table=cr4a1_usuarios_agendas`);
            const data = await response.json();
            setAllUsers(data.value || []);
        } catch (error) { console.error('Erro ao buscar usuários:', error); }
    }, []);

    const fetchEventTypes = useCallback(async () => {
        try {
            const response = await fetch(`${API_PROXY}?table=cr4a1_tipos_eventos`);
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

    const fetchEvents = async () => {
        setLoading(true);
        try {
            if (!navigator.onLine) throw new Error('Offline');
            
            const response = await fetch(`${API_PROXY}?table=cr4a1_agenda_kairoses`);
            const data = await response.json();
            
            const mapped = (data.value || [])
                .filter(e => !e.cr4a1_privado || e.cr4a1_user_login === user)
                .map(e => {
                    let localStartDate = e.cr4a1_data_inicio;
                    let localEndDate = e.cr4a1_data_fim;
                    let localStartHour = e.cr4a1_hora_inicio;
                    let localEndHour = e.cr4a1_hora_fim;

                    if (e.cr4a1_data_inicio?.includes('Z')) {
                        const startDateObj = new Date(e.cr4a1_data_inicio); 
                        localStartDate = format(startDateObj, 'yyyy-MM-dd');
                        localStartHour = format(startDateObj, 'HH:mm');
                        
                        if (e.cr4a1_data_fim?.includes('Z')) {
                            const endDateObj = new Date(e.cr4a1_data_fim);
                            localEndDate = format(endDateObj, 'yyyy-MM-dd');
                            localEndHour = format(endDateObj, 'HH:mm');
                        }
                    }

                    return {
                        ...e,
                        cr4a1_data_inicio: localStartDate,
                        cr4a1_data_fim: localEndDate,
                        cr4a1_hora_inicio: localStartHour,
                        cr4a1_hora_fim: localEndHour,
                        cr4a1_dia_inteiro: e.cr4a1_detalhes?.includes('[DIA_INTEIRO]'),
                        cr4a1_detalhes: e.cr4a1_detalhes?.replace('[DIA_INTEIRO]', '').trim()
                    };
                });
            
            setEvents(mapped);
            localStorage.setItem('kairos_events_cache', JSON.stringify(mapped));
        } catch (error) { 
            console.warn('Carregando cache local...');
            const cached = JSON.parse(localStorage.getItem('kairos_events_cache') || '[]');
            setEvents(cached);
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { fetchNationalHolidays(currentDate.getFullYear()).then(setHolidays); }, [currentDate.getFullYear()]);
    useEffect(() => { if (user) { fetchUsers(); fetchEvents(); fetchEventTypes(); } }, [user, fetchUsers, fetchEventTypes]);

    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            const matchesText = !filters.text || (event.cr4a1_titulo?.toLowerCase().includes(filters.text.toLowerCase())) || (event.cr4a1_detalhes?.toLowerCase().includes(filters.text.toLowerCase()));
            const matchesUser = filters.users.length === 0 || filters.users.includes(event.cr4a1_user_login);
            const matchesType = filters.types.length === 0 || filters.types.includes(event.cr4a1_tipo);
            return matchesText && matchesUser && matchesType;
        });
    }, [events, filters]);

    // ==========================================
    // AÇÕES DO USUÁRIO
    // ==========================================
    const login = async (username, password) => {
        try {
            const filter = encodeURIComponent(`cr4a1_username eq '${username}' and cr4a1_password eq '${password}'`);
            const response = await fetch(`${API_PROXY}?table=cr4a1_usuarios_agendas&$filter=${filter}`);
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const data = await response.json();

            if (data.value && data.value.length === 1) {
                const userData = data.value[0];
                localStorage.setItem('kairos_logged_user', username);
                localStorage.setItem('kairos_user_role', userData.cr4a1_role);
                setUser(username);
                setUserRole(userData.cr4a1_role);
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
        const details = eventData.allDay ? `[DIA_INTEIRO] ${eventData.details || ''}` : eventData.details;
        const generatedId = crypto.randomUUID();
        
        let utcStartDate = eventData.startDate;
        let utcEndDate = eventData.endDate;
        if (!eventData.allDay) {
            utcStartDate = new Date(`${eventData.startDate}T${eventData.startHour}:00`).toISOString();
            utcEndDate = new Date(`${eventData.endDate}T${eventData.endHour}:00`).toISOString();
        }

        const newEventDB = {
            cr4a1_event_id: generatedId,
            cr4a1_titulo: eventData.title,
            cr4a1_user_login: targetUser,
            cr4a1_data_inicio: utcStartDate, 
            cr4a1_data_fim: utcEndDate,
            cr4a1_hora_inicio: eventData.allDay ? '00:00' : eventData.startHour,
            cr4a1_hora_fim: eventData.allDay ? '23:59' : eventData.endHour,
            cr4a1_tipo: eventData.type,
            cr4a1_detalhes: details,
            cr4a1_privado: eventData.cr4a1_privado,
            cr4a1_arquivos: JSON.stringify(eventData.files || []),
        };

        const optimisticEvent = {
            ...newEventDB, cr4a1_agenda_kairosid: generatedId,
            cr4a1_data_inicio: eventData.startDate, cr4a1_data_fim: eventData.endDate,
            cr4a1_dia_inteiro: eventData.allDay, cr4a1_detalhes: eventData.details
        };
        setEvents(prev => [...prev, optimisticEvent]);

        if (!isOnline) { addToQueue({ method: 'POST', body: newEventDB }); return; }

        try {
            await fetch(`${API_PROXY}?table=cr4a1_agenda_kairoses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newEventDB) });
            fetchEvents();
        } catch (error) { addToQueue({ method: 'POST', body: newEventDB }); }
    };

    const updateEvent = async (eventData) => {
        const id = eventData.cr4a1_agenda_kairosid;
        const details = eventData.allDay ? `[DIA_INTEIRO] ${eventData.details || ''}` : eventData.details;
        
        let utcStartDate = eventData.startDate;
        let utcEndDate = eventData.endDate;
        if (!eventData.allDay) {
            utcStartDate = new Date(`${eventData.startDate}T${eventData.startHour}:00`).toISOString();
            utcEndDate = new Date(`${eventData.endDate}T${eventData.endHour}:00`).toISOString();
        }

        const updatedEventDB = {
            cr4a1_titulo: eventData.title,
            cr4a1_user_login: eventData.targetUser,
            cr4a1_data_inicio: utcStartDate, cr4a1_data_fim: utcEndDate,
            cr4a1_hora_inicio: eventData.allDay ? '00:00' : eventData.startHour,
            cr4a1_hora_fim: eventData.allDay ? '23:59' : eventData.endHour,
            cr4a1_tipo: eventData.type, cr4a1_detalhes: details,
            cr4a1_privado: eventData.cr4a1_privado, cr4a1_arquivos: JSON.stringify(eventData.files || []),
        };

        setEvents(prev => prev.map(e => e.cr4a1_agenda_kairosid === id ? {
            ...e, ...updatedEventDB, 
            cr4a1_data_inicio: eventData.startDate, cr4a1_data_fim: eventData.endDate,
            cr4a1_dia_inteiro: eventData.allDay, cr4a1_detalhes: eventData.details
        } : e));

        if (!isOnline) { addToQueue({ method: 'PATCH', id: id, body: updatedEventDB }); return; }

        try {
            await fetch(`${API_PROXY}?table=cr4a1_agenda_kairoses&id=${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedEventDB) });
            fetchEvents();
        } catch (error) { addToQueue({ method: 'PATCH', id: id, body: updatedEventDB }); }
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
            await fetch(`${API_PROXY}?table=cr4a1_tipos_eventos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cr4a1_nome: name, cr4a1_emoji: emoji })
            });
            fetchEventTypes();
        } catch (error) { console.error(error); }
    };

    const deleteEventType = async (id) => {
        try {
            await fetch(`${API_PROXY}?table=cr4a1_tipos_eventos&id=${id}`, { method: 'DELETE' });
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

    return {
        view, setView, currentDate, setCurrentDate, user, userRole, viewedUser, setViewedUser,
        allUsers, eventTypes, addEventType, deleteEventType, notification,
        updateUserColor, login, logout: () => { localStorage.clear(); window.location.reload(); },
        loading, isValidatingSession, holidays, events, addEvent, updateEvent, getEventsForDay, deleteEvent,
        filters, setFilters, filteredEvents, 
        isOnline, isSyncing, 
        next: () => setCurrentDate(addMonths(currentDate, 1)), prev: () => setCurrentDate(subMonths(currentDate, 1))
    };
};