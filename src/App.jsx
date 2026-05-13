import React, { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { useCalendar } from './hooks/useCalendar';
import { DayView } from './components/DayView';
import { MiniMonth } from './components/MiniMonth';
import { EventModal } from './components/EventModal';
import { ListView } from './components/ListView';
import { UserManagementModal } from './components/UserManagementModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { generateMonthDays } from './utils/dateHelpers';
import { WorkspaceModal } from './components/WorkspaceModal';
import {
  format, addMonths, subMonths, addYears, subYears, addDays, subDays, startOfWeek
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DndContext, TouchSensor, PointerSensor, useSensor, useSensors, closestCorners, useDraggable, useDroppable } from '@dnd-kit/core';
import { applyDynamicTheme } from './utils/themeGenerator';

// --- COMPONENTES AUXILIARES ---

const countryCodes = [
  { code: '+55', flag: '🇧🇷', name: 'Brasil' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+1', flag: '🇺🇸', name: 'EUA' },
  { code: '+44', flag: '🇬🇧', name: 'Reino Unido' },
  { code: '+34', flag: '🇪🇸', name: 'Espanha' }
];

const WhatsAppInput = ({ initialValue, onSave, userId }) => {
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    if (initialValue) {
      const country = countryCodes.find(c => initialValue.startsWith(c.code.replace('+', '')));
      if (country) {
        setSelectedCountry(country);
        setPhoneNumber(initialValue.replace(country.code.replace('+', ''), ''));
      } else {
        setPhoneNumber(initialValue);
      }
    }
  }, [initialValue]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* INSTRUÇÕES DO WHATSAPP */}
      <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-primary)', margin: 0 }}>
          <strong>Para receber alertas no WhatsApp:</strong><br />
          1. Salve seu número abaixo.<br />
          2. Clique no botão verde abaixo para abrir o robô.<br />
          3. Envie <strong>"Olá"</strong> para iniciar o vínculo.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
          Seu Número
        </label>
        {/* LAYOUT CORRIGIDO PARA MOBILE */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={selectedCountry.code}
            onChange={(e) => setSelectedCountry(countryCodes.find(c => c.code === e.target.value))}
            style={{
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '16px',
              cursor: 'pointer',
              outline: 'none',
              flex: '0 0 auto'
            }}
          >
            {countryCodes.map(c => (
              <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
            ))}
          </select>

          <input
            type="tel"
            placeholder="98985..."
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
            style={{
              flex: '1 1 120px',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              outline: 'none',
              minWidth: '0'
            }}
          />

          <button
            onClick={() => onSave(userId, `${selectedCountry.code.replace('+', '')}${phoneNumber}`)}
            className="icon-btn"
            style={{ background: 'var(--text-accent)', color: 'white', width: '48px', height: '48px', borderRadius: '12px', flex: '0 0 auto' }}
          >
            <span className="material-symbols-rounded">save</span>
          </button>
        </div>
      </div>

      {/* BOTÃO DO ROBÔ */}
      <a
        href="https://wa.me/5591933005886"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '16px',
          borderRadius: '16px',
          background: '#25D366',
          color: 'white',
          textDecoration: 'none',
          fontWeight: '700',
          fontSize: '14px',
          boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)',
          transition: 'transform 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span className="material-symbols-rounded">smart_toy</span>
        Falar com Robô Kairós
      </a>
    </div>
  );
};

const DraggableEvent = ({ event, children }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: event.cr4a1_agenda_kairosid });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 999, opacity: isDragging ? 0.6 : 1 } : undefined;
  return <div ref={setNodeRef} style={style} {...listeners} {...attributes}>{children}</div>;
};

const DroppableDay = ({ dateStr, children, isToday, onClick }) => {
  const { setNodeRef, isOver } = useDroppable({ id: dateStr });
  return (
    <div ref={setNodeRef} onClick={onClick} className={`calendar-day-card ${isOver ? 'drop-over' : ''} ${isToday ? 'today' : ''}`}>
      {children}
    </div>
  );
};

