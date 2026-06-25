// src/components/DashboardPanel.jsx
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

  // Converte os workspaces ativos (objetos) para uma lista de nomes
  const activeWorkspaceNames = activeWorkspaces.map(ws => ws.cr4a1_nome); // ajuste se o campo for diferente

  // Filtra os BIs que o usuário pode ver
  const bisPermitidos = biConfig.filter(bi => {
    // Verifica se o workspace está ativo (pelo nome)
    const isWorkspaceAtivo = activeWorkspaceNames.includes(bi.workspaceName);

    // Verifica permissão por role
    const temPermissao =
      bi.allowedRoles.includes('ALL') ||                           // qualquer um do workspace vê
      bi.allowedRoles.includes(userRole) ||                        // role específica
      (Array.isArray(userRole) && bi.allowedRoles.some(r => userRole.includes(r))); // múltiplas roles

    return isWorkspaceAtivo && temPermissao;
  });

  return (
    <div style={{ padding: '24px', background: 'var(--bg-primary)', borderRadius: '24px' }}>
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

      {/* Modal em tela cheia */}
      {biAberto && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ margin: 0, color: 'var(--text-title)' }}>{biAberto.title}</h3>
            <button onClick={() => { setBiAberto(null); setBiUrl(''); }} className="btn-secondary boing-effect"
              style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span> Fechar
            </button>
          </div>
          <div style={{ flex: 1, width: '100%', background: '#f5f5f5' }}>
            {biUrl && (
              <iframe title={biAberto.title} src={biUrl} frameBorder="0" allowFullScreen style={{ width: '100%', height: '100%' }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};