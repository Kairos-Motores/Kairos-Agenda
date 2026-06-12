/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { format, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateMonthDays } from '../utils/dateHelpers';
import { Draggable, Droppable } from '@hello-pangea/dnd';

/* ================================================================
   MarqueeText (mantido)
   ================================================================ */
const MarqueeText = ({ text, color, onClick }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isOverflow, setIsOverflow] = useState(false);

  useEffect(() => {
    if (containerRef.current && textRef.current) {
      setIsOverflow(textRef.current.scrollWidth > containerRef.current.clientWidth);
    }
  }, [text]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      style={{
        fontSize: '10px',
        backgroundColor: color || '#ccc',
        color: '#fff',
        borderRadius: '3px',
        padding: '1px 3px',
        marginBottom: '1px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        cursor: 'pointer',
        lineHeight: 1.1,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <span
        ref={textRef}
        style={{
          display: 'inline-block',
          animation: isOverflow ? 'marquee 6s linear infinite' : 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </span>
    </div>
  );
};

/* ================================================================
   TooltipPortal – agora sempre aparece ACIMA do dia
   ================================================================ */
const TooltipPortal = ({ children, targetRect, onMouseEnter, onMouseLeave }) => {
  if (!targetRect) return null;

  // Calcula a posição para que o tooltip fique centralizado e acima do dia
  const tooltipWidth = 280; // mesmo max-width usado no conteúdo
  let left = targetRect.left + targetRect.width / 2;
  // Garante que não ultrapasse a borda direita da tela
  if (left + tooltipWidth / 2 > window.innerWidth - 8) {
    left = window.innerWidth - tooltipWidth / 2 - 8;
  }
  // Garante que não ultrapasse a borda esquerda
  if (left - tooltipWidth / 2 < 8) {
    left = tooltipWidth / 2 + 8;
  }

  const style = {
    position: 'fixed',
    left: left,
    bottom: window.innerHeight - targetRect.top + 8, // aparece logo acima do dia
    transform: 'translateX(-50%)',
    zIndex: 99999,
    pointerEvents: 'auto',
    animation: 'fadeInUp 0.2s ease-out', // animação vindo de baixo para cima
  };

  return ReactDOM.createPortal(
    <div style={style} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {children}
    </div>,
    document.body
  );
};

/* ================================================================
   MiniMonth principal
   ================================================================ */
export const MiniMonth = ({
  monthDate,
  onSelectMonth,
  getEventsForDay,
  holidays = [],
  allUsers = [],
  onEditEvent,
  isDetailed = false,
  onDayClick,
}) => {
  const days = generateMonthDays(monthDate);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [hoveredRect, setHoveredRect] = useState(null);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const leaveTimer = useRef(null);

  // Mapa de cores por usuário
  const userColorMap = allUsers.reduce((acc, curr) => {
    acc[curr.cr4a1_username] = curr.cr4a1_cor || '#ccc';
    return acc;
  }, {});

  // Limpeza de timers
  useEffect(() => {
    return () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    };
  }, []);

  // Reseta o tooltip quando o modo muda
  useEffect(() => {
    setHoveredDay(null);
    setHoveredRect(null);
    setIsTooltipHovered(false);
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  }, [isDetailed]);

  // Controle do tooltip (sem flicker)
  const tryCloseTooltip = () => {
    leaveTimer.current = setTimeout(() => {
      if (!isTooltipHovered) {
        setHoveredDay(null);
        setHoveredRect(null);
      }
    }, 200);
  };
  const handleDayEnter = (dateStr, e) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredDay(dateStr);
    setHoveredRect(rect);
  };
  const handleDayLeave = () => { tryCloseTooltip(); };
  const handleTooltipEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setIsTooltipHovered(true);
  };
  const handleTooltipLeave = () => {
    setIsTooltipHovered(false);
    tryCloseTooltip();
  };

  const cellHeight = isDetailed ? '85px' : '35px';

  return (
    <div className="mini-month-card" style={{ padding: '8px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Cabeçalho do mês */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <strong style={{ textTransform: 'capitalize', fontSize: isDetailed ? '16px' : '12px', color: 'var(--text-title)' }}>
          {format(monthDate, 'MMMM', { locale: ptBR })}
        </strong>
      </div>

      {/* Grid do calendário */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridAutoRows: cellHeight,
          gap: isDetailed ? '2px' : '1px',
          flex: 1,
        }}
      >
        {/* Cabeçalhos dos dias da semana */}
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <span
            key={i}
            style={{
              fontWeight: 'bold',
              fontSize: isDetailed ? '14px' : '9px',
              textAlign: 'center',
              color: (i === 0 || i === 6) ? '#e74c3c' : 'var(--text-secondary)',
            }}
          >
            {d}
          </span>
        ))}

        {/* Dias do mês */}
        {days.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = day.getMonth() === monthDate.getMonth();
          const holiday = isCurrentMonth ? holidays.find(h => h.date === dateStr) : null;
          const hasContent = isCurrentMonth && (dayEvents.length > 0 || holiday);

          // Eventos que podem ser arrastados (exclui intervalos)
          const activeEvents = dayEvents.filter(e => !e.isIntervalo);

          // Cores dos usuários que têm eventos nesse dia
          const uniqueUsersOnDay = [...new Set(activeEvents.map(e => e.cr4a1_user_login))];
          const colorsForDay = uniqueUsersOnDay.map(username => userColorMap[username]).filter(Boolean);

          // Fundo colorido sutil
          const backgroundLayer = (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 0, overflow: 'hidden', borderRadius: '4px' }}>
              {isCurrentMonth && colorsForDay.map((color, idx) => (
                <div key={idx} style={{ flex: 1, backgroundColor: color, opacity: 0.25 }} />
              ))}
            </div>
          );

          // Número do dia
          const dayNumber = (
            <span style={{
              position: 'relative',
              zIndex: 1,
              fontWeight: holiday ? '700' : '500',
              fontSize: isDetailed ? '16px' : '10px',
            }}>
              {format(day, 'd')}
            </span>
          );

          // Se não é o mês corrente, renderiza sem interação
          if (!isCurrentMonth) {
            return (
              <div key={dateStr} style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {backgroundLayer}
                {dayNumber}
              </div>
            );
          }

          // Dia do mês corrente → Droppable (recebe eventos)
          return (
            <Droppable droppableId={dateStr} key={dateStr}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  onClick={(e) => {
                    if (!isCurrentMonth) return;
                    e.stopPropagation();
                    if (onDayClick) {
                      onDayClick(dateStr);
                    } else {
                      onSelectMonth(day);
                    }
                  }}
                  onMouseEnter={(e) => hasContent && !isDetailed && handleDayEnter(dateStr, e)}
                  onMouseLeave={!isDetailed ? handleDayLeave : undefined}
                  style={{
                    position: 'relative',
                    backgroundColor: snapshot.isDraggingOver ? 'var(--bg-tertiary)' : 'transparent',
                    borderRadius: '4px',
                    transition: 'background-color 0.2s',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: isDetailed ? 'flex-start' : 'center',
                    overflow: 'hidden',
                  }}
                >
                  {backgroundLayer}
                  {dayNumber}

                  {isDetailed ? (
                    /* ============================================================
                       MODO VISITAS (isDetailed): contador + lista de eventos
                       ============================================================ */
                    <>
                      {activeEvents.length > 1 && onDayClick ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDayClick) onDayClick(dateStr);
                          }}
                          style={{
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            color: '#fff',
                            borderRadius: '4px',
                            padding: '2px 4px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            marginTop: '2px',
                            width: '100%',
                          }}
                        >
                          {activeEvents.length} visitas
                        </div>
                      ) : (
                        activeEvents.map((event, idx) => {
                          const eventColor = userColorMap[event.cr4a1_user_login] || '#ccc';
                          return (
                            <Draggable
                              key={event.cr4a1_agenda_kairosid}
                              draggableId={event.cr4a1_agenda_kairosid}
                              index={idx}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditEvent(event);
                                  }}
                                  style={{
                                    ...provided.draggableProps.style,
                                    opacity: snapshot.isDragging ? 0.7 : 1,
                                    cursor: 'grab',
                                    userSelect: 'none',
                                    width: '100%',
                                    marginTop: '1px',
                                  }}
                                >
                                  <MarqueeText
                                    text={event.cr4a1_titulo}
                                    color={eventColor}
                                    onClick={() => {}}
                                  />
                                </div>
                              )}
                            </Draggable>
                          );
                        })
                      )}
                    </>
                  ) : (
                    /* ============================================================
                       MODO CALENDÁRIO COMUM: bolinhas coloridas
                       ============================================================ */
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '3px', marginTop: '4px' }}>
                      {activeEvents
                        .map(e => userColorMap[e.cr4a1_user_login] || '#ccc')
                        .filter((color, idx, arr) => arr.indexOf(color) === idx)
                        .slice(0, 3)
                        .map((color, idx) => (
                          <div 
                            key={idx} 
                            style={{ 
                              width: '6px', 
                              height: '6px', 
                              borderRadius: '50%', 
                              backgroundColor: color, 
                              filter: 'brightness(1.2)' 
                            }} 
                          />
                        ))
                      }
                    </div>
                  )}

                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          );
        })}
      </div>

      {/* Tooltip (apenas no modo normal) – agora sempre aparece ACIMA do dia */}
      {!isDetailed && hoveredDay && (
        <TooltipPortal
          targetRect={hoveredRect}
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
        >
          <div
            className="premium-tooltip"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              maxWidth: '280px',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: '800', marginBottom: '10px', color: 'var(--text-accent)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              {format(new Date(hoveredDay + 'T12:00:00'), "d 'de' MMMM", { locale: ptBR })}
            </div>
            {holidays.find(h => h.date === hoveredDay) && (
              <div style={{ color: '#e74c3c', fontSize: '11px', fontWeight: 'bold', marginBottom: '10px' }}>
                🚩 {holidays.find(h => h.date === hoveredDay).name}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {getEventsForDay(new Date(hoveredDay + 'T12:00:00'))
                .filter(e => e.cr4a1_user_login)
                .map((ev, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setIsTooltipHovered(false);
                      setHoveredDay(null);
                      setHoveredRect(null);
                      onEditEvent(ev);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '8px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      backgroundColor: 'var(--bg-secondary)',
                    }}
                  >
                    <div style={{ minWidth: '8px', height: '8px', borderRadius: '50%', backgroundColor: userColorMap[ev.cr4a1_user_login] || '#ccc', marginTop: '5px' }} />
                    <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                      <span style={{ fontWeight: '700', color: userColorMap[ev.cr4a1_user_login] || '#7f8c8d' }}>{ev.cr4a1_user_login}:</span> {ev.cr4a1_titulo}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </TooltipPortal>
      )}
    </div>
  );
};