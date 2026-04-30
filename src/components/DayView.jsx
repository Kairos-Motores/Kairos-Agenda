import React from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const DayView = ({ selectedDate, viewType, getEventsForDay, holidays, allUsers = [], onEdit, dayViewMode = 'timeline' }) => {
    
    // Define quantos dias serão renderizados
    let daysToRender = [];
    if (viewType === 'day') {
        daysToRender = [selectedDate];
    } else if (viewType === '3days') {
        daysToRender = [selectedDate, addDays(selectedDate, 1), addDays(selectedDate, 2)];
    } else if (viewType === 'week') {
        const start = startOfWeek(selectedDate, { weekStartsOn: 0 }); // Inicia no Domingo
        daysToRender = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }

    const hours = Array.from({ length: 24 }, (_, i) => i);

    const userColorMap = allUsers.reduce((acc, u) => {
        acc[u.cr4a1_username] = u.cr4a1_cor || '#3498db';
        return acc;
    }, {});

    // Helper para processar sobreposição geométrica de eventos POR DIA
    const processEventsForTimeline = (hourlyEvents, targetDateStr) => {
        const eventsWithPosition = hourlyEvents.map(e => {
            // Garantimos que a data fim esteja no mesmo formato yyyy-MM-dd para comparação
            const endDateFormatted = e.cr4a1_data_fim?.includes('T') 
                ? e.cr4a1_data_fim.split('T')[0] 
                : e.cr4a1_data_fim;

            const [sh, sm] = (e.cr4a1_hora_inicio || '00:00').split(':').map(Number);
            const [eh, em] = (e.cr4a1_hora_fim || '01:00').split(':').map(Number);
            
            let startMins = sh * 60 + sm;
            let endMins = eh * 60 + em;

            // Lógica de expansão para eventos que atravessam dias
            if (e.cr4a1_data_inicio !== endDateFormatted) {
                if (targetDateStr > e.cr4a1_data_inicio) startMins = 0; 
                if (targetDateStr < endDateFormatted) endMins = 24 * 60; 
            }

            // Failsafe: impede que a caixa tenha altura zero ou negativa
            if (endMins <= startMins) endMins = startMins + 60;

            return { ...e, startMins, endMins };
        }).sort((a, b) => a.startMins - b.startMins);

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

        return { eventsWithPosition, totalCols: columns.length || 1 };
    };

    // MODO CARTÕES
    if (dayViewMode === 'cards' && viewType === 'day') {
        const dayEvents = getEventsForDay(selectedDate);
        const hourlyEvents = dayEvents.filter(e => !e.cr4a1_dia_inteiro);
        
        const getEventsInThisHour = (hour, events) => {
            return events.filter(e => {
                if (!e.cr4a1_hora_inicio) return false;
                const startH = parseInt(e.cr4a1_hora_inicio.split(':')[0]);
                return startH === hour;
            });
        };

        return (
            <div className="view-enter" style={{ padding: '16px', boxSizing: 'border-box', overflowX: 'hidden' }}>
                {hours.map(hour => {
                    const eventsInHour = getEventsInThisHour(hour, hourlyEvents);
                    return (
                        <div key={hour} style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', minHeight: '65px', width: '100%', boxSizing: 'border-box' }}>
                            <div style={{ width: '50px', minWidth: '50px', padding: '10px', fontSize: '12px', color: 'var(--text-secondary)', borderRight: '1px solid var(--border-color)', textAlign: 'right', backgroundColor: 'var(--bg-secondary)', fontWeight: '500', boxSizing: 'border-box' }}>
                                {hour}:00
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '5px', backgroundColor: eventsInHour.length > 0 ? 'var(--bg-tertiary)' : 'transparent', minWidth: 0, boxSizing: 'border-box' }}>
                                {eventsInHour.map(event => {
                                    const userColor = event.cr4a1_cor || userColorMap[event.cr4a1_user_login] || '#3498db';
                                    return (
                                        <div key={event.cr4a1_agenda_kairosid} onClick={() => onEdit(event)} style={{ backgroundColor: userColor, color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', overflow: 'hidden', width: '100%' }}>
                                            <div style={{ fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.cr4a1_titulo}</div>
                                            <div style={{ fontSize: '10px', opacity: 0.9 }}>{event.cr4a1_hora_inicio} - {event.cr4a1_hora_fim}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // MODO LINHA DO TEMPO
    return (
        <div className="view-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-primary)' }}>
            
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                <div style={{ width: '50px', minWidth: '50px', borderRight: '1px solid var(--border-color)' }}></div>
                
                <div style={{ display: 'flex', flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }} className="timeline-scroll-sync">
                    {daysToRender.map(day => {
                        const targetDateStr = format(day, 'yyyy-MM-dd');
                        const isToday = format(new Date(), 'yyyy-MM-dd') === targetDateStr;
                        const dayEvents = getEventsForDay(day);
                        const allDayEvents = dayEvents.filter(e => e.cr4a1_dia_inteiro);
                        const dayHolidays = (holidays || []).filter(h => h.date === targetDateStr);

                        return (
                            <div key={targetDateStr} style={{ flex: 1, minWidth: viewType === 'day' ? '100%' : '120px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '10px 0', textAlign: 'center', borderBottom: '1px solid var(--border-color)', backgroundColor: isToday ? 'rgba(26, 115, 232, 0.05)' : 'transparent' }}>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: isToday ? 'var(--text-accent)' : 'var(--text-secondary)', fontWeight: '600' }}>
                                        {format(day, 'EEE', { locale: ptBR })}
                                    </div>
                                    <div style={{ fontSize: '20px', color: isToday ? 'var(--text-accent)' : 'var(--text-title)', fontWeight: isToday ? '700' : '400' }}>
                                        {format(day, 'd')}
                                    </div>
                                </div>
                                
                                <div style={{ minHeight: '30px', padding: '4px', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {dayHolidays.map(h => (
                                        <div key={h.name} style={{ fontSize: '9px', backgroundColor: 'rgba(231, 76, 60, 0.1)', color: '#c0392b', padding: '2px 4px', borderRadius: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            🚩 {h.name}
                                        </div>
                                    ))}
                                    {allDayEvents.map(event => {
                                        const userColor = event.cr4a1_cor || userColorMap[event.cr4a1_user_login] || '#3498db';
                                        return (
                                            <div key={event.cr4a1_agenda_kairosid} onClick={() => onEdit(event)} style={{ backgroundColor: userColor, color: 'white', padding: '2px 4px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {event.cr4a1_privado ? '🔒 ' : ''}{event.cr4a1_titulo}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, overflowY: 'auto', position: 'relative' }}>
                <div style={{ width: '50px', minWidth: '50px', backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', zIndex: 10 }}>
                    {hours.map(h => (
                        <div key={h} style={{ height: '60px', fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'right', padding: '4px 6px', fontWeight: '500' }}>
                            {String(h).padStart(2, '0')}:00
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', flex: 1, overflowX: 'auto', position: 'relative' }} className="timeline-scroll-sync" onScroll={(e) => {
                    const headers = document.querySelectorAll('.timeline-scroll-sync');
                    headers.forEach(h => { if(h !== e.target) h.scrollLeft = e.target.scrollLeft; });
                }}>
                    
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                        {hours.map(h => (
                            <div key={h} style={{ height: '60px', borderBottom: '1px dashed var(--border-color)', width: '100%' }}></div>
                        ))}
                    </div>

                    {daysToRender.map(day => {
                        const targetDateStr = format(day, 'yyyy-MM-dd');
                        const dayEvents = getEventsForDay(day);
                        const hourlyEvents = dayEvents.filter(e => !e.cr4a1_dia_inteiro);
                        
                        const { eventsWithPosition, totalCols } = processEventsForTimeline(hourlyEvents, targetDateStr);

                        return (
                            <div key={targetDateStr} style={{ flex: 1, minWidth: viewType === 'day' ? '100%' : '120px', position: 'relative', borderRight: '1px solid var(--border-color)', height: `${24 * 60}px` }}>
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
                                                left: `calc((100% / ${totalCols}) * ${event.colIndex})`,
                                                width: `calc(100% / ${totalCols} - 2px)`,
                                                backgroundColor: userColor,
                                                color: 'white',
                                                borderRadius: '6px',
                                                padding: '4px',
                                                fontSize: '10px',
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                zIndex: 5,
                                                boxSizing: 'border-box',
                                                display: 'flex', flexDirection: 'column'
                                            }}>
                                            <div style={{ fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {event.cr4a1_privado ? '🔒 ' : ''}{event.cr4a1_titulo}
                                            </div>
                                            <div style={{ opacity: 0.9, fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {event.cr4a1_hora_inicio} - {event.cr4a1_hora_fim}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};