const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    const result = await onLogin(username, password);
    if (!result.success) {
      toast.error(result.reason === 'connection_error' ? 'Erro de conexão.' : 'Usuário ou senha inválidos.', { style: { borderRadius: '32px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '12px 24px' } });
      setIsAuthenticating(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-page)' }}>
      <form onSubmit={handleSubmit} style={{ padding: '40px', background: 'var(--bg-primary)', borderRadius: '16px', boxShadow: 'var(--shadow-hover)', width: '350px' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--text-title)', marginBottom: '30px', fontWeight: '600' }}>Kairós Agenda</h2>
        <input type="text" placeholder="Usuário" value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid var(--border-strong)', boxSizing: 'border-box', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s' }} />
        <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '25px', borderRadius: '8px', border: '1px solid var(--border-strong)', boxSizing: 'border-box', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s' }} />
        <button type="submit" disabled={isAuthenticating} style={{ width: '100%', padding: '12px', background: 'var(--text-accent)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
          {isAuthenticating ? 'Validando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
};

const materialColors = [
  { id: 'blue', hex: '#1a73e8', label: 'Azul Google' },
  { id: 'cyan', hex: '#00acc1', label: 'Ciano' },
  { id: 'teal', hex: '#00897b', label: 'Verde Mar' },
  { id: 'green', hex: '#388e3c', label: 'Verde Sálvia' },
  { id: 'amber', hex: '#ffb300', label: 'Amarelo Ouro' },
  { id: 'orange', hex: '#f57c00', label: 'Laranja Outono' },
  { id: 'coral', hex: '#f4511e', label: 'Coral' },
  { id: 'rose', hex: '#d81b60', label: 'Rosa Escuro' },
  { id: 'purple', hex: '#673ab7', label: 'Lavanda' },
  { id: 'indigo', hex: '#3949ab', label: 'Índigo' },
  { id: 'graphite', hex: '#5f6368', label: 'Grafite' },
  { id: 'red', hex: '#d32f2f', label: 'Vermelho' },
  { id: 'pink', hex: '#c2185b', label: 'Rosa' },
  { id: 'lime', hex: '#afb42b', label: 'Lima' },
  { id: 'light-blue', hex: '#0288d1', label: 'Azul Claro' },
  { id: 'deep-orange', hex: '#e64a19', label: 'Laranja Profundo' },
  { id: 'brown', hex: '#5d4037', label: 'Marrom' },
  { id: 'blue-grey', hex: '#455a64', label: 'Cinza Azulado' },
  { id: 'violet', hex: '#7b1fa2', label: 'Violeta' },
  { id: 'emerald', hex: '#2e7d32', label: 'Esmeralda' },
  { id: 'sky', hex: '#03a9f4', label: 'Céu' },
  { id: 'gold', hex: '#fbc02d', label: 'Ouro' }
];

const OnboardingModal = ({ user, onSaveUnit }) => {
  const [selectedUnit, setSelectedUnit] = React.useState('');
  const units = ['São Luís', 'Barcarena', 'Parauapebas', 'São José dos Campos', 'Aveiro'];

  return (
    <div className="modal-overlay" style={{ zIndex: 20000, backgroundColor: 'var(--bg-page)' }}>
      <div className="modal-content" style={{ maxWidth: '400px', width: '90%', textAlign: 'center', padding: '40px', borderRadius: '32px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: '48px' }}>🏢</span>
        <h2 style={{ margin: '20px 0 10px', color: 'var(--text-title)' }}>Bem-vindo à Kairós!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '14px' }}>Selecione sua unidade para configurar seu perfil:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
          {units.map(unit => (
            <button key={unit} onClick={() => setSelectedUnit(unit)} style={{ padding: '14px', borderRadius: '12px', border: selectedUnit === unit ? '2px solid var(--text-accent)' : '1px solid var(--border-color)', background: selectedUnit === unit ? 'var(--bg-tertiary)' : 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: selectedUnit === unit ? '700' : '500' }}>{unit}</button>
          ))}
        </div>
        <button disabled={!selectedUnit} onClick={() => onSaveUnit(selectedUnit)} className="btn-primary" style={{ width: '100%', padding: '16px', opacity: selectedUnit ? 1 : 0.5 }}>Confirmar e Entrar</button>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---

function App() {
  const {
    view, setView, currentDate, setCurrentDate, holidays, events, addEvent, updateEvent, deleteEvent, notification,
    getEventsForDay, next, prev, user, userRole, viewedUser, setViewedUser, allUsers, eventTypes, addEventType, deleteEventType, login, logout, loading, isValidatingSession, updateUserColor, filters, setFilters, filteredEvents, moveEvent,
    updateWhatsApp, addWorkspace, updateUnit,
    workspaces, activeWorkspaces, toggleWorkspaceFilter
  } = useCalendar();

  const notifiedRef = useRef(new Set());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  const [hoveredMonthDay, setHoveredMonthDay] = useState(null);
  const [isYearSelectorOpen, setIsYearSelectorOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dayViewMode, setDayViewMode] = useState('timeline');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('kairos_accent_color') || '#1a73e8');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

  const [defaultWorkspaceId, setDefaultWorkspaceId] = useState(() => localStorage.getItem('kairos_default_workspace'));

  const [clock, setClock] = useState(new Date());
  const [isScrolled, setIsScrolled] = useState(false);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 5 } })
  );

  useEffect(() => {
    const checkNotifications = () => {
      if (Notification.permission !== 'granted') return;
      const now = new Date();
      const milestones = [30, 15, 5, 0];
      events.forEach(event => {
        if (event.cr4a1_dia_inteiro || !event.cr4a1_hora_inicio) return;
        const [year, month, day] = event.cr4a1_data_inicio.split('-').map(Number);
        const [hours, minutes] = event.cr4a1_hora_inicio.split(':').map(Number);
        const eventDate = new Date(year, month - 1, day, hours, minutes, 0);
        const diffMs = eventDate - now;
        const diffMin = Math.floor(diffMs / 60000);

        if (milestones.includes(diffMin)) {
          const notificationKey = `${event.cr4a1_agenda_kairosid}_${diffMin}`;
          if (!notifiedRef.current.has(notificationKey)) {
            const title = `📌 ${event.cr4a1_titulo}`;
            const options = {
              body: diffMin === 0 ? "Começando agora!" : `Em ${diffMin} minutos.`,
              icon: '/icon-512.jpg',
              tag: event.cr4a1_agenda_kairosid,
              badge: '/icon-512.jpg',
              vibrate: [200, 100, 200],
              requireInteraction: diffMin <= 5
            };
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, options);
              });
            } else {
              new Notification(title, options);
            }
            notifiedRef.current.add(notificationKey);
          }
        }
      });
      if (notifiedRef.current.size > 50) notifiedRef.current.clear();
    };
    const timer = setInterval(checkNotifications, 30000);
    return () => clearInterval(timer);
  }, [events]);

  useEffect(() => {
    applyDynamicTheme(accentColor, theme === 'dark');
    localStorage.setItem('kairos_accent_color', accentColor);
    localStorage.setItem('theme', theme);
  }, [accentColor, theme]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--text-accent', accentColor);
    localStorage.setItem('kairos_accent_color', accentColor);
  }, [accentColor]);

  if (isValidatingSession) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-page)', gap: '16px' }}>
      <span style={{ fontSize: '48px' }}>📅</span><p style={{ color: 'var(--text-secondary)' }}>Verificando sessão...</p>
    </div>
  );

  if (!user) return <LoginScreen onLogin={login} />;

  const currentUser = allUsers.find(u => u.cr4a1_username === user);
  if (currentUser && !currentUser.cr4a1_unidade) {
    return <OnboardingModal user={user} onSaveUnit={(unit) => updateUnit(currentUser.cr4a1_usuarios_agendaid, unit)} />;
  }

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isRightSwipe && touchStart < 60) setIsSidebarOpen(true);
    if (isLeftSwipe && isSidebarOpen) setIsSidebarOpen(false);
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Este navegador não suporta notificações.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast.success('Notificações ativadas!', { icon: '🔔' });
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification('Kairós Agenda', {
            body: 'As notificações estão funcionando perfeitamente!',
            icon: '/icon-512.jpg'
          });
        });
      }
    } else {
      toast.error('As notificações foram bloqueadas.');
    }
  };

  const handleSaveEvent = async (data) => {
    try {
      if (data.cr4a1_event_id) await updateEvent(data);
      else await addEvent(data);
      toast.success("Salvo com sucesso!");
      setIsModalOpen(false);
    } catch (err) { toast.error("Falha ao salvar."); throw err; }
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await deleteEvent(eventToDelete.cr4a1_agenda_kairosid, eventToDelete.cr4a1_user_login);
      toast.success("Excluído."); setIsDeleteModalOpen(false); setEventToDelete(null);
    } catch (err) { toast.error("Falha ao excluir."); }
  };

  const handleEditClick = (event) => {
    if (userRole === 'SECRETARIA' || event.cr4a1_user_login === user) {
      setEditingEvent(event); setIsModalOpen(true);
    } else {
      toast.error("Acesso Negado.", { icon: '🚫' });
    }
  };

  const getEventColor = (event) => event.cr4a1_cor || (allUsers.find(u => u.cr4a1_username === event.cr4a1_user_login)?.cr4a1_cor || '#3498db');

  const handleNavigate = (direction) => {
    const isNext = direction === 'next';
    if (view === 'year') setCurrentDate(isNext ? addYears(currentDate, 1) : subYears(currentDate, 1));
    else if (view === 'week') setCurrentDate(isNext ? addDays(currentDate, 7) : subDays(currentDate, 7));
    else if (view === '3days') setCurrentDate(isNext ? addDays(currentDate, 3) : subDays(currentDate, 3));
    else if (view === 'day') setCurrentDate(isNext ? addDays(currentDate, 1) : subDays(currentDate, 1));
    else setCurrentDate(isNext ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
  };

  const viewsConfig = [
    { id: 'year', label: 'Ano', icon: 'calendar_view_month' },
    { id: 'month', label: 'Mês', icon: 'calendar_month' },
    { id: 'week', label: 'Semana', icon: 'view_week' },
    { id: '3days', label: '3 Dias', icon: 'view_timeline' },
    { id: 'day', label: 'Dia', icon: 'view_day' },
    { id: 'list', label: 'Fichas', icon: 'view_agenda' }
  ];

  const toggleFilter = (type, val) => {
    setFilters(prev => {
      const current = prev[type];
      return { ...prev, [type]: current.includes(val) ? current.filter(item => item !== val) : [...current, val] };
    });
  };

  const handleDragEnd = (e) => { if (e.over && e.active.id !== e.over.id) moveEvent(e.active.id, e.over.id); };

  const getDisplayEvents = () => {
    if (activeWorkspaces.length > 0) return filteredEvents;
    if (defaultWorkspaceId) {
      return filteredEvents.filter(e => e.cr4a1_workspace_id === defaultWorkspaceId);
    }
    return filteredEvents;
  };

  const handleSetDefaultWorkspace = (id) => {
    setDefaultWorkspaceId(id);
    localStorage.setItem('kairos_default_workspace', id);
    toast.success("Workspace padrão atualizado!", { icon: '⭐' });
  };

  const getWorkspaceBorderStyle = () => {
    const activeWSColors = workspaces
      .filter(ws => activeWorkspaces.includes(ws.cr4a1_calendarios_workspacesid))
      .map(ws => ws.cr4a1_cor_hex || '#3498db');

    if (activeWSColors.length === 0 && defaultWorkspaceId) {
      const defWS = workspaces.find(w => w.cr4a1_calendarios_workspacesid === defaultWorkspaceId);
      if (defWS) activeWSColors.push(defWS.cr4a1_cor_hex || '#3498db');
    }

    if (activeWSColors.length === 1) {
      return { border: `1px solid ${activeWSColors[0]}`, overflow: 'visible' };
    } else if (activeWSColors.length > 1) {
      return {
        padding: '1.5px',
        background: `linear-gradient(135deg, ${activeWSColors.join(', ')})`,
        borderRadius: '16px',
        overflow: 'visible'
      };
    }
    return { border: '1px solid var(--border-color)', overflow: 'visible' };
  };

  const wsBorderStyle = getWorkspaceBorderStyle();

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}
      >
        <Toaster position="bottom-center" />

        {isSidebarOpen && (
          <div onClick={() => setIsSidebarOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 3000, backdropFilter: 'blur(4px)', transition: 'opacity 0.3s' }} />
        )}

        <div style={{
          position: 'fixed', top: 0, left: 0, height: '100vh', width: '320px', maxWidth: '85vw', backgroundColor: 'var(--bg-primary)', zIndex: 3100,
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          borderRight: '1px solid var(--border-color)', overflowY: 'auto', display: 'flex', flexDirection: 'column',
          borderTopRightRadius: '24px', borderBottomRightRadius: '24px', boxShadow: isSidebarOpen ? '4px 0 24px rgba(0,0,0,0.1)' : 'none'
        }}>
          <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h1 className="logo" style={{ margin: 0, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--text-accent)' }}>calendar_month</span> Kairós
              </h1>
              <button onClick={() => setIsSidebarOpen(false)} className="icon-btn" style={{ color: 'var(--text-primary)' }}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {viewsConfig.map(v => (
                <button key={v.id} onClick={() => { setView(v.id); setIsSidebarOpen(false); }} className="nav-pill" style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '15px', justifyContent: 'flex-start',
                  fontWeight: view === v.id ? '700' : '500', backgroundColor: view === v.id ? 'var(--bg-tertiary)' : 'transparent', color: view === v.id ? 'var(--text-accent)' : 'var(--text-primary)', transition: 'all 0.2s'
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>{v.icon}</span> {v.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Cor do Tema</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                {materialColors.map(c => (
                  <div key={c.id} onClick={() => setAccentColor(c.hex)} style={{
                    width: '36px', height: '36px', borderRadius: '50%', backgroundColor: c.hex, cursor: 'pointer', margin: 'auto',
                    border: accentColor === c.hex ? '3px solid var(--bg-primary)' : 'none',
                    boxShadow: accentColor === c.hex ? `0 0 0 2px ${c.hex}` : '0 2px 5px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s',
                    transform: accentColor === c.hex ? 'scale(1.15)' : 'scale(1)'
                  }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Pesquisa</div>
              <input placeholder="Buscar evento..." value={filters.text} onChange={e => setFilters({ ...filters, text: e.target.value })} style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Workspaces</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {workspaces.map(ws => (
                  <div key={ws.cr4a1_calendarios_workspacesid} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <label style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', padding: '8px 10px', borderRadius: '12px',
                      backgroundColor: activeWorkspaces.includes(ws.cr4a1_calendarios_workspacesid) ? 'var(--bg-tertiary)' : 'transparent',
                    }}>
                      <input
                        type="checkbox"
                        checked={activeWorkspaces.includes(ws.cr4a1_calendarios_workspacesid)}
                        onChange={() => toggleWorkspaceFilter(ws.cr4a1_calendarios_workspacesid)}
                        style={{ accentColor: ws.cr4a1_cor_hex || 'var(--text-accent)', width: '18px', height: '18px' }}
                      />
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: ws.cr4a1_cor_hex || '#3498db' }}></div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--text-primary)' }}>{ws.cr4a1_nome}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{ws.cr4a1_tipo_workspace}</span>
                      </div>
                    </label>
                    <button
                      onClick={() => handleSetDefaultWorkspace(ws.cr4a1_calendarios_workspacesid)}
                      className="icon-btn"
                      title="Definir como padrão"
                      style={{ color: defaultWorkspaceId === ws.cr4a1_calendarios_workspacesid ? 'var(--text-accent)' : 'var(--border-color)', background: 'transparent' }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                        {defaultWorkspaceId === ws.cr4a1_calendarios_workspacesid ? 'star' : 'star_outline'}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Pesquisa</div>
              <input
                placeholder="Buscar colega..."
                value={userSearchTerm}
                onChange={e => setUserSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', marginBottom: '16px', outline: 'none' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                {allUsers.filter(u => {
                  const matchesSearch = u.cr4a1_username.toLowerCase().includes(userSearchTerm.toLowerCase());
                  if (userRole === 'COMUM') return matchesSearch && u.cr4a1_unidade === currentUser.cr4a1_unidade;
                  return matchesSearch;
                }).map(u => (
                  <label key={u.cr4a1_username} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked={filters.users.includes(u.cr4a1_username)} onChange={() => toggleFilter('users', u.cr4a1_username)} style={{ accentColor: u.cr4a1_cor || 'var(--text-accent)' }} />
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: u.cr4a1_cor || '#3498db' }}></div>
                    <span style={{ flex: 1 }}>{u.cr4a1_username}</span>
                    <span style={{ fontSize: '10px', opacity: 0.6 }}>{u.cr4a1_unidade}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Tipos de Eventos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {eventTypes.map(t => (
                  <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                    <input type="checkbox" checked={filters.types.includes(t.name)} onChange={() => toggleFilter('types', t.name)} style={{ accentColor: 'var(--text-accent)', width: '18px', height: '18px' }} />
                    <span>{t.emoji} {t.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {(filters.text || filters.users.length > 0 || filters.types.length > 0) && (
              <button onClick={() => setFilters({ text: '', users: [], types: [] })} className="btn-secondary" style={{ width: '100%', borderRadius: '16px' }}>Limpar Filtros</button>
            )}
          </div>
        </div>

        <header className={`app-header ${isScrolled ? 'scrolled' : ''}`}>
          <nav className="nav-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="nav-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button onClick={() => setIsSidebarOpen(true)} className="icon-btn" style={{ color: 'var(--text-primary)' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>menu</span>
              </button>
              <h1 className="logo" onClick={() => { setView('month'); setCurrentDate(new Date()); }} style={{ cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--text-accent)', fontSize: '28px' }}>calendar_month</span>
                <span className="nav-label">Kairós</span>
              </h1>
              <select
                value={view}
                onChange={(e) => setView(e.target.value)}
                style={{
                  appearance: 'none', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '6px 30px 6px 14px', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer',
                  backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%235f6368%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px top 50%', backgroundSize: '10px auto', transition: 'all 0.2s'
                }}
              >
                {viewsConfig.map(v => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            </div>

            <div className="nav-right">
              <div className="nav-group">
                <button onClick={() => handleNavigate('prev')} className="icon-btn">
                  <span className="material-symbols-rounded">chevron_left</span>
                </button>
                <button onClick={() => setCurrentDate(new Date())} className="nav-pill"><span>Hoje</span></button>
                <button onClick={() => handleNavigate('next')} className="icon-btn">
                  <span className="material-symbols-rounded">chevron_right</span>
                </button>
              </div>
              <div className="nav-group">
                <button onClick={requestNotificationPermission} className="icon-btn" title="Ativar Notificações">
                  <span className="material-symbols-rounded">notifications</span>
                </button>
                <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="icon-btn">
                  <span className="material-symbols-rounded">{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
                </button>
                {(userRole === 'ADMIN' || userRole === 'SECRETARIA') && (
                  <button onClick={() => setIsUserManagementModalOpen(true)} className="icon-btn" title="Gerenciar Usuários">
                    <span className="material-symbols-rounded">group</span>
                  </button>
                )}
                <div
                  onClick={() => setIsProfileModalOpen(true)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary)', borderRadius: '32px', padding: '6px 14px 6px 8px', border: '1px solid var(--border-color)', fontSize: '13px', fontWeight: '500' }}
                >
                  <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--text-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>{user?.[0]?.toUpperCase()}</span>
                  <span className="nav-label" style={{ color: 'var(--text-primary)' }}>{user}</span>
                </div>
                <button onClick={logout} className="icon-btn" title="Sair do sistema" style={{ color: '#e74c3c', marginLeft: '4px' }}>
                  <span className="material-symbols-rounded">logout</span>
                </button>
              </div>
            </div>
          </nav>

          <div className="header-secondary-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '10px', position: 'relative', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
              <span className="month-name" style={{ fontSize: '20px', color: 'var(--text-title)', fontWeight: '400', textTransform: 'capitalize', textAlign: 'center' }}>
                {format(currentDate, view === 'day' ? "EEEE, d 'de' MMMM" : 'MMMM', { locale: ptBR })}
              </span>
              <span onClick={() => setIsYearSelectorOpen(!isYearSelectorOpen)} className="year-pill" style={{ cursor: 'pointer', fontSize: '20px', color: 'var(--text-secondary)' }}>
                {format(currentDate, 'yyyy')} <span style={{ fontSize: '12px', opacity: 0.5 }}>▼</span>
              </span>
              {view === 'day' && (
                <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '20px', padding: '2px', marginLeft: '12px', border: '1px solid var(--border-color)' }}>
                  <button onClick={() => setDayViewMode('timeline')} style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '18px', border: 'none', background: dayViewMode === 'timeline' ? 'var(--text-accent)' : 'transparent', color: dayViewMode === 'timeline' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}>Linhas</button>
                  <button onClick={() => setDayViewMode('cards')} style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '18px', border: 'none', background: dayViewMode === 'cards' ? 'var(--text-accent)' : 'transparent', color: dayViewMode === 'cards' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}>Cartões</button>
                </div>
              )}
            </div>
            {isYearSelectorOpen && (
              <div style={{ position: 'absolute', top: '40px', zIndex: 2000, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', width: '280px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {Array.from({ length: 16 }, (_, i) => {
                  const year = currentDate.getFullYear() - 7 + i;
                  return <button key={year} onClick={() => { setCurrentDate(new Date(year, currentDate.getMonth(), 1)); setIsYearSelectorOpen(false); }} className="nav-pill" style={{ padding: '10px 0', borderRadius: '8px', border: 'none', backgroundColor: year === currentDate.getFullYear() ? 'var(--text-accent)' : 'transparent', color: year === currentDate.getFullYear() ? 'white' : 'var(--text-primary)', cursor: 'pointer' }}>{year}</button>;
                })}
              </div>
            )}
          </div>
        </header>

        <main className="main-container view-enter" key={view} style={{ flex: 1, padding: ['day', '3days', 'week'].includes(view) ? '0' : '16px', overflow: 'visible' }}>

          {view === 'year' && (
            <div className="mini-month-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', overflow: 'visible' }}>
              {Array.from({ length: 12 }, (_, i) => {
                const monthDate = new Date(currentDate.getFullYear(), i, 1);
                const activeWSForGradient = workspaces.filter(w => activeWorkspaces.includes(w.cr4a1_calendarios_workspacesid));

                return (
                  <div key={i} style={{
                    ...(activeWSForGradient.length > 1 ? {
                      background: `linear-gradient(135deg, ${activeWSForGradient.map(w => w.cr4a1_cor_hex || '#3498db').join(', ')})`,
                      padding: '1.5px',
                      borderRadius: '16px'
                    } : {}),
                    overflow: 'visible'
                  }}>
                    <div style={{
                      ...(activeWSForGradient.length <= 1 ? wsBorderStyle : { border: 'none' }),
                      borderRadius: '14px',
                      background: 'var(--bg-primary)',
                      height: '100%',
                      overflow: 'visible'
                    }}>
                      <MiniMonth
                        monthDate={monthDate}
                        onSelectMonth={(d) => { setCurrentDate(d); setView('month'); }}
                        getEventsForDay={getEventsForDay}
                        holidays={holidays}
                        allUsers={allUsers}
                        onEditEvent={handleEditClick}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === 'month' && (
            <div className="responsive-grid-container" style={{ overflow: 'visible' }}>
              <div style={{
                ...(activeWorkspaces.length > 1 ? {
                  background: `linear-gradient(135deg, ${workspaces.filter(w => activeWorkspaces.includes(w.cr4a1_calendarios_workspacesid)).map(w => w.cr4a1_cor_hex || '#3498db').join(', ')})`,
                  padding: '1.5px',
                  borderRadius: '24px'
                } : {}),
                overflow: 'visible'
              }}>
                <div className="calendar-month-grid" style={{
                  ...(activeWorkspaces.length <= 1 ? wsBorderStyle : { border: 'none' }),
                  background: 'var(--bg-primary)',
                  borderRadius: '22px',
                  overflow: 'visible'
                }}>
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <b key={i} style={{ textAlign: 'center', color: (i === 0 || i === 6) ? '#e74c3c' : 'var(--text-secondary)', fontWeight: '600', padding: '10px 0', fontSize: '12px' }}>{d}</b>)}
                  {generateMonthDays(currentDate).map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
                    const dayEvents = getDisplayEvents().filter(e => e.cr4a1_data_inicio === dateStr);
                    return (
                      <DroppableDay key={day.toString()} dateStr={dateStr} isToday={isToday} onClick={() => { setCurrentDate(day); setView('day'); }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: isToday ? 'var(--text-accent)' : 'transparent', color: isToday ? 'white' : 'var(--text-primary)', fontWeight: isToday ? '700' : '500', fontSize: '12px', marginBottom: '4px' }}>{format(day, 'd')}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflow: 'hidden', padding: '0 2px' }}>
                          {dayEvents.map(e => (
                            <DraggableEvent key={e.cr4a1_agenda_kairosid} event={e}>
                              <div className="event-badge" style={{ background: getEventColor(e), color: 'white', borderRadius: '4px', padding: '2px 4px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '10px' }}>
                                {!e.cr4a1_dia_inteiro && <span style={{ fontWeight: '700', marginRight: '3px' }}>{e.cr4a1_hora_inicio}</span>} {e.cr4a1_privado ? '🔒 ' : ''}{e.cr4a1_titulo}
                              </div>
                            </DraggableEvent>
                          ))}
                        </div>
                      </DroppableDay>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {view === 'list' && <ListView events={getDisplayEvents()} allUsers={allUsers} eventTypes={eventTypes} onEdit={handleEditClick} onDelete={(e) => { setEventToDelete(e); setIsDeleteModalOpen(true); }} />}

          {['day', '3days', 'week'].includes(view) && (
            <DayView
              selectedDate={currentDate}
              viewType={view}
              getEventsForDay={getEventsForDay}
              holidays={holidays}
              allUsers={allUsers}
              onEdit={handleEditClick}
              dayViewMode={dayViewMode}
            />
          )}
        </main>

        <div style={{ position: 'relative', zIndex: 9999 }}>
          {isModalOpen && <EventModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveEvent}
            initialDate={currentDate.toISOString()}
            editingEvent={editingEvent}
            userRole={userRole}
            allUsers={allUsers}
            eventTypes={eventTypes}
            viewedUser={viewedUser}
            workspaces={workspaces}
          />}
          {isUserManagementModalOpen && <UserManagementModal isOpen={isUserManagementModalOpen} onClose={() => setIsUserManagementModalOpen(false)} allUsers={allUsers} updateUserColor={updateUserColor} eventTypes={eventTypes} addEventType={addEventType} deleteEventType={deleteEventType} />}
          {isDeleteModalOpen && <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} eventTitle={eventToDelete?.cr4a1_titulo} />}
          {isWorkspaceModalOpen && <WorkspaceModal isOpen={isWorkspaceModalOpen} onClose={() => setIsWorkspaceModalOpen(false)} onSave={addWorkspace} />}

          {isProfileModalOpen && (
            <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(6px)' }}>
              {/* TAMANHO DO CONTAINER DO PERFIL AJUSTADO PARA RESPONSIVIDADE */}
              <div className="modal-content" style={{ maxWidth: '450px', width: '100%', backgroundColor: 'var(--bg-primary)', padding: '28px', borderRadius: '32px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>Meu Perfil</h2>
                  <button onClick={() => setIsProfileModalOpen(false)} className="icon-btn" style={{ background: 'var(--bg-tertiary)', borderRadius: '12px' }}><span className="material-symbols-rounded">close</span></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {(() => {
                    const currentUserData = allUsers.find(u => u.cr4a1_username === user);
                    return currentUserData ? (<WhatsAppInput userId={currentUserData.cr4a1_usuarios_agendaid} initialValue={currentUserData.cr4a1_whatsapp} onSave={updateWhatsApp} />) : null;
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        {(userRole === 'ADMIN' || userRole === 'SECRETARIA' || userRole === 'DIRETORIA') && (
          <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 500 }}>
            {isFabMenuOpen && (
              <div style={{ position: 'absolute', bottom: '80px', right: '0', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-end', minWidth: '180px' }}>
                <div className="view-enter" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--text-primary)' }}>Evento</span>
                  <button onClick={() => { setEditingEvent(null); setIsModalOpen(true); setIsFabMenuOpen(false); }} style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <span className="material-symbols-rounded">calendar_add_on</span>
                  </button>
                </div>
                <div className="view-enter" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--text-primary)' }}>Workspace</span>
                  <button onClick={() => { setIsWorkspaceModalOpen(true); setIsFabMenuOpen(false); }} style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <span className="material-symbols-rounded">workspaces</span>
                  </button>
                </div>
              </div>
            )}
            <button
              className="fab-btn"
              onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
              style={{
                width: '60px', height: '60px', borderRadius: '20px', background: isFabMenuOpen ? 'var(--bg-secondary)' : 'var(--text-accent)',
                color: isFabMenuOpen ? 'var(--text-primary)' : 'white', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '32px', transform: isFabMenuOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s' }}>
                {isFabMenuOpen ? 'close' : 'add'}
              </span>
            </button>
          </div>
        )}
      </div>
    </DndContext>
  );
}

export default App;