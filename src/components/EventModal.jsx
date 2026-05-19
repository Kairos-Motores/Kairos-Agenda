import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export const EventModal = ({ isOpen, onClose, onSave, initialDate, editingEvent, userRole, allUsers = [], eventTypes = [], viewedUser, workspaces = [] }) => {
    const [formData, setFormData] = useState({
        title: '', startDate: '', endDate: '',
        startHour: '08:00', endHour: '09:00',
        details: '', type: '', files: [],
        targetUser: '', allDay: false,
        workspaceId: '' // NOVO CAMPO
    });

    // Estados para o Checklist do Workspace de Inovação
    const [subtasks, setSubtasks] = useState([]);
    const [newSubtask, setNewSubtask] = useState('');

    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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

    // Identifica se estamos no Workspace de Inovação para mostrar o checklist
    const selectedWS = workspaces.find(w => w.cr4a1_calendarios_workspacesid === formData.workspaceId);
    const isDevWorkspace = selectedWS?.cr4a1_nome === "Desenvolvimento e Inovação";

    useEffect(() => {
    if (editingEvent) {
        setFormData({
            cr4a1_agenda_kairosid: editingEvent.cr4a1_agenda_kairosid,
            cr4a1_event_id: editingEvent.cr4a1_event_id,
            title: editingEvent.cr4a1_titulo || '',
            // Trata como string pura YYYY-MM-DD
            startDate: editingEvent.cr4a1_data_inicio ? editingEvent.cr4a1_data_inicio.split('T')[0] : '',
            endDate: editingEvent.cr4a1_data_fim ? editingEvent.cr4a1_data_fim.split('T')[0] : '',
            startHour: editingEvent.cr4a1_hora_inicio || '08:00',
            endHour: editingEvent.cr4a1_hora_fim || '09:00',
            type: editingEvent.cr4a1_tipo || (eventTypes[0]?.name || ''),
            
            // CORREÇÃO AQUI: Resgata o valor correto da coluna cr4a1_detalhes
            details: editingEvent.cr4a1_detalhes || editingEvent.cr4a1_descricao || '', 
            
            allDay: editingEvent.cr4a1_dia_inteiro || false,
            files: JSON.parse(editingEvent.cr4a1_arquivos || "[]"),
            targetUser: editingEvent.cr4a1_user_login || viewedUser,
            workspaceId: editingEvent.cr4a1_workspace_id || (workspaces[0]?.cr4a1_calendarios_workspacesid || '')
        });
        setIsPrivate(editingEvent.cr4a1_privado || false);

        // Carrega as subtarefas do banco de dados (JSON)
        try {
            setSubtasks(editingEvent.cr4a1_subtasks ? (typeof editingEvent.cr4a1_subtasks === 'string' ? JSON.parse(editingEvent.cr4a1_subtasks) : editingEvent.cr4a1_subtasks) : []);
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

    // Função de Notificação (Browser/Smartphone e Toast)
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

        // Dispara notificação ao marcar como concluído
        if (!wasCompleted) {
            triggerTaskNotification(updated[index].text);
        }
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
                        toast.error(`Imagem muito grande! (Limite 2.000 caracteres)`, { duration: 4000 });
                        resolve(null);
                    } else {
                        resolve(base64);
                    }
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

    const completedCount = subtasks.filter(s => s.completed).length;
    const progressPercentage = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

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
                    {/* SELETOR DE WORKSPACE */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-accent)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>📁 Workspace Destino:</label>
                        <select
                            value={formData.workspaceId}
                            style={{ ...inputStyle, border: '2px solid var(--border-color)' }}
                            onChange={e => setFormData({ ...formData, workspaceId: e.target.value })}
                            required
                        >
                            <option value="">Selecione um Workspace...</option>
                            {workspaces.map(ws => (
                                <option key={ws.cr4a1_calendarios_workspacesid} value={ws.cr4a1_calendarios_workspacesid}>
                                    {ws.cr4a1_nome} ({ws.cr4a1_tipo_workspace})
                                </option>
                            ))}
                        </select>
                    </div>

                    {userRole === 'SECRETARIA' && (
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-accent)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>👤 Agendar para:</label>
                            <select
                                value={formData.targetUser}
                                style={{ ...inputStyle, border: '2px solid var(--text-accent)' }}
                                onChange={e => setFormData({ ...formData, targetUser: e.target.value })}
                            >
                                {allUsers.map(u => (
                                    <option key={u.cr4a1_username} value={u.cr4a1_username}>
                                        {u.cr4a1_username}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', position: 'relative' }}>
                        <input
                            placeholder="Título do compromisso..."
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                        />
                        <button
                            onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '20px', height: '45px', width: '45px', flexShrink: 0, cursor: 'pointer', boxSizing: 'border-box' }}
                        >
                            😊
                        </button>

                        {isEmojiPickerOpen && (
                            <div style={{ position: 'absolute', top: '50px', right: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px', zIndex: 1100, boxShadow: 'var(--shadow-md)' }}>
                                {commonEmojis.map(emoji => (
                                    <button key={emoji} onClick={() => handleEmojiClick(emoji)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '5px' }}>{emoji}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* SEÇÃO DE CHECKLIST (Aparece apenas em Desenvolvimento e Inovação) */}
                    {isDevWorkspace && (
                        <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '16px', marginBottom: '16px', border: '1px solid var(--text-accent)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-accent)', fontWeight: '800', textTransform: 'uppercase' }}>📝 Checklist de Progresso:</label>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{progressPercentage}%</span>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <input 
                                    placeholder="Nova subtarefa..." 
                                    value={newSubtask} 
                                    onChange={e => setNewSubtask(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && addSubtask()}
                                    style={{ ...inputStyle, marginBottom: 0, flex: 1 }} 
                                />
                                <button onClick={addSubtask} style={{ background: 'var(--text-accent)', color: 'white', border: 'none', borderRadius: '10px', padding: '0 12px', cursor: 'pointer' }}>+</button>
                            </div>

                            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                {subtasks.map((st, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', padding: '4px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={st.completed} 
                                            onChange={() => toggleSubtask(i)} 
                                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                        />
                                        <span style={{ flex: 1, fontSize: '13px', textDecoration: st.completed ? 'line-through' : 'none', opacity: st.completed ? 0.6 : 1 }}>
                                            {st.text}
                                        </span>
                                        <button onClick={() => removeSubtask(i)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 120px', minWidth: 0 }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Início</label>
                            <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} style={inputStyle} />
                        </div>
                        <div style={{ flex: '1 1 120px', minWidth: 0 }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Fim (Prazo)</label>
                            <input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} style={inputStyle} />
                        </div>
                    </div>

                    {!formData.allDay && (
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 120px', minWidth: 0 }}>
                                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Hora Início</label>
                                <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                    <select value={formData.startHour.split(':')[0]} onChange={e => handleStartHourChange(`${e.target.value}:${formData.startHour.split(':')[1]}`)} style={{ ...customSelectStyle, border: 'none' }}>
                                        {Array.from({ length: 24 }).map((_, i) => <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}h</option>)}
                                    </select>
                                    <span style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', color: 'var(--text-secondary)' }}>:</span>
                                    <select value={formData.startHour.split(':')[1]} onChange={e => handleStartHourChange(`${formData.startHour.split(':')[0]}:${e.target.value}`)} style={{ ...customSelectStyle, border: 'none' }}>
                                        {Array.from({ length: 12 }).map((_, i) => <option key={i} value={String(i * 5).padStart(2, '0')}>{String(i * 5).padStart(2, '0')}m</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ flex: '1 1 120px', minWidth: 0 }}>
                                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Hora Fim</label>
                                <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                    <select value={formData.endHour.split(':')[0]} onChange={e => setFormData({ ...formData, endHour: `${e.target.value}:${formData.endHour.split(':')[1]}` })} style={{ ...customSelectStyle, border: 'none' }}>
                                        {Array.from({ length: 24 }).map((_, i) => <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}h</option>)}
                                    </select>
                                    <span style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', color: 'var(--text-secondary)' }}>:</span>
                                    <select value={formData.endHour.split(':')[1]} onChange={e => setFormData({ ...formData, endHour: `${formData.endHour.split(':')[0]}:${e.target.value}` })} style={{ ...customSelectStyle, border: 'none' }}>
                                        {Array.from({ length: 12 }).map((_, i) => <option key={i} value={String(i * 5).padStart(2, '0')}>{String(i * 5).padStart(2, '0')}m</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 120px', minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}>
                            <input type="checkbox" checked={formData.allDay} onChange={e => setFormData({ ...formData, allDay: e.target.checked })} id="allDay" style={{ cursor: 'pointer' }} />
                            <label htmlFor="allDay" style={{ fontSize: '12px', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: '500', whiteSpace: 'nowrap' }}>🌞 Dia Inteiro</label>
                        </div>

                        <div style={{ flex: '1 1 120px', minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}>
                            <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} id="isPrivate" style={{ cursor: 'pointer' }} />
                            <label htmlFor="isPrivate" style={{ fontSize: '12px', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: '500', whiteSpace: 'nowrap' }}>🔒 Privado</label>
                        </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Tipo de Evento</label>
                        <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} style={inputStyle}>
                            {eventTypes.map(t => <option key={t.id} value={t.name}>{t.emoji} {t.name}</option>)}
                        </select>
                    </div>

                    <textarea
                        placeholder="Adicionar detalhes ou notas..."
                        value={formData.details}
                        onChange={e => setFormData({ ...formData, details: e.target.value })}
                        style={{ ...inputStyle, height: '80px', resize: 'none' }}
                    />

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Imagens (max 3)</label>
                        <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{ fontSize: '12px', width: '100%', boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', gap: '5px', marginTop: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                            {formData.files?.map((f, i) => (
                                <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                                    <img src={f} alt="upload" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                    <button onClick={() => setFormData(p => ({ ...p, files: p.files.filter((_, idx) => idx !== i) }))} style={{ position: 'absolute', top: -5, right: -5, background: '#e74c3c', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer' }}>✕</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button onClick={onClose} disabled={isSaving} className="btn-secondary" style={{ flex: '1 1 100px', boxSizing: 'border-box' }}>Cancelar</button>
                        <button
                            disabled={isSaving}
                            onClick={async () => {
                                if (!formData.title) return toast.error('Título obrigatório');
                                if (!formData.workspaceId) return toast.error('Selecione um Workspace');

                                // TRAVA RH: Só RH e ADMIN postam em workspaces institucionais
                                if (selectedWS?.cr4a1_tipo_workspace === 'RH' && userRole !== 'RH' && userRole !== 'ADMIN') {
                                    return toast.error('Apenas o RH pode criar eventos neste Workspace.');
                                }

                                // TRAVA SECRETÁRIA: Só agenda para si ou para Diretoria
                                if (userRole === 'SECRETARIA') {
                                    const target = allUsers.find(u => u.cr4a1_username === formData.targetUser);
                                    if (target?.cr4a1_role !== 'DIRETORIA' && formData.targetUser !== viewedUser) {
                                        return toast.error('Você só tem permissão para agendar para a Diretoria.');
                                    }
                                }

                                setIsSaving(true);
                                try {
                                    // MAPEAMENTO FINAL PARA O DATAVERSE COM AJUSTE DE FUSO E NOME DE COLUNA
                                    await onSave({ 
                                        ...formData, 
                                        cr4a1_titulo: formData.title,
                                        cr4a1_novacoluna: formData.details, // Utilizando a coluna corrigida para Dataverse
                                        cr4a1_subtasks: JSON.stringify(subtasks), // Salva o checklist como JSON
                                        cr4a1_privado: isPrivate,
                                        cr4a1_dia_inteiro: formData.allDay,
                                        // SOLUÇÃO DO FUSO HORÁRIO PARA EVENTOS DE DIA INTEIRO: Adiciona T12:00:00
                                        cr4a1_data_inicio: formData.allDay ? `${formData.startDate}T12:00:00` : `${formData.startDate}T${formData.startHour}:00`,
                                        cr4a1_data_fim: formData.allDay ? `${formData.endDate}T12:00:00` : `${formData.endDate}T${formData.endHour}:00`
                                    });
                                } catch (e) {
                                    setIsSaving(false);
                                }
                            }}
                            className="btn-primary"
                            style={{ flex: '2 1 160px', opacity: isSaving ? 0.7 : 1, cursor: isSaving ? 'not-allowed' : 'pointer', boxSizing: 'border-box' }}
                        >
                            {isSaving ? '⏳ Salvando...' : 'Salvar Compromisso'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};