import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { BI_CONFIG } from '../config/biConfig';

export const DashboardPanel = ({ activeWorkspaces, userRole }) => {
  const [biAberto, setBiAberto] = useState(null);

  // Filtro Mestre Ajustado para usar NOMES ao invés de IDs
  const bisPermitidos = BI_CONFIG.filter(bi => {
    // Verifica se o NOME do workspace do BI está dentro do array de workspaces marcados na lateral
    const isWorkspaceAtivo = activeWorkspaces.includes(bi.workspaceName);
    
    // Regra de permissão: Admins veem tudo. Outras roles apenas se estiverem na lista.
    const temPermissao = userRole === 'ADMIN' || bi.allowedRoles.includes(userRole);
    
    return isWorkspaceAtivo && temPermissao;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', padding: '24px', background: 'var(--bg-primary)', borderRadius: '24px', position: 'relative' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-rounded" style={{ color: '#f57c00' }}>bar_chart</span>
          Painéis e Indicadores
        </h2>
      </div>

      {/* GRID DE CARDS EM MINIATURA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px', overflowY: 'auto', paddingBottom: '24px' }}>
        {bisPermitidos.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '48px', opacity: 0.5, marginBottom: '16px' }}>visibility_off</span>
            <p>Nenhum painel disponível para os setores selecionados ou sem permissão de acesso.</p>
          </div>
        ) : (
          bisPermitidos.map(bi => (
            <div 
              key={bi.id}
              onClick={() => setBiAberto(bi)}
              className="boing-effect note-card"
              style={{ 
                background: 'var(--bg-secondary)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '16px', 
                padding: '24px', 
                cursor: 'pointer', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px',
                height: '180px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#fff3e0', padding: '12px', borderRadius: '12px', display: 'flex' }}>
                  <span className="material-symbols-rounded" style={{ color: '#f57c00', fontSize: '28px' }}>{bi.icon}</span>
                </div>
                <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '18px' }}>{bi.title}</h3>
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
                {bi.description}
              </p>
              <div style={{ marginTop: 'auto', alignSelf: 'flex-end', color: '#f57c00', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Abrir Painel <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>arrow_forward</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL DE TELA CHEIA PARA O BI - PORTAL */}
      {biAberto && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100dvh',
          background: 'var(--bg-primary)',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeInUp 0.3s ease'
        }}>
          {/* Cabeçalho do Modal */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '12px 16px', 
            borderBottom: '1px solid var(--border-color)', 
            background: 'var(--bg-secondary)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
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
              onClick={() => setBiAberto(null)} 
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
                fontSize: '14px'
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>close</span> 
              <span style={{ display: 'inline-block' }}>Fechar</span>
            </button>
          </div>
          
          {/* O iFrame que carrega o Power BI */}
          <div style={{ flex: 1, width: '100%', height: '100%', background: '#e0e0e0', position: 'relative' }}>
            <iframe 
              title={biAberto.title} 
              src={biAberto.url} 
              frameBorder="0" 
              allowFullScreen={true}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            ></iframe>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};