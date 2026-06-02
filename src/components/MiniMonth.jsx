import React, { useState } from 'react';
import { format, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateMonthDays } from '../utils/dateHelpers';

export const MiniMonth = ({ monthDate, onSelectMonth, getEventsForDay, holidays = [], allUsers = [], onEditEvent }) => {
  const days = generateMonthDays(monthDate);
  const [hoveredDay, setHoveredDay] = useState(null);

  const userColorMap = allUsers.reduce((acc, curr) => {
    acc[curr.cr4a1_username] = curr.cr4a1_cor || '#ccc';
    return acc;
  }, {});

  return (
    <div className="mini-month-card" style={{ padding: '5px', position: 'relative' }}>
      <div style={{ textAlign: 'center', marginBottom: '5px' }}>
        <strong style={{ textTransform: 'capitalize', fontSize: '12px', color: 'var(--text-title)' }}>
          {format(monthDate, 'MMMM', { locale: ptBR })}
        </strong>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <span key={i} style={{ fontWeight: 'bold', fontSize: '9px', textAlign: 'center', color: (i === 0 || i === 6) ? '#e74c3c' : 'var(--text-secondary)' }}>
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
          
          // *** ÚNICA ALTERAÇÃO: ignorar eventos com isIntervalo para pintura de fundo ***
          const uniqueUsersOnDay = [...new Set(
            dayEvents
              .filter(e => !e.isIntervalo)
              .map(e => e.cr4a1_user_login)
          )];
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
                height: '35px', 
                textAlign: 'center', 
                fontSize: '10px', 
                cursor: isCurrentMonth ? 'pointer' : 'default',
                color: textColor, 
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'visible', 
                borderRadius: '4px',
                transition: 'background 0.2s'
              }}
              className="mini-day-cell"
            >
              {/* FUNDO COLORIDO (apenas para visitas principais, não para intervalos) */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 0, overflow: 'hidden', borderRadius: '4px' }}>
                {isCurrentMonth && colorsForDay.map((color, idx) => (
                  <div key={idx} style={{ flex: 1, backgroundColor: color, opacity: 0.3 }} />
                ))}
              </div>

              <span style={{ 
                position: 'relative', 
                zIndex: 1, 
                fontWeight: holiday ? '700' : '500',
                backgroundColor: holiday ? 'var(--bg-primary)' : 'transparent',
                padding: '1px 3px',
                borderRadius: '3px'
              }}>
                {format(day, 'd')}
              </span>

              {/* PONTOS DE EVENTO (todos os eventos, incluindo intervalos) */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '2px', marginTop: '2px', height: '4px' }}>
                {isCurrentMonth && dayEvents
                  .filter(e => {
                    // Inclui eventos com user_login definido (visitas e intervalos)
                    return e.cr4a1_user_login;
                  })
                  .map(e => userColorMap[e.cr4a1_user_login])
                  .filter((color, idx, arr) => color && arr.indexOf(color) === idx) // cores únicas
                  .slice(0, 3)
                  .map((color, idx) => (
                    <div key={idx} style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: color }} />
                  ))
                }
              </div>

              {/* TOOLTIP CUSTOMIZADO INTERATIVO (INALTERADO) */}
              {hoveredDay === dateStr && hasContent && (
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
                        .filter(e => e.cr4a1_user_login) // garante que tem usuário
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