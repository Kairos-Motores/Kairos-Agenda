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
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, addYears, subYears, addDays, subDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    const result = await onLogin(username, password);
    if (!result.success) {
      if (result.reason === 'connection_error') {
        toast.error('Erro de conexão. Verifique sua internet.', { style: { borderRadius: '32px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '12px 24px' } });
      } else {
        toast.error('Usuário ou senha inválidos.', { style: { borderRadius: '32px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '12px 24px' } });
      }
      setIsAuthenticating(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-page)' }}>
      <form onSubmit={handleSubmit} style={{ padding: '40px', background: 'var(--bg-primary)', borderRadius: '16px', boxShadow: 'var(--shadow-hover)', width: '350px' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--text-title)', marginBottom: '30px', fontWeight: '600' }}>Kairós Agenda</h2>
        <input type="text" placeholder="Usuário" value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid var(--border-strong)', boxSizing: 'border-box', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }} />
        <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '25px', borderRadius: '8px', border: '1px solid var(--border-strong)', boxSizing: 'border-box', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }} />
        <button type="submit" disabled={isAuthenticating} style={{ width: '100%', padding: '12px', background: 'var(--text-accent)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.3s ease', boxShadow: '0 4px 12px rgba(41, 128, 185, 0.3)' }}>
          {isAuthenticating ? 'Validando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
};

function App() {
  const {
    view, setView, currentDate, setCurrentDate,
    holidays, events, addEvent, updateEvent, deleteEvent, notification,
    getEventsForDay, next, prev, user, userRole, viewedUser, setViewedUser,
    allUsers, eventTypes, addEventType, deleteEventType, login, logout, loading, isValidatingSession, updateUserColor,
    filters, setFilters, filteredEvents
  } = useCalendar();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  const [hoveredMonthDay, setHoveredMonthDay] = useState(null);
  const [isYearSelectorOpen, setIsYearSelectorOpen] = useState(false);
  
  // NOVO: Estado para abrir/fechar o Menu Lateral
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [dayViewMode, setDayViewMode] = useState('timeline'); 
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const [clock, setClock] = useState(new Date());
  const [isScrolled, setIsScrolled] = useState(false);
  const welcomeToastShown = useRef(false);
  const notifiedEvents = useRef(new Set());

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
    if (!user || loading || events.length === 0) return;
    const timerId = setInterval(() => {
      const now = new Date();
      setClock(now);
      const currentDateStr = format(now, 'yyyy-MM-dd');
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      events.forEach(event => {
        if (event.cr4a1_data_inicio?.split('T')[0] === currentDateStr && event.cr4a1_hora_inicio) {
          const [evtHStr, evtMStr] = event.cr4a1_hora_inicio.split(':');
          const timeDiffMins = (parseInt(evtHStr) * 60 + parseInt(evtMStr)) - (currentHour * 60 + currentMinute);
          if (timeDiffMins === 30 && !notifiedEvents.current.has(event.cr4a1_event_id)) {
            toast(`Faltam 30 minutos para:\n${event.cr4a1_titulo}`, { icon: '⏰', duration: 8000 });
            notifiedEvents.current.add(event.cr4a1_event_id);
          }
        }
      });
    }, 1000);
    return () => clearInterval(timerId);
  }, [events, user, loading]);

  useEffect(() => {
    if (events.length > 0 && !welcomeToastShown.current && !loading && user) {
      welcomeToastShown.current = true;
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const startingToday = events.filter(e => e.cr4a1_data_inicio?.split('T')[0] === todayStr);
      const endingToday = events.filter(e => e.cr4a1_data_fim?.split('T')[0] === todayStr && e.cr4a1_data_inicio?.split('T')[0] !== todayStr);

      if (startingToday.length > 0) toast.success(`Você tem ${startingToday.length} evento(s) marcado(s) para iniciar hoje.`, { duration: 6000, icon: '📅' });
      if (endingToday.length > 0) toast(`Atenção: Você tem ${endingToday.length} evento(s) que terminam hoje!`, { icon: '⏳', duration: 6000 });
    }
  }, [events, loading, user]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  if (isValidatingSession) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-page)', gap: '16px' }}>
      <span style={{ fontSize: '48px' }}>📅</span>
      <p style={{ color: 'var(--text-secondary)', fontFamily: "'Poppins', sans-serif", fontSize: '14px' }}>Verificando sessão...</p>
    </div>
  );

  if (!user) return <LoginScreen onLogin={login} />;

  const handleSaveEvent = async (data) => {
    try {
      if (data.cr4a1_event_id) await updateEvent(data);
      else await addEvent(data);
      toast.success("Salvo com sucesso!");
      setIsModalOpen(false);
    } catch (err) { toast.error("Falha ao salvar evento."); throw err; }
  };

  const handleDeleteClick = (event) => { setEventToDelete(event); setIsDeleteModalOpen(true); };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await deleteEvent(eventToDelete.cr4a1_agenda_kairosid, eventToDelete.cr4a1_user_login);
      toast.success("Evento excluído.");
      setIsDeleteModalOpen(false);
      setEventToDelete(null);
    } catch (err) { toast.error("Falha ao excluir."); }
  };

  const handleEditClick = (event) => {
    if (userRole === 'SECRETARIA' || event.cr4a1_user_login === user) {
      setEditingEvent(event);
      setIsModalOpen(true);
    } else {
      toast.error("Acesso Negado: Apenas a Secretaria pode editar eventos de terceiros.", { icon: '🚫', style: { borderRadius: '32px', background: '#ff453a', color: '#fff' } });
    }
  };

  const getUserColor = (username) => {
    const found = allUsers.find(u => u.cr4a1_username === username);
    return found ? found.cr4a1_cor : '#3498db';
  };

  const getEventColor = (event) => event.cr4a1_cor || getUserColor(event.cr4a1_user_login);

  const handleNavigate = (direction) => {
    if (view === 'year') setCurrentDate(direction === 'next' ? addYears(currentDate, 1) : subYears(currentDate, 1));
    else if (view === 'day') setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1));
    else setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
  };

  // Funções Auxiliares para manipular os Arrays de Filtro
  const toggleUserFilter = (username) => {
      setFilters(prev => {
          const current = prev.users;
          if (current.includes(username)) return { ...prev, users: current.filter(u => u !== username) };
          return { ...prev, users: [...current, username] };
      });
  };

  const toggleTypeFilter = (typeName) => {
      setFilters(prev => {
          const current = prev.types;
          if (current.includes(typeName)) return { ...prev, types: current.filter(t => t !== typeName) };
          return { ...prev, types: [...current, typeName] };
      });
  };

  const views = [
      { id: 'year', label: 'Ano', icon: '📅' },
      { id: 'month', label: 'Mês', icon: '🗓️' },
      { id: 'day', label: 'Dia', icon: '☀️' },
      { id: 'list', label: 'Agenda (Fichas)', icon: '📝' }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
      <Toaster position="bottom-center" toastOptions={{ style: { fontFamily: "'Poppins', sans-serif", borderRadius: '32px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '12px 24px', fontSize: '14px', fontWeight: '500' } }} />

      {/* OVERLAY DO MENU LATERAL */}
      {isSidebarOpen && (
          <div 
              onClick={() => setIsSidebarOpen(false)}
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 3000, backdropFilter: 'blur(2px)', animation: 'fadeIn 0.2s ease-out' }}
          />
      )}

      {/* MENU LATERAL (SIDEBAR) ESTILO MATERIAL YOU */}
      <div style={{
          position: 'fixed', top: 0, left: 0, height: '100vh', width: '320px', maxWidth: '85vw',
          backgroundColor: 'var(--bg-primary)', zIndex: 3100,
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          borderRight: '1px solid var(--border-color)',
          overflowY: 'auto', display: 'flex', flexDirection: 'column',
          boxShadow: isSidebarOpen ? '10px 0 30px rgba(0,0,0,0.1)' : 'none',
          borderTopRightRadius: '24px', borderBottomRightRadius: '24px'
      }}>
          <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h1 className="logo" style={{ margin: 0, fontSize: '22px' }}><span>📅</span> Kairós</h1>
                  <button onClick={() => setIsSidebarOpen(false)} className="icon-btn" style={{ fontSize: '20px' }}>✕</button>
              </div>
              
              {/* Seletor de Visão no Menu Lateral */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {views.map(v => (
                      <button 
                          key={v.id} 
                          onClick={() => { setView(v.id); setIsSidebarOpen(false); }}
                          style={{
                              display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px',
                              borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: view === v.id ? '700' : '500',
                              backgroundColor: view === v.id ? 'var(--bg-tertiary)' : 'transparent',
                              color: view === v.id ? 'var(--text-accent)' : 'var(--text-primary)',
                              transition: 'all 0.2s'
                          }}
                      >
                          <span style={{ fontSize: '20px' }}>{v.icon}</span> {v.label}
                      </button>
                  ))}
              </div>
          </div>

          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Input Busca */}
              <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Pesquisa</div>
                  <input
                      placeholder="🔍 Buscar evento..."
                      value={filters.text}
                      onChange={e => setFilters({ ...filters, text: e.target.value })}
                      style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                  />
              </div>

              {/* Checkboxes Usuários */}
              <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Filtrar Agendas</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {allUsers.map(u => (
                          <label key={u.cr4a1_username} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                              <input 
                                  type="checkbox" 
                                  checked={filters.users.includes(u.cr4a1_username)}
                                  onChange={() => toggleUserFilter(u.cr4a1_username)}
                                  style={{ width: '18px', height: '18px', accentColor: u.cr4a1_cor || 'var(--text-accent)' }}
                              />
                              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: u.cr4a1_cor || '#3498db' }}></div>
                              {u.cr4a1_username}
                          </label>
                      ))}
                  </div>
              </div>

              {/* Checkboxes Tipos */}
              <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Filtrar Tipos</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {eventTypes.map(t => (
                          <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                              <input 
                                  type="checkbox" 
                                  checked={filters.types.includes(t.name)}
                                  onChange={() => toggleTypeFilter(t.name)}
                                  style={{ width: '18px', height: '18px', accentColor: 'var(--text-accent)' }}
                              />
                              <span>{t.emoji} {t.name}</span>
                          </label>
                      ))}
                  </div>
              </div>

              {(filters.text || filters.users.length > 0 || filters.types.length > 0) && (
                  <button 
                      onClick={() => setFilters({ text: '', users: [], types: [] })}
                      style={{ padding: '12px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer', marginTop: '10px' }}
                  >
                      Limpar Filtros
                  </button>
              )}
          </div>
      </div>

      {loading && <div style={{ position: 'fixed', top: 15, left: '50%', transform: 'translateX(-50%)', background: '#f1c40f', color: '#333', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', zIndex: 2100, boxShadow: '0 4px 10px rgba(0,0,0,0.1)', fontWeight: '500' }}>Sincronizando Banco de Dados...</div>}

      <header className={`app-header ${isScrolled ? 'scrolled' : ''}`}>
        <nav className="nav-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div className="nav-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* NOVO: Botão Hambúrguer */}
            <button onClick={() => setIsSidebarOpen(true)} className="icon-btn" style={{ fontSize: '24px', color: 'var(--text-primary)' }}>
                ☰
            </button>
            <h1 className="logo" onClick={() => { setView('month'); setCurrentDate(new Date()); }} style={{ cursor: 'pointer', margin: 0 }}>
              <span className="nav-label">Kairós</span>
            </h1>
          </div>

          <div className="nav-right">
            <div className="nav-group">
              <button onClick={() => handleNavigate('prev')} className="icon-btn"><span>&lt;</span></button>
              <button onClick={() => setCurrentDate(new Date())} className="nav-pill"><span>Hoje</span></button>
              <button onClick={() => handleNavigate('next')} className="icon-btn"><span>&gt;</span></button>
            </div>

            <div className="nav-group">
              <button onClick={toggleTheme} className="icon-btn">
                <span>{theme === 'light' ? '🌙' : '☀️'}</span>
              </button>

              {(userRole === 'ADMIN' || userRole === 'SECRETARIA') && (
                <button onClick={() => setIsUserManagementModalOpen(true)} className="icon-btn" title="Gerenciar Usuários">
                  <span>👥</span>
                </button>
              )}

              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'var(--bg-secondary)', borderRadius: '32px',
                padding: '6px 14px 6px 8px', border: '1px solid var(--border-color)',
                fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)',
              }}>
                <span style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'var(--text-accent)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: '700', flexShrink: 0
                }}>
                  {user?.[0]?.toUpperCase()}
                </span>
                <span className="nav-label" style={{ color: 'var(--text-primary)' }}>{user}</span>
              </div>

              <button onClick={logout} className="icon-btn" title="Sair" style={{ color: '#e74c3c' }}>
                <span>📤</span>
              </button>
            </div>
          </div>
        </nav>

        <div className="header-secondary-row" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          marginTop: '10px', position: 'relative', transition: 'all 0.4s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="month-name" style={{ fontSize: '20px', color: 'var(--text-title)', fontWeight: '400', textTransform: 'capitalize' }}>
              {format(currentDate, 'MMMM', { locale: ptBR })}
            </span>
            <span
              onClick={() => setIsYearSelectorOpen(!isYearSelectorOpen)}
              className="year-pill"
              style={{
                cursor: 'pointer', fontSize: '20px', color: 'var(--text-secondary)',
                fontWeight: '400', display: 'flex', alignItems: 'center', gap: '4px',
                padding: '2px 8px', borderRadius: '4px', transition: 'background 0.2s'
              }}
            >
              {format(currentDate, 'yyyy')}
              <span style={{ fontSize: '12px', opacity: 0.5 }}>▼</span>
            </span>

            {view === 'day' && (
              <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '20px', padding: '2px', marginLeft: '12px', border: '1px solid var(--border-color)' }}>
                  <button 
                      onClick={() => setDayViewMode('timeline')} 
                      style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '18px', border: 'none', background: dayViewMode === 'timeline' ? 'var(--text-accent)' : 'transparent', color: dayViewMode === 'timeline' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: '500' }}
                  >
                      Linhas
                  </button>
                  <button 
                      onClick={() => setDayViewMode('cards')} 
                      style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '18px', border: 'none', background: dayViewMode === 'cards' ? 'var(--text-accent)' : 'transparent', color: dayViewMode === 'cards' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: '500' }}
                  >
                      Cartões
                  </button>
              </div>
            )}
          </div>

          {isYearSelectorOpen && (
            <div style={{
              position: 'absolute', top: '40px', zIndex: 2000,
              backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)',
              borderRadius: '12px', padding: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
              width: '280px', maxWidth: '90vw', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px', animation: 'scaleIn 0.2s ease-out'
            }}>
              {Array.from({ length: 16 }, (_, i) => {
                const year = currentDate.getFullYear() - 7 + i;
                const isSelected = year === currentDate.getFullYear();
                return (
                  <button
                    key={year}
                    onClick={() => {
                      setCurrentDate(new Date(year, currentDate.getMonth(), 1));
                      setIsYearSelectorOpen(false);
                    }}
                    style={{
                      padding: '10px 0', borderRadius: '8px', border: 'none',
                      backgroundColor: isSelected ? 'var(--text-accent)' : 'transparent',
                      color: isSelected ? 'white' : 'var(--text-primary)', cursor: 'pointer',
                      fontSize: '14px', fontWeight: isSelected ? '700' : '400'
                    }}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <main className="main-container view-enter" key={view} style={{ flex: 1 }}>
        
        {view === 'year' && (
          <div className="mini-month-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
            {Array.from({ length: 12 }, (_, i) => (
              <MiniMonth
                key={i} monthDate={new Date(currentDate.getFullYear(), i, 1)}
                onSelectMonth={(d) => { setCurrentDate(d); setView('month'); }}
                getEventsForDay={getEventsForDay} holidays={holidays} allUsers={allUsers}
                onEditEvent={handleEditClick}
              />
            ))}
          </div>
        )}

        {view === 'month' && (
          <div className="responsive-grid-container">
            <div className="calendar-month-grid">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <b key={i} style={{ textAlign: 'center', color: (i === 0 || i === 6) ? '#e74c3c' : 'var(--text-secondary)', fontWeight: '600', padding: '10px 0', fontSize: '12px' }}>{d}</b>)}
              {generateMonthDays(currentDate).map((day, index) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const holiday = holidays.find(h => h.date === dateStr);
                const hasContent = dayEvents.length > 0 || holiday;
                const isFirstRow = index < 7;

                return (
                  <div
                    key={day.toString()} onClick={() => { setCurrentDate(day); setView('day'); }}
                    onMouseEnter={() => hasContent && setHoveredMonthDay(dateStr)} onMouseLeave={() => setHoveredMonthDay(null)}
                    className={`calendar-day-card ${isCurrentMonth ? 'current-month' : ''} ${isToday ? 'today' : ''}`}
                    style={{ cursor: 'pointer', position: 'relative', overflow: 'visible' }}
                  >
                    <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <div style={{
                        display: 'flex', justifyContent: 'center', alignItems: 'center', alignSelf: 'center',
                        width: '28px', height: '28px', borderRadius: '50%',
                        backgroundColor: isToday ? 'var(--text-accent)' : 'transparent',
                        color: isToday ? 'white' : (holiday ? '#e74c3c' : (isCurrentMonth ? 'var(--text-title)' : 'var(--text-secondary)')),
                        fontWeight: (isToday || holiday) ? '700' : '500', fontSize: '12px', marginBottom: '4px'
                      }}>
                        {format(day, 'd')}
                      </div>

                      {holiday && <div style={{ fontSize: '9px', color: '#e74c3c', textAlign: 'center', fontWeight: '700', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🚩 {holiday.name}</div>}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflow: 'hidden', padding: '0 2px' }}>
                        {dayEvents.map(e => {
                          const isAllDay = e.cr4a1_dia_inteiro;
                          const color = getEventColor(e);
                          return (
                            <div key={e.cr4a1_event_id} className="event-badge" style={{
                              background: color, color: 'white', borderRadius: '4px', padding: '2px 4px',
                              display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '10px'
                            }}>
                              {!isAllDay && <span style={{ fontWeight: '700', marginRight: '3px', opacity: 0.9 }}>{e.cr4a1_hora_inicio}</span>}
                              {e.cr4a1_privado ? '🔒 ' : ''}{e.cr4a1_titulo}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {hoveredMonthDay === dateStr && hasContent && (
                      <div
                        onClick={(e) => e.stopPropagation()} className="premium-tooltip"
                        style={{
                          position: 'absolute', [isFirstRow ? 'top' : 'bottom']: '105%',
                          left: '50%', transform: 'translateX(-50%)', zIndex: 1500,
                          animation: isFirstRow ? 'fadeInDown 0.2s ease-out' : 'fadeInUp 0.2s ease-out'
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-accent)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{format(day, "d 'de' MMMM", { locale: ptBR })}</span>
                        </div>
                        {holiday && <div style={{ color: '#e74c3c', fontSize: '10px', fontWeight: 'bold', marginBottom: '8px' }}>🚩 {holiday.name}</div>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {dayEvents.map((ev, idx) => (
                            <div
                              key={idx} onClick={() => handleEditClick(ev)} className="tooltip-event-item"
                              style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '4px', borderRadius: '4px' }}
                            >
                              <div style={{ minWidth: '8px', height: '8px', borderRadius: '50%', backgroundColor: getUserColor(ev.cr4a1_user_login), marginTop: '4px' }} />
                              <div style={{ fontSize: '10px', lineHeight: '1.3' }}>
                                <span style={{ fontWeight: '700' }}>{ev.cr4a1_user_login}:</span> {ev.cr4a1_privado ? '🔒 ' : ''}{ev.cr4a1_titulo}
                                {!ev.cr4a1_dia_inteiro && <div style={{ opacity: 0.7 }}>🕒 {ev.cr4a1_hora_inicio}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'list' && <ListView events={filteredEvents} allUsers={allUsers} eventTypes={eventTypes} onEdit={handleEditClick} onDelete={handleDeleteClick} />}

        {view === 'day' && <DayView selectedDate={currentDate} getEventsForDay={getEventsForDay} holidays={holidays} allUsers={allUsers} onEdit={handleEditClick} onDelete={handleDeleteClick} dayViewMode={dayViewMode} />}
      </main>

      {isModalOpen && (
        <EventModal
          isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveEvent}
          initialDate={currentDate.toISOString()} editingEvent={editingEvent}
          userRole={userRole} allUsers={allUsers} eventTypes={eventTypes} viewedUser={viewedUser}
        />
      )}

      {isUserManagementModalOpen && (
        <UserManagementModal
          isOpen={isUserManagementModalOpen} onClose={() => setIsUserManagementModalOpen(false)}
          allUsers={allUsers} updateUserColor={updateUserColor} eventTypes={eventTypes}
          addEventType={addEventType} deleteEventType={deleteEventType}
        />
      )}

      {isDeleteModalOpen && (
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete} eventTitle={eventToDelete?.cr4a1_titulo}
        />
      )}

      {(userRole === 'ADMIN' || userRole === 'SECRETARIA' || userRole === 'DIRETORIA') && (
        <button className="create-btn-mobile fab-btn" onClick={() => { setEditingEvent(null); setIsModalOpen(true); }}>
          <span style={{ fontSize: '24px', color: 'white', fontWeight: '700' }}>+</span> <span className="nav-label">Criar</span>
        </button>
      )}
    </div>
  );
}

export default App;