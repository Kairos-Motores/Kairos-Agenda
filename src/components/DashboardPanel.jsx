import React, { useState } from 'react';

export const DashboardPanel = ({ activeWorkspaces, userRole, biConfig }) => {
  const [biAberto, setBiAberto] = useState(null);
  const [biUrl, setBiUrl] = useState('');

  const abrirBI = async (bi) => {
    try {
      const response = await fetch(`/api/bi-embed?id=${bi.id}`);
      const data = await response.json();
      if (data.url) {
        setBiUrl(data.url);
        setBiAberto(bi);
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
    const temPermissao =
      bi.allowedRoles.includes('ALL') ||
      bi.allowedRoles.includes(userRole) ||
      (Array.isArray(userRole) && bi.allowedRoles.some(r => userRole.includes(r)));
    return isWorkspaceAtivo && temPermissao;
  });

  return (
    <div style={{ padding: '24px', background: 'var(--bg-primary)', borderRadius: '24px', height: '100%' }}>
      <h2 style={{ marginBottom: '20px', color: 'var(--text-title)' }}>
        <span className="material-symbols-rounded" style={{ color: '#f57c00', marginRight: '8px' }}>bar_chart</span>
        Painéis e Indicadores
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {bisPermitidos.length === 0 ? (
          <p>Nenhum painel disponível para os setores selecionados ou seu nível de acesso.</p>
        ) : (
          bisPermitidos.map(bi => (
            <div key={bi.id} onClick={() => abrirBI(bi)} className="boing-effect note-card"
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
                <div style={{ background: '#fff3e0', padding: '12px', borderRadius: '12px' }}>
                  <span className="material-symbols-rounded" style={{ color: '#f57c00', fontSize: '28px' }}>{bi.icon}</span>
                </div>
                <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '18px' }}>{bi.title}</h3>
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>{bi.description}</p>
              <div style={{ marginTop: 'auto', alignSelf: 'flex-end', color: '#f57c00', fontSize: '13px', fontWeight: 'bold' }}>
                Abrir Painel <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>arrow_forward</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal em tela cheia (ocupa tudo, sem espaços extras) */}
      {biAberto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 10000,
          background: 'var(--bg-primary)',
          display: 'flex',
          flexDirection: 'column',
          margin: 0,
          padding: 0,
        }}>
          {/* Cabeçalho mínimo */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 16px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            flexShrink: 0,
          }}>
            <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '16px' }}>{biAberto.title}</h3>
            <button
              onClick={() => { setBiAberto(null); setBiUrl(''); }}
              className="btn-secondary boing-effect"
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span> Fechar
            </button>
          </div>

          {/* Container do iframe: ocupa todo o espaço restante e corta a barra inferior */}
          <div style={{
            flex: 1,
            width: '100%',
            overflow: 'hidden',    // esconde a parte de baixo do iframe
            background: '#f5f5f5',
            position: 'relative',
          }}>
            {biUrl && (
              <iframe
                title={biAberto.title}
                src={biUrl}
                frameBorder="0"
                allowFullScreen
                style={{
                  width: '100%',
                  height: '110%',        // excede um pouco para cortar a barra inferior
                  border: 'none',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};