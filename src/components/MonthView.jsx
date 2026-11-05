import React, { useMemo } from 'react';
import {
  format,
  parseISO,
  isSameMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { DroppableDay, DraggableEvent } from './DragDropHelpers';
import { parseAssignees } from '../utils/assignees';
import { getEventTypeLayer, typeLayerBorderStyle, typeLayerPatternStyle } from '../utils/eventTypeLayer';

export const MonthView = ({
  currentDate,
  getEventsForDay,
  getDisplayEvents,
  allUsers,
  eventTypes,
  workspaces,
  activeWorkspaces,
  wsBorderStyle,
  appMode,
  showWeekends = true,
  onViewEvent,
  onDayClick,
  onNavigateToDay,
  onDayMouseEnter,
  onDayMouseLeave,
  getEventColor,
}) => {
  // Configuração dos cabeçalhos dos dias da semana
  const weekDaysLabels = useMemo(() => {
    if (showWeekends) {
      return [
        { label: 'D', isWeekend: true },
        { label: 'S', isWeekend: false },
        { label: 'T', isWeekend: false },
        { label: 'Q', isWeekend: false },
        { label: 'Q', isWeekend: false },
        { label: 'S', isWeekend: false },
        { label: 'S', isWeekend: true },
      ];
    }
    return [
      { label: 'S', isWeekend: false },
      { label: 'T', isWeekend: false },
      { label: 'Q', isWeekend: false },
      { label: 'Q', isWeekend: false },
      { label: 'S', isWeekend: false },
    ];
  }, [showWeekends]);

  const numCols = weekDaysLabels.length;

  // Gera todos os dias do mês em blocos de semanas
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Domingo
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 }); // Sábado
    const allDays = eachDayOfInterval({ start: calStart, end: calEnd });

    const groupedWeeks = [];
    for (let i = 0; i < allDays.length; i += 7) {
      const fullWeek = allDays.slice(i, i + 7);
      if (showWeekends) {
        groupedWeeks.push(fullWeek);
      } else {
        // Filtra sábado (6) e domingo (0)
        const weekdaysOnly = fullWeek.filter(d => d.getDay() !== 0 && d.getDay() !== 6);
        if (weekdaysOnly.length > 0) {
          groupedWeeks.push(weekdaysOnly);
        }
      }
    }
    return groupedWeeks;
  }, [currentDate, showWeekends]);

  // Lista de todos os eventos ativos do período
  const allEvents = useMemo(() => {
    return typeof getDisplayEvents === 'function' ? getDisplayEvents() : [];
  }, [getDisplayEvents]);

  return (
    <div
      className="responsive-grid-container month-view-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        opacity: 1,
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          ...(appMode !== 'visitas' && activeWorkspaces.length > 1
            ? {
                background: `linear-gradient(135deg, ${workspaces
                  .filter(w => activeWorkspaces.includes(w.cr4a1_calendarios_workspacesid))
                  .map(w => w.cr4a1_cor_hex || '#3498db')
                  .join(', ')})`,
                padding: '1.5px',
                borderRadius: '20px',
              }
            : {}),
        }}
      >
        <div
          className="calendar-month-grid"
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            background: 'var(--bg-primary)',
            borderRadius: '18px',
            border: appMode !== 'visitas' && activeWorkspaces.length <= 1 ? (wsBorderStyle?.border || '1px solid var(--border-color)') : '1px solid var(--border-color)',
          }}
        >
          {/* Cabeçalho dos dias da semana (D, S, T, Q, Q, S, S) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`,
              borderBottom: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              flexShrink: 0,
            }}
          >
            {weekDaysLabels.map((d, i) => (
              <div
                key={i}
                style={{
                  textAlign: 'center',
                  color: d.isWeekend ? '#e74c3c' : 'var(--text-secondary)',
                  fontWeight: '600',
                  padding: '6px 0',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  borderRight: i < numCols - 1 ? '1px solid var(--border-color)' : 'none',
                }}
              >
                {d.label}
              </div>
            ))}
          </div>

          {/* Semanas do mês */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            {weeks.map((weekDays, weekIdx) => {
              const weekStartStr = format(weekDays[0], 'yyyy-MM-dd');
              const weekEndStr = format(weekDays[weekDays.length - 1], 'yyyy-MM-dd');

              // Eventos que interceptam esta semana
              const weekEvents = allEvents.filter(ev => {
                const s = ev.cr4a1_data_inicio?.split('T')[0];
                const e = ev.cr4a1_data_fim?.split('T')[0] || s;
                if (!s || !e) return false;
                return s <= weekEndStr && e >= weekStartStr;
              });

              // Separa multi-dia e dia único
              const multiDayEvents = [];
              const singleDayMap = {};
              weekDays.forEach(d => {
                singleDayMap[format(d, 'yyyy-MM-dd')] = [];
              });

              weekEvents.forEach(ev => {
                if (ev.isIntervalo) return;
                const s = ev.cr4a1_data_inicio?.split('T')[0];
                const e = ev.cr4a1_data_fim?.split('T')[0] || s;
                const isMulti = s !== e;

                if (isMulti) {
                  // Determina coluna inicial e final na grade da semana
                  let startCol = weekDays.findIndex(d => format(d, 'yyyy-MM-dd') === s);
                  if (startCol === -1) {
                    // Começou antes do primeiro dia desta semana (ou em fim de semana oculto)
                    startCol = 0;
                  }

                  let endCol = weekDays.findIndex(d => format(d, 'yyyy-MM-dd') === e);
                  if (endCol === -1) {
                    // Termina após o último dia desta semana (ou em fim de semana oculto)
                    endCol = weekDays.length - 1;
                  }

                  if (startCol > endCol) startCol = endCol;

                  const isFirstSegment = s >= weekStartStr;
                  const isLastSegment = e <= weekEndStr;
                  const color = ev.cr4a1_cor || (getEventColor ? getEventColor(ev) : '#3498db');
                  const typeLayer = getEventTypeLayer(ev.cr4a1_tipo, eventTypes);
                  const assignees = parseAssignees(ev.cr4a1_user_login);

                  multiDayEvents.push({
                    event: ev,
                    startCol,
                    endCol,
                    isFirstSegment,
                    isLastSegment,
                    eventColor: color,
                    typeLayer,
                    assignees,
                  });
                }
              });

              // Preenche os eventos de dia único
              weekDays.forEach(d => {
                const dateStr = format(d, 'yyyy-MM-dd');
                const dayEvs = (typeof getEventsForDay === 'function' ? getEventsForDay(d) : []).filter(ev => {
                  if (ev.isIntervalo) return false;
                  const s = ev.cr4a1_data_inicio?.split('T')[0];
                  const e = ev.cr4a1_data_fim?.split('T')[0] || s;
                  return s === e; // Apenas eventos que começam e terminam no mesmo dia
                });
                singleDayMap[dateStr] = dayEvs;
              });

              // Algoritmo guloso de alocação de faixas (tracks) para eventos multi-dia
              multiDayEvents.sort((a, b) => {
                if (a.startCol !== b.startCol) return a.startCol - b.startCol;
                return (b.endCol - b.startCol) - (a.endCol - a.startCol);
              });

              const tracks = [];
              const placedMultiEvents = [];
              multiDayEvents.forEach(item => {
                let trackIdx = 0;
                while (trackIdx < tracks.length && tracks[trackIdx] >= item.startCol) {
                  trackIdx++;
                }
                if (trackIdx >= tracks.length) {
                  tracks.push(item.endCol);
                } else {
                  tracks[trackIdx] = item.endCol;
                }
                placedMultiEvents.push({ ...item, trackIdx });
              });

              const maxTracks = tracks.length;

              return (
                <div
                  key={weekStartStr}
                  className="calendar-week-row"
                  style={{
                    position: 'relative',
                    display: 'grid',
                    gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`,
                    flex: 1,
                    minHeight: 0,
                    borderBottom: weekIdx < weeks.length - 1 ? '1px solid var(--border-color)' : 'none',
                    overflow: 'hidden',
                  }}
                >
                  {/* Células de fundo e alvos droppables para cada dia da semana */}
                  {weekDays.map((day, colIdx) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const singleEvents = singleDayMap[dateStr] || [];
                    const allDayEvents = typeof getEventsForDay === 'function' ? getEventsForDay(day) : [];

                    return (
                      <DroppableDay
                        key={dateStr}
                        dateStr={dateStr}
                        isToday={isToday}
                        onClick={() => {
                          if (appMode === 'visitas') {
                            const visitasDoDia = allDayEvents.filter(e => e.isVisitaPrincipal);
                            if (visitasDoDia.length > 0) {
                              onDayClick(dateStr, visitasDoDia);
                              return;
                            }
                          }
                          if (typeof onNavigateToDay === 'function') {
                            onNavigateToDay(day);
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (allDayEvents.length > 0 && appMode !== 'visitas' && typeof onDayMouseEnter === 'function') {
                            onDayMouseEnter(dateStr, allDayEvents, e.currentTarget.getBoundingClientRect());
                          }
                        }}
                        onMouseLeave={onDayMouseLeave}
                        style={{
                          borderRight: colIdx < numCols - 1 ? '1px solid var(--border-color)' : 'none',
                          background: isToday ? 'var(--bg-tertiary)' : (isCurrentMonth ? 'var(--bg-primary)' : 'var(--bg-page)'),
                          opacity: isCurrentMonth ? 1 : 0.5,
                          height: '100%',
                          minHeight: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          padding: '3px 4px',
                          overflow: 'hidden',
                          minWidth: 0,
                          boxSizing: 'border-box',
                        }}
                      >
                        {/* Indicador numérico do dia */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            alignSelf: 'center',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: isToday
                              ? (appMode === 'visitas' ? '#f57c00' : 'var(--text-accent)')
                              : 'transparent',
                            color: isToday ? 'white' : 'var(--text-primary)',
                            fontWeight: isToday ? '700' : '500',
                            fontSize: '11px',
                            marginBottom: '2px',
                            flexShrink: 0,
                          }}
                        >
                          {format(day, 'd')}
                        </div>

                        {/* Espaçador para acomodar faixas contínuas de eventos multi-dia */}
                        {maxTracks > 0 && (
                          <div
                            style={{
                              height: `${maxTracks * 22}px`,
                              flexShrink: 0,
                              pointerEvents: 'none',
                            }}
                          />
                        )}

                        {/* Lista de eventos de dia único */}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            flex: 1,
                            minHeight: 0,
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            padding: '0 1px',
                            minWidth: 0,
                            width: '100%',
                            boxSizing: 'border-box',
                          }}
                        >
                          {singleEvents.map((e, idx) => {
                            const eventAssignees = parseAssignees(e.cr4a1_user_login);
                            const eventColor = e.cr4a1_cor || (getEventColor ? getEventColor(e) : '#3498db');
                            const typeLayer = getEventTypeLayer(e.cr4a1_tipo, eventTypes);
                            let badgeStyle = {
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '4px',
                              overflow: 'hidden',
                              width: '100%',
                              boxSizing: 'border-box',
                              fontSize: '11px',
                              fontWeight: '600',
                              padding: '2px 4px',
                              color: '#fff',
                              background: eventColor,
                              opacity: 1,
                              border: '1px solid rgba(255,255,255,0.2)',
                              ...(typeLayer.layer === 'borda' ? typeLayerBorderStyle(typeLayer.color) : {}),
                              ...(typeLayer.layer === 'padrao' ? typeLayerPatternStyle(typeLayer.color) : {}),
                            };
                            if (appMode === 'visitas' && e.isVisitaPrincipal) {
                              badgeStyle.fontWeight = 'bold';
                              badgeStyle.padding = '3px 5px';
                            } else if (appMode !== 'visitas') {
                              badgeStyle.opacity = e.cr4a1_privado ? 0.7 : 1;
                            }

                            return (
                              <DraggableEvent key={e.cr4a1_agenda_kairosid} event={e} index={idx}>
                                <div
                                  className="event-badge boing-effect"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    if (typeof onViewEvent === 'function') {
                                      onViewEvent(e, ev.currentTarget.getBoundingClientRect());
                                    }
                                  }}
                                  style={badgeStyle}
                                >
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                                    {typeLayer.layer === 'icone' && typeLayer.emoji && (
                                      <span style={{ marginRight: '3px' }}>{typeLayer.emoji}</span>
                                    )}
                                    {!e.cr4a1_dia_inteiro && e.cr4a1_hora_inicio && (
                                      <span style={{ fontWeight: '700', marginRight: '3px' }}>{e.cr4a1_hora_inicio}</span>
                                    )}
                                    {e.cr4a1_privado ? '🔒 ' : ''}
                                    {e.cr4a1_titulo}
                                  </span>
                                  {eventAssignees.length > 1 && (
                                    <span style={{ display: 'flex', gap: '2px', flexShrink: 0 }} title={eventAssignees.join(', ')}>
                                      {eventAssignees.slice(0, 3).map((u, i) => (
                                        <span
                                          key={i}
                                          style={{
                                            width: '5px',
                                            height: '5px',
                                            borderRadius: '50%',
                                            background: allUsers.find(au => au.cr4a1_username === u)?.cr4a1_cor || 'rgba(255,255,255,0.9)',
                                            border: '1px solid rgba(255,255,255,0.8)',
                                          }}
                                        />
                                      ))}
                                    </span>
                                  )}
                                </div>
                              </DraggableEvent>
                            );
                          })}
                        </div>
                      </DroppableDay>
                    );
                  })}

                  {/* Camada superior: faixas contínuas de eventos multi-dia (estilo Google Calendar) */}
                  {maxTracks > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '29px',
                        left: 0,
                        right: 0,
                        display: 'grid',
                        gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`,
                        gridAutoRows: '20px',
                        rowGap: '2px',
                        pointerEvents: 'none',
                        zIndex: 10,
                        padding: '0 1px',
                      }}
                    >
                      {placedMultiEvents.map(ev => {
                        const startRadius = ev.isFirstSegment ? '4px' : '0px';
                        const endRadius = ev.isLastSegment ? '4px' : '0px';

                        const multiBadgeStyle = {
                          gridColumn: `${ev.startCol + 1} / ${ev.endCol + 2}`,
                          gridRow: `${ev.trackIdx + 1}`,
                          pointerEvents: 'auto',
                          backgroundColor: ev.eventColor,
                          color: '#ffffff',
                          height: '20px',
                          minHeight: '20px',
                          borderRadius: `${startRadius} ${endRadius} ${endRadius} ${startRadius}`,
                          margin: '0 2px',
                          padding: '0 6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
                          border: '1px solid rgba(255,255,255,0.25)',
                          ...(ev.typeLayer?.layer === 'borda' ? typeLayerBorderStyle(ev.typeLayer.color) : {}),
                          ...(ev.typeLayer?.layer === 'padrao' ? typeLayerPatternStyle(ev.typeLayer.color) : {}),
                        };

                        return (
                          <div
                            key={`${ev.event.cr4a1_agenda_kairosid}_${weekStartStr}`}
                            className="event-badge multi-day-continuous-bar boing-effect"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (typeof onViewEvent === 'function') {
                                onViewEvent(ev.event, e.currentTarget.getBoundingClientRect());
                              }
                            }}
                            style={multiBadgeStyle}
                            title={`${ev.event.cr4a1_titulo} (${ev.event.cr4a1_data_inicio?.split('T')[0]} – ${ev.event.cr4a1_data_fim?.split('T')[0] || ''})`}
                          >
                            <span
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                minWidth: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              {ev.typeLayer?.layer === 'icone' && ev.typeLayer.emoji && (
                                <span>{ev.typeLayer.emoji}</span>
                              )}
                              {!ev.event.cr4a1_dia_inteiro && ev.event.cr4a1_hora_inicio && (
                                <span style={{ fontWeight: '700' }}>{ev.event.cr4a1_hora_inicio}</span>
                              )}
                              {ev.event.cr4a1_privado ? '🔒 ' : ''}
                              <span>{ev.event.cr4a1_titulo}</span>
                            </span>
                            {ev.assignees.length > 1 && (
                              <span style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                                {ev.assignees.slice(0, 3).map((u, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      width: '5px',
                                      height: '5px',
                                      borderRadius: '50%',
                                      background: allUsers.find(au => au.cr4a1_username === u)?.cr4a1_cor || 'rgba(255,255,255,0.9)',
                                      border: '1px solid rgba(255,255,255,0.8)',
                                    }}
                                  />
                                ))}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
