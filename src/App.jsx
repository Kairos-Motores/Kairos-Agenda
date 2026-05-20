import React, { useState, useEffect, useRef, useMemo } from 'react';
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

const BirthdayCelebration = ({ name, onClose }) => (
  <div className="view-enter" style={{ position: 'fixed', inset: 0, zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <div className="birthday-float" style={{ fontSize: '80px', marginBottom: '20px' }}>🎂</div>
      <h1 style={{ color: 'white', fontSize: '32px', margin: '0 0 10px' }}>Parabéns, {name}! 🥳</h1>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '18px', marginBottom: '30px' }}>A equipa Kairós deseja-te um dia incrível!</p>
      <button onClick={onClose} className="btn-primary boing-effect" style={{ padding: '12px 32px' }}>Obrigado!</button>
    </div>
    <style>{`
      @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-20px); } 100% { transform: translateY(0px); } }
      .birthday-float { animation: float 3s ease-in-out infinite; }
    `}</style>
  </div>
);

const countryCodes = [
  { code: '+55', flag: '🇧🇷', name: 'Brasil' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+1', flag: '🇺🇸', name: 'EUA' },
  { code: '+44', flag: '🇬🇧', name: 'Reino Unido' },
  { code: '+34', flag: '🇪🇸', name: 'Espanha' }
];

const compressImage = (file, callback) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (event) => {
    const img = new Image();
    img.src = event.target.result;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 400;
      const MAX_HEIGHT = 400;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const dataurl = canvas.toDataURL('image/jpeg', 0.7);
      callback(dataurl);
    };
  };
};

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
      <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-primary)', margin: 0 }}>
          <strong>Para receber alertas no WhatsApp:</strong><br />
          1. Guarda o teu número abaixo.<br />
          2. Clica no botão verde abaixo para abrir o robô.<br />
          3. Envia <strong>"Olá"</strong> para iniciar o vínculo.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
          O Teu Número
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={selectedCountry.code}
            onChange={(e) => setSelectedCountry(countryCodes.find(c => c.code === e.target.value))}
            style={{
              padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '16px', outline: 'none', flex: '0 0 auto'
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
              flex: '1 1 120px', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', minWidth: '0'
            }}
          />

          <button
            onClick={() => onSave(userId, `${selectedCountry.code.replace('+', '')}${phoneNumber}`)}
            className="icon-btn boing-effect"
            style={{ background: 'var(--text-accent)', color: 'white', width: '48px', height: '48px', borderRadius: '12px', flex: '0 0 auto' }}
          >
            <span className="material-symbols-rounded">save</span>
          </button>
        </div>
      </div>

      <a
        href="https://wa.me/5591933005886"
        target="_blank"
        rel="noopener noreferrer"
        className="boing-effect"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px', borderRadius: '16px',
          background: '#25D366', color: 'white', textDecoration: 'none', fontWeight: '700', fontSize: '14px',
          boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)'
        }}
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
  return <div ref={setNodeRef} style={{...style, minWidth: 0, width: '100%', boxSizing: 'border-box'}} {...listeners} {...attributes}>{children}</div>;
};

