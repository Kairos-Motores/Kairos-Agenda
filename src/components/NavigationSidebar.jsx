const NavigationSidebar = ({ isTaskView, setIsTaskView, userRole }) => {
  // Se não for liderança, talvez você queira esconder ou mostrar apenas o que for relevante
  const canSeeTasks = ['DIRETORIA', 'ADMIN', 'COORD'].includes(userRole);
  
  if (!canSeeTasks) return null;

  return (
    <>
      {/* VERSÃO DESKTOP: Barra Lateral Direita */}
      <aside className="desktop-only" style={{
        width: '56px',
        borderLeft: '1px solid var(--border-color)',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0',
        gap: '20px',
        height: 'calc(100vh - 64px)',
        position: 'sticky',
        top: '64px'
      }}>
        <NavIcon 
          active={!isTaskView} 
          onClick={() => setIsTaskView(false)} 
          icon="calendar_month" 
          label="Calendário" 
        />
        <NavIcon 
          active={isTaskView} 
          onClick={() => setIsTaskView(true)} 
          icon="assignment" 
          label="Tarefas" 
        />
      </aside>

      {/* VERSÃO MOBILE: Barra Inferior (Bottom Nav) */}
      <nav className="mobile-only" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 5000,
        paddingBottom: 'env(safe-area-inset-bottom)' // Respiro para o S23
      }}>
        <button 
          onClick={() => setIsTaskView(false)}
          style={{ 
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            background: 'none', border: 'none', color: !isTaskView ? 'var(--text-accent)' : 'var(--text-secondary)'
          }}
        >
          <span className="material-symbols-rounded">calendar_month</span>
          <span style={{ fontSize: '10px', fontWeight: '700' }}>Agenda</span>
        </button>
        <button 
          onClick={() => setIsTaskView(true)}
          style={{ 
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            background: 'none', border: 'none', color: isTaskView ? 'var(--text-accent)' : 'var(--text-secondary)'
          }}
        >
          <span className="material-symbols-rounded">assignment</span>
          <span style={{ fontSize: '10px', fontWeight: '700' }}>Tarefas</span>
        </button>
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .main-container { padding-bottom: 80px !important; } /* Espaço para a barra inferior */
        }
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
        }
      `}</style>
    </>
  );
};

const NavIcon = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    title={label}
    style={{
      width: '40px',
      height: '40px',
      borderRadius: '12px',
      border: 'none',
      background: active ? 'var(--bg-tertiary)' : 'transparent',
      color: active ? 'var(--text-accent)' : 'var(--text-primary)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s'
    }}
  >
    <span className="material-symbols-rounded">{icon}</span>
  </button>
);