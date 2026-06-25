import React, { useState } from 'react';
import ReactDOM from 'react-dom';

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
      <h2 style={{ marginBottom: '20px', color: 'var(--text-title)', display: 'flex', alignItems: 'center' }}>
        <span className="material-symbols-rounded" style={{ color: '#f57c00', marginRight: '8px' }}>bar_chart</span>
        Painéis e Indicadores
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {bisPermitidos.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '48px', opacity: 0.5, marginBottom: '16px' }}>visibility_off</span>
            <p>Nenhum painel disponível para os setores selecionados ou seu nível de acesso.</p>
          </div>
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
                <div style={{ background: '#fff3e0', padding: '12px', borderRadius: '12px', display: 'flex' }}>
                  <span className="material-symbols-rounded" style={{ color: '#f57c00', fontSize: '28px' }}>{bi.icon}</span>
                </div>
                <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '18px' }}>{bi.title}</h3>
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>{bi.description}</p>
              <div style={{ marginTop: 'auto', alignSelf: 'flex-end', color: '#f57c00', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Abrir Painel <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>arrow_forward</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal que cobre tudo, inserido via Portal no document.body */}
      {biAberto && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100dvh', // Usa dvh para lidar com a barra de endereços do mobile
          zIndex: 999999, // Supera todos os componentes da tela
          background: 'var(--bg-primary)',
          display: 'flex',
          flexDirection: 'column',
          margin: 0,
          padding: 0,
          animation: 'fadeInUp 0.3s ease'
        }}>
          
          {/* Cabeçalho do BI - Responsivo e Minimalista */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#fff3e0', padding: '8px', borderRadius: '8px', display: 'flex' }}>
                <span className="material-symbols-rounded" style={{ color: '#f57c00', fontSize: '24px' }}>{biAberto.icon}</span>
              </div>
              {/* Oculta o excesso de texto no mobile com ellipsis */}
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

          {/* Container do iframe: centraliza e corta rodapé */}
          <div style={{
            flex: 1,
            width: '100%',
            overflow: 'hidden', // esconde a parte inferior do iframe
            background: '#f5f5f5',
            display: 'flex',
            justifyContent: 'center', // centraliza horizontalmente
            alignItems: 'center', // centraliza verticalmente
            position: 'relative',
          }}>
            {/* Adicionado um loader básico para não ficar a tela branca enquanto busca a API */}
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
                  height: 'calc(100% + 40px)', // corta só o rodapé inferior que você parametrizou
                  border: 'none',
                  display: 'block',
                  margin: '0 auto',
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