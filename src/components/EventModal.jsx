import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export const EventModal = ({ isOpen, onClose, onSave, initialDate, editingEvent, userRole, allUsers = [], eventTypes = [], viewedUser }) => {
    const [formData, setFormData] = useState({
        title: '', startDate: '', endDate: '',
        startHour: '08:00', endHour: '09:00',
        details: '', type: '', files: [],
        targetUser: '', allDay: false
    });
    
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    // Estado de privacidade
    const [isPrivate, setIsPrivate] = useState(false);

    const commonEmojis = ['📝', '🤝', '🏠', '🔥', '📅', '⏰', '🚀', '⭐', '💡', '✅', '❌', '🏢', '💻', '📞', '✈️', '🚗', '🍴', '🎉', '⚽', '🎨'];

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
                details: editingEvent.cr4a1_detalhes || '',
                allDay: editingEvent.cr4a1_dia_inteiro || false,
                files: JSON.parse(editingEvent.cr4a1_arquivos || "[]"),
                targetUser: editingEvent.cr4a1_user_login || viewedUser
            });
            setIsPrivate(editingEvent.cr4a1_privado || false);
        }
        else {
            const cleanInitialDate = initialDate ? initialDate.split('T')[0] : '';
            setFormData({
                title: '', startDate: cleanInitialDate, endDate: cleanInitialDate,
                startHour: '08:00', endHour: '09:00',
                details: '', type: eventTypes[0]?.name || 'Tarefa', files: [],
                targetUser: viewedUser || '', allDay: false
            });
            setIsPrivate(false);
        }
    }, [editingEvent, initialDate, isOpen, viewedUser, eventTypes]);

    if (!isOpen) return null;

    const handleEmojiClick = (emoji) => {
        setFormData(prev => ({ ...prev, title: prev.title + emoji }));
        setIsEmojiPickerOpen(false);
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

    return (
        <div className="modal-overlay">
            <div className="modal-container" style={{ maxWidth: '450px' }}>
                <div className="modal-header">
                    <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '20px', fontWeight: '600' }}>
                        {editingEvent ? '📝 Editar' : '✨ Novo'} Agendamento
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
                </div>

                <div className="modal-body">
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
                            style={{ ...inputStyle, flex: 1 }} 
                        />
                        <button 
                            onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '20px', height: '45px', width: '45px', cursor: 'pointer' }}
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

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 180px' }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Início</label>
                            <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} style={inputStyle} />
                        </div>
                        <div style={{ flex: '1 1 180px' }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Fim</label>
                            <input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} style={inputStyle} />
                        </div>
                    </div>

                    {!formData.allDay && (
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 140px' }}>
                                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Hora Início</label>
                                <input type="time" value={formData.startHour} onChange={e => setFormData({ ...formData, startHour: e.target.value })} style={inputStyle} />
                            </div>
                            <div style={{ flex: '1 1 140px' }}>
                                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Hora Fim</label>
                                <input type="time" value={formData.endHour} onChange={e => setFormData({ ...formData, endHour: e.target.value })} style={inputStyle} />
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <input type="checkbox" checked={formData.allDay} onChange={e => setFormData({ ...formData, allDay: e.target.checked })} id="allDay" style={{ cursor: 'pointer' }} />
                            <label htmlFor="allDay" style={{ fontSize: '12px', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: '500' }}>🌞 Dia Inteiro</label>
                        </div>
                        
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} id="isPrivate" style={{ cursor: 'pointer' }} />
                            <label htmlFor="isPrivate" style={{ fontSize: '12px', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: '500' }}>🔒 Privado</label>
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
                        <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{ fontSize: '12px', width: '100%' }} />
                        <div style={{ display: 'flex', gap: '5px', marginTop: '10px', overflowX: 'auto' }}>
                            {formData.files?.map((f, i) => (
                                <div key={i} style={{ position: 'relative' }}>
                                    <img src={f} alt="upload" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                    <button onClick={() => setFormData(p => ({ ...p, files: p.files.filter((_, idx) => idx !== i) }))} style={{ position: 'absolute', top: -5, right: -5, background: '#e74c3c', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer' }}>✕</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                        <button 
                            onClick={() => {
                                if (!formData.title) return toast.error('Título obrigatório');
                                // Envia os dados do form + o estado de privacidade
                                onSave({ ...formData, cr4a1_privado: isPrivate });
                            }} 
                            className="btn-primary"
                            style={{ flex: 2 }}
                        >
                            Salvar Compromisso
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};