import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    X, Smile, CalendarDays, CalendarClock, Clock, History, LayoutGrid, Bookmark, Users,
    ChevronLeft, ChevronRight, Check, Upload, FileText, Plus, Trash2, Lock
} from 'lucide-react';
import { checkAccess, hasCoordRole } from '../utils/permissions';
import { parseAssignees } from '../utils/assignees';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from './ui/popover';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from './ui/command';
import { Checkbox } from './ui/checkbox';

const commonEmojis = [
    '🤝', '📞', '👥', '💬', '📢', '💻', '🖥️', '📅', '📊', '📝', '💡', '🏢',
    '🚗', '🏍️', '✈️', '🏨', '📍', '🗺️', '⛽', '🚚', '📦', '🔑', '🏠',
    '🛠️', '🏗️', '🔧', '🔨', '⚡', '🔋', '🛡️', '🎨', '🔍', '🧪'
];

export const EventModal = ({
    isOpen, onClose, onSave, initialDate, editingEvent, userRole,
    allUsers = [], eventTypes = [], viewedUser, workspaces = [],
    preselectedTargetUser, preselectedWorkspaceId
}) => {
    const [formData, setFormData] = useState({
        title: '', startDate: '', endDate: '',
        startHour: '08:00', endHour: '09:00',
        details: '', type: '', files: [],
        targetUser: [], allDay: false,
        workspaceId: ''
    });

    const [subtasks, setSubtasks] = useState([]);
    const [newSubtask, setNewSubtask] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [targetUserSearch, setTargetUserSearch] = useState('');

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
                targetUser: parseAssignees(editingEvent.cr4a1_user_login).length > 0 ? parseAssignees(editingEvent.cr4a1_user_login) : (viewedUser ? [viewedUser] : []),
                workspaceId: editingEvent.cr4a1_workspace_id || (workspaces[0]?.cr4a1_calendarios_workspacesid || '')
            });
            setIsPrivate(editingEvent.cr4a1_privado || false);
            try {
                setSubtasks(editingEvent.cr4a1_subtasks ? (typeof editingEvent.cr4a1_subtasks === 'string' ? JSON.parse(editingEvent.cr4a1_subtasks) : editingEvent.cr4a1_subtasks) : []);
            } catch { setSubtasks([]); }
        } else {
            const cleanInitialDate = initialDate ? initialDate.split('T')[0] : format(new Date(), 'yyyy-MM-dd');
            setFormData({
                title: '', startDate: cleanInitialDate, endDate: cleanInitialDate,
                startHour: '08:00', endHour: '09:00',
                details: '', type: eventTypes[0]?.name || 'Tarefa', files: [],
                targetUser: preselectedTargetUser ? [preselectedTargetUser] : (viewedUser ? [viewedUser] : []), allDay: false,
                workspaceId: preselectedWorkspaceId || workspaces[0]?.cr4a1_calendarios_workspacesid || ''
            });
            setSubtasks([]);
            setIsPrivate(false);
        }
        setIsSaving(false);
    }, [editingEvent, initialDate, isOpen, viewedUser, eventTypes, workspaces, preselectedTargetUser, preselectedWorkspaceId]);

    const safeFormatDate = (dateStr, pattern = "EEE, d 'de' MMM") => {
        if (!dateStr) return 'Selecionar data';
        const parsedDate = new Date(dateStr + 'T12:00:00');
        if (isNaN(parsedDate.getTime())) return 'Data inválida';
        return format(parsedDate, pattern, { locale: ptBR });
    };

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        selectedFiles.forEach(file => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                setFormData(prev => ({ ...prev, files: [...prev.files, { name: file.name, size: file.size, base64: reader.result }] }));
            };
        });
    };

    const removeFile = (index) => setFormData(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }));

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

    const handleSave = async () => {
        if (!formData.title.trim()) return toast.error('O título do evento é obrigatório.');
        setIsSaving(true);
        try {
            await onSave({ ...formData, cr4a1_titulo: formData.title, cr4a1_descricao: formData.details, cr4a1_subtasks: JSON.stringify(subtasks), cr4a1_privado: isPrivate });
        } catch {
            setIsSaving(false);
        }
    };

    const isSprintWorkspace = workspaces.find(w => w.cr4a1_calendarios_workspacesid === formData.workspaceId)?.cr4a1_nome === "Desenvolvimento e Inovação";
    const canAssign = checkAccess(userRole, ['SECRETARIA', 'ADMIN', 'DIRETORIA']) || hasCoordRole(userRole);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-xl" showClose={false}>
                <div className="mb-5 flex items-center justify-between">
                    <button onClick={onClose} aria-label="Fechar" className="flex size-9 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <X className="size-[18px]" />
                    </button>
                    <h2 className="text-[17px] font-bold text-foreground">{editingEvent ? 'Editar Ficha' : 'Nova Ficha'}</h2>
                    <Button size="sm" disabled={isSaving} onClick={handleSave}>{isSaving ? 'A guardar...' : 'Salvar'}</Button>
                </div>

                <div className="flex flex-col gap-[18px]">
                    <div className="flex items-center gap-3 rounded-[20px] border border-border bg-secondary px-3.5 py-1.5">
                        <input
                            placeholder="Nome do Evento ou Tarefa..."
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="flex-1 border-none bg-transparent py-2 text-[17px] font-semibold text-foreground outline-none placeholder:text-muted-foreground placeholder:font-normal"
                        />
                        <Popover>
                            <PopoverTrigger asChild>
                                <button aria-label="Escolher emoji" className="flex size-[38px] items-center justify-center rounded-[14px] border border-border bg-card text-primary transition-colors hover:bg-muted active:scale-90 duration-200">
                                    <Smile className="size-[18px]" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-60">
                                <div className="flex flex-wrap gap-1.5">
                                    {commonEmojis.map(emoji => (
                                        <PopoverClose key={emoji} asChild>
                                            <button
                                                onClick={() => setFormData(prev => ({ ...prev, title: emoji + ' ' + prev.title }))}
                                                className="flex size-9 items-center justify-center rounded-lg text-lg transition-transform hover:scale-125"
                                            >
                                                {emoji}
                                            </button>
                                        </PopoverClose>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <DateField label="Data Inicial" icon={CalendarDays} value={safeFormatDate(formData.startDate)} selectedDate={formData.startDate} onSelect={d => setFormData(p => ({ ...p, startDate: d }))} />
                        <DateField label="Data Final" icon={CalendarClock} value={safeFormatDate(formData.endDate)} selectedDate={formData.endDate} onSelect={d => setFormData(p => ({ ...p, endDate: d }))} />
                    </div>

                    {!formData.allDay && (
                        <div className="grid grid-cols-2 gap-3">
                            <TimeField label="Hora de Início" icon={Clock} value={formData.startHour} onSelect={h => setFormData(p => ({ ...p, startHour: h }))} />
                            <TimeField label="Hora de Término" icon={History} value={formData.endHour} onSelect={h => setFormData(p => ({ ...p, endHour: h }))} />
                        </div>
                    )}

                    <div className="flex flex-col gap-1 rounded-3xl border border-primary/10 bg-primary/5 px-4.5 py-2.5">
                        <SwitchRow label="Compromisso de Dia Inteiro" checked={formData.allDay} onChange={val => setFormData({ ...formData, allDay: val })} />
                        <SwitchRow label="Restringir Visibilidade" icon={Lock} checked={isPrivate} onChange={setIsPrivate} />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <Label>Workspace Vinculado</Label>
                            <Select value={formData.workspaceId} onValueChange={v => setFormData({ ...formData, workspaceId: v })}>
                                <SelectTrigger><LayoutGrid className="size-4 text-primary" /><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                    {workspaces.map(w => <SelectItem key={w.cr4a1_calendarios_workspacesid} value={w.cr4a1_calendarios_workspacesid}>{w.cr4a1_nome}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Categoria / Tipo</Label>
                            <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
                                <SelectTrigger><Bookmark className="size-4 text-primary" /><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                    {eventTypes.map(t => <SelectItem key={t.name} value={t.name}>{t.emoji} {t.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {canAssign && (
                            <div>
                                <Label>Responsável(is)</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button className="flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2 text-sm text-foreground outline-none transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15">
                                            <Users className="size-4 shrink-0 text-primary" />
                                            <span className="flex-1 truncate text-left">
                                                {formData.targetUser.length === 0
                                                    ? 'Selecione'
                                                    : formData.targetUser.length === 1
                                                        ? (allUsers.find(u => u.cr4a1_username === formData.targetUser[0])?.cr4a1_nome_exibicao || formData.targetUser[0])
                                                        : `${formData.targetUser.length} responsáveis`}
                                            </span>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent align="start" className="w-72 p-0">
                                        <Command shouldFilter={false}>
                                            <CommandInput value={targetUserSearch} onValueChange={setTargetUserSearch} placeholder="Pesquisar..." />
                                            <CommandList>
                                                <CommandEmpty>Nenhum utilizador encontrado neste workspace.</CommandEmpty>
                                                <CommandGroup>
                                                    {workspaceUsers
                                                        .filter(u => (u.cr4a1_nome_exibicao || u.cr4a1_username).toLowerCase().includes(targetUserSearch.toLowerCase()))
                                                        .map(u => {
                                                            const isSelected = formData.targetUser.includes(u.cr4a1_username);
                                                            return (
                                                                <CommandItem
                                                                    key={u.cr4a1_username}
                                                                    onSelect={() => setFormData(p => ({
                                                                        ...p,
                                                                        targetUser: isSelected ? p.targetUser.filter(v => v !== u.cr4a1_username) : [...p.targetUser, u.cr4a1_username]
                                                                    }))}
                                                                >
                                                                    <span className={`flex size-4 items-center justify-center rounded-md border ${isSelected ? 'border-primary bg-primary' : 'border-border'}`}>
                                                                        {isSelected && <Check className="size-3 text-white" strokeWidth={3} />}
                                                                    </span>
                                                                    {u.cr4a1_nome_exibicao || u.cr4a1_username}
                                                                </CommandItem>
                                                            );
                                                        })}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col rounded-[20px] border border-border bg-secondary px-4 py-2.5">
                        <Label>Descrição Detalhada</Label>
                        <Textarea
                            rows={3}
                            placeholder="Adicione as pautas ou informações da entrega..."
                            value={formData.details}
                            onChange={e => setFormData({ ...formData, details: e.target.value })}
                            className="resize-none border-none bg-transparent p-0 text-sm leading-relaxed shadow-none focus-visible:ring-0"
                        />
                    </div>

                    {isSprintWorkspace && (
                        <div className="rounded-3xl border border-border bg-secondary p-4">
                            <Label>Sprint Checklist (Subtasks)</Label>
                            <div className="mb-3 flex gap-2">
                                <Input placeholder="Adicionar sub-item técnico..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} className="flex-1 bg-card" />
                                <Button size="sm" onClick={() => { if (!newSubtask.trim()) return; setSubtasks([...subtasks, { text: newSubtask.trim(), completed: false }]); setNewSubtask(''); }}>
                                    <Plus className="size-4" /> Incluir
                                </Button>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                {subtasks.map((task, index) => (
                                    <div key={index} className="flex items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2.5">
                                        <label className="flex items-center gap-2.5 text-[13px] cursor-pointer">
                                            <Checkbox checked={task.completed} onCheckedChange={checked => { const updated = [...subtasks]; updated[index].completed = !!checked; setSubtasks(updated); }} />
                                            <span className={task.completed ? 'text-muted-foreground line-through' : 'font-medium text-foreground'}>{task.text}</span>
                                        </label>
                                        <button onClick={() => setSubtasks(subtasks.filter((_, i) => i !== index))} aria-label={`Remover subtarefa "${task.text}"`} className="text-destructive">
                                            <Trash2 className="size-[18px]" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="rounded-3xl border border-border bg-secondary p-4">
                        <div className="mb-2.5 flex items-center justify-between">
                            <Label className="mb-0">Documentação Técnica</Label>
                            <Button size="sm" variant="outline" onClick={() => document.getElementById('modal-file-attach').click()}>
                                <Upload className="size-4" /> Carregar
                            </Button>
                            <input id="modal-file-attach" type="file" multiple hidden onChange={handleFileChange} />
                        </div>

                        {formData.files.length === 0 ? (
                            <p className="py-3 text-center text-xs text-muted-foreground opacity-70">Nenhum ficheiro anexado.</p>
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                {formData.files.map((file, i) => (
                                    <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2">
                                        <a href={file.base64} download={file.name} className="flex flex-1 items-center gap-1.5 truncate text-[13px] font-semibold text-primary no-underline">
                                            <FileText className="size-4 shrink-0" />
                                            <span className="truncate">{file.name}</span>
                                            <span className="shrink-0 text-[10px] font-normal text-muted-foreground">({Math.round(file.size / 1024)} KB)</span>
                                        </a>
                                        <button onClick={() => removeFile(i)} aria-label={`Remover anexo "${file.name}"`} className="shrink-0 text-destructive">
                                            <X className="size-[18px]" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const SwitchRow = ({ label, icon: Icon, checked, onChange }) => (
    <div className="flex items-center justify-between py-1.5">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">{Icon && <Icon className="size-3.5 text-muted-foreground" />} {label}</span>
        <Switch checked={checked} onCheckedChange={onChange} />
    </div>
);

const DateField = ({ label, icon: Icon, value, selectedDate, onSelect }) => {
    const [open, setOpen] = useState(false);
    const [pickerMonth, setPickerMonth] = useState(selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date());

    return (
        <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setPickerMonth(selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date()); }}>
            <PopoverTrigger asChild>
                <button className="flex min-h-[62px] w-full flex-col justify-center rounded-[20px] border border-border bg-secondary px-4 py-2.5 text-left transition-colors hover:bg-muted">
                    <span className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">{label}</span>
                    <span className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
                        <Icon className="size-[18px] text-primary" /> {value}
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[270px] p-4">
                <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-bold capitalize text-foreground">{format(pickerMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                    <div className="flex gap-1">
                        <button onClick={() => setPickerMonth(subMonths(pickerMonth, 1))} aria-label="Mês anterior" className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"><ChevronLeft className="size-4" /></button>
                        <button onClick={() => setPickerMonth(addMonths(pickerMonth, 1))} aria-label="Próximo mês" className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"><ChevronRight className="size-4" /></button>
                    </div>
                </div>
                <div className="mb-2 grid grid-cols-7 text-center">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <span key={i} className="text-[11px] font-bold text-muted-foreground">{d}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {eachDayOfInterval({ start: startOfWeek(startOfMonth(pickerMonth)), end: endOfWeek(endOfMonth(pickerMonth)) }).map((day, i) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const isSelected = selectedDate === dateStr;
                        const isCurrentMonth = day.getMonth() === pickerMonth.getMonth();
                        return (
                            <button
                                key={i}
                                onClick={() => { onSelect(dateStr); setOpen(false); }}
                                className={`flex size-[34px] items-center justify-center rounded-full text-xs font-bold transition-transform active:scale-90 ${isSelected ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary'} ${isCurrentMonth ? '' : 'opacity-30'}`}
                            >
                                {format(day, 'd')}
                            </button>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
};

const TimeField = ({ label, icon: Icon, value, onSelect }) => {
    const [open, setOpen] = useState(false);
    const [h, m] = value.split(':');

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button className="flex min-h-[62px] w-full flex-col justify-center rounded-[20px] border border-border bg-secondary px-4 py-2.5 text-left transition-colors hover:bg-muted">
                    <span className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">{label}</span>
                    <span className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
                        <Icon className="size-[18px] text-primary" /> {value}
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-60 text-center">
                <span className="mb-4 block text-xs font-bold uppercase tracking-wide text-primary">Definir Horário</span>
                <div className="mb-5 flex items-center justify-center gap-2">
                    <input type="text" maxLength={2} defaultValue={h} id={`h-picker-${label}`} className="h-16 w-[68px] rounded-2xl border border-border bg-card text-center text-2xl font-bold text-foreground outline-none" />
                    <span className="text-2xl font-light text-muted-foreground">:</span>
                    <input type="text" maxLength={2} defaultValue={m} id={`m-picker-${label}`} className="h-16 w-[68px] rounded-2xl border border-border bg-card text-center text-2xl font-bold text-foreground outline-none" />
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button
                        size="sm"
                        onClick={() => {
                            const hVal = document.getElementById(`h-picker-${label}`).value || '00';
                            const mVal = document.getElementById(`m-picker-${label}`).value || '00';
                            onSelect(`${hVal.padStart(2, '0')}:${mVal.padStart(2, '0')}`);
                            setOpen(false);
                        }}
                    >
                        OK
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};
