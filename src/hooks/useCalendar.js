import { useState, useEffect, useCallback } from 'react';
import { addMonths, subMonths, format } from 'date-fns';
import { fetchNationalHolidays } from '../api/holidays';

const API_PROXY = '/api/dataverse-proxy';

export const useCalendar = () => {
    const [view, setView] = useState('year');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [holidays, setHolidays] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const [user, setUser] = useState(() => localStorage.getItem('kairos_logged_user') || null);
    const [userRole, setUserRole] = useState(() => localStorage.getItem('kairos_user_role') || null);
    const [viewedUser, setViewedUser] = useState(() => localStorage.getItem('kairos_logged_user') || null);
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

    // Cores profissionais expandidas
    const colorPalette = [
        '#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c',
        '#2c3e50', '#d35400', '#27ae60', '#2980b9', '#8e44ad', '#16a085', '#7f8c8d',
        '#c0392b', '#f39c12', '#bdc3c7', '#34495e', '#ecf0f1', '#ff9f43', '#0abde3',
        '#ee5253', '#00d2d3', '#54a0ff', '#5f27cd'
    ];

    useEffect(() => {
        fetchNationalHolidays(currentDate.getFullYear()).then(setHolidays);
    }, [currentDate.getFullYear()]);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await fetch(`${API_PROXY}?table=cr4a1_usuarios_agendas`);
            const data = await response.json();
            setAllUsers(data.value || []);
        } catch (error) { console.error(error); }
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
        } catch (error) { console.log("Usando tipos de evento padrão/local"); }
    }, []);

    useEffect(() => {
        if (user) {
            fetchUsers();
            fetchEvents();
            fetchEventTypes();
        }
    }, [user, fetchUsers, fetchEventTypes]);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_PROXY}?table=cr4a1_agenda_kairoses`);
            const data = await response.json();
            const mapped = (data.value || []).map(e => ({
                ...e,
                cr4a1_dia_inteiro: e.cr4a1_detalhes?.includes('[DIA_INTEIRO]'),
                cr4a1_detalhes: e.cr4a1_detalhes?.replace('[DIA_INTEIRO]', '').trim()
            }));
            setEvents(mapped);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const addEventType = async (name, emoji) => {
        const newType = { id: Date.now().toString(), name, emoji };
        try {
            const res = await fetch(`${API_PROXY}?table=cr4a1_tipos_eventos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cr4a1_nome: name, cr4a1_emoji: emoji })
            });
            if (res.ok) fetchEventTypes();
            else throw new Error("API Fail");
        } catch (error) { 
            // Fallback robusto para local
            setEventTypes(prev => {
                const updated = [...prev, newType];
                localStorage.setItem('kairos_event_types', JSON.stringify(updated));
                return updated;
            });
        }
    };

    const deleteEventType = async (id) => {
        try {
            const res = await fetch(`${API_PROXY}?table=cr4a1_tipos_eventos&id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchEventTypes();
            else throw new Error("API Fail");
        } catch (error) {
            setEventTypes(prev => {
                const updated = prev.filter(t => t.id !== id);
                localStorage.setItem('kairos_event_types', JSON.stringify(updated));
                return updated;
            });
        }
    };

    const updateUserColor = async (userId, newColor) => {
        try {
            await fetch(`${API_PROXY}?table=cr4a1_usuarios_agendas&id=${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cr4a1_cor: newColor })
            });
            fetchUsers();
        } catch (error) { alert("Erro ao atualizar cor"); }
    };

    const login = async (username, password) => {
        try {
            const filter = encodeURIComponent(`cr4a1_username eq '${username}' and cr4a1_password eq '${password}'`);
            const response = await fetch(`${API_PROXY}?table=cr4a1_usuarios_agendas&$filter=${filter}`);
            const data = await response.json();

            if (data.value && data.value.length > 0) {
                const userData = data.value[0];
                localStorage.setItem('kairos_logged_user', username);
                localStorage.setItem('kairos_user_role', userData.cr4a1_role);
                setUser(username);
                setUserRole(userData.cr4a1_role);
                setViewedUser(username);
                return true;
            }
            return false;
        } catch (error) { return false; }
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
            cr4a1_arquivos: JSON.stringify(eventData.files || []),
        };

        try {
            await fetch(`${API_PROXY}?table=cr4a1_agenda_kairoses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEvent)
            });
            
            try {
                const alertPhone = import.meta.env.VITE_WHATSAPP_ALERT_PHONE || '5511999999999'; 
                const message = `*Novo Evento no Calendário*\n\n*Título:* ${eventData.title}\n*Data:* ${eventData.startDate} a ${eventData.endDate}\n*Horário:* ${eventData.allDay ? 'Dia Inteiro' : eventData.startHour + ' às ' + eventData.endHour}\n*Detalhes:* ${eventData.details || 'Nenhum'}`;
                await fetch('http://localhost:3005/api/alert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: alertPhone, message })
                });
            } catch (wppError) { console.error(wppError); }

            fetchEvents();
        } catch (error) { alert("Erro ao salvar"); }
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
            cr4a1_arquivos: JSON.stringify(eventData.files || []),
        };

        try {
            await fetch(`${API_PROXY}?table=cr4a1_agenda_kairoses&id=${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedEvent)
            });
            fetchEvents();
        } catch (error) { alert("Erro ao atualizar"); }
    };

    const deleteEvent = async (id, owner) => {
        // Se receber o objeto do evento em vez do ID diretamente
        const finalId = (typeof id === 'object') ? id.cr4a1_agenda_kairosid : id;
        const finalOwner = (typeof id === 'object') ? id.cr4a1_user_login : owner;

        if (userRole !== 'SECRETARIA' && finalOwner !== user) {
            alert("Você só pode excluir seus próprios eventos.");
            return;
        }
        try {
            await fetch(`${API_PROXY}?table=cr4a1_agenda_kairoses&id=${finalId}`, { method: 'DELETE' });
            setEvents(prev => prev.filter(e => e.cr4a1_agenda_kairosid !== finalId));
        } catch (error) { console.error(error); }
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
        allUsers, eventTypes, addEventType, deleteEventType,
        colorPalette, updateUserColor, login, logout: () => { localStorage.clear(); window.location.reload(); },
        loading, holidays, events, addEvent, updateEvent, getEventsForDay, deleteEvent,
        next: () => setCurrentDate(addMonths(currentDate, 1)),
        prev: () => setCurrentDate(subMonths(currentDate, 1))
    };
};