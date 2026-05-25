import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const ListView = ({
  events,
  allUsers,
  eventTypes,
  onEdit,
  onDelete,
  workspaces = [],
  viewMode: externalViewMode, // opcional: controle externo do modo
  onViewModeChange,           // callback para alterar o modo externo
}) => {
  // Se não houver controle externo, usamos estado interno
  const [internalViewMode, setInternalViewMode] = useState('grid');
  const viewMode = externalViewMode ?? internalViewMode;

  const setViewMode = (mode) => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setInternalViewMode(mode);
    }
  };

  // Workspace técnico da Kairós (usado para progresso)
  const devWorkspace = workspaces.find(ws => ws.cr4a1_nome === "Desenvolvimento e Inovação");
  const devWorkspaceId = devWorkspace?.cr4a1_calendarios_workspacesid;

  // Função auxiliar para renderizar um card individual (reutilizada no grid e no carrossel)
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
    const percentage = totalSubtasks > 0
      ? Math.round((completedCount / totalSubtasks) * 100)
      : 0;

    return (
      <div
        key={event.cr4a1_agenda_kairosid}
        style={{
          background: 'var(--bg-primary)',
          border: `1px solid ${currentWorkspace ? workspaceColor : 'var(--border-color)'}`,
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
          position: 'relative',
        }}
      >
        <div>
          {/* Metadados superiores */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
              {event.cr4a1_data_inicio
                ? format(new Date(event.cr4a1_data_inicio.split('T')[0] + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR })
                : ''}
            </span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {workspaceName && (
                <span style={{
                  fontSize: '10px', fontWeight: '700', color: workspaceColor,
                  padding: '3px 8px', background: 'var(--bg-secondary)', borderRadius: '6px',
                  border: `1px solid ${workspaceColor}33`, textTransform: 'uppercase', letterSpacing: '0.3px'
                }}>
                  {workspaceName}
                </span>
              )}
              <span style={{
                fontSize: '11px', fontWeight: '800', color: 'var(--text-accent)',
                padding: '4px 8px', background: 'var(--bg-tertiary)', borderRadius: '6px'
              }}>
                {event.cr4a1_tipo || 'Compromisso'}
              </span>
            </div>
          </div>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-title)', fontSize: '17px', fontWeight: '700' }}>
            {event.cr4a1_titulo}
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px 0', lineHeight: '1.5' }}>
            {event.cr4a1_detalhes || event.cr4a1_descricao || 'Sem descrição cadastrada.'}
          </p>
        </div>

        {isDevWorkspace && totalSubtasks > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', padding: '10px 14px',
            background: 'var(--bg-secondary)', borderRadius: '12px', marginBottom: '16px',
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
            style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: '600', borderRadius: '10px' }}
          >
            Editar Ficha
          </button>
          <button
            onClick={() => onDelete(event)}
            className="icon-btn"
            style={{
              width: '38px', height: '38px', borderRadius: '10px',
              border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#e74c3c'
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span>
          </button>
        </div>
      </div>
    );
  };

  // Renderização do modo Grid
  const renderGrid = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
      gap: '20px',
      padding: '10px 0'
    }}>
      {events.map(event => renderCard(event))}
    </div>
  );

  // Renderização do modo Lista (linhas simples)
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
              padding: '12px 16px',
              background: 'var(--bg-primary)',
              borderRadius: '12px',
              border: `1px solid var(--border-color)`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
              transition: 'background 0.15s',
              cursor: 'pointer',
            }}
            onClick={() => onEdit(event)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 2 }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-title)' }}>
                {event.cr4a1_titulo}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {event.cr4a1_data_inicio
                  ? format(new Date(event.cr4a1_data_inicio.split('T')[0] + 'T12:00:00'), "dd/MM")
                  : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
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
            <div style={{ marginLeft: '12px', display: 'flex', gap: '4px' }}>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(event); }}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--text-secondary)', fontSize: '18px'
                }}
              >
                <span className="material-symbols-rounded">edit</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(event); }}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: '#e74c3c', fontSize: '18px'
                }}
              >
                <span className="material-symbols-rounded">delete</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Renderização do Carrossel por tipo de evento
  const renderCarousel = () => {
    // Agrupar eventos por cr4a1_tipo (fallback "Sem tipo")
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
          className="carousel-container"
          style={{
            display: 'flex',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            gap: '24px',
            paddingBottom: '10px',
          }}
        >
          {tipos.map(tipo => (
            <div
              key={tipo}
              style={{
                flex: '0 0 85%',  // largura do slide
                scrollSnapAlign: 'start',
                background: 'var(--bg-secondary)',
                borderRadius: '16px',
                padding: '16px',
                border: '1px solid var(--border-color)',
              }}
            >
              <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: 'var(--text-title)' }}>
                {tipo}
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',  // EXATAMENTE 2 COLUNAS
                gap: '16px'
              }}>
                {grouped[tipo].map(event => renderCard(event))}
              </div>
            </div>
          ))}
        </div>
        {/* Controles de navegação */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
          <button
            onClick={() => {
              const container = document.querySelector('.carousel-container');
              if (container) container.scrollBy({ left: -320, behavior: 'smooth' });
            }}
            style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}
          >
            <span className="material-symbols-rounded">chevron_left</span>
          </button>
          <button
            onClick={() => {
              const container = document.querySelector('.carousel-container');
              if (container) container.scrollBy({ left: 320, behavior: 'smooth' });
            }}
            style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}
          >
            <span className="material-symbols-rounded">chevron_right</span>
          </button>
        </div>
      </div>
    );
  };

  // Seletor de visualização (ícones)
  const renderViewSelector = () => (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      {['grid', 'list', 'carousel'].map(mode => (
        <button
          key={mode}
          onClick={() => setViewMode(mode)}
          style={{
            padding: '8px 12px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            background: viewMode === mode ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
            fontWeight: viewMode === mode ? '700' : '500',
            cursor: 'pointer',
            fontSize: '14px',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span className="material-symbols-rounded">
            {mode === 'grid' ? 'grid_view' : mode === 'list' ? 'view_list' : 'view_carousel'}
          </span>
          {mode === 'grid' ? 'Grade' : mode === 'list' ? 'Lista' : 'Carrossel'}
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