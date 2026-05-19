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

    // Estados dos novos seletores Material Design 3
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [pickerMonth, setPickerMonth] = useState(new Date());

    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);

    const startDateRef = useRef(null);
    const endDateRef = useRef(null);
    const startTimeRef = useRef(null);
    const endTimeRef = useRef(null);

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
            } catch (e) {
                setSubtasks([]);
            }
        } else {
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

    // Fechar seletores ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (startDateRef.current && !startDateRef.current.contains(event.target)) setShowStartDatePicker(false);
            if (endDateRef.current && !endDateRef.current.contains(event.target)) setShowEndDatePicker(false);
            if (startTimeRef.current && !startTimeRef.current.contains(event.target)) setShowStartTimePicker(false);
            if (endTimeRef.current && !endTimeRef.current.contains(event.target)) setShowEndTimePicker(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isOpen) return null;

    // Gerador de dias para o calendário MD3 interno
    const generateCalendarDays = () => {
        const start = startOfWeek(startOfMonth(pickerMonth));
        const end = endOfWeek(endOfMonth(pickerMonth));
        return eachDayOfInterval({ start, end });
    };

    const handleSelectDate = (date, field) => {
        const formattedDate = format(date, 'yyyy-MM-dd');
        setFormData(prev => ({ ...prev, [field]: formattedDate }));
        if (field === 'startDate') setShowStartDatePicker(false);
        if (field === 'endDate') setShowEndDatePicker(false);
    };

    const handleSelectTime = (hour, minute, field) => {
        const formattedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        setFormData(prev => ({ ...prev, [field]: formattedTime }));
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 11000, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div className="modal-content view-enter" style={{ maxWidth: '600px', width: '100%', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', background: 'var(--bg-primary)', borderRadius: '28px', border: '1px solid var(--border-color)', boxShadow: '0 24px 48px rgba(0,0,0,0.15)', padding: '24px' }}>
                
                {/* HEADER DO MODAL */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-rounded" style={{ color: 'var(--text-accent)' }}>{editingEvent ? 'edit_calendar' : 'add_task'}</span>
                        {editingEvent ? 'Editar Evento' : 'Novo Agendamento'}
                    </h3>
                    <button onClick={onClose} className="icon-btn" style={{ borderRadius: '50%' }}>
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* CAMPO DE TÍTULO COM EMOJI ATALHO */}
                    <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
                        <input 
                            type="text" 
                            placeholder="Título do evento ou compromisso" 
                            value={formData.title} 
                            onChange={e => setFormData({ ...formData, title: e.target.value })} 
                            style={{ flex: 1, padding: '14px 16px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px', fontWeight: '500', outline: 'none' }}
                        />
                        <button onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)} className="icon-btn" style={{ background: 'var(--bg-secondary)', width: '50px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                            <span className="material-symbols-rounded">mood</span>
                        </button>
                        {isEmojiPickerOpen && (
                            <div style={{ position: 'absolute', right: 0, top: '56px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px', zIndex: 12000, maxWidth: '240px', display: 'flex', flexWrap: 'wrap', gap: '6px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                                {commonEmojis.map(emoji => (
                                    <span key={emoji} onClick={() => { setFormData({ ...formData, title: emoji + ' ' + formData.title }); setIsEmojiPickerOpen(false); }} style={{ fontSize: '20px', cursor: 'pointer', padding: '4px', borderRadius: '8px', transition: 'background 0.2s' }} onMouseEnter={e => e.target.style.background = 'var(--bg-secondary)'} onMouseLeave={e => e.target.style.background = 'transparent'}>{emoji}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* CONFIGURAÇÃO DE DATAS E HORAS - PADRÃO MATERIAL DESIGN 3 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', position: 'relative' }}>
                        
                        {/* DATA DE INÍCIO CUSTOMIZADA */}
                        <div ref={startDateRef} style={{ position: 'relative' }}>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Início</label>
                            <div 
                                onClick={() => setShowStartDatePicker(!showStartDatePicker)}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', borderRadius: '16px', border: showStartDatePicker ? '2px solid var(--text-accent)' : '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                            >
                                <span className="material-symbols-rounded" style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>calendar_today</span>
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                    {formData.startDate ? format(new Date(formData.startDate + 'T12:00:00'), "dd/MM/yyyy") : 'Selecionar data'}
                                </span>
                            </div>

                            {/* POPUP CALENDÁRIO MD3 START DATE */}
                            {showStartDatePicker && (
                                <div style={{ position: 'absolute', top: '72px', left: 0, zIndex: 12500, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '16px', boxShadow: '0 12px 36px rgba(0,0,0,0.15)', width: '280px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-title)', textTransform: 'capitalize' }}>{format(pickerMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button onClick={() => setPickerMonth(subMonths(pickerMonth, 1))} className="icon-btn" style={{ padding: '4px' }}><span className="material-symbols-rounded">chevron_left</span></button>
                                            <button onClick={() => setPickerMonth(addMonths(pickerMonth, 1))} className="icon-btn" style={{ padding: '4px' }}><span className="material-symbols-rounded">chevron_right</span></button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
                                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <span key={i} style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>{d}</span>)}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                                        {generateCalendarDays().map((day, idx) => {
                                            const isSelected = formData.startDate === format(day, 'yyyy-MM-dd');
                                            const isCurrentMonth = day.getMonth() === pickerMonth.getMonth();
                                            return (
                                                <button key={idx} onClick={() => handleSelectDate(day, 'startDate')} style={{ width: '32px', height: '32px', border: 'none', borderRadius: '50%', background: isSelected ? 'var(--text-accent)' : 'transparent', color: isSelected ? '#ffffff' : (isCurrentMonth ? 'var(--text-primary)' : 'var(--text-secondary)'), opacity: isCurrentMonth ? 1 : 0.4, fontWeight: isSelected ? '700' : '500', fontSize: '12px', cursor: 'pointer' }}>
                                                    {format(day, 'd')}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* DATA DE FIM CUSTOMIZADA */}
                        <div ref={endDateRef} style={{ position: 'relative' }}>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Término</label>
                            <div 
                                onClick={() => setShowEndDatePicker(!showEndDatePicker)}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', borderRadius: '16px', border: showEndDatePicker ? '2px solid var(--text-accent)' : '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                            >
                                <span className="material-symbols-rounded" style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>calendar_today</span>
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                    {formData.endDate ? format(new Date(formData.endDate + 'T12:00:00'), "dd/MM/yyyy") : 'Selecionar data'}
                                </span>
                            </div>

                            {/* POPUP CALENDÁRIO MD3 END DATE */}
                            {showEndDatePicker && (
                                <div style={{ position: 'absolute', top: '72px', right: 0, zIndex: 12500, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '16px', boxShadow: '0 12px 36px rgba(0,0,0,0.15)', width: '280px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-title)', textTransform: 'capitalize' }}>{format(pickerMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button onClick={() => setPickerMonth(subMonths(pickerMonth, 1))} className="icon-btn" style={{ padding: '4px' }}><span className="material-symbols-rounded">chevron_left</span></button>
                                            <button onClick={() => setPickerMonth(addMonths(pickerMonth, 1))} className="icon-btn" style={{ padding: '4px' }}><span className="material-symbols-rounded">chevron_right</span></button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
                                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <span key={i} style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>{d}</span>)}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                                        {generateCalendarDays().map((day, idx) => {
                                            const isSelected = formData.endDate === format(day, 'yyyy-MM-dd');
                                            const isCurrentMonth = day.getMonth() === pickerMonth.getMonth();
                                            return (
                                                <button key={idx} onClick={() => handleSelectDate(day, 'endDate')} style={{ width: '32px', height: '32px', border: 'none', borderRadius: '50%', background: isSelected ? 'var(--text-accent)' : 'transparent', color: isSelected ? '#ffffff' : (isCurrentMonth ? 'var(--text-primary)' : 'var(--text-secondary)'), opacity: isCurrentMonth ? 1 : 0.4, fontWeight: isSelected ? '700' : '500', fontSize: '12px', cursor: 'pointer' }}>
                                                    {format(day, 'd')}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SELETORES DE HORA ESTILO GOOGLE CLOCK/ANDROID 17 DIGITAL */}
                    {!formData.allDay && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            
                            {/* HORA DE INÍCIO */}
                            <div ref={startTimeRef} style={{ position: 'relative' }}>
                                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Hora Início</label>
                                <div 
                                    onClick={() => setShowStartTimePicker(!showStartTimePicker)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', borderRadius: '16px', border: showStartTimePicker ? '2px solid var(--text-accent)' : '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                                >
                                    <span className="material-symbols-rounded" style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>schedule</span>
                                    <span style={{ fontSize: '14px', fontWeight: '600' }}>{formData.startHour}</span>
                                </div>

                                {showStartTimePicker && (
                                    <div style={{ position: 'absolute', top: '72px', left: 0, zIndex: 12400, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '16px', boxShadow: '0 12px 36px rgba(0,0,0,0.15)', width: '210px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input type="number" min="0" max="23" value={formData.startHour.split(':')[0]} onChange={e => handleSelectTime(e.target.value, formData.startHour.split(':')[1], 'startHour')} style={{ width: '56px', height: '48px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700', textAlign: 'center', outline: 'none' }} />
                                            <span style={{ fontWeight: '700', fontSize: '20px' }}>:</span>
                                            <input type="number" min="0" max="59" value={formData.startHour.split(':')[1]} onChange={e => handleSelectTime(formData.startHour.split(':')[0], e.target.value, 'startHour')} style={{ width: '56px', height: '48px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700', textAlign: 'center', outline: 'none' }} />
                                        </div>
                                        <button onClick={() => setShowStartTimePicker(false)} className="btn-secondary" style={{ width: '100%', padding: '6px', borderRadius: '100px', fontSize: '12px' }}>Confirmar</button>
                                    </div>
                                )}
                            </div>

                            {/* HORA DE TÉMINO */}
                            <div ref={endTimeRef} style={{ position: 'relative' }}>
                                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Hora Término</label>
                                <div 
                                    onClick={() => setShowEndTimePicker(!showEndTimePicker)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', borderRadius: '16px', border: showEndTimePicker ? '2px solid var(--text-accent)' : '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                                >
                                    <span className="material-symbols-rounded" style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>schedule</span>
                                    <span style={{ fontSize: '14px', fontWeight: '600' }}>{formData.endHour}</span>
                                </div>

                                {showEndTimePicker && (
                                    <div style={{ position: 'absolute', top: '72px', right: 0, zIndex: 12400, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '16px', boxShadow: '0 12px 36px rgba(0,0,0,0.15)', width: '210px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input type="number" min="0" max="23" value={formData.endHour.split(':')[0]} onChange={e => handleSelectTime(e.target.value, formData.endHour.split(':')[1], 'endHour')} style={{ width: '56px', height: '48px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700', textAlign: 'center', outline: 'none' }} />
                                            <span style={{ fontWeight: '700', fontSize: '20px' }}>:</span>
                                            <input type="number" min="0" max="59" value={formData.endHour.split(':')[1]} onChange={e => handleSelectTime(formData.endHour.split(':')[0], e.target.value, 'endHour')} style={{ width: '56px', height: '48px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700', textAlign: 'center', outline: 'none' }} />
                                        </div>
                                        <button onClick={() => setShowEndTimePicker(false)} className="btn-secondary" style={{ width: '100%', padding: '6px', borderRadius: '100px', fontSize: '12px' }}>Confirmar</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TOGGLE DIA INTEIRO E PRIVADO */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '4px 0' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }}>
                            <input type="checkbox" checked={formData.allDay} onChange={e => setFormData({ ...formData, allDay: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: 'var(--text-accent)' }} />
                            Dia Inteiro
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }}>
                            <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--text-accent)' }} />
                            Evento Privado 🔒
                        </label>
                    </div>

                    {/* SELETORES DE METADADOS (WORKSPACE, TIPO, UTILIZADOR) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Workspace</label>
                            <select value={formData.workspaceId} onChange={e => setFormData({ ...formData, workspaceId: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}>
                                {workspaces.map(ws => <option key={ws.cr4a1_calendarios_workspacesid} value={ws.cr4a1_calendarios_workspacesid}>{ws.cr4a1_nome}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Tipo de Evento</label>
                            <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}>
                                {eventTypes.map(t => <option key={t.id} value={t.name}>{t.emoji} {t.name}</option>)}
                            </select>
                        </div>
                        {['SECRETARIA', 'COORD', 'ADMIN', 'DIRETORIA'].includes(userRole) && (
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Agendar para</label>
                                <select value={formData.targetUser} onChange={e => setFormData({ ...formData, targetUser: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}>
                                    {allUsers.map(u => <option key={u.cr4a1_username} value={u.cr4a1_username}>{u.cr4a1_nome_exibicao || u.cr4a1_username}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* DESCRIÇÃO / DETALHES */}
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Descrição / Detalhes</label>
                        <textarea placeholder="Insira informações adicionais sobre a pauta ou reunião..." value={formData.details} onChange={e => setFormData({ ...formData, details: e.target.value })} rows={3} style={{ width: '100%', padding: '12px 16px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>

                    {/* SISTEMA DE SUBTASKS / SPRINT CHECKLIST */}
                    {workspaces.find(w => w.cr4a1_calendarios_workspacesid === formData.workspaceId)?.cr4a1_nome === "Desenvolvimento e Inovação" && (
                        <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Sprint Checklist (Subtasks)</label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <input type="text" placeholder="Nova subtarefa..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
                                <button onClick={() => { if (!newSubtask.trim()) return; setSubtasks([...subtasks, { text: newSubtask.trim(), completed: false }]); setNewSubtask(''); }} className="btn-primary" style={{ padding: '0 16px', borderRadius: '12px', fontSize: '13px' }}>+ Add</button>
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

                    {/* BOTÕES DE SALVAMENTO */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap-reverse' }}>
                        <button onClick={onClose} className="btn-secondary" style={{ flex: '1 1 100px', padding: '14px', borderRadius: '100px', fontWeight: '600' }}>Cancelar</button>
                        <button 
                            disabled={isSaving}
                            onClick={async () => {
                                if (!formData.title.trim()) return toast.error('O título do evento é obrigatório.');
                                if (userRole === 'DIRETORIA') {
                                    if (formData.targetUser !== 'DIRETORIA' && formData.targetUser !== viewedUser) {
                                        return toast.error('Você só tem permissão para agendar para a Diretoria.');
                                    }
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
                            className="btn-primary"
                            style={{ flex: '2 1 160px', opacity: isSaving ? 0.7 : 1, cursor: isSaving ? 'not-allowed' : 'pointer', borderRadius: '100px', fontWeight: '600', padding: '14px' }}
                        >
                            {isSaving ? '⏳ A Guardar...' : 'Salvar Compromisso'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};