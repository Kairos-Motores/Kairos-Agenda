import { useState, useEffect, useCallback } from 'react';
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
    
    const [user, setUser] = useState(() => localStorage.getItem('kairos_logged_user') || null);
    const [userRole, setUserRole] = useState(() => localStorage.getItem('kairos_user_role') || null);
    const [viewedUser, setViewedUser] = useState(() => localStorage.getItem('kairos_logged_user') || null);
    const [isValidatingSession, setIsValidatingSession] = useState(!!localStorage.getItem('kairos_logged_user'));
    const [allUsers, setAllUsers] = useState([]);
    const [eventTypes, setEventTypes] = useState(() => {
        const saved = localStorage.getItem('kairos_event_types');
        return saved ? JSON.parse(saved) : [
            { id: '1', name: 'Tarefa', emoji: '📝' },
            { id: '2', name: 'Reunião', emoji: '🤝' },
            { id: '3', name: 'Pessoal', emoji: '🏠' },
            { id: '4', name: 'Urgente', emoji: '🔥' }
        ];
    });

    const colorPalette = [
        '#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c',
        '#2c3e50', '#d35400', '#27ae60', '#2980b9', '#8e44ad', '#16a085', '#7f8c8d',
        '#c0392b', '#f39c12', '#bdc3c7', '#34495e', '#ecf0f1', '#ff9f43', '#0abde3',
        '#ee5253', '#00d2d3', '#54a0ff', '#5f27cd'
    ];

    const triggerAndroidNotification = (message) => {
        setNotification(message);
        setTimeout(() => {
            const el = document.querySelector('.android-notification');
            if (el) el.classList.add('android-out');
            setTimeout(() => setNotification(null), 500);
        }, 3500);
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

    useEffect(() => {
        fetchNationalHolidays(currentDate.getFullYear()).then(setHolidays);
    }, [currentDate.getFullYear()]);

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
            const response = await fetch(`${API_PROXY}?table=cr4a1_agenda_kairoses`);
            const data = await response.json();
            const mapped = (data.value || [])
                // FILTRO DE PRIVACIDADE UNIFICADO
                .filter(e => !e.cr4a1_privado || e.cr4a1_user_login === user)
                .map(e => ({
                    ...e,
                    cr4a1_dia_inteiro: e.cr4a1_detalhes?.includes('[DIA_INTEIRO]'),
                    cr4a1_detalhes: e.cr4a1_detalhes?.replace('[DIA_INTEIRO]', '').trim()
                }));
            setEvents(mapped);
        } catch (error) { console.error('Erro ao buscar eventos:', error); } finally { setLoading(false); }
    };

    useEffect(() => {
        if (user) {
            fetchUsers();
            fetchEvents();
            fetchEventTypes();
        }
    }, [user, fetchUsers, fetchEventTypes]);

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
            triggerAndroidNotification("Usuário ou senha incorretos");
            return { success: false };
        } catch (error) { 
            triggerAndroidNotification("Erro de conexão com o banco");
            return { success: false };
        }
    };

    const addEvent = async (eventData) => {
        const targetUser = eventData.targetUser || (userRole === 'SECRETARIA' ? viewedUser : user);
        const details = eventData.allDay ? `[DIA_INTEIRO] ${eventData.details || ''}` : eventData.details;
        const newEvent = {
            cr4a1_event_id: crypto.randomUUID(),
            cr4a1_titulo: eventData.title,
            cr4a1_user_login: targetUser,
            cr4a1_data_inicio: eventData.startDate,
            cr4a1_data_fim: eventData.endDate,
            cr4a1_hora_inicio: eventData.allDay ? '00:00' : eventData.startHour,
            cr4a1_hora_fim: eventData.allDay ? '23:59' : eventData.endHour,
            cr4a1_tipo: eventData.type,
            cr4a1_detalhes: details,
            cr4a1_privado: eventData.cr4a1_privado, // Persistência da Privacidade
            cr4a1_arquivos: JSON.stringify(eventData.files || []),
        };

        try {
            await fetch(`${API_PROXY}?table=cr4a1_agenda_kairoses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEvent)
            });

            // Lógica Restaurada do WhatsApp
            try {
                const alertPhone = import.meta.env.VITE_WHATSAPP_ALERT_PHONE || '5511999999999';
                const message = `*Novo Evento*\n*Título:* ${eventData.title}\n*Horário:* ${eventData.allDay ? 'Dia Inteiro' : eventData.startHour}`;
                await fetch('http://localhost:3005/api/alert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: alertPhone, message })
                });
            } catch (wppError) { console.error('Erro WPP:', wppError); }

            fetchEvents();
        } catch (error) { toast.error("Erro ao salvar"); }
    };

    const updateEvent = async (eventData) => {
        const id = eventData.cr4a1_agenda_kairosid;
        const details = eventData.allDay ? `[DIA_INTEIRO] ${eventData.details || ''}` : eventData.details;
        const updatedEvent = {
            cr4a1_titulo: eventData.title,
            cr4a1_user_login: eventData.targetUser,
            cr4a1_data_inicio: eventData.startDate,
            cr4a1_data_fim: eventData.endDate,
            cr4a1_hora_inicio: eventData.allDay ? '00:00' : eventData.startHour,
            cr4a1_hora_fim: eventData.allDay ? '23:59' : eventData.endHour,
            cr4a1_tipo: eventData.type,
            cr4a1_detalhes: details,
            cr4a1_privado: eventData.cr4a1_privado, // Persistência da Privacidade na edição
            cr4a1_arquivos: JSON.stringify(eventData.files || []),
        };

        try {
            await fetch(`${API_PROXY}?table=cr4a1_agenda_kairoses&id=${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedEvent)
            });
            fetchEvents();
        } catch (error) { toast.error("Erro ao atualizar"); }
    };

    const deleteEvent = async (id, owner) => {
        const finalId = (typeof id === 'object') ? id.cr4a1_agenda_kairosid : id;
        const finalOwner = (typeof id === 'object') ? id.cr4a1_user_login : owner;

        if (userRole !== 'SECRETARIA' && finalOwner !== user) {
            toast.error("Permissão negada.");
            return;
        }
        try {
            await fetch(`${API_PROXY}?table=cr4a1_agenda_kairoses&id=${finalId}`, { method: 'DELETE' });
            fetchEvents();
        } catch (error) { console.error('Erro ao deletar:', error); }
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
        return events.filter(event => {
            const start = event.cr4a1_data_inicio?.split('T')[0];
            const end = event.cr4a1_data_fim?.split('T')[0];
            return targetDate >= start && targetDate <= end;
        });
    };

    return {
        view, setView, currentDate, setCurrentDate, user, userRole, viewedUser, setViewedUser,
        allUsers, eventTypes, addEventType, deleteEventType, notification,
        colorPalette, updateUserColor, login, 
        logout: () => { localStorage.clear(); window.location.reload(); },
        loading, isValidatingSession, holidays, events, addEvent, updateEvent, getEventsForDay, deleteEvent,
        next: () => setCurrentDate(addMonths(currentDate, 1)),
        prev: () => setCurrentDate(subMonths(currentDate, 1))
    };
};