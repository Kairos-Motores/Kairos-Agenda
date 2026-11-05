import React from 'react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseAssignees } from '../utils/assignees';
import { getEventTypeLayer, typeLayerPatternStyle } from '../utils/eventTypeLayer';

export const AgendaView = ({ startDate, daysCount = 14, getEventsForDay, holidays, allUsers = [], eventTypes = [], onEdit }) => {
    const days = Array.from({ length: daysCount }, (_, i) => addDays(startDate, i));

    const userColorMap = allUsers.reduce((acc, u) => {
        acc[u.cr4a1_username] = u.cr4a1_cor || '#3498db';
        return acc;
    }, {});

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const dayEntries = days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const events = getEventsForDay(day)
            .filter(e => !e.isIntervalo)
            .sort((a, b) => {
                if (!!a.cr4a1_dia_inteiro !== !!b.cr4a1_dia_inteiro) return a.cr4a1_dia_inteiro ? -1 : 1;
                return (a.cr4a1_hora_inicio || '').localeCompare(b.cr4a1_hora_inicio || '');
            });
        const dayHolidays = (holidays || []).filter(h => h.date === dateStr);
        return { day, dateStr, events, dayHolidays };
    }).filter(entry => entry.events.length > 0 || entry.dayHolidays.length > 0);

    if (dayEntries.length === 0) {
        return (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '40px', opacity: 0.5 }}>event_busy</span>
                <p style={{ marginTop: '8px' }}>Nenhum evento neste período.</p>
            </div>
        );
    }

    return (
        <div className="view-enter" style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px 4px 24px' }}>
            {dayEntries.map(({ day, dateStr, events, dayHolidays }) => {
                const isToday = dateStr === todayStr;
                return (
                    <div key={dateStr} style={{ display: 'flex', gap: '16px', padding: '14px 4px', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ width: '56px', flexShrink: 0, textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '600', color: isToday ? 'var(--text-accent)' : 'var(--text-secondary)' }}>
                                {format(day, 'EEE', { locale: ptBR })}
                            </div>
                            <div style={{
                                fontSize: '20px', fontWeight: isToday ? '700' : '500',
                                color: isToday ? '#fff' : 'var(--text-title)',
                                background: isToday ? 'var(--text-accent)' : 'transparent',
                                width: '34px', height: '34px', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2px auto 0'
                            }}>
                                {format(day, 'd')}
                            </div>
                        </div>

                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {dayHolidays.map(h => (
                                <div key={h.name} style={{ fontSize: '12px', color: '#c0392b', fontWeight: '600' }}>🚩 {h.name}</div>
                            ))}
                            {events.map(event => {
                                const assignees = parseAssignees(event.cr4a1_user_login);
                                const userColor = event.cr4a1_cor || userColorMap[assignees[0]] || '#3498db';
                                const typeLayer = getEventTypeLayer(event.cr4a1_tipo, eventTypes);
                                return (
                                    <div
                                        key={event.cr4a1_agenda_kairosid}
                                        onClick={(e) => onEdit(event, e.currentTarget.getBoundingClientRect())}
                                        className="boing-effect"
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
                                            borderRadius: '10px', background: 'var(--bg-secondary)', cursor: 'pointer',
                                            borderLeft: `4px solid ${userColor}`,
                                            ...(typeLayer.layer === 'padrao' ? typeLayerPatternStyle(typeLayer.color) : {}),
                                        }}
                                    >
                                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', minWidth: '42px', flexShrink: 0 }}>
                                            {event.cr4a1_dia_inteiro ? 'Dia todo' : (event.cr4a1_hora_inicio || '')}
                                        </span>
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                                            {typeLayer.layer === 'icone' && typeLayer.emoji ? typeLayer.emoji + ' ' : ''}
                                            {event.cr4a1_privado ? '🔒 ' : ''}{event.cr4a1_titulo}
                                        </span>
                                        {assignees.length > 1 && (
                                            <span style={{ display: 'flex', gap: '2px', flexShrink: 0 }} title={assignees.join(', ')}>
                                                {assignees.slice(0, 4).map((u, i) => (
                                                    <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: userColorMap[u] || '#3498db', border: '1px solid var(--bg-secondary)' }} />
                                                ))}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
