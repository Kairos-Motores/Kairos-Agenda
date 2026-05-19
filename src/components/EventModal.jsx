import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { format, parseISO, isAfter, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
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
    const [activePicker, setActivePicker] = useState(null);
    const [openDropdown, setOpenDropdown] = useState(null);
    const [pickerMonth, setPickerMonth] = useState(new Date());

    const workspaceRef = useRef(null);
    const typeRef = useRef(null);
    const targetUserRef = useRef(null);
    const commonEmojis = ['🤝', '📞', '👥', '💬', '📢', '💻', '🖥️', '📅', '📊', '📝', '💡', '🏢', '🚗', '🏍️', '✈️', '🏨', '📍', '🗺️', '🛠️', '⚡'];

    // 1. Sincronização Inicial
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
        }
    }, [editingEvent, initialDate, isOpen, viewedUser, eventTypes, workspaces]);

    // 2. Lógica de Tempo (Intervalo de 1 hora)
    const handleStartHourChange = (newStart) => {
        const [h, m] = newStart.split(':').map(Number);
        const date = new Date();
        date.setHours(h + 1, m);
        setFormData(prev => ({ ...prev, startHour: newStart, endHour: format(date, 'HH:mm') }));
    };

    // 3. Helpers de Arquivo
    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        selectedFiles.forEach(file => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => setFormData(prev => ({ ...prev, files: [...prev.files, { name: file.name, size: file.size, base64: reader.result }] }));
        });
    };

    if (!isOpen) return null;

    // Componentes de Estilo MD3 Corrigidos (Sem Labels sobrepostas)
    const InputField = ({ label, children }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-accent)', marginLeft: '12px', textTransform: 'uppercase' }}>{label}</span>
            {children}
        </div>
    );

    return (
        <div className="modal-overlay" style={{ zIndex: 11000, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div className="modal-content" style={{ maxWidth: '520px', width: '100%', background: 'var(--bg-primary)', borderRadius: '32px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <button onClick={onClose} className="icon-btn"><span className="material-symbols-rounded">close</span></button>
                    <h2 style={{ fontSize: '17px', fontWeight: '700' }}>{editingEvent ? 'Editar Ficha' : 'Nova Ficha'}</h2>
                    <button onClick={async () => {
                        if (!formData.title.trim()) return toast.error('O título é obrigatório.');
                        if (isAfter(parseISO(formData.startDate), parseISO(formData.endDate))) return toast.error('Data inicial > Final.');
                        if (formData.startDate === formData.endDate && !formData.allDay && formData.startHour >= formData.endHour) return toast.error('Hora inicial > Final.');
                        setIsSaving(true);
                        await onSave({ ...formData, cr4a1_titulo: formData.title, cr4a1_descricao: formData.details, cr4a1_subtasks: JSON.stringify(subtasks), cr4a1_privado: isPrivate });
                    }} style={{ background: 'var(--text-accent)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '100px', fontWeight: '600', cursor: 'pointer' }}>
                        {isSaving ? '...' : 'SALVAR'}
                    </button>
                </div>

                {/* Formulário */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Título do evento..." style={{ width: '100%', padding: '16px', borderRadius: '20px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', outline: 'none', fontSize: '16px' }} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <InputField label="Data Inicial">
                            <button onClick={() => setActivePicker('startDate')} style={{ padding: '14px', borderRadius: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', textAlign: 'left', cursor: 'pointer' }}>{safeFormatDate(formData.startDate)}</button>
                        </InputField>
                        <InputField label="Data Final">
                            <button onClick={() => setActivePicker('endDate')} style={{ padding: '14px', borderRadius: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', textAlign: 'left', cursor: 'pointer' }}>{safeFormatDate(formData.endDate)}</button>
                        </InputField>
                    </div>

                    {!formData.allDay && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <InputField label="Início">
                                <input type="time" value={formData.startHour} onChange={e => handleStartHourChange(e.target.value)} style={{ padding: '14px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }} />
                            </InputField>
                            <InputField label="Fim">
                                <input type="time" value={formData.endHour} onChange={e => setFormData({...formData, endHour: e.target.value})} style={{ padding: '14px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }} />
                            </InputField>
                        </div>
                    )}

                    {/* Checkboxes em estilo Switch */}
                    <div style={{ display: 'flex', gap: '20px', padding: '0 12px' }}>
                        <label><input type="checkbox" checked={formData.allDay} onChange={e => setFormData({...formData, allDay: e.target.checked})} /> Dia inteiro</label>
                        <label><input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} /> Privado 🔒</label>
                    </div>
                </div>

                {/* Modais de Data (Picker fixo) */}
                {(activePicker === 'startDate' || activePicker === 'endDate') && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 13000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                        <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '24px', width: '300px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                                {eachDayOfInterval({ start: startOfWeek(startOfMonth(pickerMonth)), end: endOfWeek(endOfMonth(pickerMonth)) }).map((day, i) => (
                                    <button key={i} onClick={() => handleSelectDate(day)} style={{ padding: '8px', borderRadius: '50%', border: 'none' }}>{format(day, 'd')}</button>
                                ))}
                            </div>
                            <button onClick={() => setActivePicker(null)} style={{ width: '100%', marginTop: '10px' }}>Cancelar</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper simples para formatar data
const safeFormatDate = (dateStr, pattern = "dd/MM") => {
    if (!dateStr) return 'Selecione';
    return format(parseISO(dateStr), pattern);
};