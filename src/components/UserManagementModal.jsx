import React, { useState, useEffect } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { parseRoles } from '../utils/permissions';
import { ALL_KNOWN_ROLES } from '../config/roleWorkspaceMap';

export const UserManagementModal = ({ isOpen, onClose, allUsers, updateUserColor, eventTypes = [], addEventType, updateEventType, deleteEventType, isAdmin = false, updateUserRoles }) => {
    const trapRef = useFocusTrap(isOpen);
    const [activeTab, setActiveTab] = useState('users');
    const [editingTypeId, setEditingTypeId] = useState(null);
    const [newTypeName, setNewTypeName] = useState('');
    const [newTypeEmoji, setNewTypeEmoji] = useState('📝');
    const [newTypeLayer, setNewTypeLayer] = useState('nenhuma');
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [editingRolesFor, setEditingRolesFor] = useState(null);
    const [draftRoles, setDraftRoles] = useState([]);
    const [roleSearch, setRoleSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');

    const startEditingRoles = (u) => {
        setEditingRolesFor(u.cr4a1_username);
        setDraftRoles(parseRoles(u.cr4a1_role));
        setRoleSearch('');
    };

    const cancelEditingRoles = () => {
        setEditingRolesFor(null);
        setDraftRoles([]);
        setRoleSearch('');
    };

    const toggleDraftRole = (role) => {
        setDraftRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
    };

    const saveRoles = () => {
        updateUserRoles(editingRolesFor, draftRoles);
        cancelEditingRoles();
    };

    const startEditingType = (t) => {
        setEditingTypeId(t.id);
        setNewTypeName(t.name);
        setNewTypeEmoji(t.emoji);
        setNewTypeLayer(t.layer || 'nenhuma');
    };

    const cancelEditingType = () => {
        setEditingTypeId(null);
        setNewTypeName('');
        setNewTypeEmoji('📝');
        setNewTypeLayer('nenhuma');
    };

    // Ao trocar de aba, volta o scroll do modal para o topo — sem isso, quem estivesse
    // rolado lá embaixo na lista de Membros via a nova aba renderizada fora da área
    // visível e parecia que os membros continuavam ali, sobrepostos aos tipos de evento.
    useEffect(() => {
        if (trapRef.current) trapRef.current.scrollTop = 0;
    }, [activeTab, trapRef]);

    const layerOptions = [
        { id: 'icone', label: 'Ícone', description: 'Mostra o emoji do tipo no card do evento' },
        { id: 'borda', label: 'Borda', description: 'Faixa colorida na lateral do card' },
        { id: 'padrao', label: 'Padrão', description: 'Textura sutil sobre a cor do responsável' },
        { id: 'nenhuma', label: 'Nenhuma', description: 'Sem destaque extra além da cor do responsável' }
    ];

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
                            <input
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                                placeholder="Buscar utilizador..."
                                style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}
                            />
                            {allUsers.filter(u => u.cr4a1_username.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                                <div key={u.cr4a1_username} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: u.cr4a1_cor || '#3498db' }} />
                                            <span style={{ fontWeight: '500', color: 'var(--text-primary)', fontSize: '14px' }}>{u.cr4a1_username}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {isAdmin && (
                                                <button onClick={() => startEditingRoles(u)} className="icon-btn boing-effect" aria-label={`Editar roles de "${u.cr4a1_username}"`} style={{ width: '28px', height: '28px', color: 'var(--text-accent)' }}>
                                                    <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>badge</span>
                                                </button>
                                            )}
                                            <input type="color" value={u.cr4a1_cor || '#3498db'} onChange={(e) => updateUserColor(u.cr4a1_usuarios_agendaid, e.target.value)} style={{ border: 'none', width: '28px', height: '28px', cursor: 'pointer', background: 'none' }} />
                                        </div>
                                    </div>

                                    {isAdmin && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {parseRoles(u.cr4a1_role).length === 0 ? (
                                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sem role</span>
                                            ) : parseRoles(u.cr4a1_role).map(r => (
                                                <span key={r} style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>{r}</span>
                                            ))}
                                        </div>
                                    )}

                                    {isAdmin && editingRolesFor === u.cr4a1_username && (
                                        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <input
                                                value={roleSearch}
                                                onChange={e => setRoleSearch(e.target.value)}
                                                placeholder="Buscar role..."
                                                style={{ padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                                            />
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                                                {ALL_KNOWN_ROLES.filter(r => r.toLowerCase().includes(roleSearch.toLowerCase())).map(role => (
                                                    <button
                                                        key={role}
                                                        onClick={() => toggleDraftRole(role)}
                                                        className="boing-effect"
                                                        style={{
                                                            padding: '6px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                                                            border: draftRoles.includes(role) ? '2px solid var(--text-accent)' : '1px solid var(--border-color)',
                                                            background: draftRoles.includes(role) ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                                                            color: draftRoles.includes(role) ? 'var(--text-accent)' : 'var(--text-primary)'
                                                        }}
                                                    >
                                                        {role}
                                                    </button>
                                                ))}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button onClick={cancelEditingRoles} className="btn-secondary" style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '13px' }}>Cancelar</button>
                                                <button onClick={saveRoles} className="btn-primary" style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '13px' }}>Salvar roles</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>
                            <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: editingTypeId ? 'var(--text-accent)' : 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                    {editingTypeId ? '✏️ Editando tipo' : 'Novo tipo'}
                                </span>
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
                                        onClick={() => {
                                            if (!newTypeName) return;
                                            if (editingTypeId) {
                                                updateEventType(editingTypeId, newTypeName, newTypeEmoji, newTypeLayer);
                                            } else {
                                                addEventType(newTypeName, newTypeEmoji, newTypeLayer);
                                            }
                                            cancelEditingType();
                                        }}
                                        className="btn-primary"
                                        style={{ padding: '10px 20px', borderRadius: '12px' }}
                                    >
                                        {editingTypeId ? 'Salvar' : 'Add'}
                                    </button>
                                    {editingTypeId && (
                                        <button
                                            onClick={cancelEditingType}
                                            className="btn-secondary"
                                            style={{ padding: '10px 16px', borderRadius: '12px' }}
                                        >
                                            Cancelar
                                        </button>
                                    )}
                                </div>

                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                                        Camada visual no calendário
                                    </label>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {layerOptions.map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setNewTypeLayer(opt.id)}
                                                title={opt.description}
                                                className="boing-effect"
                                                style={{
                                                    padding: '8px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                                    border: newTypeLayer === opt.id ? '2px solid var(--text-accent)' : '1px solid var(--border-color)',
                                                    background: newTypeLayer === opt.id ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                                                    color: newTypeLayer === opt.id ? 'var(--text-accent)' : 'var(--text-primary)'
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {eventTypes.map(t => (
                                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: editingTypeId === t.id ? 'var(--bg-tertiary)' : 'var(--bg-secondary)', padding: '10px 16px', borderRadius: '12px', border: editingTypeId === t.id ? '2px solid var(--text-accent)' : '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '16px' }}>{t.emoji}</span>
                                            <span style={{ fontWeight: '500', color: 'var(--text-primary)', fontSize: '14px' }}>{t.name}</span>
                                            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                {layerOptions.find(o => o.id === (t.layer || 'nenhuma'))?.label || 'Nenhuma'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button onClick={() => startEditingType(t)} className="icon-btn boing-effect" aria-label={`Editar tipo de evento "${t.name}"`} style={{ width: '32px', height: '32px', color: 'var(--text-accent)' }}>
                                                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>edit</span>
                                            </button>
                                            <button onClick={() => { if (editingTypeId === t.id) cancelEditingType(); deleteEventType(t.id); }} className="icon-btn boing-effect" aria-label={`Remover tipo de evento "${t.name}"`} style={{ width: '32px', height: '32px', color: '#e74c3c' }}>
                                                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span>
                                            </button>
                                        </div>
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