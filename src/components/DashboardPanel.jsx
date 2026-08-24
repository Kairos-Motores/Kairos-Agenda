import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { checkAccess } from '../utils/permissions';

const TABS_STORAGE_KEY = 'kairos_bi_open_tabs';
const ACTIVE_TAB_STORAGE_KEY = 'kairos_bi_active_tab';

export const DashboardPanel = ({ activeWorkspaces, userRole, biConfig }) => {
  // Cada aba: { bi, url, loading, reloadKey }
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  // Permite "minimizar" o painel em tela cheia para escolher outro painel na grade,
  // sem fechar as abas já abertas — como abrir uma nova aba no navegador.
  const [isFullscreenVisible, setIsFullscreenVisible] = useState(true);
  const hasRestoredRef = useRef(false);

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  // Estados para a barra do BI (Auto-hide)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  // Estados para o botão discreto (Auto-hide)
  const [isButtonVisible, setIsButtonVisible] = useState(false);
  const buttonTimerRef = useRef(null);

  const activeTab = openTabs.find(t => t.bi.id === activeTabId) || null;

  // Funções auxiliares para controle do botão
  const showButton = () => {
    if (buttonTimerRef.current) clearTimeout(buttonTimerRef.current);
    setIsButtonVisible(true);
  };

  const hideButtonAfterDelay = (delay = 3000) => {
    if (buttonTimerRef.current) clearTimeout(buttonTimerRef.current);
    buttonTimerRef.current = setTimeout(() => {
      setIsButtonVisible(false);
    }, delay);
  };

  // Lógica do temporizador da barra
  useEffect(() => {
    let timer;
    if (activeTab && isHeaderVisible) {
      timer = setTimeout(() => {
        setIsHeaderVisible(false);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [activeTab, isHeaderVisible]);

  // Efeito para controlar a visibilidade do botão
  useEffect(() => {
    if (activeTab && !isHeaderVisible) {
      // Barra oculta → mostrar botão e programar ocultação
      showButton();
      hideButtonAfterDelay(4000);
    } else {
      // Barra visível ou nenhum BI aberto → esconder botão imediatamente
      setIsButtonVisible(false);
      if (buttonTimerRef.current) clearTimeout(buttonTimerRef.current);
    }
    return () => {
      if (buttonTimerRef.current) clearTimeout(buttonTimerRef.current);
    };
  }, [activeTab, isHeaderVisible]);

  const fetchBiUrl = async (biId) => {
    const response = await fetch(`/api/bi-embed?id=${biId}`);
    const data = await response.json();
    return data.url || null;
  };

  const carregarUrlBI = async (biId) => {
    try {
      const url = await fetchBiUrl(biId);
      setOpenTabs(prev => prev.map(t => t.bi.id === biId ? { ...t, url, loading: false } : t));
      if (!url) alert('Erro ao carregar painel. Verifique suas permissões.');
    } catch (error) {
      console.error('Falha ao buscar URL do BI:', error);
      setOpenTabs(prev => prev.map(t => t.bi.id === biId ? { ...t, loading: false } : t));
    }
  };

  const abrirBI = (bi) => {
    setActiveTabId(bi.id);
    setIsFullscreenVisible(true);
    setIsHeaderVisible(true);
    const jaAberta = openTabs.some(t => t.bi.id === bi.id);
    if (jaAberta) return;
    setOpenTabs(prev => [...prev, { bi, url: null, loading: true, reloadKey: 0 }]);
    carregarUrlBI(bi.id);
  };

  const recarregarBI = (biId) => {
    setOpenTabs(prev => prev.map(t => t.bi.id === biId ? { ...t, loading: true, reloadKey: t.reloadKey + 1 } : t));
    carregarUrlBI(biId);
  };

  const fecharTab = (biId) => {
    setOpenTabs(prev => {
      const next = prev.filter(t => t.bi.id !== biId);
      setActiveTabId(current => {
        if (current !== biId) return current;
        return next.length > 0 ? next[next.length - 1].bi.id : null;
      });
      return next;
    });
  };

  const activeWorkspaceNames = activeWorkspaces.map(ws => ws.cr4a1_nome);

  const isBiPermitido = (bi) => {
    const isWorkspaceAtivo = activeWorkspaceNames.includes(bi.workspaceName);
    const temPermissao = bi.allowedRoles.includes('ALL') || checkAccess(userRole, bi.allowedRoles);
    return isWorkspaceAtivo && temPermissao;
  };

  const bisPermitidos = biConfig.filter(bi => {
    const matchesSearch = bi.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWorkspace = selectedWorkspace ? bi.workspaceName === selectedWorkspace : true;
    return isBiPermitido(bi) && matchesSearch && matchesWorkspace;
  });

  // Restaura as abas que ficaram abertas antes de um refresh de página,
  // em vez de simplesmente voltar para o calendário.
  useEffect(() => {
    if (hasRestoredRef.current) return;
    if (activeWorkspaces.length === 0 || biConfig.length === 0) return;
    hasRestoredRef.current = true;

    try {
      const savedIds = JSON.parse(localStorage.getItem(TABS_STORAGE_KEY) || '[]');
      const savedActive = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
      const bisParaAbrir = savedIds
        .map(id => biConfig.find(bi => bi.id === id))
        .filter(bi => bi && isBiPermitido(bi));

      if (bisParaAbrir.length === 0) return;

      setOpenTabs(bisParaAbrir.map(bi => ({ bi, url: null, loading: true, reloadKey: 0 })));
      setActiveTabId(bisParaAbrir.some(bi => bi.id === savedActive) ? savedActive : bisParaAbrir[bisParaAbrir.length - 1].bi.id);
      bisParaAbrir.forEach(bi => carregarUrlBI(bi.id));
    } catch (e) {
      console.warn('Não foi possível restaurar os painéis abertos:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaces, biConfig]);

  // Persiste quais abas estão abertas para sobreviver a um refresh de página
  useEffect(() => {
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(openTabs.map(t => t.bi.id)));
  }, [openTabs]);

  useEffect(() => {
    if (activeTabId) localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTabId);
    else localStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
  }, [activeTabId]);

  return (
    <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '24px', height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header e Filtros */}
      <div>
        <h2 style={{ margin: '0 0 16px 0', color: 'var(--text-title)', display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-rounded" style={{ color: '#f57c00', marginRight: '8px' }}>bar_chart</span>
          Painéis e Indicadores
        </h2>

        {openTabs.length > 0 && !isFullscreenVisible && (
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px', scrollbarWidth: 'none' }}>
            {openTabs.map(tab => (
              <button
                key={tab.bi.id}
                onClick={() => { setActiveTabId(tab.bi.id); setIsFullscreenVisible(true); }}
                className="boing-effect"
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '20px',
                  border: '1px solid #f57c00', background: '#fff3e0', color: '#f57c00', fontWeight: '600',
                  whiteSpace: 'nowrap', cursor: 'pointer', fontSize: '13px'
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>{tab.bi.icon}</span>
                {tab.bi.title}
                <span
                  className="material-symbols-rounded"
                  onClick={(e) => { e.stopPropagation(); fecharTab(tab.bi.id); }}
                  style={{ fontSize: '15px' }}
                >
                  close
                </span>
              </button>
            ))}
          </div>
        )}

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
                outline: 'none',
                boxSizing: 'border-box'
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

      {/* Grid de Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', overflowY: 'auto' }}>
        {bisPermitidos.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px', gridColumn: '1 / -1' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '48px', opacity: 0.5 }}>visibility_off</span>
            <p>Nenhum painel encontrado.</p>
          </div>
        ) : (
          bisPermitidos.map(bi => {
            const isOpen = openTabs.some(t => t.bi.id === bi.id);
            return (
              <div key={bi.id} onClick={() => abrirBI(bi)} className="boing-effect note-card"
                style={{
                  background: 'var(--bg-secondary)', border: isOpen ? '1px solid #f57c00' : '1px solid var(--border-color)', borderRadius: '16px', padding: '20px',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', position: 'relative'
                }}
              >
                {isOpen && (
                  <span style={{ position: 'absolute', top: '12px', right: '12px', width: '8px', height: '8px', borderRadius: '50%', background: '#f57c00' }} title="Já está aberto" />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="material-symbols-rounded" style={{ color: '#f57c00', fontSize: '24px' }}>{bi.icon}</span>
                  <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-title)' }}>{bi.title}</h3>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{bi.description}</p>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL FULLSCREEN */}
      {activeTab && isFullscreenVisible && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: 'var(--bg-primary)',
          overflow: 'hidden'
        }}>
          {/* Iframes (todas as abas abertas ficam montadas, só a ativa fica visível) */}
          {openTabs.map(tab => (
            <div key={tab.bi.id} style={{ position: 'absolute', inset: 0, background: '#f5f5f5', display: tab.bi.id === activeTabId ? 'block' : 'none' }}>
              {tab.loading && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)', gap: '8px' }}>
                  <span className="material-symbols-rounded" style={{ animation: 'spin 1s linear infinite' }}>autorenew</span>
                  Carregando painel...
                </div>
              )}
              {tab.url && (
                <iframe
                  key={`${tab.bi.id}-${tab.reloadKey}`}
                  title={tab.bi.title}
                  src={tab.url}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    // Painéis com mais de uma página (ex: Kanban Operacional/Sintético) precisam da
                    // barra de navegação de páginas do Power BI visível; nos demais, cortamos os
                    // últimos 42px para esconder o rodapé de marca d'água do Power BI.
                    height: tab.bi.showPageNav ? '100%' : 'calc(100% + 42px)',
                    border: 'none',
                    display: tab.loading ? 'none' : 'block'
                  }}
                />
              )}

              {/* A barra de navegação de páginas do Power BI (ex: "‹ 2 de 2 ›") vem junto com
                  o link "Microsoft Power BI" e os botões de partilhar/abrir numa nova aba, na
                  mesma faixa horizontal. Como é conteúdo de outra origem (iframe), não dá para
                  remover só essas partes — cobrimos com retângulos na mesma cor da barra,
                  deixando só o navegador de páginas do meio visível e clicável. */}
              {tab.url && !tab.loading && tab.bi.showPageNav && (
                <>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: '180px', height: '36px', background: '#f3f2f1', zIndex: 1 }} />
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: '90px', height: '36px', background: '#f3f2f1', zIndex: 1 }} />
                </>
              )}
            </div>
          ))}

          {/* ZONA DE HOVER (ativa apenas quando a barra está oculta) */}
          {!isHeaderVisible && (
            <div
              onMouseEnter={() => {
                showButton();
              }}
              onMouseLeave={() => {
                hideButtonAfterDelay(2000);
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '60px',
                zIndex: 10,
              }}
            />
          )}

          {/* BOTÃO DISCRETO – visibilidade controlada por opacidade e pointerEvents */}
          <button
            onClick={() => setIsHeaderVisible(true)}
            onMouseEnter={() => {
              if (buttonTimerRef.current) clearTimeout(buttonTimerRef.current);
            }}
            onMouseLeave={() => {
              if (!isHeaderVisible) {
                hideButtonAfterDelay(2000);
              }
            }}
            style={{
              position: 'absolute',
              top: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 11,
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: '30px',
              padding: '6px 14px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#333',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'opacity 0.3s ease, background 0.2s',
              opacity: isButtonVisible ? 1 : 0,
              pointerEvents: isButtonVisible ? 'auto' : 'none',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.95)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.75)'}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>expand_more</span>
            Mostrar barra
          </button>

          {/* Cabeçalho (overlay) */}
          <div
            onMouseEnter={() => setIsHeaderVisible(true)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              background: 'rgba(255, 255, 255, 0.90)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              boxSizing: 'border-box',
              opacity: isHeaderVisible ? 1 : 0,
              transform: isHeaderVisible ? 'translateY(0)' : 'translateY(-100%)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              pointerEvents: isHeaderVisible ? 'auto' : 'none',
              zIndex: 12
            }}
          >
            {/* Barra de abas, estilo navegador */}
            {openTabs.length > 1 && (
              <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', padding: '8px 8px 0 8px', scrollbarWidth: 'none' }}>
                {openTabs.map(tab => (
                  <div
                    key={tab.bi.id}
                    onClick={() => setActiveTabId(tab.bi.id)}
                    className="boing-effect"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px',
                      borderRadius: '10px 10px 0 0', cursor: 'pointer', maxWidth: '180px',
                      background: tab.bi.id === activeTabId ? '#fff' : 'rgba(0,0,0,0.04)',
                      boxShadow: tab.bi.id === activeTabId ? '0 -2px 8px rgba(0,0,0,0.06)' : 'none',
                      fontWeight: tab.bi.id === activeTabId ? '600' : '500'
                    }}
                  >
                    <span className="material-symbols-rounded" style={{ color: '#f57c00', fontSize: '16px', flexShrink: 0 }}>{tab.bi.icon}</span>
                    <span style={{ fontSize: '12px', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.bi.title}</span>
                    <span
                      className="material-symbols-rounded"
                      onClick={(e) => { e.stopPropagation(); fecharTab(tab.bi.id); }}
                      style={{ fontSize: '15px', color: '#888', flexShrink: 0, borderRadius: '50%', padding: '1px' }}
                    >
                      close
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#fff3e0', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                  <span className="material-symbols-rounded" style={{ color: '#f57c00', fontSize: '20px' }}>{activeTab.bi.icon}</span>
                </div>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#333' }}>{activeTab.bi.title}</h3>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setIsFullscreenVisible(false)}
                  title="Escolher outro painel (mantém este aberto em segundo plano)"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#fff3e0',
                    color: '#f57c00',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>add</span>
                  Novo painel
                </button>
                <button
                  onClick={() => recarregarBI(activeTab.bi.id)}
                  title="Recarregar apenas este painel"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#e3f2fd',
                    color: '#1565c0',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '18px', animation: activeTab.loading ? 'spin 1s linear infinite' : 'none' }}>autorenew</span>
                  Recarregar
                </button>
                <button
                  onClick={() => fecharTab(activeTab.bi.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#ffebee',
                    color: '#c62828',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
