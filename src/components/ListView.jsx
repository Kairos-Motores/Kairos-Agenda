import React from 'react';

export const ListView = ({ events, allUsers = [], eventTypes = [], onEdit, onDelete }) => {
    if (!events) return <p>Carregando eventos...</p>;

    const userColorMap = allUsers.reduce((acc, u) => {
        acc[u.cr4a1_username] = u.cr4a1_cor || '#3498db';
        return acc;
    }, {});

    // Apenas ordena, porque a filtragem já veio pronta do Hook global
    const sortedEvents = [...events].sort((a, b) => {
        const dateA = a.cr4a1_data_inicio || "";
        const dateB = b.cr4a1_data_inicio || "";
        return dateA.localeCompare(dateB);
    });

    return (
        <div className="view-enter">
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
                                        {event.cr4a1_privado ? '🔒 ' : ''}{event.cr4a1_titulo || "SEM TÍTULO"}
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