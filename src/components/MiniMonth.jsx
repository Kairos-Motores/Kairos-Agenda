import React, { useState } from 'react';
import { format, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateMonthDays } from '../utils/dateHelpers';

export const MiniMonth = ({ monthDate, onSelectMonth, getEventsForDay, holidays = [], allUsers = [], onEditEvent, isDetailed = false }) => {
  const days = generateMonthDays(monthDate);
  const [hoveredDay, setHoveredDay] = useState(null);

  const userColorMap = allUsers.reduce((acc, curr) => {
    acc[curr.cr4a1_username] = curr.cr4a1_cor || '#ccc';
    return acc;
  }, {});

  // Altura da célula varia conforme o modo
  const cellHeight = isDetailed ? 'minmax(55px, 1fr)' : '35px';
  const gridAutoRows = isDetailed ? 'minmax(55px, auto)' : undefined;

  return (
    <div className="mini-month-card" style={{ padding: '8px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <strong style={{ textTransform: 'capitalize', fontSize: isDetailed ? '16px' : '12px', color: 'var(--text-title)' }}>
          {format(monthDate, 'MMMM', { locale: ptBR })}
        </strong>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gridAutoRows: cellHeight,
        gap: isDetailed ? '2px' : '1px',
        flex: 1,
        overflow: 'hidden'
      }}>
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <span key={i} style={{ fontWeight: 'bold', fontSize: isDetailed ? '12px' : '9px', textAlign: 'center', color: (i === 0 || i === 6) ? '#e74c3c' : 'var(--text-secondary)' }}>
            {d}
          </span>
        ))}

        {days.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = day.getMonth() === monthDate.getMonth();
          const holiday = isCurrentMonth ? holidays.find(h => h.date === dateStr) : null;
          const hasContent = isCurrentMonth && (dayEvents.length > 0 || holiday);
          const isFirstRow = index < 7;

          // Filtra eventos que não são intervalos
          const activeEvents = dayEvents.filter(e => !e.isIntervalo);
          const uniqueUsersOnDay = [...new Set(activeEvents.map(e => e.cr4a1_user_login))];
          const colorsForDay = uniqueUsersOnDay.map(username => userColorMap[username]).filter(Boolean);

          let textColor = isCurrentMonth ? 'var(--text-primary)' : 'var(--text-secondary)';
          if (isCurrentMonth && (isWeekend(day) || holiday)) textColor = '#e74c3c';

          return (
            <div
              key={day.toString()}
              onClick={() => isCurrentMonth && onSelectMonth(day)}
              onMouseEnter={() => hasContent && setHoveredDay(dateStr)}
              onMouseLeave={() => setHoveredDay(null)}
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
                overflow: 'visible',
                borderRadius: '4px',
                transition: 'background 0.2s',
                padding: isDetailed ? '4px 2px' : '0',
                minHeight: isDetailed ? '55px' : undefined,
                height: 'auto'
              }}
              className="mini-day-cell"
            >
              {/* Fundo colorido por usuário */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 0, overflow: 'hidden', borderRadius: '4px' }}>
                {isCurrentMonth && colorsForDay.map((color, idx) => (
                  <div key={idx} style={{ flex: 1, backgroundColor: color, opacity: 0.25 }} />
                ))}
              </div>

              <span style={{
                position: 'relative',
                zIndex: 1,
                fontWeight: holiday ? '700' : '500',
                backgroundColor: holiday ? 'var(--bg-primary)' : 'transparent',
                padding: '1px 3px',
                borderRadius: '3px',
                fontSize: isDetailed ? '13px' : '10px'
              }}>
                {format(day, 'd')}
              </span>

              {/* No modo detalhado, mostra os títulos dos eventos */}
              {isDetailed && isCurrentMonth && activeEvents.length > 0 && (
                <div style={{ position: 'relative', zIndex: 1, width: '100%', marginTop: '2px' }}>
                  {activeEvents.slice(0, 3).map((ev, i) => (
                    <div
                      key={i}
                      onClick={(e) => { e.stopPropagation(); onEditEvent(ev); }}
                      style={{
                        fontSize: '9px',
                        backgroundColor: userColorMap[ev.cr4a1_user_login] || '#ccc',
                        color: '#fff',
                        borderRadius: '3px',
                        padding: '1px 3px',
                        marginBottom: '1px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        cursor: 'pointer',
                        lineHeight: 1.1
                      }}
                    >
                      {ev.cr4a1_titulo}
                    </div>
                  ))}
                  {activeEvents.length > 3 && (
                    <div style={{ fontSize: '8px', color: 'var(--text-secondary)' }}>+{activeEvents.length - 3}</div>
                  )}
                </div>
              )}

              {/* Bolinhas coloridas (modo normal) */}
              {!isDetailed && (
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '2px', marginTop: '2px', height: '4px' }}>
                  {isCurrentMonth && activeEvents
                    .map(e => userColorMap[e.cr4a1_user_login])
                    .filter((color, idx, arr) => color && arr.indexOf(color) === idx)
                    .slice(0, 3)
                    .map((color, idx) => (
                      <div key={idx} style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: color }} />
                    ))
                  }
                </div>
              )}

              {/* Tooltip (apenas no modo normal) */}
              {!isDetailed && hoveredDay === dateStr && hasContent && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="premium-tooltip"
                  style={{
                    position: 'absolute',
                    [isFirstRow ? 'top' : 'bottom']: '120%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1100,
                    animation: isFirstRow ? 'fadeInDown 0.2s ease-out' : 'fadeInUp 0.2s ease-out'
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: '800', marginBottom: '10px', color: 'var(--text-accent)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                    {format(day, "d 'de' MMMM", { locale: ptBR })}
                  </div>
                  
                  {holiday && (
                    <div style={{ color: '#e74c3c', fontSize: '11px', fontWeight: 'bold', marginBottom: '10px' }}>
                      🚩 {holiday.name}
                    </div>
                  )}
  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {dayEvents
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
                          backgroundColor: 'var(--bg-secondary)'
                        }}
                      >
                        <div style={{ minWidth: '8px', height: '8px', borderRadius: '50%', backgroundColor: userColorMap[ev.cr4a1_user_login] || '#ccc', marginTop: '5px' }} />
                        <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                          <span style={{ fontWeight: '700', color: userColorMap[ev.cr4a1_user_login] || '#7f8c8d' }}>{ev.cr4a1_user_login}:</span> {ev.cr4a1_titulo}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    position: 'absolute',
                    [isFirstRow ? 'bottom' : 'top']: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)' + (isFirstRow ? ' rotate(180deg)' : ''),
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: '8px solid rgba(255, 255, 255, 0.98)'
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};