const DroppableDay = ({ dateStr, children, isToday, onClick }) => {
  const { setNodeRef, isOver } = useDroppable({ id: dateStr });
  return (
    <div 
      ref={setNodeRef} 
      onClick={onClick} 
      className={`calendar-day-card ${isOver ? 'drop-over' : ''} ${isToday ? 'today' : ''}`} 
      style={{ overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column', opacity: 1 }}
    >
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
      toast.error(result.reason === 'connection_error' ? 'Erro de conexão.' : 'Utilizador ou senha inválidos.', { style: { borderRadius: '32px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '12px 24px' } });
      setIsAuthenticating(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-page)' }}>
      <form onSubmit={handleSubmit} style={{ padding: '40px', background: 'var(--bg-primary)', borderRadius: '16px', boxShadow: 'var(--shadow-hover)', width: '350px' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--text-title)', marginBottom: '30px', fontWeight: '600' }}>Kairós Agenda</h2>
        <input type="text" placeholder="Utilizador" value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid var(--border-strong)', boxSizing: 'border-box', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s' }} />
        <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '25px', borderRadius: '8px', border: '1px solid var(--border-strong)', boxSizing: 'border-box', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s' }} />
        <button type="submit" disabled={isAuthenticating} className="boing-effect" style={{ width: '100%', padding: '12px', background: 'var(--text-accent)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
          {isAuthenticating ? 'A validar...' : 'Entrar'}
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
        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '14px' }}>Seleciona a tua unidade para configurares o teu perfil:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
          {units.map(unit => (
            <button key={unit} onClick={() => setSelectedUnit(unit)} className="boing-effect" style={{ padding: '14px', borderRadius: '12px', border: selectedUnit === unit ? '2px solid var(--text-accent)' : '1px solid var(--border-color)', background: selectedUnit === unit ? 'var(--bg-tertiary)' : 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: selectedUnit === unit ? '700' : '500' }}>{unit}</button>
          ))}
        </div>
        <button disabled={!selectedUnit} onClick={() => onSaveUnit(selectedUnit)} className="btn-primary boing-effect" style={{ width: '100%', padding: '16px', opacity: selectedUnit ? 1 : 0.5 }}>Confirmar e Entrar</button>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---

function App() {
  const {
    view, setView, currentDate, setCurrentDate, holidays, events, addEvent, updateEvent, deleteEvent, notification,
    getEventsForDay, next, prev, user, userRole, viewedUser, setViewedUser, allUsers, eventTypes, addEventType, deleteEventType, login, logout, loading, isValidatingSession, updateUserColor, filters, setFilters, filteredEvents, moveEvent,
    updateWhatsApp, addWorkspace, updateUnit, updateProfile,
    workspaces, activeWorkspaces, toggleWorkspaceFilter
  } = useCalendar();

  const viewsConfig = useMemo(() => [
    { id: 'year', label: 'Ano', icon: 'calendar_view_month' },
    { id: 'month', label: 'Mês', icon: 'calendar_month' },
    { id: 'week', label: 'Semana', icon: 'view_week' },
    { id: '3days', label: '3 Dias', icon: 'view_timeline' },
    { id: 'day', label: 'Dia', icon: 'view_day' }
  ], []);

  const handleDragEnd = (e) => {
    if (e.over && e.active.id !== e.over.id) moveEvent(e.active.id, e.over.id);
  };

  const notifiedRef = useRef(new Set());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  const [isYearSelectorOpen, setIsYearSelectorOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dayViewMode, setDayViewMode] = useState('timeline');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('kairos_accent_color') || '#1a73e8');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showBirthday, setShowBirthday] = useState(false);
  const [isTaskView, setIsTaskView] = useState(false);

  const [defaultWorkspaceId, setDefaultWorkspaceId] = useState(() => localStorage.getItem('kairos_default_workspace'));
  const [isScrolled, setIsScrolled] = useState(false);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 5 } })
  );

  const taskEvents = useMemo(() => {
    const devWorkspace = workspaces.find(ws => ws.cr4a1_nome === "Desenvolvimento e Inovação");
    if (!devWorkspace) return [];
    return events.filter(e => e.cr4a1_workspace_id === devWorkspace.cr4a1_calendarios_workspacesid);
  }, [events, workspaces]);

  const handleToggleSubtask = async (task, index) => {
    try {
        const subtasks = task.cr4a1_subtasks ? (typeof task.cr4a1_subtasks === 'string' ? JSON.parse(task.cr4a1_subtasks) : task.cr4a1_subtasks) : [];
        const updatedSubtasks = [...subtasks];
        updatedSubtasks[index].completed = !updatedSubtasks[index].completed;

        const cleanStartDate = task.cr4a1_data_inicio ? task.cr4a1_data_inicio.split('T')[0] : '';
        const cleanEndDate = task.cr4a1_data_fim ? task.cr4a1_data_fim.split('T')[0] : cleanStartDate;

        await updateEvent({
            ...task,
            cr4a1_subtasks: JSON.stringify(updatedSubtasks),
            title: task.cr4a1_titulo,
            details: task.cr4a1_detalhes || task.cr4a1_descricao || '',
            startDate: cleanStartDate,
            endDate: cleanEndDate,
            startHour: task.cr4a1_hora_inicio || '08:00',
            endHour: task.cr4a1_hora_fim || '09:00',
            allDay: task.cr4a1_dia_inteiro,
            targetUser: task.cr4a1_user_login,
            workspaceId: task.cr4a1_workspace_id
        });

        if (updatedSubtasks[index].completed) {
            toast.success(`Check! ${updatedSubtasks[index].text} concluído.`, { icon: '✅' });
        }
    } catch (error) {
        toast.error("Erro ao atualizar subtarefa.");
        console.error(error);
    }
  };

  const minSwipeDistance = 50;

  useEffect(() => {
    if (user && allUsers.length > 0) {
      const currentUserData = allUsers.find(u => u.cr4a1_username === user);
      if (currentUserData?.cr4a1_aniversario) {
        const today = format(new Date(), 'MM-dd');
        const birthday = currentUserData.cr4a1_aniversario.substring(5, 10);
        const sessionCelebrated = sessionStorage.getItem('kairos_birthday_celebrated');
        if (today === birthday && !sessionCelebrated) {
          setShowBirthday(true);
          sessionStorage.setItem('kairos_birthday_celebrated', 'true');
        }
      }
    }
  }, [user, allUsers]);

  useEffect(() => {
    const checkNotifications = () => {
      if (Notification.permission !== 'granted') return;
      const now = new Date();
      const milestones = [30, 15, 5, 0];
      events.forEach(event => {
        if (event.cr4a1_dia_inteiro || !event.cr4a1_hora_inicio) return;
        const [year, month, day] = event.cr4a1_data_inicio.split('T')[0].split('-').map(Number);
        const [hours, minutes] = event.cr4a1_hora_inicio.split(':').map(Number);
        const eventDate = new Date(year, month - 1, day, hours, minutes, 0);
        const diffMs = eventDate - now;
        const diffMin = Math.floor(diffMs / 60000);

        if (milestones.includes(diffMin)) {
          const notificationKey = `${event.cr4a1_agenda_kairosid}_${diffMin}`;
          if (!notifiedRef.current.has(notificationKey)) {
            const title = `📌 ${event.cr4a1_titulo}`;
            const options = {
              body: diffMin === 0 ? "A começar agora!" : `Em ${diffMin} minutes.`,
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
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
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
      <span style={{ fontSize: '48px' }}>📅</span><p style={{ color: 'var(--text-secondary)' }}>A verificar sessão...</p>
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
            body: 'As notificações estão a funcionar perfeitamente!',
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
      toast.success("Guardado com sucesso!");
      setIsModalOpen(false);
    } catch (err) { toast.error("Falha ao guardar."); throw err; }
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await deleteEvent(eventToDelete.cr4a1_agenda_kairosid, eventToDelete.cr4a1_user_login);
      toast.success("Eliminado."); setIsDeleteModalOpen(false); setEventToDelete(null);
    } catch (err) { toast.error("Falha ao eliminar."); }
  };

  const handleEditClick = (event) => {
    if (userRole === 'SECRETARIA' || userRole === 'COORD' || userRole === 'ADMIN' || event.cr4a1_user_login === user) {
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

  const toggleFilter = (type, value) => {
    setFilters(prev => {
        const currentList = [...prev[type]];
        const index = currentList.indexOf(value);
        if (index > -1) currentList.splice(index, 1);
        else currentList.push(value);
        return { ...prev, [type]: currentList };
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}
      >
        <Toaster position="bottom-center" />

        {showBirthday && <BirthdayCelebration name={currentUser?.cr4a1_nome_exibicao || user} onClose={() => setShowBirthday(false)} />}

        {isSidebarOpen && (
          <div onClick={() => setIsSidebarOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 3000, backdropFilter: 'blur(4px)', transition: 'opacity 0.3s' }} />
        )}

        {/* SIDEBAR ESQUERDA (MENU) */}
        <div style={{
          position: 'fixed', top: 0, left: 0, height: '100vh', width: '320px', maxWidth: '85vw', backgroundColor: 'var(--bg-primary)', zIndex: 3100,
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          borderRight: '1px solid var(--border-color)', overflowY: 'auto', display: 'flex', flexDirection: 'column',
          borderTopRightRadius: '24px', borderBottomRightRadius: '24px', boxShadow: isSidebarOpen ? '4px 0 24px rgba(0,0,0,0.1)' : 'none'
        }}>
          <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h1 className="logo" style={{ margin: 0, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--text-accent)' }}>calendar_month</span> Kairós
              </h1>
              <button onClick={() => setIsSidebarOpen(false)} className="icon-btn" style={{ color: 'var(--text-primary)' }}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            {['DIRETORIA', 'ADMIN', 'COORD', 'SECRETARIA'].includes(userRole) && (
              <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Modo de Visualização</div>
                <button onClick={() => { setIsTaskView(false); setIsSidebarOpen(false); }} className="nav-pill boing-effect" style={{ 
                  justifyContent: 'flex-start', gap: '12px', width: '100%', padding: '14px', borderRadius: '100px', border: 'none', cursor: 'pointer',
                  backgroundColor: !isTaskView ? 'var(--bg-tertiary)' : 'transparent',
                  color: !isTaskView ? 'var(--text-accent)' : 'var(--text-primary)'
                }}>
                  <span className="material-symbols-rounded">calendar_month</span> Agenda
                </button>
                <button onClick={() => { setIsTaskView(true); setIsSidebarOpen(false); }} className="nav-pill boing-effect" style={{ 
                  justifyContent: 'flex-start', gap: '12px', width: '100%', padding: '14px', borderRadius: '100px', border: 'none', cursor: 'pointer',
                  backgroundColor: isTaskView ? 'var(--bg-tertiary)' : 'transparent',
                  color: isTaskView ? 'var(--text-accent)' : 'var(--text-primary)'
                }}>
                  <span className="material-symbols-rounded">assignment</span> Tarefas
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Vistas do Calendário</div>
              {viewsConfig.map(v => (
                <button key={v.id} onClick={() => { setView(v.id); setIsSidebarOpen(false); setIsTaskView(false); }} className="nav-pill boing-effect" style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '15px', justifyContent: 'flex-start',
                  fontWeight: (view === v.id && !isTaskView) ? '700' : '500', backgroundColor: (view === v.id && !isTaskView) ? 'var(--bg-tertiary)' : 'transparent', color: (view === v.id && !isTaskView) ? 'var(--text-accent)' : 'var(--text-primary)', transition: 'all 0.2s'
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>{v.icon}</span> {v.label}
                </button>
              ))}
              <button onClick={() => { setView('list'); setIsSidebarOpen(false); setIsTaskView(false); }} className="nav-pill boing-effect" style={{
                display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '15px', justifyContent: 'flex-start',
                fontWeight: (view === 'list' && !isTaskView) ? '700' : '500', backgroundColor: (view === 'list' && !isTaskView) ? 'var(--bg-tertiary)' : 'transparent', color: (view === 'list' && !isTaskView) ? 'var(--text-accent)' : 'var(--text-primary)', transition: 'all 0.2s'
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>view_agenda</span> Fichas
              </button>
            </div>
          </div>

          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Cor do Tema</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                {materialColors.map(c => (
                  <div key={c.id} onClick={() => setAccentColor(c.hex)} className="boing-effect" style={{
                    width: '36px', height: '36px', borderRadius: '50%', backgroundColor: c.hex, cursor: 'pointer', margin: 'auto',
                    border: accentColor === c.hex ? '3px solid var(--bg-primary)' : 'none',
                    boxShadow: accentColor === c.hex ? `0 0 0 2px ${c.hex}` : '0 2px 5px rgba(0,0,0,0.1)',
                    transform: accentColor === c.hex ? 'scale(1.15)' : 'scale(1)'
                  }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Pesquisa</div>
              <input placeholder="Procurar evento..." value={filters.text} onChange={e => setFilters({ ...filters, text: e.target.value })} style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }} />
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
                      className="icon-btn boing-effect"
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
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Colegas de Equipa</div>
              <input
                placeholder="Procurar colega..."
                value={userSearchTerm}
                onChange={e => setUserSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', marginBottom: '16px', outline: 'none' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                {allUsers.filter(u => {
                  const matchesSearch = u.cr4a1_username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                        (u.cr4a1_nome_exibicao && u.cr4a1_nome_exibicao.toLowerCase().includes(userSearchTerm.toLowerCase()));
                  
                  if (userRole === 'COMUM') return matchesSearch && u.cr4a1_unidade === currentUser.cr4a1_unidade;
                  return matchesSearch;
                }).map(u => (
                  <label key={u.cr4a1_username} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '14px', padding: '4px 0' }}>
                    <input 
                      type="checkbox" 
                      checked={filters.users.includes(u.cr4a1_username)} 
                      onChange={() => toggleFilter('users', u.cr4a1_username)} 
                      style={{ accentColor: u.cr4a1_cor || 'var(--text-accent)' }} 
                    />
                    
                    {u.cr4a1_foto ? (
                      <img 
                        src={u.cr4a1_foto} 
                        alt={u.cr4a1_username}
                        style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border-color)' }} 
                      />
                    ) : (
                      <div 
                        style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: u.cr4a1_cor || '#3498db', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: '700' }}
                      >
                        {u.cr4a1_username?.[0]?.toUpperCase()}
                      </div>
                    )}
                    
                    <span style={{ flex: 1, color: 'var(--text-primary)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.cr4a1_nome_exibicao || u.cr4a1_username}
                    </span>
                    
                    <span style={{ fontSize: '10px', opacity: 0.6, backgroundColor: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>
                      {u.cr4a1_unidade}
                    </span>
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
              <button onClick={() => setFilters({ text: '', users: [], types: [] })} className="btn-secondary boing-effect" style={{ width: '100%', borderRadius: '16px' }}>Limpar Filtros</button>
            )}
          </div>
        </div>

        {/* HEADER FLEXÍVEL E INTELIGENTE */}
        <header className={`app-header ${isScrolled ? 'scrolled' : ''}`}>
          
          <div className="header-left">
            <button onClick={() => setIsSidebarOpen(true)} className="icon-btn boing-effect" style={{ color: 'var(--text-primary)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>menu</span>
            </button>
            <h1 className="logo boing-effect" onClick={() => { setView('month'); setCurrentDate(new Date()); setIsTaskView(false); }} style={{ cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--text-accent)', fontSize: '28px' }}>calendar_month</span>
              <span className="nav-label-collapse">Kairós</span>
            </h1>
            
            <div className="segmented-views" style={{
              display: 'inline-flex', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              borderRadius: '100px', padding: '4px', alignItems: 'center', gap: '2px', boxSizing: 'border-box'
            }}>
              {viewsConfig.map(v => {
                const isActive = view === v.id && !isTaskView;
                return (
                  <button
                    key={v.id}
                    onClick={() => { setView(v.id); setIsTaskView(false); }}
                    className="boing-effect"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '100px', border: 'none',
                      background: isActive ? 'var(--text-accent)' : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--text-primary)',
                      fontSize: '13px', fontWeight: isActive ? '700' : '500', cursor: 'pointer', whiteSpace: 'nowrap'
                    }}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '18px', color: isActive ? '#ffffff' : 'inherit' }}>{v.icon}</span>
                    <span className="nav-label-collapse">{v.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => { setView('list'); setIsTaskView(false); }}
              className="boing-effect"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '100px',
                border: (view === 'list' && !isTaskView) ? '1px solid var(--text-accent)' : '1px solid var(--border-color)',
                background: (view === 'list' && !isTaskView) ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                color: (view === 'list' && !isTaskView) ? 'var(--text-accent)' : 'var(--text-primary)',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer'
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>view_agenda</span>
              <span className="nav-label-collapse">Fichas</span>
            </button>
          </div>

          <div className="header-profile">
            <div
              onClick={() => setIsProfileModalOpen(true)}
              className="boing-effect"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', borderRadius: '32px', padding: '4px 12px 4px 4px', border: '1px solid var(--border-color)', fontSize: '13px', fontWeight: '500' }}
            >
              {currentUser?.cr4a1_foto ? (
                <img src={currentUser.cr4a1_foto} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
              ) : (
                <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--text-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                  {user?.[0]?.toUpperCase()}
                </span>
              )}
              <span style={{ color: 'var(--text-primary)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                {currentUser?.cr4a1_nome_exibicao || user}
              </span>
            </div>
            <button onClick={logout} className="icon-btn boing-effect" title="Sair do sistema" style={{ color: '#e74c3c' }}>
              <span className="material-symbols-rounded">logout</span>
            </button>
          </div>

          <div className="header-bottom">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => handleNavigate('prev')} className="icon-btn boing-effect">
                <span className="material-symbols-rounded">chevron_left</span>
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="nav-pill boing-effect"><span>Hoje</span></button>
              <button onClick={() => handleNavigate('next')} className="icon-btn boing-effect">
                <span className="material-symbols-rounded">chevron_right</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px', color: 'var(--text-title)', fontWeight: '400', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                {format(currentDate, view === 'day' ? "EEEE, d 'de' MMMM" : 'MMMM', { locale: ptBR })}
              </span>
              <span onClick={() => setIsYearSelectorOpen(!isYearSelectorOpen)} style={{ cursor: 'pointer', fontSize: '20px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {format(currentDate, 'yyyy')} <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>arrow_drop_down</span>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={requestNotificationPermission} className="icon-btn boing-effect" title="Ativar Notificações">
                <span className="material-symbols-rounded">notifications</span>
              </button>
              <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="icon-btn boing-effect">
                <span className="material-symbols-rounded">{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
              </button>
              {(userRole === 'ADMIN' || userRole === 'SECRETARIA') && (
                <button onClick={() => setIsUserManagementModalOpen(true)} className="icon-btn boing-effect" title="Gerir Utilizadores">
                  <span className="material-symbols-rounded">group</span>
                </button>
              )}
            </div>

            {!isTaskView && view === 'day' && (
              <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '20px', padding: '2px', border: '1px solid var(--border-color)' }}>
                <button onClick={() => setDayViewMode('timeline')} className="boing-effect" style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '18px', border: 'none', background: dayViewMode === 'timeline' ? 'var(--text-accent)' : 'transparent', color: dayViewMode === 'timeline' ? 'white' : 'var(--text-secondary)', cursor: 'pointer' }}>Linhas</button>
                <button onClick={() => setDayViewMode('cards')} className="boing-effect" style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '18px', border: 'none', background: dayViewMode === 'cards' ? 'var(--text-accent)' : 'transparent', color: dayViewMode === 'cards' ? 'white' : 'var(--text-secondary)', cursor: 'pointer' }}>Cartões</button>
              </div>
            )}
            
            {isYearSelectorOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', zIndex: 2000, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', width: '280px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {Array.from({ length: 16 }, (_, i) => {
                  const year = currentDate.getFullYear() - 7 + i;
                  return <button key={year} onClick={() => { setCurrentDate(new Date(year, currentDate.getMonth(), 1)); setIsYearSelectorOpen(false); }} className="nav-pill boing-effect" style={{ padding: '10px 0', borderRadius: '8px', border: 'none', backgroundColor: year === currentDate.getFullYear() ? 'var(--text-accent)' : 'transparent', color: year === currentDate.getFullYear() ? 'white' : 'var(--text-primary)', cursor: 'pointer' }}>{year}</button>;
                })}
              </div>
            )}
          </div>
        </header>

        <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'visible' }}>
          <main className="main-container" style={{ flex: 1, padding: isTaskView ? '24px' : (['day', '3days', 'week'].includes(view) ? '0' : '16px'), paddingBottom: '80px', overflow: 'visible' }}>
            
            <div key={isTaskView ? 'tasks' : 'calendar'} className="view-enter" style={{ width: '100%', height: '100%' }}>
              {isTaskView ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '850px', margin: '0 auto', width: '100%' }}>
                  <header style={{ marginBottom: '10px' }}>
                    <h2 style={{ color: 'var(--text-title)', fontSize: '26px', fontWeight: '800' }}>Desenvolvimento e Inovação</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Gestão de sprints e pedidos técnicos</p>
                  </header>

                  {taskEvents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '100px', opacity: 0.5 }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '48px' }}>inventory_2</span>
                      <p>Nenhuma tarefa pendente neste workspace.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                      {taskEvents.map(task => {
                        const subtasks = task.cr4a1_subtasks ? (typeof task.cr4a1_subtasks === 'string' ? JSON.parse(task.cr4a1_subtasks) : task.cr4a1_subtasks) : [];
                        const completedCount = subtasks.filter(s => s.completed).length;
                        const totalSubtasks = subtasks.length;
                        const percentage = totalSubtasks > 0 ? Math.round((completedCount / totalSubtasks) * 100) : 0;

                        const now = new Date();
                        now.setHours(0,0,0,0);
                        
                        const deadlineDateStr = task.cr4a1_data_fim || task.cr4a1_data_inicio;
                        const deadline = new Date(deadlineDateStr);
                        deadline.setHours(0,0,0,0);
                        
                        const isDelayed = now > deadline && percentage < 100;

                        return (
                          <div 
                            key={task.cr4a1_agenda_kairosid}
                            style={{ 
                              background: 'var(--bg-primary)', padding: '24px', borderRadius: '24px', 
                              border: `1px solid ${isDelayed ? '#ff4d4d44' : 'var(--border-color)'}`,
                              boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                  <span style={{ 
                                    padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800',
                                    background: isDelayed ? '#fee2e2' : (percentage === 100 ? '#dcfce7' : '#e0f2fe'), 
                                    color: isDelayed ? '#ef4444' : (percentage === 100 ? '#22c55e' : '#0ea5e9')
                                  }}>
                                    {isDelayed ? 'ATRASADO' : (percentage === 100 ? 'CONCLUÍDO' : 'EM DIA')}
                                  </span>
                                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    Prazo: {format(deadline, "dd 'de' MMM", { locale: ptBR })}
                                  </span>
                                </div>
                                <h3 style={{ fontSize: '20px', margin: 0, color: 'var(--text-title)' }}>{task.cr4a1_titulo}</h3>
                              </div>
                              
                              <div style={{ position: 'relative', width: '54px', height: '54px', flexShrink: 0 }}>
                                <svg width="54" height="54" viewBox="0 0 36 36">
                                  <circle cx="18" cy="18" r="16" fill="none" stroke="var(--bg-tertiary)" strokeWidth="3" />
                                  <circle cx="18" cy="18" r="16" fill="none" stroke="var(--text-accent)" strokeWidth="3" 
                                    strokeDasharray={`${percentage}, 100`} strokeLinecap="round" transform="rotate(-90 18 18)" />
                                  <text x="18" y="21" textAnchor="middle" fontSize="9" fontWeight="800" fill="var(--text-primary)">{percentage}%</text>
                                </svg>
                              </div>
                            </div>

                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                              {task.cr4a1_descricao || task.cr4a1_detalhes || 'Sem descrição adicional.'}
                            </p>

                            {totalSubtasks > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                                {subtasks.map((s, i) => (
                                  <div 
                                    key={i} 
                                    onClick={(e) => { e.stopPropagation(); handleToggleSubtask(task, i); }}
                                    className="boing-effect"
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', opacity: s.completed ? 0.5 : 1 }}
                                  >
                                    <span className="material-symbols-rounded" style={{ fontSize: '20px', color: s.completed ? 'var(--text-accent)' : 'var(--text-secondary)' }}>
                                      {s.completed ? 'check_circle' : 'radio_button_unchecked'}
                                    </span>
                                    <span style={{ textDecoration: s.completed ? 'line-through' : 'none', color: 'var(--text-primary)' }}>{s.text}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <button onClick={() => handleEditClick(task)} className="btn-secondary boing-effect" style={{ width: '100%', borderRadius: '14px', padding: '12px', fontWeight: '600' }}>
                              Ver Detalhes Completos
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {view === 'year' && (
                    <div className="mini-month-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', overflow: 'visible' }}>
                      {Array.from({ length: 12 }, (_, i) => {
                        const monthDate = new Date(currentDate.getFullYear(), i, 1);
                        const activeWSForGradient = workspaces.filter(w => activeWorkspaces.includes(w.cr4a1_calendarios_workspacesid));
                        return (
                          <div key={i} style={{ ...(activeWSForGradient.length > 1 ? { background: `linear-gradient(135deg, ${activeWSForGradient.map(w => w.cr4a1_cor_hex || '#3498db').join(', ')})`, padding: '1.5px', borderRadius: '16px' } : {}), overflow: 'visible' }}>
                            <div style={{ ...(activeWSForGradient.length <= 1 ? wsBorderStyle : { border: 'none' }), borderRadius: '14px', background: 'var(--bg-primary)', height: '100%', overflow: 'visible' }}>
                              <MiniMonth monthDate={monthDate} onSelectMonth={(d) => { setCurrentDate(d); setView('month'); }} getEventsForDay={getEventsForDay} holidays={holidays} allUsers={allUsers} onEditEvent={handleEditClick} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {view === 'month' && (
                    <div className="responsive-grid-container" style={{ overflow: 'visible', opacity: 1 }}>
                      <div style={{ ...(activeWorkspaces.length > 1 ? { background: `linear-gradient(135deg, ${workspaces.filter(w => activeWorkspaces.includes(w.cr4a1_calendarios_workspacesid)).map(w => w.cr4a1_cor_hex || '#3498db').join(', ')})`, padding: '1.5px', borderRadius: '24px' } : {}), overflow: 'visible', opacity: 1 }}>
                        <div 
                          className="calendar-month-grid" 
                          style={{ 
                            ...(activeWorkspaces.length <= 1 ? wsBorderStyle : { border: 'none' }), 
                            background: 'var(--bg-primary)', 
                            borderRadius: '22px', 
                            overflow: 'visible',
                            opacity: 1
                          }}
                        >
                          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <b key={i} style={{ textAlign: 'center', color: (i === 0 || i === 6) ? '#e74c3c' : 'var(--text-secondary)', fontWeight: '600', padding: '10px 0', fontSize: '12px' }}>{d}</b>)}
                          {generateMonthDays(currentDate).map((day) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
                            const dayEvents = getDisplayEvents().filter(e => e.cr4a1_data_inicio && e.cr4a1_data_inicio.split('T')[0] === dateStr);
                            return (
                              <DroppableDay key={day.toString()} dateStr={dateStr} isToday={isToday} onClick={() => { setCurrentDate(day); setView('day'); }}>
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: isToday ? 'var(--text-accent)' : 'transparent', color: isToday ? 'white' : 'var(--text-primary)', fontWeight: isToday ? '700' : '500', fontSize: '12px', marginBottom: '4px', flexShrink: 0 }}>{format(day, 'd')}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflow: 'hidden', padding: '0 2px', minWidth: 0, width: '100%' }}>
                                  {dayEvents.map(e => (
                                    <DraggableEvent key={e.cr4a1_agenda_kairosid} event={e}>
                                      <div className="event-badge" style={{ background: getEventColor(e), color: 'white', borderRadius: '4px', padding: '2px 4px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '10px', width: '100%', boxSizing: 'border-box' }}>
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

                  {view === 'list' && <ListView events={getDisplayEvents()} allUsers={allUsers} eventTypes={eventTypes} onEdit={handleEditClick} onDelete={(e) => { setEventToDelete(e); setIsDeleteModalOpen(true); }} workspaces={workspaces} />}

                  {['day', '3days', 'week'].includes(view) && (
                    <DayView selectedDate={currentDate} viewType={view} getEventsForDay={getEventsForDay} holidays={holidays} allUsers={allUsers} onEdit={handleEditClick} dayViewMode={dayViewMode} />
                  )}
                </>
              )}
            </div>
          </main>

          {/* BARRA LATERAL DIREITA FIXA (DESKTOP) - FLUTUANTE */}
          {['DIRETORIA', 'ADMIN', 'COORD', 'SECRETARIA'].includes(userRole) && (
            <aside className="desktop-only" style={{
              position: 'fixed',
              right: '0',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '64px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRight: 'none',
              borderRadius: '24px 0 0 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '24px 0',
              gap: '24px',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.06)',
              zIndex: 1000
            }}>
              <button onClick={() => setIsTaskView(false)} className={`boing-effect ${!isTaskView ? 'active' : ''}`} title="Agenda" style={{ 
                width: '44px', height: '44px', borderRadius: '16px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: !isTaskView ? 'var(--bg-tertiary)' : 'transparent', color: !isTaskView ? 'var(--text-accent)' : 'var(--text-primary)'
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>calendar_month</span>
              </button>
              <button onClick={() => setIsTaskView(true)} className={`boing-effect ${isTaskView ? 'active' : ''}`} title="Tarefas" style={{ 
                width: '44px', height: '44px', borderRadius: '16px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isTaskView ? 'var(--bg-tertiary)' : 'transparent', color: isTaskView ? 'var(--text-accent)' : 'var(--text-primary)'
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>assignment</span>
              </button>
            </aside>
          )}
        </div>

        {/* MODAIS E COMPONENTES FIXOS */}
        <div style={{ position: 'relative', zIndex: 9999 }}>
          {isModalOpen && <EventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveEvent} initialDate={currentDate.toISOString()} editingEvent={editingEvent} userRole={userRole} allUsers={allUsers} eventTypes={eventTypes} viewedUser={viewedUser} workspaces={workspaces} />}
          {isUserManagementModalOpen && <UserManagementModal isOpen={isUserManagementModalOpen} onClose={() => setIsUserManagementModalOpen(false)} allUsers={allUsers} updateUserColor={updateUserColor} eventTypes={eventTypes} addEventType={addEventType} deleteEventType={deleteEventType} />}
          {isDeleteModalOpen && <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} eventTitle={eventToDelete?.cr4a1_titulo} />}
          {isWorkspaceModalOpen && <WorkspaceModal isOpen={isWorkspaceModalOpen} onClose={() => setIsWorkspaceModalOpen(false)} onSave={addWorkspace} />}
          {isProfileModalOpen && (
            <div className="modal-overlay" style={{ zIndex: 10000, backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className="modal-content profile-modal" style={{ maxWidth: '450px', width: '100%', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', padding: '28px', borderRadius: '32px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ margin: 0, fontSize: '22px', color: 'var(--text-title)' }}>O Meu Perfil</h2>
                  <button onClick={() => setIsProfileModalOpen(false)} className="icon-btn boing-effect">✕</button>
                </div>
                {currentUser && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                      {currentUser.cr4a1_foto ? (
                        <img src={currentUser.cr4a1_foto} style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--text-accent)' }} />
                      ) : (
                        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--text-accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '700', margin: '0 auto' }}>
                          {user?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <br />
                      <button onClick={() => document.getElementById('p-up').click()} className="btn-secondary boing-effect" style={{ marginTop: '12px', padding: '8px 16px', borderRadius: '8px' }}>Mudar Foto</button>
                      <input 
                        type="file" 
                        id="p-up" 
                        hidden 
                        accept="image/*" 
                        onChange={(e) => compressImage(e.target.files[0], (res) => updateProfile(currentUser.cr4a1_usuarios_agendaid, {
                          nomeExibicao: document.getElementById('n-up')?.value || currentUser.cr4a1_nome_exibicao,
                          aniversario: document.getElementById('b-up')?.value || currentUser.cr4a1_aniversario,
                          foto: res
                        }))} 
                      />
                    </div>

                    <div className="input-group">
                      <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Nome de Exibição</label>
                      <input 
                        type="text" 
                        defaultValue={currentUser.cr4a1_nome_exibicao || user} 
                        id="n-up" 
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none' }} 
                      />
                    </div>

                    <div className="input-group">
                      <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Aniversário</label>
                      <input 
                        type="date" 
                        defaultValue={currentUser.cr4a1_aniversario ? currentUser.cr4a1_aniversario.split('T')[0] : ''} 
                        id="b-up" 
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none' }} 
                      />
                    </div>

                    <button 
                      onClick={() => updateProfile(currentUser.cr4a1_usuarios_agendaid, {
                        nomeExibicao: document.getElementById('n-up').value,
                        aniversario: document.getElementById('b-up').value,
                        foto: currentUser.cr4a1_foto
                      })} 
                      className="btn-primary boing-effect" 
                      style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: '600', marginTop: '4px' }}
                    >
                      Salvar Dados do Perfil
                    </button>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '10px 0' }} />

                    <WhatsAppInput userId={currentUser.cr4a1_usuarios_agendaid} initialValue={currentUser.cr4a1_whatsapp} onSave={updateWhatsApp} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FAB */}
        {(userRole === 'ADMIN' || userRole === 'SECRETARIA' || userRole === 'DIRETORIA' || userRole === 'COORD' || userRole === 'COMUM') && (
          <div style={{ position: 'fixed', bottom: isTaskView ? '80px' : '24px', right: '24px', zIndex: 500 }}>
            {isFabMenuOpen && (
              <div style={{ position: 'absolute', bottom: '80px', right: '0', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-end', minWidth: '180px' }}>
                <div className="view-enter" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--text-primary)' }}>Evento</span>
                  <button onClick={() => { setEditingEvent(null); setIsModalOpen(true); setIsFabMenuOpen(false); }} className="boing-effect" style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <span className="material-symbols-rounded">calendar_add_on</span>
                  </button>
                </div>
                <div className="view-enter" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--text-primary)' }}>Workspace</span>
                  <button onClick={() => { setIsWorkspaceModalOpen(true); setIsFabMenuOpen(false); }} className="boing-effect" style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <span className="material-symbols-rounded">workspaces</span>
                  </button>
                </div>
              </div>
            )}
            <button className="fab-btn boing-effect" onClick={() => setIsFabMenuOpen(!isFabMenuOpen)} style={{ width: '60px', height: '60px', borderRadius: '20px', background: isFabMenuOpen ? 'var(--bg-secondary)' : 'var(--text-accent)', color: isFabMenuOpen ? 'var(--text-primary)' : 'white', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '32px', transform: isFabMenuOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>{isFabMenuOpen ? 'close' : 'add'}</span>
            </button>
          </div>
        )}
      </div>

      {/* BLOCO DE ESTILOS CSS INJETADO */}
      <style>{`
        @keyframes viewSlideIn { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        .view-enter { animation: viewSlideIn 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        
        @media (max-width: 1024px) { .desktop-only { display: none !important; } .mobile-only { display: flex !important; } }
        @media (min-width: 1025px) { .mobile-only { display: none !important; } .desktop-only { display: flex !important; } }
        
        /* EFEITO BOING (MOLA ELÁSTICA) */
        .boing-effect {
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), background 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease !important;
        }
        .boing-effect:active {
            transform: scale(0.85) !important;
            transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        /* LÓGICA DO CABEÇALHO (SMART HEADER) */
        .app-header {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 16px;
            padding: 16px 24px;
            background: var(--bg-primary);
            border-bottom: 1px solid var(--border-color);
            position: sticky;
            top: 0;
            z-index: 2000;
            transition: padding 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1), gap 0.4s;
        }
        
        .app-header.scrolled {
            padding: 10px 24px;
            gap: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.06);
            background: rgba(var(--bg-primary-rgb, 255, 255, 255), 0.98);
            backdrop-filter: blur(12px);
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
            order: 1;
            flex-wrap: nowrap;
        }

        .header-profile {
            display: flex;
            align-items: center;
            gap: 8px;
            order: 2;
            margin-left: auto;
            transition: all 0.4s ease;
        }

        .header-bottom {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            order: 3;
            flex-basis: 100%; /* Força para a linha de baixo */
            flex-wrap: wrap;
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* O GRANDE TRUQUE: QUANDO ROLA A PÁGINA */
        .app-header.scrolled .header-bottom {
            order: 2; /* Sobe para o meio */
            flex-basis: auto; /* Perde a largura total para se alinhar */
            margin-left: 16px;
            margin-right: auto;
            justify-content: flex-start;
        }
        .app-header.scrolled .header-profile {
            order: 3;
            margin-left: 0;
        }

        /* ENCOLHIMENTO SUAVE DAS ETIQUETAS */
        .nav-label-collapse {
            display: inline-block;
            transition: max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, margin 0.3s ease, padding 0.3s ease;
            max-width: 150px;
            opacity: 1;
            overflow: hidden;
            white-space: nowrap;
        }
        
        .app-header.scrolled .nav-label-collapse {
            max-width: 0px;
            opacity: 0;
            margin: 0;
            padding: 0;
        }

        /* COMPORTAMENTO MOBILE */
        @media (max-width: 900px) {
            .app-header { padding: 12px 16px; gap: 12px; }
            .app-header.scrolled { padding: 8px 16px; }
            
            .header-left { width: 100%; justify-content: space-between; }
            .segmented-views { overflow-x: auto; max-width: 100%; scrollbar-width: none; }
            .segmented-views::-webkit-scrollbar { display: none; }
            
            .header-profile { order: 1; position: absolute; right: 16px; top: 12px; margin-left: 0; }
            
            .header-bottom { order: 3; flex-basis: 100%; justify-content: space-between; margin-top: 4px; }
            .app-header.scrolled .header-bottom { order: 3; flex-basis: 100%; margin-left: 0; justify-content: space-between; }
            .app-header.scrolled .header-profile { position: absolute; right: 16px; top: 8px; order: 1; }
            
            /* No mobile as etiquetas somem por padrão nos views para caber */
            .segmented-views .nav-label-collapse { max-width: 0; opacity: 0; margin: 0; }
        }
      `}</style>
    </DndContext>
  );
}

export default App;