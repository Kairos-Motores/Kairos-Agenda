import React, { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const ListView = ({ events, allUsers = [], eventTypes = [], onEdit, onDelete }) => {
    const [filters, setFilters] = useState({
        text: '',
        user: 'all',
        type: 'all',
        month: 'all'
    });

    if (!events) return <p>Carregando eventos...</p>;

    // Criamos um mapa de cores para busca rápida
    const userColorMap = allUsers.reduce((acc, u) => {
        acc[u.cr4a1_username] = u.cr4a1_cor || '#3498db';
        return acc;
    }, {});

    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            const matchesText = !filters.text || 
                (event.cr4a1_titulo?.toLowerCase().includes(filters.text.toLowerCase())) ||
                (event.cr4a1_detalhes?.toLowerCase().includes(filters.text.toLowerCase()));
            
            const matchesUser = filters.user === 'all' || event.cr4a1_user_login === filters.user;
            const matchesType = filters.type === 'all' || event.cr4a1_tipo === filters.type;
            
            let matchesMonth = true;
            if (filters.month !== 'all') {
                const eventMonth = event.cr4a1_data_inicio?.split('-').slice(0, 2).join('-'); // yyyy-MM
                matchesMonth = eventMonth === filters.month;
            }

            return matchesText && matchesUser && matchesType && matchesMonth;
        });
    }, [events, filters]);

    const sortedEvents = [...filteredEvents].sort((a, b) => {
        const dateA = a.cr4a1_data_inicio || "";
        const dateB = b.cr4a1_data_inicio || "";
        return dateA.localeCompare(dateB);
    });

    // Meses únicos dos eventos para o filtro
    const availableMonths = useMemo(() => {
        const months = new Set();
        events.forEach(e => {
            if (e.cr4a1_data_inicio) {
                const [y, m] = e.cr4a1_data_inicio.split('-');
                months.add(`${y}-${m}`);
            }
        });
        return Array.from(months).sort().reverse();
    }, [events]);

    const filterStyle = {
        padding: '8px 12px',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        outline: 'none',
        fontSize: '13px',
        minWidth: '120px'
    };

    return (
        <div style={{ marginTop: '20px' }} className="view-enter">
            {/* Barra de Filtros */}
            <div className="list-filter-bar">
                <input 
                    placeholder="🔍 Buscar evento..." 
                    value={filters.text}
                    onChange={e => setFilters({...filters, text: e.target.value})}
                    style={{ flex: 2, minWidth: '200px' }}
                />
                
                <select 
                    value={filters.user} 
                    onChange={e => setFilters({...filters, user: e.target.value})}
                >
                    <option value="all">👤 Todos Usuários</option>
                    {allUsers.map(u => <option key={u.cr4a1_username} value={u.cr4a1_username}>{u.cr4a1_username}</option>)}
                </select>
 
                <select 
                    value={filters.type} 
                    onChange={e => setFilters({...filters, type: e.target.value})}
                >
                    <option value="all">🏷️ Todos Tipos</option>
                    {eventTypes.map(t => <option key={t.id} value={t.name}>{t.emoji} {t.name}</option>)}
                </select>
 
                <select 
                    value={filters.month} 
                    onChange={e => setFilters({...filters, month: e.target.value})}
                >
                    <option value="all">📅 Todos Meses</option>
                    {availableMonths.map(m => {
                        const [y, mm] = m.split('-');
                        const date = new Date(y, parseInt(mm)-1);
                        return <option key={m} value={m}>{format(date, 'MMMM yyyy', { locale: ptBR })}</option>
                    })}
                </select>
 
                {(filters.text || filters.user !== 'all' || filters.type !== 'all' || filters.month !== 'all') && (
                    <button 
                        onClick={() => setFilters({ text: '', user: 'all', type: 'all', month: 'all' })}
                        className="nav-pill"
                        style={{ color: 'var(--text-accent)' }}
                    >
                        Limpar Filtros
                    </button>
                )}
            </div>
 
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {sortedEvents.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)', borderRadius: '32px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                        <p style={{ fontSize: '16px', fontWeight: '500' }}>Nenhum evento encontrado para estes filtros.</p>
                    </div>
                )}
 
                {sortedEvents.map(event => {
                    const userColor = event.cr4a1_cor || userColorMap[event.cr4a1_user_login] || '#3498db';
                    const eventType = eventTypes.find(t => t.name === event.cr4a1_tipo);
                    const emoji = eventType?.emoji || "📝";
                    
                    return (
                        <div key={event.cr4a1_agenda_kairosid || Math.random()} className="list-event-card" style={{ borderLeft: `8px solid ${userColor}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: '800', color: userColor, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        👤 {event.cr4a1_user_login}
                                    </div>
                                    <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-title)', fontSize: '18px', fontWeight: '700' }}>
                                        {event.cr4a1_titulo || "SEM TÍTULO"}
                                    </h3>
                                    <span style={{
                                        backgroundColor: userColor,
                                        color: 'white',
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        fontSize: '11px',
                                        fontWeight: '700'
                                    }}>
                                        {emoji} {event.cr4a1_tipo || "TASK"}
                                    </span>
                                </div>
 
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => onEdit(event)} className="nav-pill" style={{ backgroundColor: 'var(--bg-secondary)' }}>✏️ Editar</button>
                                    <button onClick={() => onDelete(event)} className="icon-btn" style={{ color: '#e74c3c', backgroundColor: 'rgba(231,76,60,0.1)' }}>🗑️</button>
                                </div>
                            </div>
 
                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '12px 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', margin: '8px 0' }}>
                                <span>📅 <strong>Data:</strong> {event.cr4a1_data_inicio} até {event.cr4a1_data_fim}</span>
                                <span>🕒 <strong>Horário:</strong> {event.cr4a1_dia_inteiro ? <span style={{ color: 'var(--text-accent)', fontWeight: '700' }}>🌞 Dia Inteiro</span> : `${event.cr4a1_hora_inicio} - ${event.cr4a1_hora_fim}`}</span>
                            </div>
 
                            {event.cr4a1_detalhes && (
                                <div style={{ backgroundColor: 'var(--bg-page)', padding: '16px', borderRadius: '16px', fontSize: '14px', color: 'var(--text-primary)', borderLeft: '3px solid var(--border-color)', fontStyle: 'italic', lineHeight: '1.6' }}>
                                    {event.cr4a1_detalhes}
                                </div>
                            )}
 
                            {event.cr4a1_arquivos && (
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                                    {JSON.parse(event.cr4a1_arquivos || "[]").map((file, idx) => (
                                        <div key={idx} className="file-preview-pill" style={{ transition: 'var(--transition-elastic)' }}>
                                            {file.startsWith('data:image') ? (
                                                <img src={file} alt="Anexo" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }} />
                                            ) : (
                                                <div style={{ padding: '8px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>📄 Documento</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};