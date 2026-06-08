import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { format, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateMonthDays } from '../utils/dateHelpers';

// ─── Componente Marquee (texto correndo) ───────────────────────
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
        fontSize: '9px',
        backgroundColor: color || '#ccc',
        color: '#fff',
        borderRadius: '3px',
        padding: '1px 3px',
        marginBottom: '1px',
        whiteSpace: 'nowrap',
        overflow: 'hidden', // corta o texto que sai
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

// ─── Tooltip via Portal (nunca é cortado) ─────────────────────
const TooltipPortal = ({ children, targetRect, isFirstRow, onMouseEnter, onMouseLeave }) => {
  if (!targetRect) return null;

  const style = {
    position: 'fixed',
    left: targetRect.left + targetRect.width / 2,
    transform: 'translateX(-50%)',
    zIndex: 99999,
    pointerEvents: 'auto',
    animation: isFirstRow ? 'fadeInDown 0.2s ease-out' : 'fadeInUp 0.2s ease-out',
  };

  if (isFirstRow) {
    style.top = targetRect.bottom + 8;
  } else {
    style.bottom = window.innerHeight - targetRect.top + 8;
  }

  return ReactDOM.createPortal(
    <div
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>,
    document.body
  );
};

// ─── Componente principal ──────────────────────────────────────
export const MiniMonth = ({ monthDate, onSelectMonth, getEventsForDay, holidays = [], allUsers = [], onEditEvent, isDetailed = false }) => {
  const days = generateMonthDays(monthDate);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [hoveredRect, setHoveredRect] = useState(null);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const leaveTimer = useRef(null);

  // Mapa de cores dos usuários
  const userColorMap = allUsers.reduce((acc, curr) => {
    acc[curr.cr4a1_username] = curr.cr4a1_cor || '#ccc';
    return acc;
  }, {});

  // Limpa timer ao desmontar
  useEffect(() => {
    return () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    };
  }, []);

  // Fecha tooltip se mouse saiu do dia E do tooltip
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

  const handleDayLeave = () => {
    tryCloseTooltip();
  };

  const handleTooltipEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setIsTooltipHovered(true);
  };

  const handleTooltipLeave = () => {
    setIsTooltipHovered(false);
    tryCloseTooltip();
  };

  const cellHeight = isDetailed ? '55px' : '35px';

  return (
    <div className="mini-month-card" style={{ padding: '8px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Nome do mês */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <strong style={{ textTransform: 'capitalize', fontSize: isDetailed ? '16px' : '12px', color: 'var(--text-title)' }}>
          {format(monthDate, 'MMMM', { locale: ptBR })}
        </strong>
      </div>

      {/* Grade de dias */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gridAutoRows: cellHeight,
        gap: isDetailed ? '2px' : '1px',
        flex: 1,
      }}>
        {/* Cabeçalhos dos dias da semana */}
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <span key={i} style={{
            fontWeight: 'bold',
            fontSize: isDetailed ? '12px' : '9px',
            textAlign: 'center',
            color: (i === 0 || i === 6) ? '#e74c3c' : 'var(--text-secondary)',
          }}>
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
          const isFirstRow = index < 7;

          const activeEvents = dayEvents.filter(e => !e.isIntervalo);
          const uniqueUsersOnDay = [...new Set(activeEvents.map(e => e.cr4a1_user_login))];
          const colorsForDay = uniqueUsersOnDay.map(username => userColorMap[username]).filter(Boolean);

          let textColor = isCurrentMonth ? 'var(--text-primary)' : 'var(--text-secondary)';
          if (isCurrentMonth && (isWeekend(day) || holiday)) textColor = '#e74c3c';

          return (
            <div
              key={day.toString()}
              onClick={() => isCurrentMonth && onSelectMonth(day)}
              onMouseEnter={(e) => hasContent && !isDetailed && handleDayEnter(dateStr, e)}
              onMouseLeave={!isDetailed ? handleDayLeave : undefined}
              style={{
                textAlign: 'center',
                fontSize: '10px',
                cursor: isCurrentMonth ? 'pointer' : 'default',
                color: textColor,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: isDetailed ? 'flex-start' : 'center',
                borderRadius: '4px',
                padding: isDetailed ? '4px 2px' : '0',
                height: '100%',
                boxSizing: 'border-box',
                overflow: 'hidden', // impede que conteúdo extra expanda a célula
              }}
              className="mini-day-cell"
            >
              {/* Fundo colorido por usuário */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 0, overflow: 'hidden', borderRadius: '4px' }}>
                {isCurrentMonth && colorsForDay.map((color, idx) => (
                  <div key={idx} style={{ flex: 1, backgroundColor: color, opacity: 0.25 }} />
                ))}
              </div>

              {/* Número do dia */}
              <span style={{ position: 'relative', zIndex: 1, fontWeight: holiday ? '700' : '500', fontSize: isDetailed ? '13px' : '10px' }}>
                {format(day, 'd')}
              </span>

              {/* Eventos no modo detalhado (visitas) com marquee */}
              {isDetailed && isCurrentMonth && activeEvents.length > 0 && (
                <div style={{ width: '100%', marginTop: '2px', overflow: 'hidden' }}>
                  {activeEvents.slice(0, 3).map((ev, i) => (
                    <MarqueeText
                      key={i}
                      text={ev.cr4a1_titulo}
                      color={userColorMap[ev.cr4a1_user_login]}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditEvent(ev);
                      }}
                    />
                  ))}
                  {activeEvents.length > 3 && (
                    <div style={{ fontSize: '8px', color: 'var(--text-secondary)' }}>+{activeEvents.length - 3}</div>
                  )}
                </div>
              )}

              {/* Bolinhas coloridas (modo normal) */}
              {!isDetailed && (
                <div style={{ display: 'flex', gap: '2px', marginTop: '2px', height: '4px' }}>
                  {isCurrentMonth && activeEvents
                    .map(e => userColorMap[e.cr4a1_user_login])
                    .filter((color, idx, arr) => color && arr.indexOf(color) === idx)
                    .slice(0, 3)
                    .map((color, idx) => (
                      <div key={idx} style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: color }} />
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tooltip (apenas no modo normal) renderizado no body */}
      {!isDetailed && hoveredDay && (
        <TooltipPortal
          targetRect={hoveredRect}
          isFirstRow={hoveredDay ? parseInt(hoveredDay.split('-')[2]) <= 7 : true}
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
        >
          <div className="premium-tooltip" style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            maxWidth: '280px',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
          }}>
            {/* Cabeçalho do tooltip */}
            <div style={{ fontSize: '12px', fontWeight: '800', marginBottom: '10px', color: 'var(--text-accent)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              {format(new Date(hoveredDay + 'T12:00:00'), "d 'de' MMMM", { locale: ptBR })}
            </div>

            {holidays.find(h => h.date === hoveredDay) && (
              <div style={{ color: '#e74c3c', fontSize: '11px', fontWeight: 'bold', marginBottom: '10px' }}>
                🚩 {holidays.find(h => h.date === hoveredDay).name}
              </div>
            )}

            {/* Lista de eventos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {getEventsForDay(new Date(hoveredDay + 'T12:00:00'))
                .filter(e => e.cr4a1_user_login)
                .map((ev, idx) => (
                  <div
                    key={idx}
                    onClick={() => onEditEvent(ev)}
                    className="tooltip-event-item"
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