import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { checkAccess, hasCoordRole } from '../utils/permissions';
import { useFocusTrap } from '../hooks/useFocusTrap';

export const EventModal = ({
    isOpen, onClose, onSave, initialDate, editingEvent, userRole,
    allUsers = [], eventTypes = [], viewedUser, workspaces = [],
    preselectedTargetUser, preselectedWorkspaceId
}) => {
    const trapRef = useFocusTrap(isOpen);
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

    // Controlo de Estados dos Menus MD3 Customizados
    const [activePicker, setActivePicker] = useState(null); // 'startDate', 'endDate', 'startTime', 'endTime'
    const [openDropdown, setOpenDropdown] = useState(null); // 'workspace', 'type', 'targetUser'
    const [pickerMonth, setPickerMonth] = useState(new Date());
    const [targetUserSearch, setTargetUserSearch] = useState('');

    // Refs para monitorizar fecho de dropdowns customizados
    const workspaceRef = useRef(null);
    const typeRef = useRef(null);
    const targetUserRef = useRef(null);

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
                targetUser: preselectedTargetUser || viewedUser || '', allDay: false,
                workspaceId: preselectedWorkspaceId || workspaces[0]?.cr4a1_calendarios_workspacesid || ''
            });
            setSubtasks([]);
            setIsPrivate(false);
        }
        setIsSaving(false);
    }, [editingEvent, initialDate, isOpen, viewedUser, eventTypes, workspaces, preselectedTargetUser, preselectedWorkspaceId]);

    // Fechar dropdowns ao clicar fora
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (openDropdown === 'workspace' && workspaceRef.current && !workspaceRef.current.contains(e.target)) setOpenDropdown(null);
            if (openDropdown === 'type' && typeRef.current && !typeRef.current.contains(e.target)) setOpenDropdown(null);
            if (openDropdown === 'targetUser' && targetUserRef.current && !targetUserRef.current.contains(e.target)) { setOpenDropdown(null); setTargetUserSearch(''); }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [openDropdown]);

    // Fecha com Esc -- só quando não há um seletor (data/hora) ou dropdown aberto por cima,
    // pra Esc fechar aquele primeiro em vez de pular direto pro modal inteiro
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => {
            if (e.key !== 'Escape') return;
            if (activePicker) { setActivePicker(null); return; }
            if (openDropdown) { setOpenDropdown(null); return; }
            if (isEmojiPickerOpen) { setIsEmojiPickerOpen(false); return; }
            onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, activePicker, openDropdown, isEmojiPickerOpen, onClose]);

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

    // Utilizadores do workspace selecionado (criador + membros), para restringir a quem
    // pode ser atribuída a responsabilidade do evento dentro desse workspace específico.
    const selectedWorkspace = workspaces.find(ws => ws.cr4a1_calendarios_workspacesid === formData.workspaceId);
    const workspaceUsers = selectedWorkspace
        ? allUsers.filter(u => {
            if (u.cr4a1_username === selectedWorkspace.cr4a1_criador_login) return true;
            const membros = (selectedWorkspace.cr4a1_membros_logins || '').split(',').map(s => s.trim()).filter(Boolean);
            return membros.includes(u.cr4a1_username);
        })
        : [];

    // Estilos de Cores Dinâmicas baseados no Accent Color (Material You Tonal Mappings)
    const tintColor = 'var(--text-accent)';
    const surfaceVariant = `${tintColor}0d`; // 5% de opacidade para fundo suave
    const activeItemBg = `${tintColor}1c`; // 11% de opacidade para itens ativos

    // COMPONENTE CUSTOMIZADO: Campo de Seleção Estilo MD3 (Sem Dropdown Nativo)
    const MD3DropdownField = ({ label, icon, options, value, onSelect, displayValue, containerRef, dropdownKey, searchable = false, searchTerm = '', onSearchChange, emptyMessage = 'Nenhuma opção encontrada.' }) => {
        const isDropdownOpen = openDropdown === dropdownKey;
        const filteredOptions = searchable && searchTerm.trim()
            ? options.filter(opt => opt.name.toLowerCase().includes(searchTerm.trim().toLowerCase()))
            : options;
        return (
            <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
                <div
                    onClick={() => {
                        const willClose = isDropdownOpen;
                        setOpenDropdown(willClose ? null : dropdownKey);
                        if (willClose && searchable) onSearchChange('');
                    }}
                    style={{
                        display: 'flex', flexDirection: 'column', padding: '10px 16px', minHeight: '62px',
                        borderRadius: '20px', border: isDropdownOpen ? `2px solid ${tintColor}` : '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)', cursor: 'pointer', boxSizing: 'border-box',
                        justifyContent: 'center', transition: 'all 0.2s ease-in-out'
                    }}
                >
                    <span style={{ fontSize: '11px', fontWeight: '700', color: tintColor, marginBottom: '2px', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                        {label}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {icon && <span className="material-symbols-rounded" style={{ fontSize: '18px', color: tintColor }}>{icon}</span>}
                            <span>{displayValue}</span>
                        </div>
                        <span className="material-symbols-rounded" style={{ transition: 'transform 0.2s', transform: isDropdownOpen ? 'rotate(180deg)' : 'none', color: 'var(--text-secondary)', fontSize: '20px' }}>expand_more</span>
                    </div>
                </div>

                {isDropdownOpen && (
                    <div style={{
                        position: 'absolute', top: '68px', left: 0, right: 0, zIndex: 12600,
                        background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                        borderRadius: '20px', padding: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px'
                    }}>
                        {searchable && (
                            <input
                                type="text"
                                autoFocus
                                placeholder="Pesquisar..."
                                value={searchTerm}
                                onClick={e => e.stopPropagation()}
                                onChange={e => onSearchChange(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px 12px', marginBottom: '4px', borderRadius: '12px',
                                    border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                                }}
                            />
                        )}
                        {filteredOptions.length === 0 ? (
                            <div style={{ padding: '14px 10px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>{emptyMessage}</div>
                        ) : filteredOptions.map(opt => {
                            const isSelected = opt.id === value;
                            return (
                                <div
                                    key={opt.id}
                                    onClick={() => { onSelect(opt.id); setOpenDropdown(null); if (searchable) onSearchChange(''); }}
                                    style={{
                                        padding: '12px 14px', borderRadius: '14px', fontSize: '14px', fontWeight: isSelected ? '700' : '500',
                                        color: isSelected ? tintColor : 'var(--text-primary)',
                                        background: isSelected ? activeItemBg : 'transparent',
                                        cursor: 'pointer', transition: 'background 0.15s ease', display: 'flex', alignItems: 'center', gap: '8px'
                                    }}
                                    onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'var(--bg-secondary)')}
                                    onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
                                >
                                    {opt.emoji && <span>{opt.emoji}</span>}
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.name}</span>
                                    {isSelected && <span className="material-symbols-rounded" style={{ marginLeft: 'auto', fontSize: '16px' }}>check</span>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    // COMPONENTE CUSTOMIZADO: Campo de Data/Hora Integrado
    const MD3InputField = ({ label, value, icon, onClick }) => (
        <div 
            onClick={onClick}
            style={{
                display: 'flex', flexDirection: 'column', padding: '10px 16px', minHeight: '62px',
                borderRadius: '20px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                cursor: 'pointer', boxSizing: 'border-box', justifyHeight: 'center', justifyContent: 'center', transition: 'all 0.2s'
            }}
            className="md3-input-hover"
        >
            <span style={{ fontSize: '11px', fontWeight: '700', color: tintColor, marginBottom: '2px', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                {label}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {icon && <span className="material-symbols-rounded" style={{ fontSize: '18px', color: tintColor }}>{icon}</span>}
                <span>{value}</span>
            </div>
        </div>
    );

    const MD3Switch = ({ label, checked, onChange }) => (
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '6px 0' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-title)' }}>{label}</span>
            <div onClick={() => onChange(!checked)} style={{
                width: '50px', height: '28px', borderRadius: '100px', padding: '2px',
                background: checked ? tintColor : 'var(--bg-tertiary)',
                position: 'relative', transition: 'all 0.2s ease', boxSizing: 'border-box'
            }}>
                <div style={{
                    width: '24px', height: '24px', borderRadius: '50%', background: '#ffffff',
                    position: 'absolute', left: checked ? '24px' : '2px', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
                }}>
                    {checked && <span className="material-symbols-rounded" style={{ fontSize: '14px', color: tintColor, fontWeight: '900' }}>check</span>}
                </div>
            </div>
        </label>
    );

    return (
        <div className="modal-overlay" style={{ zIndex: 11000, backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div ref={trapRef} tabIndex={-1} className="modal-content view-enter" style={{ maxWidth: '520px', width: '100%', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', background: 'var(--bg-primary)', borderRadius: '32px', padding: '26px', position: 'relative', border: '1px solid var(--border-color)', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
                
                {/* BARRA DE AÇÕES SUPERIOR */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <button onClick={onClose} className="icon-btn boing-effect" aria-label="Fechar" style={{ background: 'var(--bg-secondary)', borderRadius: '50%', width: '36px', height: '36px' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span>
                    </button>
                    <h2 style={{ fontSize: '17px', fontWeight: '700', margin: 0, color: 'var(--text-title)' }}>
                        {editingEvent ? 'Editar Ficha' : 'Nova Ficha'}
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
                        className="boing-effect"
                        style={{ background: tintColor, border: 'none', color: '#ffffff', fontWeight: '700', cursor: isSaving ? 'default' : 'pointer', fontSize: '13px', padding: '8px 20px', borderRadius: '100px', letterSpacing: '0.2px', opacity: isSaving ? 0.7 : 1 }}
                    >
                        {isSaving ? 'A GUARDAR...' : 'SALVAR'}
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    
                    {/* ENTRADA DE TÍTULO */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-secondary)', padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--border-color)', position: 'relative' }}>
                        <input 
                            placeholder="Nome do Evento ou Tarefa..."
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '17px', padding: '8px 0', outline: 'none', color: 'var(--text-primary)', fontWeight: '600' }}
                        />
                        <button onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)} className="icon-btn boing-effect" aria-label="Escolher emoji" style={{ background: isEmojiPickerOpen ? 'var(--bg-tertiary)' : 'var(--bg-primary)', borderRadius: '14px', width: '38px', height: '38px', border: `1px solid ${isEmojiPickerOpen ? tintColor : 'var(--border-color)'}` }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '18px', color: tintColor }}>mood</span>
                        </button>

                        {isEmojiPickerOpen && (
                            <div style={{ position: 'absolute', right: '12px', top: '58px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '12px', zIndex: 12000, maxWidth: '230px', display: 'flex', flexWrap: 'wrap', gap: '6px', boxShadow: '0 12px 32px rgba(0,0,0,0.12)' }}>
                                {commonEmojis.map(emoji => (
                                    <span 
                                        key={emoji} 
                                        onClick={() => { setFormData({ ...formData, title: emoji + ' ' + formData.title }); setIsEmojiPickerOpen(false); }} 
                                        style={{ fontSize: '19px', cursor: 'pointer', padding: '4px', borderRadius: '8px', transition: 'transform 0.1s' }}
                                        onMouseEnter={e => e.target.style.transform = 'scale(1.2)'}
                                        onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                                    >
                                        {emoji}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* SELETORES DE DATA INTEGRADOS */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <MD3InputField label="Data Inicial" value={safeFormatDate(formData.startDate)} icon="calendar_month" onClick={() => setActivePicker('startDate')} />
                        <MD3InputField label="Data Final" value={safeFormatDate(formData.endDate)} icon="event_upcoming" onClick={() => setActivePicker('endDate')} />
                    </div>

                    {/* SELETORES DE HORÁRIO INTEGRADOS */}
                    {!formData.allDay && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <MD3InputField label="Hora de Início" value={formData.startHour} icon="schedule" onClick={() => setActivePicker('startTime')} />
                            <MD3InputField label="Hora de Término" value={formData.endHour} icon="history" onClick={() => setActivePicker('endTime')} />
                        </div>
                    )}

                    {/* SWITCHES OVALADOS CONTRASTANTES */}
                    <div style={{ background: surfaceVariant, padding: '10px 18px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '4px', border: `1px solid ${tintColor}15` }}>
                        <MD3Switch label="Compromisso de Dia Inteiro" checked={formData.allDay} onChange={val => setFormData({...formData, allDay: val})} />
                        <MD3Switch label="Restringir Visibilidade (Privado 🔒)" checked={isPrivate} onChange={setIsPrivate} />
                    </div>

                    {/* DROPDOWNS REFORMULADOS MD3 CUSTOMIZADOS */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                        <MD3DropdownField 
                            label="Workspace Vinculado" 
                            icon="workspaces"
                            dropdownKey="workspace"
                            containerRef={workspaceRef}
                            value={formData.workspaceId}
                            displayValue={workspaces.find(ws => ws.cr4a1_calendarios_workspacesid === formData.workspaceId)?.cr4a1_nome || 'Selecione'}
                            options={workspaces.map(w => ({ id: w.cr4a1_calendarios_workspacesid, name: w.cr4a1_nome }))}
                            onSelect={val => setFormData({...formData, workspaceId: val})}
                        />
                        
                        <MD3DropdownField 
                            label="Categoria / Tipo" 
                            icon="bookmarks"
                            dropdownKey="type"
                            containerRef={typeRef}
                            value={formData.type}
                            displayValue={formData.type || 'Selecione'}
                            options={eventTypes.map(t => ({ id: t.name, name: t.name, emoji: t.emoji }))}
                            onSelect={val => setFormData({...formData, type: val})}
                        />

                        {(checkAccess(userRole, ['SECRETARIA', 'ADMIN', 'DIRETORIA']) || hasCoordRole(userRole)) && (
                            <MD3DropdownField
                                label="Responsável"
                                icon="person"
                                dropdownKey="targetUser"
                                containerRef={targetUserRef}
                                value={formData.targetUser}
                                displayValue={allUsers.find(u => u.cr4a1_username === formData.targetUser)?.cr4a1_nome_exibicao || formData.targetUser || 'Selecione'}
                                options={workspaceUsers.map(u => ({ id: u.cr4a1_username, name: u.cr4a1_nome_exibicao || u.cr4a1_username }))}
                                onSelect={val => setFormData({...formData, targetUser: val})}
                                searchable
                                searchTerm={targetUserSearch}
                                onSearchChange={setTargetUserSearch}
                                emptyMessage="Nenhum utilizador encontrado neste workspace."
                            />
                        )}
                    </div>

                    {/* CORPO DA DESCRIÇÃO INTEGRADO */}
                    <div style={{ display: 'flex', flexDirection: 'column', padding: '10px 16px', borderRadius: '20px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', boxSizing: 'border-box' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: tintColor, marginBottom: '6px', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                            Descrição Detalhada
                        </span>
                        <textarea 
                            rows={3}
                            placeholder="Adicione as pautas ou informações da entrega..."
                            value={formData.details}
                            onChange={e => setFormData({...formData, details: e.target.value})}
                            style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', resize: 'none', fontSize: '14px', fontFamily: 'inherit', lineHeight: '1.5', padding: 0 }}
                        />
                    </div>

                    {/* SPRINT SUBTASKS (CHECKLIST DINÂMICO) */}
                    {workspaces.find(w => w.cr4a1_calendarios_workspacesid === formData.workspaceId)?.cr4a1_nome === "Desenvolvimento e Inovação" && (
                        <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: tintColor, textTransform: 'uppercase', display: 'block', marginBottom: '8px', letterSpacing: '0.3px' }}>Sprint Checklist (Subtasks)</label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <input type="text" placeholder="Adicionar sub-item técnico..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} style={{ flex: 1, padding: '10px 14px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
                                <button onClick={() => { if (!newSubtask.trim()) return; setSubtasks([...subtasks, { text: newSubtask.trim(), completed: false }]); setNewSubtask(''); }} className="btn-primary boing-effect" style={{ padding: '0 16px', borderRadius: '14px', fontSize: '13px', background: tintColor }}>Incluir</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {subtasks.map((task, index) => (
                                    <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                                            <input type="checkbox" checked={task.completed} onChange={e => { const updated = [...subtasks]; updated[index].completed = e.target.checked; setSubtasks(updated); }} style={{ accentColor: tintColor, width: '16px', height: '16px' }} />
                                            <span style={{ textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)', fontWeight: '500' }}>{task.text}</span>
                                        </div>
                                        <button onClick={() => setSubtasks(subtasks.filter((_, i) => i !== index))} className="icon-btn boing-effect" aria-label={`Remover subtarefa "${task.text}"`} style={{ width: '28px', height: '28px', color: '#e74c3c' }}><span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DOCUMENTAÇÃO E ANEXOS */}
                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: tintColor, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Documentação Técnica</label>
                            <button onClick={() => document.getElementById('modal-file-attach').click()} className="btn-secondary boing-effect" style={{ padding: '6px 14px', borderRadius: '100px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
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
                                        <a href={file.base64} download={file.name} style={{ fontSize: '13px', color: tintColor, textDecoration: 'none', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '10px' }}>
                                            📄 {file.name} <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '400' }}>({Math.round(file.size / 1024)} KB)</span>
                                        </a>
                                        <button onClick={() => removeFile(i)} className="icon-btn boing-effect" aria-label={`Remover anexo "${file.name}"`} style={{ width: '28px', height: '28px', color: '#e74c3c' }}>
                                            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                {/* --- DIÁLOGO FIXED DE ESCOLA DE DATAS --- */}
                {(activePicker === 'startDate' || activePicker === 'endDate') && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 13000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
                        <div style={{ width: '310px', background: 'var(--bg-primary)', borderRadius: '32px', overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', padding: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <span style={{ fontWeight: '700', textTransform: 'capitalize', fontSize: '14px', color: 'var(--text-title)' }}>{format(pickerMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button onClick={() => setPickerMonth(subMonths(pickerMonth, 1))} className="icon-btn boing-effect" aria-label="Mês anterior"><span className="material-symbols-rounded">chevron_left</span></button>
                                    <button onClick={() => setPickerMonth(addMonths(pickerMonth, 1))} className="icon-btn boing-effect" aria-label="Próximo mês"><span className="material-symbols-rounded">chevron_right</span></button>
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
                                            className={`boing-effect${isSelected ? '' : ' date-picker-day'}`}
                                            style={{
                                                width: '34px', height: '34px', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '12px', fontWeight: '700',
                                                background: isSelected ? tintColor : 'transparent',
                                                color: isSelected ? '#ffffff' : (isCurrentMonth ? 'var(--text-primary)' : 'var(--text-secondary)'),
                                                opacity: isCurrentMonth ? 1 : 0.3
                                            }}
                                        >
                                            {format(day, 'd')}
                                        </button>
                                    );
                                })}
                            </div>
                            <button onClick={() => setActivePicker(null)} className="boing-effect cancel-text-btn" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', fontSize: '12px', width: '100%', textAlign: 'right', marginTop: '12px', paddingRight: '8px' }}>CANCELAR</button>
                        </div>
                    </div>
                )}

                {/* --- DIÁLOGO FIXED DE ESCOLHA DE HORÁRIO --- */}
                {(activePicker === 'startTime' || activePicker === 'endTime') && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 13000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
                        <div style={{ padding: '20px', background: 'var(--bg-primary)', borderRadius: '32px', textAlign: 'center', boxShadow: '0 16px 48px rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', width: '240px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '16px', color: tintColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Definir Horário</span>
                            
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
                                <input 
                                    type="text" 
                                    maxLength={2}
                                    defaultValue={formData[activePicker === 'startTime' ? 'startHour' : 'endHour'].split(':')[0]} 
                                    id="h-picker"
                                    style={{ width: '68px', height: '64px', borderRadius: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '28px', textAlign: 'center', color: 'var(--text-primary)', fontWeight: '700', outline: 'none' }}
                                />
                                <span style={{ fontSize: '28px', fontWeight: '300', color: 'var(--text-secondary)' }}>:</span>
                                <input 
                                    type="text" 
                                    maxLength={2}
                                    defaultValue={formData[activePicker === 'startTime' ? 'startHour' : 'endHour'].split(':')[1]} 
                                    id="m-picker"
                                    style={{ width: '68px', height: '64px', borderRadius: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '28px', textAlign: 'center', color: 'var(--text-primary)', fontWeight: '700', outline: 'none' }}
                                />
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button onClick={() => setActivePicker(null)} className="boing-effect cancel-text-btn" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', fontSize: '12px', padding: '6px 10px' }}>CANCELAR</button>
                                <button
                                    onClick={() => {
                                        const hInput = document.getElementById('h-picker').value || '00';
                                        const mInput = document.getElementById('m-picker').value || '00';
                                        setFormData(prev => ({ ...prev, [activePicker === 'startTime' ? 'startHour' : 'endHour']: `${hInput.padStart(2, '0')}:${mInput.padStart(2, '0')}` }));
                                        setActivePicker(null);
                                    }}
                                    className="boing-effect"
                                    style={{ background: tintColor, border: 'none', color: '#ffffff', fontWeight: '700', cursor: 'pointer', fontSize: '12px', padding: '6px 14px', borderRadius: '100px' }}
                                >OK</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                .md3-input-hover:hover { background: var(--bg-tertiary) !important; border-color: var(--text-accent) !important; }
            `}</style>
        </div>
    );
};