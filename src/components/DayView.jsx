import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const DayView = ({ selectedDate, getEventsForDay, holidays, allUsers = [], onEdit, onDelete, dayViewMode = 'cards' }) => {
  const dayEvents = getEventsForDay(selectedDate);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const targetDateStr = selectedDate.toISOString().split('T')[0];

  const userColorMap = allUsers.reduce((acc, u) => {
    acc[u.cr4a1_username] = u.cr4a1_cor || '#3498db';
    return acc;
  }, {});

  const dayHolidays = (holidays || []).filter(h => h.date === targetDateStr);
  const allDayEvents = dayEvents.filter(e => e.cr4a1_dia_inteiro);
  const hourlyEvents = dayEvents.filter(e => !e.cr4a1_dia_inteiro);

  const getEventsInThisHour = (hour, events) => {
    return events.filter(e => {
      if (!e.cr4a1_hora_inicio || !e.cr4a1_hora_fim) return false;
      const startH = parseInt(e.cr4a1_hora_inicio.split(':')[0]);
      const endH = parseInt(e.cr4a1_hora_fim.split(':')[0]);
      if (e.cr4a1_data_inicio === e.cr4a1_data_fim) return hour >= startH && hour <= endH;
      if (targetDateStr === e.cr4a1_data_inicio) return hour >= startH;
      if (targetDateStr === e.cr4a1_data_fim) return hour <= endH;
      return targetDateStr > e.cr4a1_data_inicio && targetDateStr < e.cr4a1_data_fim;
    });
  };

  const EventCard = ({ event, showDetails, userColor }) => (
    <div
      className="day-view-event"
      style={{
        boxSizing: 'border-box',
        width: '100%',
        backgroundColor: userColor,
        color: 'white',
        padding: '6px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        opacity: 0.95,
        cursor: 'pointer',
        transition: 'transform 0.2s',
        marginBottom: '2px',
      }}
      onClick={() => onEdit(event)}
    >
      <div style={{ fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {showDetails 
          ? `${event.cr4a1_user_login?.charAt(0).toUpperCase()}: ${event.cr4a1_privado ? '🔒 ' : ''}${event.cr4a1_titulo}` 
          : `(Cont.) ${event.cr4a1_privado ? '🔒 ' : ''}${event.cr4a1_titulo}`
        }
      </div>
      {showDetails && (
        <div style={{ fontSize: '10px', opacity: 0.9, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>{event.cr4a1_hora_inicio} - {event.cr4a1_hora_fim}</span>
          {event.cr4a1_detalhes && <span>• 📄 Detalhes</span>}
          {event.cr4a1_arquivos && JSON.parse(event.cr4a1_arquivos).length > 0 && <span>• 📎 Anexos</span>}
        </div>
      )}
    </div>
  );

  // MODO: LINHA DO TEMPO (TIMELINE)
  if (dayViewMode === 'timeline') {
      const eventsWithPosition = hourlyEvents.map(e => {
          const [sh, sm] = (e.cr4a1_hora_inicio || '00:00').split(':').map(Number);
          const [eh, em] = (e.cr4a1_hora_fim || '01:00').split(':').map(Number);
          let startMins = sh * 60 + sm;
          let endMins = eh * 60 + em;
          if (endMins <= startMins) endMins = startMins + 60; // fallback se fim for antes do início
          return { ...e, startMins, endMins };
      }).sort((a, b) => a.startMins - b.startMins);

      // Algoritmo para separar eventos que encavalam e exibi-los lado a lado
      const columns = [];
      eventsWithPosition.forEach(event => {
          let placed = false;
          for (let i = 0; i < columns.length; i++) {
              if (!columns[i].some(e => e.startMins < event.endMins && e.endMins > event.startMins)) {
                  columns[i].push(event);
                  event.colIndex = i;
                  placed = true;
                  break;
              }
          }
          if (!placed) {
              event.colIndex = columns.length;
              columns.push([event]);
          }
      });

      const totalCols = columns.length || 1;

      return (
          <div className="view-enter" style={{ padding: '20px' }}>
              <h2 style={{ color: 'var(--text-title)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </h2>

              {dayHolidays.length > 0 && (
                  <div style={{ marginBottom: '16px', backgroundColor: 'rgba(231, 76, 60, 0.1)', borderLeft: '4px solid #e74c3c', padding: '10px 15px', borderRadius: '8px', color: '#c0392b', fontSize: '13px', fontWeight: '600' }}>
                      {dayHolidays.map(h => <div key={h.name}>🚩 Feriado: {h.name}</div>)}
                  </div>
              )}

              {allDayEvents.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>🌞 Eventos de Dia Inteiro</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {allDayEvents.map(event => (
                              <EventCard key={event.cr4a1_agenda_kairosid} event={event} showDetails={true} userColor={event.cr4a1_cor || userColorMap[event.cr4a1_user_login] || '#3498db'} />
                          ))}
                      </div>
                  </div>
              )}

              {/* GRID DA TIMELINE */}
              <div style={{ position: 'relative', height: `${24 * 60}px`, marginTop: '20px', backgroundColor: 'var(--bg-primary)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                  {/* Linhas de fundo e marcações de horas */}
                  {Array.from({ length: 24 }).map((_, h) => (
                      <div key={h} style={{ position: 'absolute', top: `${h * 60}px`, width: '100%', height: '60px', borderBottom: '1px dashed var(--border-color)', display: 'flex' }}>
                          <div style={{ width: '55px', fontSize: '11px', color: 'var(--text-secondary)', padding: '8px 4px', borderRight: '1px solid var(--border-color)', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', fontWeight: '500' }}>
                              {String(h).padStart(2, '0')}:00
                          </div>
                          <div style={{ flex: 1 }}></div>
                      </div>
                  ))}
                  
                  {/* Eventos Posicionados */}
                  {eventsWithPosition.map(event => {
                      const userColor = event.cr4a1_cor || userColorMap[event.cr4a1_user_login] || '#3498db';
                      return (
                          <div 
                              key={event.cr4a1_agenda_kairosid}
                              onClick={() => onEdit(event)}
                              style={{
                                  position: 'absolute',
                                  top: `${event.startMins}px`,
                                  height: `${event.endMins - event.startMins}px`,
                                  left: `calc(55px + ((100% - 55px) / ${totalCols}) * ${event.colIndex})`,
                                  width: `calc((100% - 55px) / ${totalCols} - 4px)`,
                                  backgroundColor: userColor,
                                  color: 'white',
                                  borderRadius: '8px',
                                  padding: '6px 8px',
                                  fontSize: '11px',
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  border: '1px solid rgba(255,255,255,0.2)',
                                  transition: 'all 0.2s',
                                  zIndex: 10
                              }}>
                              <div style={{ fontWeight: '800', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {event.cr4a1_privado ? '🔒 ' : ''}{event.cr4a1_titulo}
                              </div>
                              <div style={{ opacity: 0.9 }}>{event.cr4a1_hora_inicio} - {event.cr4a1_hora_fim}</div>
                          </div>
                      )
                  })}
              </div>
          </div>
      );
  }

  // MODO: CARTÕES (Padrão Original)
  return (
    <div className="view-enter" style={{ padding: '20px' }}>
      <h2 style={{ color: 'var(--text-title)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>
        {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
      </h2>

      {dayHolidays.length > 0 && (
        <div style={{ marginBottom: '16px', backgroundColor: 'rgba(231, 76, 60, 0.1)', borderLeft: '4px solid #e74c3c', padding: '10px 15px', borderRadius: '8px', color: '#c0392b', fontSize: '13px', fontWeight: '600' }}>
          {dayHolidays.map(h => <div key={h.name}>🚩 Feriado: {h.name}</div>)}
        </div>
      )}

      {allDayEvents.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>🌞 Eventos de Dia Inteiro</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {allDayEvents.map(event => (
              <EventCard key={event.cr4a1_agenda_kairosid} event={event} showDetails={true} userColor={event.cr4a1_cor || userColorMap[event.cr4a1_user_login] || '#3498db'} />
            ))}
          </div>
        </div>
      )}

      {hours.map(hour => {
        const eventsInHour = getEventsInThisHour(hour, hourlyEvents);

        return (
          <div key={hour} style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', minHeight: '65px', position: 'relative' }}>
            <div style={{ width: '50px', padding: '10px', fontSize: '12px', color: 'var(--text-secondary)', borderRight: '1px solid var(--border-color)', textAlign: 'right', backgroundColor: 'var(--bg-secondary)', fontWeight: '500' }}>
              {hour}:00
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '5px', backgroundColor: eventsInHour.length > 0 ? 'var(--bg-tertiary)' : 'transparent' }}>
              {eventsInHour.map(event => {
                const userColor = event.cr4a1_cor || userColorMap[event.cr4a1_user_login] || '#3498db';
                const isFirstHourOfDay = (ev) => {
                  if (targetDateStr === ev.cr4a1_data_inicio) return parseInt(ev.cr4a1_hora_inicio.split(':')[0]) === hour;
                  return hour === 0;
                };

                return (
                  <EventCard
                    key={event.cr4a1_agenda_kairosid}
                    event={event}
                    showDetails={isFirstHourOfDay(event)}
                    userColor={userColor}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};