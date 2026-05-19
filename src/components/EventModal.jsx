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

    // Seletores MD3
    const [activePicker, setActivePicker] = useState(null); // 'startDate', 'endDate', 'startTime', 'endTime'
    const [pickerMonth, setPickerMonth] = useState(new Date());

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
    }, [editingEvent, initialDate, isOpen]);

    if (!isOpen) return null;

    const handleSelectDate = (date) => {
        const formattedDate = format(date, 'yyyy-MM-dd');
        setFormData(prev => ({ ...prev, [activePicker]: formattedDate }));
        setActivePicker(null);
    };

    // Componente MD3 Outlined Field (O Campo com a etiqueta na borda)
    const MD3Field = ({ label, value, icon, onClick, children, type = "text", ...props }) => (
        <div style={{ position: 'relative', width: '100%', marginBottom: '4px' }}>
            <div 
                onClick={onClick}
                style={{
                    display: 'flex', alignItems: 'center', minHeight: '56px', padding: '0 16px',
                    borderRadius: '12px', border: '1px solid var(--border-color)', background: 'transparent',
                    cursor: onClick ? 'pointer' : 'text'
                }}
            >
                <label style={{
                    position: 'absolute', left: '12px', top: '-8px', background: 'var(--bg-primary)',
                    padding: '0 4px', fontSize: '12px', color: 'var(--text-accent)', fontWeight: '500'
                }}>
                    {label}
                </label>
                {icon && <span className="material-symbols-rounded" style={{ marginRight: '12px', color: 'var(--text-secondary)' }}>{icon}</span>}
                <div style={{ flex: 1, fontSize: '16px', color: 'var(--text-primary)' }}>
                    {children || value}
                </div>
                {onClick && <span className="material-symbols-rounded" style={{ opacity: 0.5 }}>arrow_drop_down</span>}
            </div>
        </div>
    );

    // Componente MD3 Switch (O interruptor do Android)
    const MD3Switch = ({ label, checked, onChange }) => (
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '8px 0' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>{label}</span>
            <div onClick={() => onChange(!checked)} style={{
                width: '52px', height: '32px', borderRadius: '100px', padding: '4px',
                background: checked ? 'var(--text-accent)' : 'var(--bg-tertiary)',
                position: 'relative', transition: 'all 0.3s'
            }}>
                <div style={{
                    width: '24px', height: '24px', borderRadius: '50%', background: checked ? '#fff' : 'var(--text-secondary)',
                    position: 'absolute', left: checked ? '24px' : '4px', transition: 'all 0.3s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    {checked && <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--text-accent)' }}>check</span>}
                </div>
            </div>
        </label>
    );

    return (
        <div className="modal-overlay" style={{ zIndex: 11000, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal-content" style={{ maxWidth: '500px', width: '95%', background: 'var(--bg-primary)', borderRadius: '28px', padding: '24px', position: 'relative', border: '1px solid var(--border-color)' }}>
                
                {/* TOPO: Ações MD3 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <button onClick={onClose} className="icon-btn"><span className="material-symbols-rounded">close</span></button>
                    <h2 style={{ fontSize: '18px', fontWeight: '400', margin: 0 }}>{editingEvent ? 'Editar evento' : 'Novo evento'}</h2>
                    <button 
                        disabled={isSaving}
                        onClick={async () => {
                            setIsSaving(true);
                            await onSave({ ...formData, cr4a1_titulo: formData.title, cr4a1_descricao: formData.details, cr4a1_subtasks: JSON.stringify(subtasks), cr4a1_privado: isPrivate });
                            setIsSaving(false);
                        }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-accent)', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}
                    >
                        {isSaving ? 'SALVANDO...' : 'SALVAR'}
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* CAMPO DE TÍTULO ESTILO MD3 */}
                    <div style={{ position: 'relative' }}>
                        <input 
                            placeholder="Título do evento"
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', fontSize: '24px', padding: '8px 0', outline: 'none', color: 'var(--text-primary)' }}
                        />
                    </div>

                    {/* SELETORES DE DATA (GRID) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <MD3Field 
                            label="Data de início" 
                            value={format(new Date(formData.startDate + 'T12:00:00'), "EEE, d 'de' MMM", { locale: ptBR })} 
                            icon="calendar_month" 
                            onClick={() => setActivePicker('startDate')} 
                        />
                        <MD3Field 
                            label="Data de término" 
                            value={format(new Date(formData.endDate + 'T12:00:00'), "EEE, d 'de' MMM", { locale: ptBR })} 
                            icon="event_upcoming" 
                            onClick={() => setActivePicker('endDate')} 
                        />
                    </div>

                    {/* SELETORES DE HORA (MD3 CLOCK STYLE) */}
                    {!formData.allDay && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <MD3Field label="Hora início" value={formData.startHour} icon="schedule" onClick={() => setActivePicker('startTime')} />
                            <MD3Field label="Hora término" value={formData.endHour} icon="history" onClick={() => setActivePicker('endTime')} />
                        </div>
                    )}

                    {/* INTERRUPTORES (SWITCHES) */}
                    <div style={{ background: 'var(--bg-secondary)', padding: '8px 16px', borderRadius: '16px' }}>
                        <MD3Switch label="Dia inteiro" checked={formData.allDay} onChange={val => setFormData({...formData, allDay: val})} />
                        <MD3Switch label="Evento privado" checked={isPrivate} onChange={setIsPrivate} />
                    </div>

                    {/* SELECTS MD3 WRAPPED */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <MD3Field label="Workspace">
                            <select value={formData.workspaceId} onChange={e => setFormData({...formData, workspaceId: e.target.value})} style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'inherit', cursor: 'pointer' }}>
                                {workspaces.map(ws => <option key={ws.cr4a1_calendarios_workspacesid} value={ws.cr4a1_calendarios_workspacesid}>{ws.cr4a1_nome}</option>)}
                            </select>
                        </MD3Field>
                        <MD3Field label="Tipo">
                            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'inherit', cursor: 'pointer' }}>
                                {eventTypes.map(t => <option key={t.id} value={t.name}>{t.emoji} {t.name}</option>)}
                            </select>
                        </MD3Field>
                    </div>

                    {/* DESCRIÇÃO OUTLINED */}
                    <div style={{ position: 'relative', width: '100%' }}>
                        <textarea 
                            rows={3}
                            value={formData.details}
                            onChange={e => setFormData({...formData, details: e.target.value})}
                            style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'transparent', outline: 'none', color: 'var(--text-primary)', resize: 'none' }}
                        />
                        <label style={{ position: 'absolute', left: '12px', top: '-8px', background: 'var(--bg-primary)', padding: '0 4px', fontSize: '12px', color: 'var(--text-accent)' }}>Descrição</label>
                    </div>
                </div>

                {/* --- MODAL DE DATA (DATE PICKER MD3 FULL) --- */}
                {(activePicker === 'startDate' || activePicker === 'endDate') && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 13000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                        <div style={{ width: '320px', background: 'var(--bg-primary)', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 12px 48px rgba(0,0,0,0.2)' }}>
                            <div style={{ padding: '16px 24px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                                <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Selecionar data</span>
                                <h2 style={{ fontSize: '32px', margin: '12px 0 0', fontWeight: '400' }}>
                                    {format(pickerMonth, 'EEE, d MMM', { locale: ptBR })}
                                </h2>
                            </div>
                            <div style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ fontWeight: '700' }}>{format(pickerMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => setPickerMonth(subMonths(pickerMonth, 1))} className="icon-btn"><span className="material-symbols-rounded">chevron_left</span></button>
                                        <button onClick={() => setPickerMonth(addMonths(pickerMonth, 1))} className="icon-btn"><span className="material-symbols-rounded">chevron_right</span></button>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
                                    {['D','S','T','Q','Q','S','S'].map(d => <span key={d} style={{ fontSize: '12px', opacity: 0.5 }}>{d}</span>)}
                                    {eachDayOfInterval({ start: startOfWeek(startOfMonth(pickerMonth)), end: endOfWeek(endOfMonth(pickerMonth)) }).map((day, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => handleSelectDate(day)}
                                            style={{
                                                width: '36px', height: '36px', border: 'none', borderRadius: '50%', cursor: 'pointer',
                                                background: isSameDay(day, new Date(formData[activePicker] + 'T12:00:00')) ? 'var(--text-accent)' : 'transparent',
                                                color: isSameDay(day, new Date(formData[activePicker] + 'T12:00:00')) ? '#fff' : (day.getMonth() === pickerMonth.getMonth() ? 'inherit' : 'var(--text-secondary)')
                                            }}
                                        >
                                            {format(day, 'd')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- MODAL DE HORA (TIME PICKER MD3 DIGITAL) --- */}
                {(activePicker === 'startTime' || activePicker === 'endTime') && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 13000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                        <div style={{ padding: '24px', background: 'var(--bg-primary)', borderRadius: '28px', textAlign: 'center', boxShadow: '0 12px 48px rgba(0,0,0,0.2)' }}>
                            <span style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '20px' }}>Insira o horário</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                                <input 
                                    type="number" 
                                    defaultValue={formData[activePicker === 'startTime' ? 'startHour' : 'endHour'].split(':')[0]} 
                                    id="h-picker"
                                    style={{ width: '96px', height: '80px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: 'none', fontSize: '48px', textAlign: 'center', color: 'var(--text-accent)' }}
                                />
                                <span style={{ fontSize: '48px', fontWeight: '300' }}>:</span>
                                <input 
                                    type="number" 
                                    defaultValue={formData[activePicker === 'startTime' ? 'startHour' : 'endHour'].split(':')[1]} 
                                    id="m-picker"
                                    style={{ width: '96px', height: '80px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: 'none', fontSize: '48px', textAlign: 'center', color: 'var(--text-accent)' }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                                <button onClick={() => setActivePicker(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer' }}>CANCELAR</button>
                                <button 
                                    onClick={() => {
                                        const h = document.getElementById('h-picker').value.padStart(2, '0');
                                        const m = document.getElementById('m-picker').value.padStart(2, '0');
                                        setFormData(prev => ({ ...prev, [activePicker === 'startTime' ? 'startHour' : 'endHour']: `${h}:${m}` }));
                                        setActivePicker(null);
                                    }}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-accent)', fontWeight: '700', cursor: 'pointer' }}
                                >OK</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};