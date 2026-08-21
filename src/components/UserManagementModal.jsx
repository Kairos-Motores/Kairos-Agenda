import React, { useState, useEffect } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

export const UserManagementModal = ({ isOpen, onClose, allUsers, updateUserColor, eventTypes = [], addEventType, deleteEventType }) => {
    const trapRef = useFocusTrap(isOpen);
    const [activeTab, setActiveTab] = useState('users');
    const [newTypeName, setNewTypeName] = useState('');
    const [newTypeEmoji, setNewTypeEmoji] = useState('📝');
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    const commonEmojis = [
        // Trabalho e Reuniões
        '🤝', '📞', '👥', '💬', '📢', '💻', '🖥️', '📅', '📊', '📝', '💡', '🏢',
        // Logística e Visitas
        '🚗', '🏍️', '✈️', '🏨', '📍', '🗺️', '⛽', '🚚', '📦', '🔑', '🏠',
        // Manutenção e Execução
        '🛠️', '🏗️', '🔧', '🔨', '⚡', '🔋', '🛡️', '🎨', '🔍', '🧪',
        // Status e Urgência
        '⚠️', '✅', '❌', '🚩', '🕒', '⏳', '🔥', '💎', '🎯', '🚀',
        // Comunicação e Documentos
        '✉️', '📄', '⚖️', '💰', '💵', '💳', '📈', '📌', '🔔', '📱',
        // Bem-estar e Pausas
        '☕', '🍱', '🍕', '🥤', '🏋️', '🥋', '🧘', '🚶', '🎉', '🏆'
    ];

    if (!isOpen) return null;

    const tabStyle = (active) => ({
        padding: '10px 20px',
        cursor: 'pointer',
        userSelect: 'none',
        borderBottom: active ? '3px solid var(--text-accent)' : '3px solid transparent',
        color: active ? 'var(--text-accent)' : 'var(--text-secondary)',
        fontWeight: '600',
        transition: 'all 0.2s'
    });

    return (
        <div className="modal-overlay">
            <div ref={trapRef} tabIndex={-1} className="modal-container">
                <div className="modal-header">
                    <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '20px', fontWeight: '600' }}>⚙️ Configurações</h3>
                    <button onClick={onClose} className="icon-btn boing-effect" aria-label="Fechar" style={{ color: 'var(--text-secondary)' }}>
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>

                <div className="modal-body">
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '20px', overflowX: 'auto' }}>
                        <div onClick={() => setActiveTab('users')} style={tabStyle(activeTab === 'users')}>Membros</div>
                        <div onClick={() => setActiveTab('types')} style={tabStyle(activeTab === 'types')}>Tipos de Evento</div>
                    </div>

                    {activeTab === 'users' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {allUsers.map(u => (
                                <div key={u.cr4a1_username} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '16px', border: '1px solid var(--border-color)', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: u.cr4a1_cor || '#3498db' }} />
                                        <span style={{ fontWeight: '500', color: 'var(--text-primary)', fontSize: '14px' }}>{u.cr4a1_username}</span>
                                    </div>
                                    <input type="color" value={u.cr4a1_cor || '#3498db'} onChange={(e) => updateUserColor(u.cr4a1_usuarios_agendaid, e.target.value)} style={{ border: 'none', width: '28px', height: '28px', cursor: 'pointer', background: 'none' }} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>
                            <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                                            className="boing-effect"
                                            style={{ width: '45px', height: '45px', borderRadius: '12px', border: `1px solid ${isEmojiPickerOpen ? 'var(--text-accent)' : 'var(--border-color)'}`, background: isEmojiPickerOpen ? 'var(--bg-tertiary)' : 'var(--bg-secondary)', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            {newTypeEmoji}
                                        </button>
                                        {isEmojiPickerOpen && (
                                            <div style={{ position: 'absolute', top: '50px', left: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px', zIndex: 1100, boxShadow: 'var(--shadow-md)', maxHeight: '200px', overflowY: 'auto' }}>
                                                {commonEmojis.map(emoji => (
                                                    <button key={emoji} onClick={() => { setNewTypeEmoji(emoji); setIsEmojiPickerOpen(false); }} className="boing-effect emoji-pick-btn" style={{ background: 'none', border: 'none', borderRadius: '8px', fontSize: '20px', cursor: 'pointer', padding: '5px' }}>{emoji}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <input 
                                        value={newTypeName} 
                                        onChange={e => setNewTypeName(e.target.value)} 
                                        style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} 
                                        placeholder="Nome do novo tipo..."
                                    />
                                    <button 
                                        onClick={() => { if(newTypeName) { addEventType(newTypeName, newTypeEmoji); setNewTypeName(''); } }}
                                        className="btn-primary"
                                        style={{ padding: '10px 20px', borderRadius: '12px' }}
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {eventTypes.map(t => (
                                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '16px' }}>{t.emoji}</span>
                                            <span style={{ fontWeight: '500', color: 'var(--text-primary)', fontSize: '14px' }}>{t.name}</span>
                                        </div>
                                        <button onClick={() => deleteEventType(t.id)} className="icon-btn boing-effect" aria-label={`Remover tipo de evento "${t.name}"`} style={{ width: '32px', height: '32px', color: '#e74c3c' }}>
                                            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '24px' }}>
                        <button onClick={onClose} className="btn-primary" style={{ width: '100%', padding: '14px' }}>Concluído</button>
                    </div>
                </div>
            </div>
        </div>
    );
};