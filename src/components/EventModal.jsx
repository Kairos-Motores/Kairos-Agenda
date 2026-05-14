import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export const EventModal = ({ isOpen, onClose, onSave, initialDate, editingEvent, userRole, allUsers = [], eventTypes = [], viewedUser, workspaces = [] }) => {
    const [formData, setFormData] = useState({
        title: '', startDate: '', endDate: '',
        startHour: '08:00', endHour: '09:00',
        details: '', type: '', files: [],
        targetUser: '', allDay: false,
        workspaceId: ''
    });

    // ESTADOS PARA CHECKLIST ESTILO NOTION
    const [subtasks, setSubtasks] = useState([]);
    const [newSubtask, setNewSubtask] = useState('');

    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const commonEmojis = [
        '🤝', '📞', '👥', '💬', '📢', '💻', '🖥️', '📅', '📊', '📝', '💡', '🏢',
        '🚗', '🏍️', '✈️', '🏨', '📍', '🗺️', '⛽', '🚚', '📦', '🔑', '🏠',
        '🛠️', '🏗️', '🔧', '🔨', '⚡', '🔋', '🛡️', '🎨', '🔍', '🧪',
        '⚠️', '✅', '❌', '🚩', '🕒', '⏳', '🔥', '💎', '🎯', '🚀',
        '✉️', '📄', '⚖️', '💰', '💵', '💳', '📈', '📌', '🔔', '📱',
        '☕', '🍱', '🍕', '🥤', '🏋️', '🥋', '🧘', '🚶', '🎉', '🏆'
    ];

    useEffect(() => {
        if (editingEvent) {
            setFormData({
                cr4a1_agenda_kairosid: editingEvent.cr4a1_agenda_kairosid,
                cr4a1_event_id: editingEvent.cr4a1_event_id,
                title: editingEvent.cr4a1_titulo || '',
                startDate: editingEvent.cr4a1_data_inicio ? editingEvent.cr4a1_data_inicio.split('T')[0] : '',
                endDate: editingEvent.cr4a1_data_fim ? editingEvent.cr4a1_data_fim.split('T')[0] : '',
                startHour: editingEvent.cr4a1_hora_inicio || '08:00',
                endHour: editingEvent.cr4a1_hora_fim || '09:00',
                type: editingEvent.cr4a1_tipo || (eventTypes[0]?.name || ''),
                details: editingEvent.cr4a1_descricao || '', // MAPEADO PARA cr4a1_descricao
                allDay: editingEvent.cr4a1_dia_inteiro || false,
                files: JSON.parse(editingEvent.cr4a1_arquivos || "[]"),
                targetUser: editingEvent.cr4a1_user_login || viewedUser,
                workspaceId: editingEvent.cr4a1_workspace_id || (workspaces[0]?.cr4a1_calendarios_workspacesid || '')
            });
            setIsPrivate(editingEvent.cr4a1_privado || false);
            
            // CARREGAR CHECKLIST SE EXISTIR
            try {
                setSubtasks(editingEvent.cr4a1_subtasks ? JSON.parse(editingEvent.cr4a1_subtasks) : []);
            } catch (e) {
                setSubtasks([]);
            }
        }
        else {
            const cleanInitialDate = initialDate ? initialDate.split('T')[0] : '';
            setFormData({
                title: '', startDate: cleanInitialDate, endDate: cleanInitialDate,
                startHour: '08:00', endHour: '09:00',
                details: '', type: eventTypes[0]?.name || 'Tarefa', files: [],
                targetUser: viewedUser || '', allDay: false,
                workspaceId: workspaces[0]?.cr4a1_calendarios_workspacesid || ''
            });
            setSubtasks([]);
            setIsPrivate(false);
        }
        setIsSaving(false);
    }, [editingEvent, initialDate, isOpen, viewedUser, eventTypes, workspaces]);

    if (!isOpen) return null;

    const handleEmojiClick = (emoji) => {
        setFormData(prev => ({ ...prev, title: prev.title + emoji }));
        setIsEmojiPickerOpen(false);
    };

    const addSubtask = () => {
        if (!newSubtask.trim()) return;
        setSubtasks([...subtasks, { text: newSubtask, completed: false }]);
        setNewSubtask('');
    };

    const toggleSubtask = (index) => {
        const updated = [...subtasks];
        updated[index].completed = !updated[index].completed;
        setSubtasks(updated);
    };

    const removeSubtask = (index) => {
        setSubtasks(subtasks.filter((_, i) => i !== index));
    };

    const inputStyle = { width: '100%', marginBottom: '12px', padding: '12px 16px', boxSizing: 'border-box', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', fontSize: '14px' };

    return (
        <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div className="modal-content view-enter" style={{ maxWidth: '500px', width: '100%', borderRadius: '24px', background: 'var(--bg-primary)', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '20px', margin: 0 }}>{editingEvent ? 'Editar Atividade' : 'Nova Atividade'}</h2>
                    <button onClick={onClose} className="icon-btn">✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Título</label>
                    <div style={{ position: 'relative', display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <input
                            style={{ ...inputStyle, marginBottom: 0 }}
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Nome do evento ou tarefa..."
                        />
                        <button onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)} className="icon-btn" style={{ padding: '0 12px' }}>😊</button>
                        {isEmojiPickerOpen && (
                            <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 200, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                                {commonEmojis.map(emoji => (
                                    <span key={emoji} onClick={() => handleEmojiClick(emoji)} style={{ cursor: 'pointer', fontSize: '20px' }}>{emoji}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Início</label>
                            <input type="date" style={inputStyle} value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                            {!formData.allDay && <input type="time" style={inputStyle} value={formData.startHour} onChange={(e) => setFormData({ ...formData, startHour: e.target.value })} />}
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Fim (Prazo)</label>
                            <input type="date" style={inputStyle} value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
                            {!formData.allDay && <input type="time" style={inputStyle} value={formData.endHour} onChange={(e) => setFormData({ ...formData, endHour: e.target.value })} />}
                        </div>
                    </div>

                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Workspace</label>
                    <select style={inputStyle} value={formData.workspaceId} onChange={(e) => setFormData({ ...formData, workspaceId: e.target.value })}>
                        {workspaces.map(ws => (
                            <option key={ws.cr4a1_calendarios_workspacesid} value={ws.cr4a1_calendarios_workspacesid}>{ws.cr4a1_nome}</option>
                        ))}
                    </select>

                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Descrição Detalhada</label>
                    <textarea
                        style={{ ...inputStyle, height: '80px', resize: 'none' }}
                        value={formData.details}
                        onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                        placeholder="Adicione notas extras aqui..."
                    />

                    {/* SEÇÃO CHECKLIST - ESTILO NOTION */}
                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '16px', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '12px' }}>Checklist da Tarefa</label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <input 
                                style={{ ...inputStyle, marginBottom: 0, flex: 1 }} 
                                value={newSubtask} 
                                onChange={(e) => setNewSubtask(e.target.value)} 
                                onKeyPress={(e) => e.key === 'Enter' && addSubtask()}
                                placeholder="Adicionar item..." 
                            />
                            <button onClick={addSubtask} className="icon-btn" style={{ background: 'var(--text-accent)', color: 'white' }}>
                                <span className="material-symbols-rounded">add</span>
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {subtasks.map((st, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div onClick={() => toggleSubtask(i)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: st.completed ? 'var(--text-accent)' : 'var(--text-secondary)' }}>
                                        <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                                            {st.completed ? 'check_box' : 'check_box_outline_blank'}
                                        </span>
                                    </div>
                                    <span style={{ flex: 1, fontSize: '14px', textDecoration: st.completed ? 'line-through' : 'none', opacity: st.completed ? 0.6 : 1 }}>{st.text}</span>
                                    <button onClick={() => removeSubtask(i)} className="icon-btn" style={{ fontSize: '16px', opacity: 0.5 }}>✕</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                        <button onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                        <button
                            onClick={async () => {
                                setIsSaving(true);
                                try {
                                    // MAPEAMENTO FINAL PARA O DATAVERSE
                                    const finalData = {
                                        ...formData,
                                        cr4a1_titulo: formData.title,
                                        cr4a1_descricao: formData.details,
                                        cr4a1_subtasks: JSON.stringify(subtasks), // PERSISTE COMO STRING JSON
                                        cr4a1_privado: isPrivate
                                    };
                                    await onSave(finalData);
                                } catch (e) {
                                    setIsSaving(false);
                                }
                            }}
                            className="btn-primary"
                            style={{ flex: 2, opacity: isSaving ? 0.7 : 1 }}
                        >
                            {isSaving ? 'Salvando...' : 'Salvar Atividade'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};