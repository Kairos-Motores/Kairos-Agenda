import { SearchField } from './ui/search-field';
import { matchesSearch } from '../utils/search';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { checkAccess } from '../utils/permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import ReactDOM from 'react-dom';
import * as pbi from 'powerbi-client';

const PowerBIEmbeddedReport = ({ tab }) => {
  const containerRef = useRef(null);
  const showPageNav = tab.bi?.showPageNav;
  const tabMode = tab.mode;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !tab.embedData || tabMode !== 'embedded') return;

    let powerbi;
    try {
      powerbi = new pbi.service.Service(
        pbi.factories.hpmFactory,
        pbi.factories.wpmpFactory,
        pbi.factories.routerFactory
      );

      const config = {
        type: 'report',
        tokenType: pbi.models.TokenType.Embed,
        accessToken: tab.embedData.accessToken,
        embedUrl: tab.embedData.embedUrl,
        id: tab.embedData.id,
        permissions: pbi.models.Permissions.All,
        settings: {
          panes: {
            filters: {
              expanded: false,
              visible: false,
            },
            pageNavigation: {
              visible: !!tab.bi.showPageNav,
            },
          },
          visualSettings: {
            visualHeaders: [
              {
                settings: {
                  visible: true,
                },
              },
            ],
          },
          bars: {
            statusBar: {
              visible: false,
            },
          },
        },
      };

      powerbi.embed(container, config);
    } catch (err) {
      console.error('Erro ao inicializar Power BI Embedded:', err);
    }

    return () => {
      if (powerbi && container) {
        try {
          powerbi.reset(container);
        } catch {
          // cleanup safe
        }
      }
    };
  }, [tab.embedData, tab.reloadKey, showPageNav, tabMode, tab.bi.showPageNav]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: tab.loading ? 'none' : 'block',
      }}
    />
  );
};
import { isBiVisibleForRoles, buildBiRolesOverrideMap } from '../utils/biPermissions';
import {
  BarChart3, Search, FilterX, X, EyeOff, Plus, RotateCw, ChevronDown,
  RefreshCw, CheckCircle2, AlertTriangle, Clock, Info, Copy, Check
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';

const TABS_STORAGE_KEY = 'kairos_bi_open_tabs';
const ACTIVE_TAB_STORAGE_KEY = 'kairos_bi_active_tab';

export const DashboardPanel = ({ activeWorkspaces, userRole, biConfig, biPermissoes = [] }) => {
  // Cada aba: { bi, url, loading, reloadKey }
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  // Permite "minimizar" o painel em tela cheia para escolher outro painel na grade,
  // sem fechar as abas já abertas — como abrir uma nova aba no navegador.
  const [isFullscreenVisible, setIsFullscreenVisible] = useState(true);
  const hasRestoredRef = useRef(false);

  // Estados para atualizações do Power BI
  const isAdmin = checkAccess(userRole, ['ADMIN']);
  const [refreshDataMap, setRefreshDataMap] = useState({});
  const [isTriggeringRefresh, setIsTriggeringRefresh] = useState(false);
  const [errorModalData, setErrorModalData] = useState(null);
  const [hasCopiedError, setHasCopiedError] = useState(false);

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

  const formatRefreshDistance = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch {
      return '';
    }
  };

  const formatRefreshExact = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return format(date, "dd/MM 'às' HH:mm", { locale: ptBR });
    } catch {
      return '';
    }
  };

  const fetchRefreshStatus = useCallback(async (biId, silent = false) => {
    if (!biId) return null;
    try {
      const res = await fetch(`/api/bi-refresh?id=${biId}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.ok) {
        setRefreshDataMap(prev => {
          const previous = prev[biId];
          if (previous?.isRefreshing && !data.isRefreshing) {
            if (data.lastRefresh?.status === 'Completed') {
              toast.success('Dados atualizados com sucesso no Power BI!');
            } else if (data.lastRefresh?.status === 'Failed') {
              toast.error('A atualização do Power BI falhou.');
            }
          }
          return { ...prev, [biId]: data };
        });
        return data;
      }
    } catch (err) {
      if (!silent) console.warn('[DashboardPanel] Falha ao consultar status de atualização:', err);
    }
    return null;
  }, []);

  const handleTriggerRefresh = async (biId) => {
    if (!isAdmin || isTriggeringRefresh) return;
    setIsTriggeringRefresh(true);
    try {
      const res = await fetch('/api/bi-refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: biId, userRole })
      });
      const result = await res.json();
      if (result.ok) {
        toast.success('Atualização do Power BI iniciada!');
        setRefreshDataMap(prev => ({
          ...prev,
          [biId]: {
            ...(prev[biId] || {}),
            isRefreshing: true,
          }
        }));
        setTimeout(() => fetchRefreshStatus(biId, true), 2000);
      } else {
        toast.error(result.error || 'Erro ao iniciar atualização.');
      }
    } catch (err) {
      console.error('[DashboardPanel] Erro ao disparar refresh:', err);
      toast.error('Falha de conexão ao disparar atualização.');
    } finally {
      setIsTriggeringRefresh(false);
    }
  };

  // Efeito para carregar status do BI ativo e manter polling enquanto estiver atualizando
  useEffect(() => {
    if (!activeTabId) return;
    if (!refreshDataMap[activeTabId]) {
      fetchRefreshStatus(activeTabId, true);
    }

    const currentData = refreshDataMap[activeTabId];
    let interval = null;
    if (currentData?.isRefreshing) {
      interval = setInterval(() => {
        fetchRefreshStatus(activeTabId, true);
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTabId, refreshDataMap, fetchRefreshStatus]);

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

  const fetchBiData = async (biId) => {
    const response = await fetch(`/api/bi-embed?id=${biId}`);
    const data = await response.json();
    return data;
  };

  const carregarUrlBI = async (biId) => {
    try {
      const data = await fetchBiData(biId);
      if (data.mode === 'embedded' && data.accessToken) {
        setOpenTabs(prev => prev.map(t => t.bi.id === biId ? {
          ...t,
          mode: 'embedded',
          embedData: data,
          url: data.embedUrl,
          loading: false,
        } : t));
      } else if (data.url) {
        setOpenTabs(prev => prev.map(t => t.bi.id === biId ? {
          ...t,
          mode: 'legacy',
          embedData: null,
          url: data.url,
          loading: false,
        } : t));
      } else {
        alert('Erro ao carregar painel. Verifique suas permissões.');
        setOpenTabs(prev => prev.map(t => t.bi.id === biId ? { ...t, loading: false } : t));
      }
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
  // BI_CONFIG tem só algumas dezenas de itens — reconstruir o mapa de overrides a
  // cada render sai barato, sem necessidade de useMemo.
  const biRolesOverrideMap = buildBiRolesOverrideMap(biPermissoes);

  const isBiPermitido = (bi) => {
    const isWorkspaceAtivo = activeWorkspaceNames.includes(bi.workspaceName);
    const temPermissao = isBiVisibleForRoles(bi, userRole, biRolesOverrideMap);
    return isWorkspaceAtivo && temPermissao;
  };

  const bisPermitidos = biConfig.filter(bi => {
    const matchesQuery = matchesSearch(bi.title, searchTerm);
    const matchesWorkspace = selectedWorkspace ? bi.workspaceName === selectedWorkspace : true;
    return isBiPermitido(bi) && matchesQuery && matchesWorkspace;
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
        <h2 style={{ margin: '0 0 16px 0', color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 className="size-5 text-[#f57c00]" />
          Painéis e Indicadores
        </h2>

        {openTabs.length > 0 && !isFullscreenVisible && (
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px', scrollbarWidth: 'none' }}>
            {openTabs.map(tab => (
              <button
                key={tab.bi.id}
                onClick={() => { setActiveTabId(tab.bi.id); setIsFullscreenVisible(true); }}
                className="boing-effect flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-semibold"
                style={{ border: '1px solid #f57c00', background: '#fff3e0', color: '#f57c00' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>{tab.bi.icon}</span>
                {tab.bi.title}
                <X className="size-[15px]" onClick={(e) => { e.stopPropagation(); fecharTab(tab.bi.id); }} />
              </button>
            ))}
          </div>
        )}

        <div className="mb-4 flex gap-2">
          <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Pesquisar painéis..." className="flex-1" inputClassName="h-auto rounded-full py-3 text-base" />
          <Button
            onClick={() => { setSearchTerm(''); setSelectedWorkspace(null); }}
            variant="secondary"
            size="icon"
            className="shrink-0 rounded-full"
            title="Limpar filtros"
          >
            <FilterX className="size-5" />
          </Button>
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
          <div className="col-span-full mt-10 text-center text-muted-foreground">
            <EyeOff className="mx-auto size-12 opacity-50" />
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
              {/* Modo Power BI Embedded (oficial com exportação para Excel) */}
              {tab.mode === 'embedded' && tab.embedData && (
                <PowerBIEmbeddedReport tab={tab} />
              )}

              {/* Modo Legado (Iframe direto com link público) */}
              {tab.mode !== 'embedded' && tab.url && (
                <iframe
                  key={`${tab.bi.id}-${tab.reloadKey}`}
                  title={tab.bi.title}
                  src={tab.url}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: tab.bi.showPageNav ? '100%' : 'calc(100% + 42px)',
                    border: 'none',
                    display: tab.loading ? 'none' : 'block'
                  }}
                />
              )}

              {/* Retângulos de máscara na barra inferior apenas para o modo legado com showPageNav */}
              {tab.mode !== 'embedded' && tab.url && !tab.loading && tab.bi.showPageNav && (
                <>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: '180px', height: '36px', background: '#f3f2f1', zIndex: 1 }} />
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: '90px', height: '36px', background: '#f3f2f1', zIndex: 1 }} />
                </>
              )}
            </div>
          ))}

          {/* ZONA DE HOVER (ativa apenas quando a barra está oculta).
              O iframe do Power BI é cross-origin e "engole" todos os eventos de
              ponteiro, então precisamos de um elemento físico sobreposto para
              detectar o mouse perto do topo. Mantemos essa faixa BEM fina (só a
              borda superior, onde o Power BI nunca põe controles) para não roubar
              cliques da parte de cima do relatório — o problema que existia com a
              faixa antiga de 60px. */}
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
                height: '14px',
                zIndex: 10,
              }}
            />
          )}

          {/* BOTÃO DISCRETO – visibilidade controlada por opacidade e pointerEvents */}
          <button
            onClick={() => setIsHeaderVisible(true)}
            onMouseEnter={(e) => { if (buttonTimerRef.current) clearTimeout(buttonTimerRef.current); e.currentTarget.style.background = 'rgba(255,255,255,0.95)'; }}
            onMouseLeave={(e) => { if (!isHeaderVisible) hideButtonAfterDelay(2000); e.currentTarget.style.background = 'rgba(255,255,255,0.75)'; }}
            className="boing-effect absolute left-1/2 top-3 z-[11] flex -translate-x-1/2 items-center gap-1 rounded-[30px] px-3.5 py-1.5 text-[13px] font-medium backdrop-blur-sm transition-opacity"
            style={{
              background: 'rgba(255, 255, 255, 0.75)',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              color: '#333',
              opacity: isButtonVisible ? 1 : 0,
              pointerEvents: isButtonVisible ? 'auto' : 'none',
            }}
          >
            <ChevronDown className="size-[18px]" />
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ background: '#fff3e0', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                  <span className="material-symbols-rounded" style={{ color: '#f57c00', fontSize: '20px' }}>{activeTab.bi.icon}</span>
                </div>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#333' }}>{activeTab.bi.title}</h3>
                {activeTab.mode === 'embedded' && (
                  <span style={{ fontSize: '11px', background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                    Exportação Ativa (.xlsx)
                  </span>
                )}

                {/* --- Indicadores de Atualização do Power BI --- */}
                {refreshDataMap[activeTab.bi.id] && (() => {
                  const refInfo = refreshDataMap[activeTab.bi.id];
                  const totalDia = refInfo.totalScheduledToday > 0 ? refInfo.totalScheduledToday : refInfo.dailyLimit;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Contador do Dia */}
                      <div
                        title={`Atualizações executadas hoje: ${refInfo.refreshesToday}${refInfo.totalScheduledToday > 0 ? ` de ${refInfo.totalScheduledToday} agendadas` : ` (capacidade diária: ${refInfo.dailyLimit})`}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          background: '#f8fafc',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: '600'
                        }}
                      >
                        <Clock className="size-3 text-[#f57c00]" />
                        <span>{refInfo.refreshesToday}/{totalDia} hoje</span>
                      </div>

                      {/* Status da Última Atualização */}
                      {refInfo.isRefreshing ? (
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '11px',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            padding: '2px 9px',
                            borderRadius: '12px',
                            fontWeight: '600'
                          }}
                        >
                          <RefreshCw className="size-3 animate-spin text-[#2563eb]" />
                          Atualizando fonte...
                        </span>
                      ) : refInfo.lastRefresh?.status === 'Completed' ? (
                        <span
                          title={`Atualizado em: ${formatRefreshExact(refInfo.lastRefresh.endTime || refInfo.lastRefresh.startTime)}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '11px',
                            background: '#f0fdf4',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: '500'
                          }}
                        >
                          <CheckCircle2 className="size-3 text-emerald-600" />
                          Última atualização: {formatRefreshDistance(refInfo.lastRefresh.endTime || refInfo.lastRefresh.startTime)}
                        </span>
                      ) : refInfo.lastRefresh?.status === 'Failed' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            title={`Tentativa em: ${formatRefreshExact(refInfo.lastRefresh.endTime || refInfo.lastRefresh.startTime)}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '11px',
                              background: '#fef2f2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontWeight: '500'
                            }}
                          >
                            <AlertTriangle className="size-3 text-red-600" />
                            Última atualização: Falhou ({formatRefreshDistance(refInfo.lastRefresh.endTime || refInfo.lastRefresh.startTime)})
                          </span>

                          {/* Botão Ver Motivo do Erro (Apenas ADMIN) */}
                          {isAdmin && refInfo.lastFailedRefresh && (
                            <button
                              onClick={() => setErrorModalData({ reportTitle: activeTab.bi.title, ...refInfo.lastFailedRefresh })}
                              className="boing-effect"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                background: '#fee2e2',
                                color: '#991b1b',
                                border: '1px solid #f87171',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                              title="Clique para ver o motivo técnico do erro"
                            >
                              <Info className="size-3" />
                              Ver motivo do erro
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Botão Atualizar Dados (Apenas ADMIN) */}
                {isAdmin && (
                  <Button
                    onClick={() => handleTriggerRefresh(activeTab.bi.id)}
                    disabled={refreshDataMap[activeTab.bi.id]?.isRefreshing || isTriggeringRefresh}
                    title={refreshDataMap[activeTab.bi.id]?.isRefreshing ? 'Atualização já em andamento no Power BI' : 'Atualizar dados da fonte no Power BI'}
                    className="font-bold flex items-center gap-1.5"
                    style={{
                      background: refreshDataMap[activeTab.bi.id]?.isRefreshing ? '#f1f5f9' : '#e0f2fe',
                      color: refreshDataMap[activeTab.bi.id]?.isRefreshing ? '#94a3b8' : '#0369a1'
                    }}
                  >
                    <RefreshCw className={cn('size-[16px]', (refreshDataMap[activeTab.bi.id]?.isRefreshing || isTriggeringRefresh) && 'animate-spin')} />
                    {refreshDataMap[activeTab.bi.id]?.isRefreshing ? 'Atualizando...' : 'Atualizar Dados'}
                  </Button>
                )}

                <Button
                  onClick={() => setIsFullscreenVisible(false)}
                  title="Escolher outro painel (mantém este aberto em segundo plano)"
                  className="font-bold"
                  style={{ background: '#fff3e0', color: '#f57c00' }}
                >
                  <Plus className="size-[18px]" />
                  Novo painel
                </Button>
                <Button
                  onClick={() => {
                    recarregarBI(activeTab.bi.id);
                    fetchRefreshStatus(activeTab.bi.id, true);
                  }}
                  title="Recarregar apenas este painel na tela"
                  className="font-bold"
                  style={{ background: '#e3f2fd', color: '#1565c0' }}
                >
                  <RotateCw className={cn("size-[18px]", activeTab.loading && "animate-spin")} />
                  Recarregar
                </Button>
                <Button
                  onClick={() => fecharTab(activeTab.bi.id)}
                  className="font-bold"
                  style={{ background: '#ffebee', color: '#c62828' }}
                >
                  <X className="size-[18px]" />
                  Fechar
                </Button>
              </div>
            </div>
          </div>

          {/* Modal de Detalhes da Falha na Atualização (Apenas ADMIN) */}
          {errorModalData && (
            <Dialog open={!!errorModalData} onOpenChange={(open) => { if (!open) setErrorModalData(null); }}>
              <DialogContent className="max-w-2xl !z-[10000005]" overlayClassName="!z-[10000004]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="size-5 text-red-600" />
                    Detalhes da Falha na Atualização
                  </DialogTitle>
                  <DialogDescription>
                    Relatório: <strong>{errorModalData.reportTitle}</strong>
                    {errorModalData.endTime && (
                      <> • Tentativa em: {format(new Date(errorModalData.endTime), "dd/MM/yyyy 'às' HH:mm:ss")}</>
                    )}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Código do Erro */}
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Código do Erro:</span>
                    <div className="mt-1 font-mono text-xs bg-muted/60 p-2.5 rounded-lg text-foreground font-semibold">
                      {errorModalData.errorCode || 'Desconhecido'}
                    </div>
                  </div>

                  {/* Mensagem da Fonte / Power BI */}
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mensagem da Fonte / Power BI:</span>
                    <div className="mt-1 font-mono text-xs bg-red-50 text-red-900 border border-red-200 p-3.5 rounded-lg max-h-64 overflow-y-auto whitespace-pre-wrap break-all select-all">
                      {errorModalData.errorDescription || errorModalData.raw || 'Nenhuma descrição detalhada retornada pela API.'}
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-6 flex justify-between items-center sm:justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const textToCopy = `Falha na Atualização do BI: ${errorModalData.reportTitle}\nData: ${errorModalData.endTime || ''}\nCódigo: ${errorModalData.errorCode || ''}\nErro: ${errorModalData.errorDescription || errorModalData.raw || ''}`;
                      navigator.clipboard.writeText(textToCopy);
                      setHasCopiedError(true);
                      toast.success('Detalhes copiados para a área de transferência!');
                      setTimeout(() => setHasCopiedError(false), 2500);
                    }}
                    className="flex items-center gap-1.5"
                  >
                    {hasCopiedError ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                    {hasCopiedError ? 'Copiado!' : 'Copiar Detalhes'}
                  </Button>

                  <Button
                    onClick={() => setErrorModalData(null)}
                    style={{ background: '#f57c00' }}
                  >
                    Fechar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
