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

    // Estados dos Seletores Customizados MD3
    const [activePicker, setActivePicker] = useState(null); // 'startDate', 'endDate', 'startTime', 'endTime'
    const [pickerMonth, setPickerMonth] = useState(new Date());

    const startDateRef = useRef(null);
    const endDateRef = useRef(null);
    const startTimeRef = useRef(null);
    const endTimeRef = useRef(null);

    const commonEmojis = [
        '🤝', '📞', '👥', '💬', '📢', '💻', '🖥️', '📅', '📊', '📝', '💡', '🏢',
        '🚗', '🏍️', '✈️', '🏨', '📍', '🗺️', '⛽', '🚚', '📦', '🔑', '🏠',
        '🛠️', '🏗️', '🔧', '🔨', '⚡', '🔋', '🛡️', '🎨', '🔍', '🧪'
    ];

    // Sincronização e Carga Inicial do Formulário
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
            } catch (e) { 
                setSubtasks([]); 
            }
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

    // Fechar os pickers flutuantes ao clicar fora do escopo
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (startDateRef.current && !startDateRef.current.contains(event.target)) setActivePicker(p => p === 'startDate' ? null : p);
            if (endDateRef.current && !endDateRef.current.contains(event.target)) setActivePicker(p => p === 'endDate' ? null : p);
            if (startTimeRef.current && !startTimeRef.current.contains(event.target)) setActivePicker(p => p === 'startTime' ? null : p);
            if (endTimeRef.current && !endTimeRef.current.contains(event.target)) setActivePicker(p => p === 'endTime' ? null : p);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isOpen) return null;

    // PROTEÇÃO CONTRA RANGE ERROR: Formata datas apenas se a string for válida
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

    // Upload e Conversão de ficheiros para Base64 (Mantendo integridade com o Dataverse)
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
            reader.onerror = () => toast.error(`Erro ao carregar o arquivo: ${file.name}`);
        });
    };

    const removeFile = (index) => {
        setFormData(prev => ({
            ...prev,
            files: prev.files.filter((_, i) => i !== index)
        }));
    };

    // Componente MD3 Outlined Field (Borda integrada e label flutuante)
    const MD3Field = ({ label, icon, onClick, children, value }) => (
        <div style={{ position: 'relative', width: '100%' }}>
            <div 
                onClick={onClick}
                style={{
                    display: 'flex', alignItems: 'center', minHeight: '56px', padding: '0 16px',
                    borderRadius: '12px', border: '1px solid var(--border-color)', background: 'transparent',
                    cursor: onClick ? 'pointer' : 'text', boxSizing: 'border-box'
                }}
            >
                <label style={{
                    position: 'absolute', left: '12px', top: '-8px', background: 'var(--bg-primary)',
                    padding: '0 6px', fontSize: '12px', color: 'var(--text-accent)', fontWeight: '600', letterSpacing: '0.4px'
                }}>
                    {label}
                </label>
                {icon && <span className="material-symbols-rounded" style={{ marginRight: '12px', color: 'var(--text-secondary)', fontSize: '20px' }}>{icon}</span>}
                <div style={{ flex: 1, fontSize: '15px', color: 'var(--text-primary)', fontWeight: '500' }}>
                    {children || value}
                </div>
                {onClick && <span className="material-symbols-rounded" style={{ opacity: 0.6, fontSize: '20px' }}>arrow_drop_down</span>}
            </div>
        </div>
    );

    // Componente MD3 Switch (O interruptor oval nativo Material You)
    const MD3Switch = ({ label, checked, onChange }) => (
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '10px 0' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{label}</span>
            <div onClick={() => onChange(!checked)} style={{
                width: '50px', height: '28px', borderRadius: '100px', padding: '2px',
                background: checked ? 'var(--text-accent)' : 'var(--bg-tertiary)',
                position: 'relative', transition: 'all 0.25s ease', boxSizing: 'border-box'
            }}>
                <div style={{
                    width: '24px', height: '24px', borderRadius: '50%', background: checked ? '#ffffff' : 'var(--text-secondary)',
                    position: 'absolute', left: checked ? '24px' : '2px', transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    {checked && <span className="material-symbols-rounded" style={{ fontSize: '14px', color: 'var(--text-accent)', fontWeight: '900' }}>check</span>}
                </div>
            </div>
        </label>
    );

    return (
        <div className="modal-overlay" style={{ zIndex: 11000, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div className="modal-content view-enter" style={{ maxWidth: '540px', width: '100%', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', background: 'var(--bg-primary)', borderRadius: '28px', padding: '24px', position: 'relative', border: '1px solid var(--border-color)', boxShadow: '0 24px 48px rgba(0,0,0,0.18)' }}>
                
                {/* ACTIONS BAR / HEADER SUPERIOR MD3 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                    <button onClick={onClose} className="icon-btn" style={{ background: 'transparent' }}>
                        <span className="material-symbols-rounded">close</span>
                    </button>
                    <h2 style={{ fontSize: '18px', fontWeight: '500', margin: 0, color: 'var(--text-title)' }}>
                        {editingEvent ? 'Editar compromisso' : 'Novo compromisso'}
                    </h2>
                    <button 
                        disabled={isSaving}
                        onClick={async () => {
                            if (!formData.title.trim()) return toast.error('O título do evento é obrigatório.');
                            if (userRole === 'DIRETORIA' && formData.targetUser !== 'DIRETORIA' && formData.targetUser !== viewedUser) {
                                return toast.error('Você só tem permissão para agendar para a Diretoria.');
                            }

                            setIsSaving(true);
                            try {
                                await onSave({ 
                                    ...formData, 
                                    cr4a1_titulo: formData.title,
                                    cr4a1_descricao: formData.details,
                                    cr4a1_subtasks: JSON.stringify(subtasks),
                                    cr4a1_privado: isPrivate 
                                });
                            } catch (e) {
                                setIsSaving(false);
                            }
                        }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-accent)', fontWeight: '700', cursor: 'pointer', fontSize: '14px', letterSpacing: '0.5px' }}
                    >
                        {isSaving ? 'A GUARDAR...' : 'GUARDAR'}
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* INPUT DE TÍTULO GIGANTE MATERIAL DESIGN COM ATALHO DE EMOJI */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', position: 'relative' }}>
                        <input 
                            placeholder="Título do evento"
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '22px', padding: '10px 0', outline: 'none', color: 'var(--text-primary)', fontWeight: '400' }}
                        />
                        <button onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)} className="icon-btn" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', width: '40px', height: '40px' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>mood</span>
                        </button>

                        {isEmojiPickerOpen && (
                            <div style={{ position: 'absolute', right: 0, top: '52px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px', zIndex: 12000, maxWidth: '230px', display: 'flex', flexWrap: 'wrap', gap: '6px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                                {commonEmojis.map(emoji => (
                                    <span 
                                        key={emoji} 
                                        onClick={() => { setFormData({ ...formData, title: emoji + ' ' + formData.title }); setIsEmojiPickerOpen(false); }} 
                                        style={{ fontSize: '20px', cursor: 'pointer', padding: '4px', borderRadius: '8px' }}
                                        className="nav-pill"
                                    >
                                        {emoji}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* SELETORES DE DATA COM AJUSTE DE TIMEOUT/CONVERSÃO */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div ref={startDateRef}>
                            <MD3Field 
                                label="Início" 
                                value={safeFormatDate(formData.startDate)} 
                                icon="calendar_month" 
                                onClick={() => setActivePicker(activePicker === 'startDate' ? null : 'startDate')} 
                            />
                        </div>
                        <div ref={endDateRef}>
                            <MD3Field 
                                label="Término" 
                                value={safeFormatDate(formData.endDate)} 
                                icon="event_upcoming" 
                                onClick={() => setActivePicker(activePicker === 'endDate' ? null : 'endDate')} 
                            />
                        </div>
                    </div>

                    {/* SELETORES DE HORÁRIO DIGITAL GIGANTE (MOLDES ANDROID CLOCK) */}
                    {!formData.allDay && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            <div ref={startTimeRef}>
                                <MD3Field label="Hora de início" value={formData.startHour} icon="schedule" onClick={() => setActivePicker(activePicker === 'startTime' ? null : 'startTime')} />
                            </div>
                            <div ref={endTimeRef}>
                                <MD3Field label="Hora de término" value={formData.endHour} icon="history" onClick={() => setActivePicker(activePicker === 'endTime' ? null : 'endTime')} />
                            </div>
                        </div>
                    )}

                    {/* INTERRUPTORES DO CONTROLADOR */}
                    <div style={{ background: 'var(--bg-secondary)', padding: '6px 16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                        <MD3Switch label="Dia inteiro" checked={formData.allDay} onChange={val => setFormData({...formData, allDay: val})} />
                        <MD3Switch label="Evento privado 🔒" checked={isPrivate} onChange={setIsPrivate} />
                    </div>

                    {/* SELECTS ENCAPSULADOS MD3 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
                        <MD3Field label="Workspace">
                            <select value={formData.workspaceId} onChange={e => setFormData({...formData, workspaceId: e.target.value})} style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'inherit', cursor: 'pointer', fontSize: '15px', fontWeight: '500' }}>
                                {workspaces.map(ws => <option key={ws.cr4a1_calendarios_workspacesid} value={ws.cr4a1_calendarios_workspacesid}>{ws.cr4a1_nome}</option>)}
                            </select>
                        </MD3Field>
                        
                        <MD3Field label="Tipo de Evento">
                            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'inherit', cursor: 'pointer', fontSize: '15px', fontWeight: '500' }}>
                                {eventTypes.map(t => <option key={t.id} value={t.name}>{t.emoji} {t.name}</option>)}
                            </select>
                        </MD3Field>

                        {/* RESTAURADO: FILTRO DE ATRIBUIÇÃO POR CARGO */}
                        {['SECRETARIA', 'COORD', 'ADMIN', 'DIRETORIA'].includes(userRole) && (
                            <MD3Field label="Agendar para">
                                <select value={formData.targetUser} onChange={e => setFormData({...formData, targetUser: e.target.value})} style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'inherit', cursor: 'pointer', fontSize: '15px', fontWeight: '500' }}>
                                    {allUsers.map(u => <option key={u.cr4a1_username} value={u.cr4a1_username}>{u.cr4a1_nome_exibicao || u.cr4a1_username}</option>)}
                                </select>
                            </MD3Field>
                        )}
                    </div>

                    {/* DESCRIÇÃO OUTLINED FIELD */}
                    <div style={{ position: 'relative', width: '100%' }}>
                        <textarea 
                            rows={3}
                            placeholder="Adicione notas, links ou detalhes importantes..."
                            value={formData.details}
                            onChange={e => setFormData({...formData, details: e.target.value})}
                            style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'transparent', outline: 'none', color: 'var(--text-primary)', resize: 'none', fontSize: '15px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                        />
                        <label style={{ position: 'absolute', left: '12px', top: '-8px', background: 'var(--bg-primary)', padding: '0 6px', fontSize: '12px', color: 'var(--text-accent)', fontWeight: '600' }}>Descrição</label>
                    </div>

                    {/* RESTAURADO: SISTEMA CONDICIONAL DE SUBTASKS / SPRINT CHECKLIST */}
                    {workspaces.find(w => w.cr4a1_calendarios_workspacesid === formData.workspaceId)?.cr4a1_nome === "Desenvolvimento e Inovação" && (
                        <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Sprint Checklist (Subtasks)</label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <input type="text" placeholder="Adicionar nova subtarefa..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
                                <button onClick={() => { if (!newSubtask.trim()) return; setSubtasks([...subtasks, { text: newSubtask.trim(), completed: false }]); setNewSubtask(''); }} className="btn-primary" style={{ padding: '0 16px', borderRadius: '10px', fontSize: '13px' }}>Incluir</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {subtasks.map((task, index) => (
                                    <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                            <input type="checkbox" checked={task.completed} onChange={e => { const updated = [...subtasks]; updated[index].completed = e.target.checked; setSubtasks(updated); }} style={{ accentColor: 'var(--text-accent)' }} />
                                            <span style={{ textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{task.text}</span>
                                        </div>
                                        <button onClick={() => setSubtasks(subtasks.filter((_, i) => i !== index))} style={{ border: 'none', background: 'transparent', color: '#e74c3c', cursor: 'pointer' }}><span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* RESTAURADO: GERENCIADOR E COMPONENTE DE DOCUMENTOS / ATTACHMENTS ARQUIVOS */}
                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Documentos Anexados</label>
                            <button onClick={() => document.getElementById('modal-file-attach').click()} className="btn-secondary" style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>attach_file</span> Anexar
                            </button>
                            <input id="modal-file-attach" type="file" multiple hidden onChange={handleFileChange} />
                        </div>

                        {formData.files.length === 0 ? (
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.7, textAlign: 'center', padding: '10px 0' }}>Nenhum documento anexado.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {formData.files.map((file, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                        <a href={file.base64} download={file.name} style={{ fontSize: '13px', color: 'var(--text-accent)', textDecoration: 'none', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '10px' }}>
                                            📁 {file.name} <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>({Math.round(file.size / 1024)} KB)</span>
                                        </a>
                                        <button onClick={() => removeFile(i)} style={{ border: 'none', background: 'transparent', color: '#e74c3c', cursor: 'pointer' }}>
                                            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                {/* --- MODAL DIALOG: DATE PICKER MD3 (SELECIONADOR DO CALENDÁRIO) --- */}
                {(activePicker === 'startDate' || activePicker === 'endDate') && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 13000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
                        <div style={{ width: '328px', background: 'var(--bg-primary)', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 12px 48px rgba(0,0,0,0.25)', border: '1px solid var(--border-color)' }}>
                            <div style={{ padding: '16px 24px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Selecionar data</span>
                                <h2 style={{ fontSize: '28px', margin: '12px 0 0', fontWeight: '400', color: 'var(--text-title)' }}>
                                    {formData[activePicker] ? safeFormatDate(formData[activePicker], "EEE, d 'de' MMM") : 'Nenhuma data'}
                                </h2>
                            </div>
                            <div style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <span style={{ fontWeight: '700', textTransform: 'capitalize', fontSize: '14px' }}>{format(pickerMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button onClick={() => setPickerMonth(subMonths(pickerMonth, 1))} className="icon-btn"><span className="material-symbols-rounded">chevron_left</span></button>
                                        <button onClick={() => setPickerMonth(addMonths(pickerMonth, 1))} className="icon-btn"><span className="material-symbols-rounded">chevron_right</span></button>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '6px' }}>
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
                                                    width: '36px', height: '36px', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                                                    background: isSelected ? 'var(--text-accent)' : 'transparent',
                                                    color: isSelected ? '#ffffff' : (isCurrentMonth ? 'var(--text-primary)' : 'var(--text-secondary)'),
                                                    opacity: isCurrentMonth ? 1 : 0.3
                                                }}
                                            >
                                                {format(day, 'd')}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- MODAL DIALOG: TIME PICKER MD3 DIGITAL CLOCK --- */}
                {(activePicker === 'startTime' || activePicker === 'endTime') && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 13000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
                        <div style={{ padding: '24px', background: 'var(--bg-primary)', borderRadius: '28px', textAlign: 'center', boxShadow: '0 12px 48px rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', width: '280px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '20px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Horário do Evento</span>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
                                <input 
                                    type="number" 
                                    min="0" max="23"
                                    defaultValue={formData[activePicker === 'startTime' ? 'startHour' : 'endHour'].split(':')[0]} 
                                    id="h-picker"
                                    style={{ width: '80px', height: '72px', borderRadius: '12px', background: 'var(--bg-tertiary)', border: 'none', fontSize: '38px', textAlign: 'center', color: 'var(--text-accent)', fontWeight: '700', outline: 'none' }}
                                />
                                <span style={{ fontSize: '38px', fontWeight: '300', color: 'var(--text-primary)' }}>:</span>
                                <input 
                                    type="number" 
                                    min="0" max="59"
                                    defaultValue={formData[activePicker === 'startTime' ? 'startHour' : 'endHour'].split(':')[1]} 
                                    id="m-picker"
                                    style={{ width: '80px', height: '72px', borderRadius: '12px', background: 'var(--bg-tertiary)', border: 'none', fontSize: '38px', textAlign: 'center', color: 'var(--text-accent)', fontWeight: '700', outline: 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                                <button onClick={() => setActivePicker(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>CANCELAR</button>
                                <button 
                                    onClick={() => {
                                        const h = document.getElementById('h-picker').value.padStart(2, '0');
                                        const m = document.getElementById('m-picker').value.padStart(2, '0');
                                        setFormData(prev => ({ ...prev, [activePicker === 'startTime' ? 'startHour' : 'endHour']: `${h}:${m}` }));
                                        setActivePicker(null);
                                    }}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-accent)', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
                                >OK</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};