import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { checkAccess } from '../utils/permissions';

export const DashboardPanel = ({ activeWorkspaces, userRole, biConfig }) => {
  const [biAberto, setBiAberto] = useState(null);
  const [biUrl, setBiUrl] = useState('');
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  // Estados para a barra do BI (Auto-hide)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  // Lógica para esconder a barra após 3 segundos de inatividade
  useEffect(() => {
    if (!biAberto) return;

    const timer = setTimeout(() => {
      setIsHeaderVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [biAberto, isHeaderVisible]);

  const abrirBI = async (bi) => {
    try {
      const response = await fetch(`/api/bi-embed?id=${bi.id}`);
      const data = await response.json();
      if (data.url) {
        setBiUrl(data.url);
        setBiAberto(bi);
        setIsHeaderVisible(true); // Garante que começa visível
      } else {
        alert('Erro ao carregar painel. Verifique suas permissões.');
      }
    } catch (error) {
      console.error('Falha ao buscar URL do BI:', error);
    }
  };

  const activeWorkspaceNames = activeWorkspaces.map(ws => ws.cr4a1_nome);

  const bisPermitidos = biConfig.filter(bi => {
    const isWorkspaceAtivo = activeWorkspaceNames.includes(bi.workspaceName);
    const temPermissao = bi.allowedRoles.includes('ALL') || checkAccess(userRole, bi.allowedRoles);
    const matchesSearch = bi.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWorkspace = selectedWorkspace ? bi.workspaceName === selectedWorkspace : true;
    
    return isWorkspaceAtivo && temPermissao && matchesSearch && matchesWorkspace;
  });

  return (
    <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '24px', height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header MD3 */}
      <div>
        <h2 style={{ margin: '0 0 16px 0', color: 'var(--text-title)', display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-rounded" style={{ color: '#f57c00', marginRight: '8px' }}>bar_chart</span>
          Painéis e Indicadores
        </h2>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-rounded" style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)' }}>search</span>
            <input 
              type="text" 
              placeholder="Pesquisar painéis..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                borderRadius: '28px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-title)',
                fontSize: '16px',
                outline: 'none'
              }}
            />
          </div>
          <button 
            onClick={() => { setSearchTerm(''); setSelectedWorkspace(null); }}
            style={{ padding: '12px', borderRadius: '50%', border: 'none', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <span className="material-symbols-rounded">filter_alt_off</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
           <button 
             onClick={() => setSelectedWorkspace(null)}
             style={{ 
               padding: '8px 16px', borderRadius: '20px', border: !selectedWorkspace ? 'none' : '1px solid var(--border-color)', 
               background: !selectedWorkspace ? '#f57c00' : 'var(--bg-secondary)', color: !selectedWorkspace ? 'white' : 'var(--text-title)',
               whiteSpace: 'nowrap', cursor: 'pointer', fontWeight: '500'
             }}
           >
             Todos
           </button>
           {activeWorkspaceNames.map(name => (
             <button 
               key={name}
               onClick={() => setSelectedWorkspace(name)}
               style={{ 
                 padding: '8px 16px', borderRadius: '20px', border: selectedWorkspace === name ? 'none' : '1px solid var(--border-color)', 
                 background: selectedWorkspace === name ? '#f57c00' : 'var(--bg-secondary)', color: selectedWorkspace === name ? 'white' : 'var(--text-title)',
                 whiteSpace: 'nowrap', cursor: 'pointer', fontWeight: '500'
               }}
             >
               {name}
             </button>
           ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', overflowY: 'auto' }}>
        {bisPermitidos.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '48px', opacity: 0.5 }}>visibility_off</span>
            <p>Nenhum painel encontrado.</p>
          </div>
        ) : (
          bisPermitidos.map(bi => (
            <div key={bi.id} onClick={() => abrirBI(bi)} className="boing-effect note-card"
              style={{
                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="material-symbols-rounded" style={{ color: '#f57c00', fontSize: '24px' }}>{bi.icon}</span>
                <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-title)' }}>{bi.title}</h3>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{bi.description}</p>
            </div>
          ))
        )}
      </div>

      {biAberto && ReactDOM.createPortal(
        <div 
          onMouseMove={() => setIsHeaderVisible(true)} // Reseta o timer ao mover o mouse
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100dvh',
            zIndex: 999999,
            background: 'var(--bg-primary)',
            display: 'flex',
            flexDirection: 'column',
            margin: 0,
            padding: 0,
            animation: 'fadeInUp 0.3s ease'
          }}
        >
          {/* Header com transição de opacidade */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            flexShrink: 0,
            opacity: isHeaderVisible ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            pointerEvents: isHeaderVisible ? 'auto' : 'none' // Impede cliques quando invisível
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#fff3e0', padding: '8px', borderRadius: '8px', display: 'flex' }}>
                <span className="material-symbols-rounded" style={{ color: '#f57c00', fontSize: '24px' }}>{biAberto.icon}</span>
              </div>
              <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '16px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60vw' }}>
                {biAberto.title}
              </h3>
            </div>
            <button
              onClick={() => { setBiAberto(null); setBiUrl(''); }}
              className="boing-effect"
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: 'none',
                background: '#ffebee',
                color: '#c62828',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 'bold',
                fontSize: '14px',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>close</span> 
              <span>Fechar</span>
            </button>
          </div>
          
          <div style={{
            flex: 1,
            width: '100%',
            overflow: 'hidden',
            background: '#f5f5f5',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
          }}>
            {!biUrl && (
              <div style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}>autorenew</span>
                Carregando painel...
              </div>
            )}
            {biUrl && (
              <iframe
                title={biAberto.title}
                src={biUrl}
                frameBorder="0"
                allowFullScreen
                style={{
                  width: '100%',
                  height: 'calc(100% + 100px)',
                  marginTop: '0px',
                  border: 'none',
                  display: 'block',
                  marginRight: 'auto',
                  marginLeft: 'auto'
                }}
              />
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};