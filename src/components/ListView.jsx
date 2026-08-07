import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
};

export const ListView = ({
  events,
  allUsers,
  eventTypes,
  onEdit,
  onDelete,
  workspaces = [],
  activeWorkspaces = [], // Controla a visibilidade global
  viewMode: externalViewMode,
  onViewModeChange,
}) => {
  const [internalViewMode, setInternalViewMode] = useState('grid');
  const viewMode = externalViewMode ?? internalViewMode;
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [statusFilter, setStatusFilter] = useState('Todos');
  const [assigneeFilter, setAssigneeFilter] = useState('Todos');

  const setViewMode = useCallback((mode) => {
    if (onViewModeChange) onViewModeChange(mode);
    else setInternalViewMode(mode);
  }, [onViewModeChange]);

  // Extrai responsáveis APENAS dos workspaces que estão ativos no momento (Lógica Universal)
  const uniqueAssignees = Array.from(new Set(
    events
      .filter(e => activeWorkspaces.length === 0 || activeWorkspaces.includes(e.cr4a1_workspace_id))
      .map(e => e.cr4a1_user_login || 'Sem responsável')
  ));

  // Verifica se há alguma tarefa com subtasks nos workspaces ativos para exibir a barra de filtros
  const hasSubtaskEvents = events.some(e => {
    if (activeWorkspaces.length > 0 && !activeWorkspaces.includes(e.cr4a1_workspace_id)) return false;
    const sub = typeof e.cr4a1_subtasks === 'string' ? JSON.parse(e.cr4a1_subtasks || '[]') : (e.cr4a1_subtasks || []);
    return sub.length > 0;
  });

  const processedEvents = events.filter(event => {
    // 1. Filtro Global de Workspaces
    if (activeWorkspaces.length > 0 && event.cr4a1_workspace_id) {
       if (!activeWorkspaces.includes(event.cr4a1_workspace_id)) return false;
    }

    // 2. Lógica Universal de Status (para qualquer card com subtarefas)
    const subtasks = event.cr4a1_subtasks
      ? (typeof event.cr4a1_subtasks === 'string' ? JSON.parse(event.cr4a1_subtasks) : event.cr4a1_subtasks)
      : [];
    
    const completedCount = subtasks.filter(s => s.completed).length;
    const totalSubtasks = subtasks.length;
    const percentage = totalSubtasks > 0 ? Math.round((completedCount / totalSubtasks) * 100) : 0;
    
    let status = 'Em andamento';
    if (totalSubtasks > 0 && percentage === 100) {
      status = 'Concluído';
    } else {
      const dataFim = event.cr4a1_data_fim ? new Date(event.cr4a1_data_fim + 'T23:59:59') : null;
      if (dataFim && dataFim < new Date() && percentage < 100) {
        status = 'Atrasado';
      }
    }

    if (statusFilter !== 'Todos' && status !== statusFilter) return false;

    const assignee = event.cr4a1_user_login || 'Sem responsável';
    if (assigneeFilter !== 'Todos' && assignee !== assigneeFilter) return false;

    return true;
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef(null);
  const isMobileRef = useRef(isMobile);
  useEffect(() => { isMobileRef.current = isMobile; }, [isMobile]);

  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollLeft, clientWidth } = container;
      const gap = 24;
      const slideWidth = clientWidth * (isMobileRef.current ? 0.95 : 0.85) + gap;
      const index = Math.round(scrollLeft / slideWidth);
      setActiveIndex(index);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSlide = (index) => {
    const container = carouselRef.current;
    if (!container) return;
    const gap = 24;
    const slideWidth = container.clientWidth * (isMobile ? 0.95 : 0.85) + gap;
    container.scrollTo({ left: index * slideWidth, behavior: 'smooth' });
  };

  const renderCard = (event) => {
    const currentWorkspace = workspaces.find(
      ws => ws.cr4a1_calendarios_workspacesid === event.cr4a1_workspace_id
    );
    const workspaceColor = currentWorkspace?.cr4a1_cor_hex || 'var(--border-color)';
    const workspaceName = currentWorkspace?.cr4a1_nome || '';

    const subtasks = event.cr4a1_subtasks
      ? (typeof event.cr4a1_subtasks === 'string'
          ? JSON.parse(event.cr4a1_subtasks)
          : event.cr4a1_subtasks)
      : [];
    const completedCount = subtasks.filter(s => s.completed).length;
    const totalSubtasks = subtasks.length;
    const percentage = totalSubtasks > 0 ? Math.round((completedCount / totalSubtasks) * 100) : 0;

    const cardPadding = isMobile ? '16px' : '20px';
    const cardRadius = isMobile ? '16px' : '20px';
    const titleSize = isMobile ? '16px' : '17px';
    const btnSize = isMobile ? '44px' : '38px';
    const btnRadius = isMobile ? '12px' : '10px';

    return (
      <div
        key={event.cr4a1_agenda_kairosid}
        className="animated-border-card"
        style={{
          '--border-gradient-color': currentWorkspace ? workspaceColor : 'var(--text-accent)',
          borderRadius: cardRadius,
          padding: cardPadding,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
              {event.cr4a1_data_inicio
                ? format(new Date(event.cr4a1_data_inicio.split('T')[0] + 'T12:00:00'), isMobile ? "dd/MM" : "dd 'de' MMM", { locale: ptBR })
                : ''}
            </span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {workspaceName && (
                <span style={{
                  fontSize: '10px', fontWeight: '700', color: workspaceColor,
                  padding: '2px 6px', background: 'var(--bg-secondary)', borderRadius: '6px',
                  border: `1px solid ${workspaceColor}33`, textTransform: 'uppercase', letterSpacing: '0.3px',
                  whiteSpace: 'nowrap'
                }}>
                  {workspaceName}
                </span>
              )}
              <span style={{
                fontSize: '11px', fontWeight: '800', color: 'var(--text-accent)',
                padding: '2px 6px', background: 'var(--bg-tertiary)', borderRadius: '6px',
                whiteSpace: 'nowrap'
              }}>
                {event.cr4a1_tipo || 'Compromisso'}
              </span>
            </div>
          </div>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-title)', fontSize: titleSize, fontWeight: '700', lineHeight: 1.3 }}>
            {event.cr4a1_titulo}
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: '1.5' }}>
            {event.cr4a1_detalhes || event.cr4a1_descricao || 'Sem descrição cadastrada.'}
          </p>
        </div>

        {totalSubtasks > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', padding: '8px 12px',
            background: 'var(--bg-secondary)', borderRadius: '12px', marginBottom: '12px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: percentage === 100 ? '#22c55e' : 'var(--text-accent)' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                  {percentage === 100 ? 'task_alt' : 'inventory'}
                </span>
                <span>{percentage}% concluído</span>
              </div>
              <span style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>
                {completedCount}/{totalSubtasks} subtasks
              </span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: 'auto' }}>
          <button
            onClick={() => onEdit(event)}
            className="btn-secondary"
            style={{
              flex: 1, padding: isMobile ? '12px' : '10px', fontSize: '13px', fontWeight: '600',
              borderRadius: btnRadius, minHeight: btnSize, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            Editar Ficha
          </button>
          <button
            onClick={() => onDelete(event)}
            className="icon-btn"
            style={{
              width: btnSize, height: btnSize, borderRadius: btnRadius,
              border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
              color: '#e74c3c', display: 'flex', alignItems: 'center', justifyContent: 'center',
              minWidth: btnSize, minHeight: btnSize
            }}
            aria-label="Excluir evento"
          >
            <span className="material-symbols-rounded" style={{ fontSize: isMobile ? '20px' : '18px' }}>delete</span>
          </button>
        </div>
      </div>
    );
  };

  const renderGrid = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(310px, 1fr))',
      gap: isMobile ? '16px' : '20px',
      padding: '10px 0'
    }}>
      {processedEvents.map(event => renderCard(event))}
    </div>
  );

  const renderList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '10px 0' }}>
      {processedEvents.map(event => {
        const currentWorkspace = workspaces.find(
          ws => ws.cr4a1_calendarios_workspacesid === event.cr4a1_workspace_id
        );
        const workspaceColor = currentWorkspace?.cr4a1_cor_hex || 'var(--border-color)';
        const workspaceName = currentWorkspace?.cr4a1_nome || '';

        return (
          <div
            key={event.cr4a1_agenda_kairosid}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: isMobile ? '12px 12px' : '12px 16px',
              background: 'var(--bg-primary)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'background 0.15s',
              cursor: 'pointer',
              flexWrap: 'wrap',
              gap: '8px'
            }}
            onClick={() => onEdit(event)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: isMobile ? '1 1 auto' : 2 }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-title)', wordBreak: 'break-word' }}>
                {event.cr4a1_titulo}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {event.cr4a1_data_inicio
                  ? format(new Date(event.cr4a1_data_inicio.split('T')[0] + 'T12:00:00'), "dd/MM")
                  : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: isMobile ? '0 0 auto' : 1, justifyContent: 'flex-end' }}>
              {workspaceName && (
                <span style={{
                  fontSize: '10px', fontWeight: '700', color: workspaceColor,
                  padding: '2px 8px', background: 'var(--bg-secondary)', borderRadius: '6px',
                  border: `1px solid ${workspaceColor}33`, textTransform: 'uppercase'
                }}>
                  {workspaceName}
                </span>
              )}
              <span style={{
                fontSize: '11px', fontWeight: '700', color: 'var(--text-accent)',
                padding: '2px 8px', background: 'var(--bg-tertiary)', borderRadius: '6px'
              }}>
                {event.cr4a1_tipo || 'Compromisso'}
              </span>
            </div>
            
            {/* BOTÕES DE AÇÃO RESTAURADOS */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(event); }}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--text-secondary)', fontSize: isMobile ? '20px' : '18px',
                  padding: isMobile ? '8px' : '4px', borderRadius: '50%',
                  width: isMobile ? '44px' : 'auto', height: isMobile ? '44px' : 'auto',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                aria-label="Editar evento"
              >
                <span className="material-symbols-rounded">edit</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(event); }}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: '#e74c3c', fontSize: isMobile ? '20px' : '18px',
                  padding: isMobile ? '8px' : '4px', borderRadius: '50%',
                  width: isMobile ? '44px' : 'auto', height: isMobile ? '44px' : 'auto',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                aria-label="Excluir evento"
              >
                <span className="material-symbols-rounded">delete</span>
              </button>
            </div>

          </div>
        );
      })}
    </div>
  );

  const renderCarousel = () => {
    const grouped = processedEvents.reduce((acc, event) => {
      const tipo = event.cr4a1_tipo || 'Sem tipo';
      if (!acc[tipo]) acc[tipo] = [];
      acc[tipo].push(event);
      return acc;
    }, {});

    const tipos = Object.keys(grouped);
    if (tipos.length === 0) return <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Nenhum evento corresponde aos filtros.</p>;

    return (
      <div style={{ padding: '10px 0' }}>
        <div
          ref={carouselRef}
          className="carousel-container"
          style={{
            display: 'flex',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            gap: '24px',
            paddingBottom: '10px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <style>{`.carousel-container::-webkit-scrollbar { display: none; }`}</style>
          {tipos.map(tipo => (
            <div
              key={tipo}
              style={{
                flex: `0 0 ${isMobile ? '95%' : '85%'}`,
                scrollSnapAlign: 'start',
                background: 'var(--bg-secondary)',
                borderRadius: '16px',
                padding: isMobile ? '12px' : '16px',
                border: '1px solid var(--border-color)',
              }}
            >
              <h4 style={{ margin: '0 0 16px 0', fontSize: isMobile ? '15px' : '16px', fontWeight: '700', color: 'var(--text-title)' }}>
                {tipo}
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: isMobile ? '12px' : '16px'
              }}>
                {grouped[tipo].map(event => renderCard(event))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
          <button
            onClick={() => carouselRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
            style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            aria-label="Slide anterior"
          >
            <span className="material-symbols-rounded">chevron_left</span>
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {tipos.map((_, index) => (
              <div
                key={index}
                onClick={() => scrollToSlide(index)}
                style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: index === activeIndex ? 'var(--text-accent)' : 'var(--border-color)',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              />
            ))}
          </div>

          <button
            onClick={() => carouselRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
            style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            aria-label="Próximo slide"
          >
            <span className="material-symbols-rounded">chevron_right</span>
          </button>
        </div>
      </div>
    );
  };

  const renderViewSelector = () => (
    <div style={{
      display: 'flex', justifyContent: isMobile ? 'space-between' : 'flex-start',
      gap: '8px', marginBottom: '16px', flexWrap: 'wrap'
    }}>
      {['grid', 'list', 'carousel'].map(mode => (
        <button
          key={mode}
          onClick={() => setViewMode(mode)}
          style={{
            padding: isMobile ? '8px 12px' : '8px 16px',
            borderRadius: '20px',
            border: viewMode === mode ? '2px solid var(--text-accent)' : '1px solid var(--border-color)',
            background: viewMode === mode ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
            fontWeight: viewMode === mode ? '700' : '500',
            cursor: 'pointer',
            fontSize: isMobile ? '13px' : '14px',
            color: viewMode === mode ? 'var(--text-accent)' : 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flex: isMobile ? '1 1 auto' : '0 0 auto',
            justifyContent: 'center',
            transition: 'all 0.2s',
            minWidth: '0',
          }}
          title={`Visualização em ${mode === 'grid' ? 'grade' : mode === 'list' ? 'lista' : 'carrossel'}`}
        >
          <span className="material-symbols-rounded" style={{ fontSize: isMobile ? '20px' : '18px' }}>
            {mode === 'grid' ? 'grid_view' : mode === 'list' ? 'view_list' : 'view_carousel'}
          </span>
          {isMobile ? (
            <span style={{ fontSize: '12px' }}>{mode === 'grid' ? 'Grade' : mode === 'list' ? 'Lista' : 'Carrossel'}</span>
          ) : (
            <span>{mode === 'grid' ? 'Grade' : mode === 'list' ? 'Lista' : 'Carrossel'}</span>
          )}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      {renderViewSelector()}

      {hasSubtaskEvents && (
        <div style={{ 
          display: 'flex', gap: '12px', marginBottom: '16px', 
          padding: '12px', background: 'var(--bg-secondary)', 
          borderRadius: '16px', border: '1px solid var(--border-color)',
          flexWrap: 'wrap', alignItems: 'center'
        }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>
            Filtros de Tarefas:
          </span>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            style={{ 
              padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', 
              background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px',
              outline: 'none', cursor: 'pointer'
            }}
          >
            <option value="Todos">Status: Todos</option>
            <option value="Em andamento">🚧 Em andamento</option>
            <option value="Concluído">✅ Concluído</option>
            <option value="Atrasado">⚠️ Atrasado</option>
          </select>

          <select 
            value={assigneeFilter} 
            onChange={e => setAssigneeFilter(e.target.value)}
            style={{ 
              padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', 
              background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px',
              outline: 'none', cursor: 'pointer'
            }}
          >
            <option value="Todos">Responsável: Todos</option>
            {uniqueAssignees.map(user => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>
        </div>
      )}

      {viewMode === 'grid' && renderGrid()}
      {viewMode === 'list' && renderList()}
      {viewMode === 'carousel' && renderCarousel()}
    </div>
  );
};