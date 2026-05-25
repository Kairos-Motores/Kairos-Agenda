import React, { useState, useEffect, useRef } from 'react';
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
  viewMode: externalViewMode,
  onViewModeChange,
}) => {
  const [internalViewMode, setInternalViewMode] = useState('grid');
  const viewMode = externalViewMode ?? internalViewMode;
  const isMobile = useMediaQuery('(max-width: 768px)');

  const setViewMode = (mode) => {
    if (onViewModeChange) onViewModeChange(mode);
    else setInternalViewMode(mode);
  };

  const devWorkspace = workspaces.find(ws => ws.cr4a1_nome === "Desenvolvimento e Inovação");
  const devWorkspaceId = devWorkspace?.cr4a1_calendarios_workspacesid;

  // ===== Hooks do carrossel (agora no escopo do componente) =====
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef(null);

  // Efeito para detectar scroll e atualizar slide ativo
  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const slideWidth = container.clientWidth * (isMobile ? 0.95 : 0.85) + 24; // gap
      const index = Math.round(scrollLeft / slideWidth);
      setActiveIndex(index);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  // Função para scroll programático (setas + dots)
  const scrollToSlide = (index) => {
    if (!carouselRef.current) return;
    const slideWidth = carouselRef.current.clientWidth * (isMobile ? 0.95 : 0.85) + 24;
    carouselRef.current.scrollTo({ left: index * slideWidth, behavior: 'smooth' });
  };

  // ===== Renderizadores =====
  const renderCard = (event) => {
    const currentWorkspace = workspaces.find(
      ws => ws.cr4a1_calendarios_workspacesid === event.cr4a1_workspace_id
    );
    const workspaceColor = currentWorkspace?.cr4a1_cor_hex || 'var(--border-color)';
    const workspaceName = currentWorkspace?.cr4a1_nome || '';
    const isDevWorkspace = event.cr4a1_workspace_id === devWorkspaceId;

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
        style={{
          background: 'var(--bg-primary)',
          border: `1px solid ${currentWorkspace ? workspaceColor : 'var(--border-color)'}`,
          borderRadius: cardRadius,
          padding: cardPadding,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
          position: 'relative',
          transition: 'box-shadow 0.2s, border-color 0.2s',
        }}
        onMouseEnter={(e) => { if (!isMobile) e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.06)'; }}
        onMouseLeave={(e) => { if (!isMobile) e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)'; }}
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

        {isDevWorkspace && totalSubtasks > 0 && (
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
      {events.map(event => renderCard(event))}
    </div>
  );

  const renderList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '10px 0' }}>
      {events.map(event => {
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
    const grouped = events.reduce((acc, event) => {
      const tipo = event.cr4a1_tipo || 'Sem tipo';
      if (!acc[tipo]) acc[tipo] = [];
      acc[tipo].push(event);
      return acc;
    }, {});

    const tipos = Object.keys(grouped);
    if (tipos.length === 0) return <p>Nenhum evento para exibir.</p>;

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

        {/* Controles + indicadores */}
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
      {viewMode === 'grid' && renderGrid()}
      {viewMode === 'list' && renderList()}
      {viewMode === 'carousel' && renderCarousel()}
    </div>
  );
};