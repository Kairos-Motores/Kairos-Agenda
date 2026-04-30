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
  format, addMonths, subMonths, addYears, subYears, addDays, subDays, startOfWeek
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
      toast.error(result.reason === 'connection_error' ? 'Erro de conexão.' : 'Usuário ou senha inválidos.', { style: { borderRadius: '32px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '12px 24px' } });
      setIsAuthenticating(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-page)' }}>
      <form onSubmit={handleSubmit} style={{ padding: '40px', background: 'var(--bg-primary)', borderRadius: '16px', boxShadow: 'var(--shadow-hover)', width: '350px' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--text-title)', marginBottom: '30px', fontWeight: '600' }}>Kairós Agenda</h2>
        <input type="text" placeholder="Usuário" value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid var(--border-strong)', boxSizing: 'border-box', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }} />
        <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '25px', borderRadius: '8px', border: '1px solid var(--border-strong)', boxSizing: 'border-box', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }} />
        <button type="submit" disabled={isAuthenticating} style={{ width: '100%', padding: '12px', background: 'var(--text-accent)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.3s ease' }}>
          {isAuthenticating ? 'Validando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
};

// NOVO: Paleta de Cores Dinâmicas do Material You
const materialColors = [
    { id: 'blue', hex: '#1a73e8', label: 'Azul Google' },
    { id: 'green', hex: '#388e3c', label: 'Verde Sálvia' },
    { id: 'purple', hex: '#673ab7', label: 'Lavanda' },
    { id: 'rose', hex: '#d81b60', label: 'Rosa Escuro' },
    { id: 'graphite', hex: '#5f6368', label: 'Grafite' }
];

function App() {
  const {
    view, setView, currentDate, setCurrentDate, holidays, events, addEvent, updateEvent, deleteEvent, notification,
    getEventsForDay, next, prev, user, userRole, viewedUser, setViewedUser, allUsers, eventTypes, addEventType, deleteEventType, login, logout, loading, isValidatingSession, updateUserColor, filters, setFilters, filteredEvents
  } = useCalendar();

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
  
  // NOVO: Estado da Cor Dinâmica
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('kairos_accent_color') || '#1a73e8');

  const [clock, setClock] = useState(new Date());
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // NOVO: Aplica a cor dinâmica no root do CSS
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
      { id: 'year', label: 'Ano', icon: '📅' },
      { id: 'month', label: 'Mês', icon: '🗓️' },
      { id: 'week', label: 'Semana', icon: '📅' },
      { id: '3days', label: '3 Dias', icon: '📆' },
      { id: 'day', label: 'Dia', icon: '☀️' },
      { id: 'list', label: 'Agenda', icon: '📝' }
  ];

  const toggleFilter = (type, val) => {
      setFilters(prev => {
          const current = prev[type];
          return { ...prev, [type]: current.includes(val) ? current.filter(item => item !== val) : [...current, val] };
      });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
      <Toaster position="bottom-center" />

      {isSidebarOpen && (
          <div onClick={() => setIsSidebarOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 3000, backdropFilter: 'blur(2px)' }} />
      )}

      <div style={{
          position: 'fixed', top: 0, left: 0, height: '100vh', width: '320px', maxWidth: '85vw', backgroundColor: 'var(--bg-primary)', zIndex: 3100,
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          borderRight: '1px solid var(--border-color)', overflowY: 'auto', display: 'flex', flexDirection: 'column',
          borderTopRightRadius: '24px', borderBottomRightRadius: '24px'
      }}>
          <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h1 className="logo" style={{ margin: 0, fontSize: '22px' }}><span>📅</span> Kairós</h1>
                  <button onClick={() => setIsSidebarOpen(false)} className="icon-btn" style={{ fontSize: '20px' }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {viewsConfig.map(v => (
                      <button key={v.id} onClick={() => { setView(v.id); setIsSidebarOpen(false); }} style={{
                          display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '15px',
                          fontWeight: view === v.id ? '700' : '500', backgroundColor: view === v.id ? 'var(--bg-tertiary)' : 'transparent', color: view === v.id ? 'var(--text-accent)' : 'var(--text-primary)', transition: 'all 0.2s'
                      }}>
                          <span style={{ fontSize: '20px' }}>{v.icon}</span> {v.label}
                      </button>
                  ))}
              </div>
          </div>

          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* NOVO: Material You Dynamic Color Picker */}
              <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Cor do Tema</div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {materialColors.map(c => (
                          <div key={c.id} onClick={() => setAccentColor(c.hex)} style={{
                              width: '32px', height: '32px', borderRadius: '50%', backgroundColor: c.hex, cursor: 'pointer',
                              border: accentColor === c.hex ? '3px solid var(--bg-primary)' : 'none',
                              boxShadow: accentColor === c.hex ? `0 0 0 2px ${c.hex}` : 'none',
                              transition: 'transform 0.2s', transform: accentColor === c.hex ? 'scale(1.1)' : 'scale(1)'
                          }} title={c.label} />
                      ))}
                  </div>
              </div>

              <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Pesquisa</div>
                  <input placeholder="Buscar evento..." value={filters.text} onChange={e => setFilters({ ...filters, text: e.target.value })} style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>

              <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Agendas</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {allUsers.map(u => (
                          <label key={u.cr4a1_username} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                              <input type="checkbox" checked={filters.users.includes(u.cr4a1_username)} onChange={() => toggleFilter('users', u.cr4a1_username)} style={{ accentColor: u.cr4a1_cor || 'var(--text-accent)' }} />
                              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: u.cr4a1_cor || '#3498db' }}></div>{u.cr4a1_username}
                          </label>
                      ))}
                  </div>
              </div>

              {(filters.text || filters.users.length > 0 || filters.types.length > 0) && (
                  <button onClick={() => setFilters({ text: '', users: [], types: [] })} style={{ padding: '12px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer' }}>Limpar Filtros</button>
              )}
          </div>
      </div>

      <header className={`app-header ${isScrolled ? 'scrolled' : ''}`}>
        <nav className="nav-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="nav-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={() => setIsSidebarOpen(true)} className="icon-btn" style={{ fontSize: '24px', color: 'var(--text-primary)' }}>☰</button>
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
              <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="icon-btn"><span>{theme === 'light' ? '🌙' : '☀️'}</span></button>
              {(userRole === 'ADMIN' || userRole === 'SECRETARIA') && <button onClick={() => setIsUserManagementModalOpen(true)} className="icon-btn"><span>👥</span></button>}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary)', borderRadius: '32px', padding: '6px 14px 6px 8px', border: '1px solid var(--border-color)', fontSize: '13px', fontWeight: '500' }}>
                <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--text-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>{user?.[0]?.toUpperCase()}</span>
                <span className="nav-label" style={{ color: 'var(--text-primary)' }}>{user}</span>
              </div>
            </div>
          </div>
        </nav>

        <div className="header-secondary-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '10px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="month-name" style={{ fontSize: '20px', color: 'var(--text-title)', fontWeight: '400', textTransform: 'capitalize' }}>
              {format(currentDate, view === 'day' ? "EEEE, d 'de' MMMM" : 'MMMM', { locale: ptBR })}
            </span>
            <span onClick={() => setIsYearSelectorOpen(!isYearSelectorOpen)} className="year-pill" style={{ cursor: 'pointer', fontSize: '20px', color: 'var(--text-secondary)' }}>
              {format(currentDate, 'yyyy')} <span style={{ fontSize: '12px', opacity: 0.5 }}>▼</span>
            </span>

            {view === 'day' && (
              <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '20px', padding: '2px', marginLeft: '12px', border: '1px solid var(--border-color)' }}>
                  <button onClick={() => setDayViewMode('timeline')} style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '18px', border: 'none', background: dayViewMode === 'timeline' ? 'var(--text-accent)' : 'transparent', color: dayViewMode === 'timeline' ? 'white' : 'var(--text-secondary)', cursor: 'pointer' }}>Linhas</button>
                  <button onClick={() => setDayViewMode('cards')} style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '18px', border: 'none', background: dayViewMode === 'cards' ? 'var(--text-accent)' : 'transparent', color: dayViewMode === 'cards' ? 'white' : 'var(--text-secondary)', cursor: 'pointer' }}>Cartões</button>
              </div>
            )}
          </div>
          {isYearSelectorOpen && (
            <div style={{ position: 'absolute', top: '40px', zIndex: 2000, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', width: '280px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {Array.from({ length: 16 }, (_, i) => {
                const year = currentDate.getFullYear() - 7 + i;
                return <button key={year} onClick={() => { setCurrentDate(new Date(year, currentDate.getMonth(), 1)); setIsYearSelectorOpen(false); }} style={{ padding: '10px 0', borderRadius: '8px', border: 'none', backgroundColor: year === currentDate.getFullYear() ? 'var(--text-accent)' : 'transparent', color: year === currentDate.getFullYear() ? 'white' : 'var(--text-primary)', cursor: 'pointer' }}>{year}</button>;
              })}
            </div>
          )}
        </div>
      </header>

      <main className="main-container view-enter" key={view} style={{ flex: 1, padding: ['day', '3days', 'week'].includes(view) ? '0' : '16px' }}>
        
        {view === 'year' && (
          <div className="mini-month-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
            {Array.from({ length: 12 }, (_, i) => <MiniMonth key={i} monthDate={new Date(currentDate.getFullYear(), i, 1)} onSelectMonth={(d) => { setCurrentDate(d); setView('month'); }} getEventsForDay={getEventsForDay} holidays={holidays} allUsers={allUsers} onEditEvent={handleEditClick} />)}
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

                return (
                  <div key={day.toString()} onClick={() => { setCurrentDate(day); setView('day'); }} className={`calendar-day-card ${isCurrentMonth ? 'current-month' : ''} ${isToday ? 'today' : ''}`} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: isToday ? 'var(--text-accent)' : 'transparent', color: isToday ? 'white' : 'var(--text-primary)', fontWeight: isToday ? '700' : '500', fontSize: '12px', marginBottom: '4px' }}>{format(day, 'd')}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflow: 'hidden', padding: '0 2px' }}>
                      {dayEvents.map(e => (
                        <div key={e.cr4a1_event_id} className="event-badge" style={{ background: getEventColor(e), color: 'white', borderRadius: '4px', padding: '2px 4px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '10px' }}>
                          {!e.cr4a1_dia_inteiro && <span style={{ fontWeight: '700', marginRight: '3px' }}>{e.cr4a1_hora_inicio}</span>} {e.cr4a1_privado ? '🔒 ' : ''}{e.cr4a1_titulo}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'list' && <ListView events={filteredEvents} allUsers={allUsers} eventTypes={eventTypes} onEdit={handleEditClick} onDelete={(e) => {setEventToDelete(e); setIsDeleteModalOpen(true);}} />}

        {/* NOVO: Componente DayView agora lida com 1, 3 ou 7 dias */}
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

      {isModalOpen && <EventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveEvent} initialDate={currentDate.toISOString()} editingEvent={editingEvent} userRole={userRole} allUsers={allUsers} eventTypes={eventTypes} viewedUser={viewedUser} />}
      {isUserManagementModalOpen && <UserManagementModal isOpen={isUserManagementModalOpen} onClose={() => setIsUserManagementModalOpen(false)} allUsers={allUsers} updateUserColor={updateUserColor} eventTypes={eventTypes} addEventType={addEventType} deleteEventType={deleteEventType} />}
      {isDeleteModalOpen && <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} eventTitle={eventToDelete?.cr4a1_titulo} />}
      {(userRole === 'ADMIN' || userRole === 'SECRETARIA' || userRole === 'DIRETORIA') && (
        <button className="create-btn-mobile fab-btn" onClick={() => { setEditingEvent(null); setIsModalOpen(true); }}>
          <span style={{ fontSize: '24px', color: 'white', fontWeight: '700' }}>+</span>
        </button>
      )}
    </div>
  );
}

export default App;