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

    // Estados para o Checklist do Workspace de Inovação
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

    const selectedWS = workspaces.find(w => w.cr4a1_calendarios_workspacesid === formData.workspaceId);
    const isDevWorkspace = selectedWS?.cr4a1_nome === "Desenvolvimento e Inovação";

    useEffect(() => {
        if (editingEvent) {
            setFormData({
                cr4a1_agenda_kairosid: editingEvent.cr4a1_agenda_kairosid,
                cr4a1_event_id: editingEvent.cr4a1_event_id,
                title: editingEvent.cr4a1_titulo || '',
                // CORREÇÃO: Extrair apenas a parte da data YYYY-MM-DD
                startDate: editingEvent.cr4a1_data_inicio ? editingEvent.cr4a1_data_inicio.split('T')[0] : '',
                endDate: editingEvent.cr4a1_data_fim ? editingEvent.cr4a1_data_fim.split('T')[0] : '',
                startHour: editingEvent.cr4a1_hora_inicio || '08:00',
                endHour: editingEvent.cr4a1_hora_fim || '09:00',
                type: editingEvent.cr4a1_tipo || (eventTypes[0]?.name || ''),
                details: editingEvent.cr4a1_descricao || editingEvent.cr4a1_detalhes || '', 
                allDay: editingEvent.cr4a1_dia_inteiro || false,
                files: JSON.parse(editingEvent.cr4a1_arquivos || "[]"),
                targetUser: editingEvent.cr4a1_user_login || viewedUser,
                workspaceId: editingEvent.cr4a1_workspace_id || (workspaces[0]?.cr4a1_calendarios_workspacesid || '')
            });
            setIsPrivate(editingEvent.cr4a1_privado || false);

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

    const triggerTaskNotification = (taskName) => {
        const title = "Kairós Inovação";
        const options = {
            body: `Etapa concluída: ${taskName}`,
            icon: '/icon-192.png',
            vibrate: [200, 100, 200]
        };
        if (Notification.permission === "granted") {
            new Notification(title, options);
        }
        toast.success(`Check! ${taskName} concluído.`, { icon: '✅', position: 'top-right' });
    };

    const handleEmojiClick = (emoji) => {
        setFormData(prev => ({ ...prev, title: prev.title + emoji }));
        setIsEmojiPickerOpen(false);
    };

    const handleStartHourChange = (newTime) => {
        setFormData(prev => {
            const [h, m] = newTime.split(':');
            const endH = String((parseInt(h) + 1) % 24).padStart(2, '0');
            return { ...prev, startHour: newTime, endHour: `${endH}:${m}` };
        });
    };

    const addSubtask = () => {
        if (!newSubtask.trim()) return;
        setSubtasks([...subtasks, { text: newSubtask, completed: false }]);
        setNewSubtask('');
    };

    const toggleSubtask = (index) => {
        const updated = [...subtasks];
        const wasCompleted = updated[index].completed;
        updated[index].completed = !wasCompleted;
        setSubtasks(updated);
        if (!wasCompleted) triggerTaskNotification(updated[index].text);
    };

    const removeSubtask = (index) => {
        setSubtasks(subtasks.filter((_, i) => i !== index));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const readers = files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result;
                    if (base64.length > 2000) {
                        toast.error(`Imagem demasiado grande!`, { duration: 4000 });
                        resolve(null);
                    } else resolve(base64);
                };
                reader.readAsDataURL(file);
            });
        });
        Promise.all(readers).then(base64Files => {
            const validFiles = base64Files.filter(f => f !== null);
            if (validFiles.length > 0) {
                setFormData(prev => ({ ...prev, files: [...(prev.files || []), ...validFiles] }));
            }
        });
    };

    const inputStyle = {
        width: '100%', marginBottom: '12px', padding: '12px 16px', boxSizing: 'border-box',
        borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
        color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', fontSize: '14px', transition: 'all 0.2s'
    };

    const customSelectStyle = {
        padding: '10px 4px', borderRadius: '10px', border: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none',
        fontSize: '15px', flex: 1, textAlign: 'center', cursor: 'pointer', appearance: 'none', boxSizing: 'border-box'
    };

    const progressPercentage = subtasks.length > 0 ? Math.round((subtasks.filter(s => s.completed).length / subtasks.length) * 100) : 0;

    return (
        <div className="modal-overlay">
            <div className="modal-container" style={{ maxWidth: '450px', width: '90%', boxSizing: 'border-box' }}>
                <div className="modal-header">
                    <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '20px', fontWeight: '600' }}>
                        {isDevWorkspace ? '🚀 Gestão de Tarefa' : (editingEvent ? '📝 Editar' : '✨ Novo') + ' Agendamento'}
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
                </div>

                <div className="modal-body" style={{ boxSizing: 'border-box' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-accent)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>📁 Workspace Destino:</label>
                        <select value={formData.workspaceId} style={{ ...inputStyle, border: '2px solid var(--border-color)' }} onChange={e => setFormData({ ...formData, workspaceId: e.target.value })} required>
                            <option value="">Seleciona um Workspace...</option>
                            {workspaces.map(ws => (
                                <option key={ws.cr4a1_calendarios_workspacesid} value={ws.cr4a1_calendarios_workspacesid}>{ws.cr4a1_nome} ({ws.cr4a1_tipo_workspace})</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', position: 'relative' }}>
                        <input placeholder="Título do compromisso..." value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                        <button onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '20px', height: '45px', width: '45px', cursor: 'pointer' }}>😊</button>
                        {isEmojiPickerOpen && (
                            <div style={{ position: 'absolute', top: '50px', right: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px', zIndex: 1100 }}>
                                {commonEmojis.map(emoji => (
                                    <button key={emoji} onClick={() => handleEmojiClick(emoji)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>{emoji}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    {isDevWorkspace && (
                        <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '16px', marginBottom: '16px', border: '1px solid var(--text-accent)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-accent)', fontWeight: '800', textTransform: 'uppercase' }}>📝 Checklist:</label>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{progressPercentage}%</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <input placeholder="Nova subtarefa..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyPress={e => e.key === 'Enter' && addSubtask()} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
                                <button onClick={addSubtask} style={{ background: 'var(--text-accent)', color: 'white', border: 'none', borderRadius: '10px', padding: '0 12px', cursor: 'pointer' }}>+</button>
                            </div>
                            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                {subtasks.map((st, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', padding: '4px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                        <input type="checkbox" checked={st.completed} onChange={() => toggleSubtask(i)} style={{ cursor: 'pointer', width: '18px', height: '18px' }} />
                                        <span style={{ flex: 1, fontSize: '13px', textDecoration: st.completed ? 'line-through' : 'none', opacity: st.completed ? 0.6 : 1 }}>{st.text}</span>
                                        <button onClick={() => removeSubtask(i)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer' }}>✕</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Início</label>
                            <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} style={inputStyle} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Fim (Prazo)</label>
                            <input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} style={inputStyle} />
                        </div>
                    </div>

                    <textarea placeholder="Adicionar detalhes..." value={formData.details} onChange={e => setFormData({ ...formData, details: e.target.value })} style={{ ...inputStyle, height: '80px', resize: 'none' }} />

                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                        <button onClick={onClose} disabled={isSaving} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                        <button
                            disabled={isSaving}
                            onClick={async () => {
                                if (!formData.title || !formData.workspaceId) return toast.error('Preenche os campos obrigatórios');
                                setIsSaving(true);
                                try {
                                    // MAPEAMENTO CORRETO: cr4a1_descricao + Ajuste de Fuso
                                    await onSave({ 
                                        ...formData, 
                                        cr4a1_titulo: formData.title,
                                        cr4a1_descricao: formData.details, // COLUNA CORRETA
                                        cr4a1_subtasks: JSON.stringify(subtasks), 
                                        cr4a1_privado: isPrivate,
                                        // CORREÇÃO DATA: Força T12:00:00 para evitar que o fuso recue um dia
                                        cr4a1_data_inicio: formData.allDay ? `${formData.startDate}T12:00:00` : `${formData.startDate}T${formData.startHour}:00`,
                                        cr4a1_data_fim: formData.allDay ? `${formData.endDate}T12:00:00` : `${formData.endDate}T${formData.endHour}:00`
                                    });
                                } catch (e) { setIsSaving(false); }
                            }}
                            className="btn-primary"
                            style={{ flex: 2, opacity: isSaving ? 0.7 : 1 }}
                        >
                            {isSaving ? '⏳ A guardar...' : 'Guardar Compromisso'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};