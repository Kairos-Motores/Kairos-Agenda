import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const EventModal = ({ isOpen, onClose, onSave, initialDate, editingEvent, userRole, allUsers = [], eventTypes = [], viewedUser, workspaces = [] }) => {
    const [formData, setFormData] = useState({
        title: '', startDate: '', endDate: '',
        startHour: '08:00', endHour: '09:00',
        details: '', type: '', files: [],
        targetUser: '', allDay: false,
        workspaceId: ''
    });

    const [subtasks, setSubtasks] = useState([]);
    const [newSubtask, setNewSubtask] = useState('');
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Seletores Flutuantes MD3
    const [activePicker, setActivePicker] = useState(null); // 'startDate', 'endDate', 'startTime', 'endTime'
    const [pickerMonth, setPickerMonth] = useState(new Date());

    const commonEmojis = [
        '🤝', '📞', '👥', '💬', '📢', '💻', '🖥️', '📅', '📊', '📝', '💡', '🏢',
        '🚗', '🏍️', '✈️', '🏨', '📍', '🗺️', '⛽', '🚚', '📦', '🔑', '🏠',
        '🛠️', '🏗️', '🔧', '🔨', '⚡', '🔋', '🛡️', '🎨', '🔍', '🧪'
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
                details: editingEvent.cr4a1_detalhes || editingEvent.cr4a1_descricao || '',
                allDay: editingEvent.cr4a1_dia_inteiro || false,
                files: JSON.parse(editingEvent.cr4a1_arquivos || "[]"),
                targetUser: editingEvent.cr4a1_user_login || viewedUser,
                workspaceId: editingEvent.cr4a1_workspace_id || (workspaces[0]?.cr4a1_calendarios_workspacesid || '')
            });
            setIsPrivate(editingEvent.cr4a1_privado || false);
            try {
                setSubtasks(editingEvent.cr4a1_subtasks ? (typeof editingEvent.cr4a1_subtasks === 'string' ? JSON.parse(editingEvent.cr4a1_subtasks) : editingEvent.cr4a1_subtasks) : []);
            } catch (e) { setSubtasks([]); }
        } else {
            const cleanInitialDate = initialDate ? initialDate.split('T')[0] : format(new Date(), 'yyyy-MM-dd');
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

    const safeFormatDate = (dateStr, pattern = "EEE, d 'de' MMM") => {
        if (!dateStr) return 'Selecionar data';
        const parsedDate = new Date(dateStr + 'T12:00:00');
        if (isNaN(parsedDate.getTime())) return 'Data inválida';
        return format(parsedDate, pattern, { locale: ptBR });
    };

    const handleSelectDate = (date) => {
        const formattedDate = format(date, 'yyyy-MM-dd');
        setFormData(prev => ({ ...prev, [activePicker]: formattedDate }));
        setActivePicker(null);
    };

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        selectedFiles.forEach(file => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                setFormData(prev => ({
                    ...prev,
                    files: [...prev.files, { name: file.name, size: file.size, base64: reader.result }]
                }));
            };
        });
    };

    const removeFile = (index) => {
        setFormData(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }));
    };

    // Card de Input Suave (Estilo Container de Superfície Amigável)
    const MD3Field = ({ label, icon, onClick, children, value }) => (
        <div style={{ position: 'relative', width: '100%' }}>
            <div 
                onClick={onClick}
                style={{
                    display: 'flex', alignItems: 'center', minHeight: '58px', padding: '0 16px',
                    borderRadius: '20px', border: '1px solid var(--border-color)', 
                    background: 'var(--bg-secondary)', cursor: onClick ? 'pointer' : 'text', 
                    boxSizing: 'border-box', transition: 'all 0.2s ease'
                }}
                className="input-field-hover"
            >
                <label style={{
                    position: 'absolute', left: '16px', top: '-9px', background: 'var(--bg-primary)',
                    padding: '0 6px', fontSize: '11px', color: 'var(--text-accent)', fontWeight: '700', letterSpacing: '0.3px'
                }}>
                    {label}
                </label>
                {icon && <span className="material-symbols-rounded" style={{ marginRight: '12px', color: 'var(--text-accent)', fontSize: '20px', opacity: 0.8 }}>{icon}</span>}
                <div style={{ flex: 1, fontSize: '15px', color: 'var(--text-primary)', fontWeight: '500' }}>
                    {children || value}
                </div>
                {onClick && <span className="material-symbols-rounded" style={{ opacity: 0.4, fontSize: '20px' }}>expand_more</span>}
            </div>
        </div>
    );

    const MD3Switch = ({ label, checked, onChange }) => (
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '6px 0' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-title)' }}>{label}</span>
            <div onClick={() => onChange(!checked)} style={{
                width: '52px', height: '30px', borderRadius: '100px', padding: '3px',
                background: checked ? 'var(--text-accent)' : 'var(--bg-tertiary)',
                position: 'relative', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', boxSizing: 'border-box'
            }}>
                <div style={{
                    width: '24px', height: '24px', borderRadius: '50%', background: '#ffffff',
                    position: 'absolute', left: checked ? '24px' : '4px', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}>
                    {checked && <span className="material-symbols-rounded" style={{ fontSize: '14px', color: 'var(--text-accent)', fontWeight: '900' }}>check</span>}
                </div>
            </div>
        </label>
    );

    return (
        <div className="modal-overlay" style={{ zIndex: 11000, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div className="modal-content view-enter" style={{ maxWidth: '520px', width: '100%', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', background: 'var(--bg-primary)', borderRadius: '32px', padding: '28px', position: 'relative', border: '1px solid var(--border-color)', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
                
                {/* BARRA SUPERIOR DE AÇÕES */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <button onClick={onClose} className="icon-btn" style={{ background: 'var(--bg-secondary)', borderRadius: '50%', width: '38px', height: '38px' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>close</span>
                    </button>
                    <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: 'var(--text-title)' }}>
                        {editingEvent ? 'Editar Ficha' : 'Criar Nova Ficha'}
                    </h2>
                    <button 
                        disabled={isSaving}
                        onClick={async () => {
                            if (!formData.title.trim()) return toast.error('O título do evento é obrigatório.');
                            setIsSaving(true);
                            try {
                                await onSave({ 
                                    ...formData, 
                                    cr4a1_titulo: formData.title,
                                    cr4a1_descricao: formData.details,
                                    cr4a1_subtasks: JSON.stringify(subtasks),
                                    cr4a1_privado: isPrivate 
                                });
                            } catch (e) { setIsSaving(false); }
                        }}
                        style={{ background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-accent)', fontWeight: '700', cursor: 'pointer', fontSize: '13px', padding: '8px 18px', borderRadius: '100px', letterSpacing: '0.3px' }}
                    >
                        {isSaving ? 'A GUARDAR...' : 'SALVAR'}
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    
                    {/* INPUT DE TÍTULO PRINCIPAL */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-secondary)', padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--border-color)', position: 'relative' }}>
                        <input 
                            placeholder="Nome do Evento ou Tarefa..."
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '18px', padding: '8px 0', outline: 'none', color: 'var(--text-primary)', fontWeight: '500' }}
                        />
                        <button onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)} className="icon-btn" style={{ background: 'var(--bg-primary)', borderRadius: '14px', width: '38px', height: '38px', border: '1px solid var(--border-color)' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--text-accent)' }}>mood</span>
                        </button>

                        {isEmojiPickerOpen && (
                            <div style={{ position: 'absolute', right: '12px', top: '58px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '14px', zIndex: 12000, maxWidth: '230px', display: 'flex', flexWrap: 'wrap', gap: '8px', boxShadow: '0 12px 32px rgba(0,0,0,0.15)' }}>
                                {commonEmojis.map(emoji => (
                                    <span 
                                        key={emoji} 
                                        onClick={() => { setFormData({ ...formData, title: emoji + ' ' + formData.title }); setIsEmojiPickerOpen(false); }} 
                                        style={{ fontSize: '20px', cursor: 'pointer', padding: '4px', borderRadius: '10px', transition: 'transform 0.1s' }}
                                        onMouseEnter={e => e.target.style.transform = 'scale(1.2)'}
                                        onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                                    >
                                        {emoji}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* SELETORES DE DATA CARD */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <MD3Field label="Data de Início" value={safeFormatDate(formData.startDate)} icon="calendar_month" onClick={() => setActivePicker('startDate')} />
                        <MD3Field label="Data de Término" value={safeFormatDate(formData.endDate)} icon="event_upcoming" onClick={() => setActivePicker('endDate')} />
                    </div>

                    {/* SELETORES DE HORÁRIO */}
                    {!formData.allDay && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            <MD3Field label="Hora de Início" value={formData.startHour} icon="schedule" onClick={() => setActivePicker('startTime')} />
                            <MD3Field label="Hora de Término" value={formData.endHour} icon="history" onClick={() => setActivePicker('endTime')} />
                        </div>
                    )}

                    {/* SWITCHES OVALADOS */}
                    <div style={{ background: 'var(--bg-tertiary)', padding: '10px 18px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <MD3Switch label="Compromisso de Dia Inteiro" checked={formData.allDay} onChange={val => setFormData({...formData, allDay: val})} />
                        <MD3Switch label="Restringir Visibilidade (Privado 🔒)" checked={isPrivate} onChange={setIsPrivate} />
                    </div>

                    {/* MENU DE SELEÇÃO FLUIDA */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
                        <MD3Field label="Workspace Vinculado">
                            <select value={formData.workspaceId} onChange={e => setFormData({...formData, workspaceId: e.target.value})} style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'inherit', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                                {workspaces.map(ws => <option key={ws.cr4a1_calendarios_workspacesid} value={ws.cr4a1_calendarios_workspacesid}>{ws.cr4a1_nome}</option>)}
                            </select>
                        </MD3Field>
                        
                        <MD3Field label="Categoria/Tipo">
                            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'inherit', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                                {eventTypes.map(t => <option key={t.id} value={t.name}>{t.emoji} {t.name}</option>)}
                            </select>
                        </MD3Field>

                        {['SECRETARIA', 'COORD', 'ADMIN', 'DIRETORIA'].includes(userRole) && (
                            <MD3Field label="Responsável">
                                <select value={formData.targetUser} onChange={e => setFormData({...formData, targetUser: e.target.value})} style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'inherit', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                                    {allUsers.map(u => <option key={u.cr4a1_username} value={u.cr4a1_username}>{u.cr4a1_nome_exibicao || u.cr4a1_username}</option>)}
                                </select>
                            </MD3Field>
                        )}
                    </div>

                    {/* CORPO DA DESCRIÇÃO */}
                    <div style={{ position: 'relative', width: '100%' }}>
                        <textarea 
                            rows={3}
                            placeholder="O que será debatido ou feito neste compromisso?"
                            value={formData.details}
                            onChange={e => setFormData({...formData, details: e.target.value})}
                            style={{ width: '100%', padding: '16px', borderRadius: '20px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', outline: 'none', color: 'var(--text-primary)', resize: 'none', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: '1.5' }}
                        />
                        <label style={{ position: 'absolute', left: '16px', top: '-9px', background: 'var(--bg-primary)', padding: '0 6px', fontSize: '11px', color: 'var(--text-accent)', fontWeight: '700' }}>Descrição Detalhada</label>
                    </div>

                    {/* SPRINT SUBTASKS (CHECKLIST DINÂMICO) */}
                    {workspaces.find(w => w.cr4a1_calendarios_workspacesid === formData.workspaceId)?.cr4a1_nome === "Desenvolvimento e Inovação" && (
                        <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-accent)', textTransform: 'uppercase', display: 'block', marginBottom: '8px', letterSpacing: '0.3px' }}>Sprint Checklist (Subtasks)</label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <input type="text" placeholder="Adicionar sub-item técnico..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} style={{ flex: 1, padding: '10px 14px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
                                <button onClick={() => { if (!newSubtask.trim()) return; setSubtasks([...subtasks, { text: newSubtask.trim(), completed: false }]); setNewSubtask(''); }} className="btn-primary" style={{ padding: '0 16px', borderRadius: '14px', fontSize: '13px' }}>Incluir</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {subtasks.map((task, index) => (
                                    <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                                            <input type="checkbox" checked={task.completed} onChange={e => { const updated = [...subtasks]; updated[index].completed = e.target.checked; setSubtasks(updated); }} style={{ accentColor: 'var(--text-accent)', width: '16px', height: '16px' }} />
                                            <span style={{ textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)', fontWeight: '500' }}>{task.text}</span>
                                        </div>
                                        <button onClick={() => setSubtasks(subtasks.filter((_, i) => i !== index))} style={{ border: 'none', background: 'transparent', color: '#e74c3c', cursor: 'pointer', display: 'flex' }}><span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* COMPONENTE DE ANEXOS / DOCUMENTOS */}
                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Documentação Técnica</label>
                            <button onClick={() => document.getElementById('modal-file-attach').click()} className="btn-secondary" style={{ padding: '6px 14px', borderRadius: '100px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>upload_file</span> Carregar
                            </button>
                            <input id="modal-file-attach" type="file" multiple hidden onChange={handleFileChange} />
                        </div>

                        {formData.files.length === 0 ? (
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.6, textAlign: 'center', padding: '12px 0' }}>Nenhum ficheiro anexado.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {formData.files.map((file, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                        <a href={file.base64} download={file.name} style={{ fontSize: '13px', color: 'var(--text-accent)', textDecoration: 'none', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '10px' }}>
                                            📄 {file.name} <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '400' }}>({Math.round(file.size / 1024)} KB)</span>
                                        </a>
                                        <button onClick={() => removeFile(i)} style={{ border: 'none', background: 'transparent', color: '#e74c3c', cursor: 'pointer', display: 'flex' }}>
                                            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                {/* --- DIÁLOGO DA DATA (DATE PICKER OVERLAY) --- */}
                {(activePicker === 'startDate' || activePicker === 'endDate') && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 13000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
                        <div style={{ width: '320px', background: 'var(--bg-primary)', borderRadius: '32px', overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', padding: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <span style={{ fontWeight: '700', textTransform: 'capitalize', fontSize: '15px', color: 'var(--text-title)' }}>{format(pickerMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button onClick={() => setPickerMonth(subMonths(pickerMonth, 1))} className="icon-btn"><span className="material-symbols-rounded">chevron_left</span></button>
                                    <button onClick={() => setPickerMonth(addMonths(pickerMonth, 1))} className="icon-btn"><span className="material-symbols-rounded">chevron_right</span></button>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
                                {['D','S','T','Q','Q','S','S'].map(d => <span key={d} style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>{d}</span>)}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                                {eachDayOfInterval({ start: startOfWeek(startOfMonth(pickerMonth)), end: endOfWeek(endOfMonth(pickerMonth)) }).map((day, i) => {
                                    const dateStr = format(day, 'yyyy-MM-dd');
                                    const isSelected = formData[activePicker] === dateStr;
                                    const isCurrentMonth = day.getMonth() === pickerMonth.getMonth();
                                    return (
                                        <button 
                                            key={i} 
                                            onClick={() => handleSelectDate(day)}
                                            style={{
                                                width: '36px', height: '36px', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '12px', fontWeight: '700',
                                                background: isSelected ? 'var(--text-accent)' : 'transparent',
                                                color: isSelected ? '#ffffff' : (isCurrentMonth ? 'var(--text-primary)' : 'var(--text-secondary)'),
                                                opacity: isCurrentMonth ? 1 : 0.35
                                            }}
                                        >
                                            {format(day, 'd')}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- DIÁLOGO DA HORA CORRIGIDO (TIME PICKER OVERLAY COMPACTO E AMIGÁVEL) --- */}
                {(activePicker === 'startTime' || activePicker === 'endTime') && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 13000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
                        <div style={{ padding: '24px', background: 'var(--bg-primary)', borderRadius: '32px', textAlign: 'center', boxShadow: '0 16px 48px rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', width: '260px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '18px', color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Definir Horário</span>
                            
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '22px' }}>
                                <input 
                                    type="text" 
                                    maxLength={2}
                                    placeholder="08"
                                    defaultValue={formData[activePicker === 'startTime' ? 'startHour' : 'endHour'].split(':')[0]} 
                                    id="h-picker"
                                    style={{ width: '74px', height: '68px', borderRadius: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '32px', textAlign: 'center', color: 'var(--text-primary)', fontWeight: '700', outline: 'none' }}
                                />
                                <span style={{ fontSize: '32px', fontWeight: '300', color: 'var(--text-secondary)' }}>:</span>
                                <input 
                                    type="text" 
                                    maxLength={2}
                                    placeholder="00"
                                    defaultValue={formData[activePicker === 'startTime' ? 'startHour' : 'endHour'].split(':')[1]} 
                                    id="m-picker"
                                    style={{ width: '74px', height: '68px', borderRadius: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '32px', textAlign: 'center', color: 'var(--text-primary)', fontWeight: '700', outline: 'none' }}
                                />
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button onClick={() => setActivePicker(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', fontSize: '13px', padding: '6px 12px' }}>CANCELAR</button>
                                <button 
                                    onClick={() => {
                                        const hInput = document.getElementById('h-picker').value || '00';
                                        const mInput = document.getElementById('m-picker').value || '00';
                                        const h = hInput.padStart(2, '0');
                                        const m = mInput.padStart(2, '0');
                                        setFormData(prev => ({ ...prev, [activePicker === 'startTime' ? 'startHour' : 'endHour']: `${h}:${m}` }));
                                        setActivePicker(null);
                                    }}
                                    style={{ background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-accent)', fontWeight: '700', cursor: 'pointer', fontSize: '13px', padding: '6px 16px', borderRadius: '100px' }}
                                >OK</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                .input-field-hover:hover { background: var(--bg-tertiary) !important; border-color: var(--text-accent) !important; }
            `}</style>
        </div>
    );
};