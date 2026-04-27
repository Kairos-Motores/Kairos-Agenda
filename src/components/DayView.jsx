import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const DayView = ({ selectedDate, getEventsForDay, holidays, allUsers = [], onEdit, onDelete }) => {
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
        borderLeft: '4px solid rgba(0,0,0,0.3)',
        transition: 'transform 0.2s',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {showDetails ? `${event.cr4a1_user_login?.charAt(0).toUpperCase()}: ${event.cr4a1_titulo}` : `(Cont.) ${event.cr4a1_titulo}`}
          </div>
          {showDetails && !event.cr4a1_dia_inteiro && (
              <div style={{ fontSize: '10px', opacity: 0.9, marginTop: '2px', fontWeight: '500' }}>
                  🕒 {event.cr4a1_hora_inicio} - {event.cr4a1_hora_fim}
              </div>
          )}
          {event.cr4a1_dia_inteiro && <div style={{ fontSize: '10px', opacity: 0.9, marginTop: '2px', fontWeight: '600' }}>🌞 Dia Inteiro</div>}
        </div>

        <div style={{ display: 'flex', gap: '8px', paddingRight: '8px' }}>
          <button 
              onClick={(e) => { e.stopPropagation(); onEdit(event); }} 
              title="Editar"
              style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: 'white', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}
          >
              ✏️
          </button>
          <button 
              onClick={(e) => { e.stopPropagation(); onDelete(event); }} 
              title="Excluir"
              style={{ background: 'rgba(231,76,60,0.9)', border: 'none', color: 'white', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}
          >
              🗑️
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', overflow: 'hidden' }}>
      
      {/* CABEÇALHO DO DIA */}
      <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', textAlign: 'center' }}>
        <h2 style={{ margin: 0, color: 'var(--text-title)', textTransform: 'capitalize', fontSize: '20px' }}>
            {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </h2>
      </div>

      {dayHolidays.length > 0 && (
        <div style={{ backgroundColor: 'var(--bg-holiday)', padding: '12px', borderBottom: '1px solid var(--border-strong)', color: '#e74c3c', textAlign: 'center' }}>
          {dayHolidays.map(h => (
            <div key={h.name} style={{ fontWeight: 'bold', fontSize: '14px' }}>🚩 Feriado: {h.name}</div>
          ))}
        </div>
      )}

      {/* SEÇÃO DIA INTEIRO */}
      {allDayEvents.length > 0 && (
        <div style={{ padding: '10px 15px', background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-accent)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>🌞 Eventos de Dia Inteiro</div>
          {allDayEvents.map(event => (
            <EventCard 
              key={event.cr4a1_agenda_kairosid} 
              event={event} 
              showDetails={true} 
              userColor={userColorMap[event.cr4a1_user_login] || '#3498db'} 
            />
          ))}
        </div>
      )}

      {hours.map(hour => {
        const eventsInHour = getEventsInThisHour(hour, hourlyEvents);
        
        return (
          <div key={hour} style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', minHeight: '65px', position: 'relative' }}>
            <div style={{ width: '50px', padding: '10px', fontSize: '12px', color: 'var(--text-secondary)', borderRight: '1px solid var(--border-color)', textAlign: 'right', backgroundColor: 'var(--bg-secondary)' }}>
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