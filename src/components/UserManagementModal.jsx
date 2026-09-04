import React, { useState } from 'react';
import { Settings, X, Search, UserPlus, Shield, UserMinus, Pencil, Trash2, Check, Smile } from 'lucide-react';
import { parseRoles } from '../utils/permissions';
import { ALL_KNOWN_ROLES } from '../config/roleWorkspaceMap';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from './ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from './ui/command';

const layerOptions = [
    { id: 'icone', label: 'Ícone', description: 'Mostra o emoji do tipo no card do evento' },
    { id: 'borda', label: 'Borda', description: 'Faixa colorida na lateral do card' },
    { id: 'padrao', label: 'Padrão', description: 'Textura sutil sobre a cor do responsável' },
    { id: 'nenhuma', label: 'Nenhuma', description: 'Sem destaque extra além da cor do responsável' }
];

const commonEmojis = [
    '🤝', '📞', '👥', '💬', '📢', '💻', '🖥️', '📅', '📊', '📝', '💡', '🏢',
    '🚗', '🏍️', '✈️', '🏨', '📍', '🗺️', '⛽', '🚚', '📦', '🔑', '🏠',
    '🛠️', '🏗️', '🔧', '🔨', '⚡', '🔋', '🛡️', '🎨', '🔍', '🧪',
    '⚠️', '✅', '❌', '🚩', '🕒', '⏳', '🔥', '💎', '🎯', '🚀',
    '✉️', '📄', '⚖️', '💰', '💵', '💳', '📈', '📌', '🔔', '📱',
    '☕', '🍱', '🍕', '🥤', '🏋️', '🥋', '🧘', '🚶', '🎉', '🏆'
];

export const UserManagementModal = ({ isOpen, onClose, allUsers, updateUserColor, eventTypes = [], addEventType, updateEventType, deleteEventType, isAdmin = false, updateUserRoles, addUser, deleteUser, currentUsername }) => {
    const [userSearch, setUserSearch] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [editingTypeId, setEditingTypeId] = useState(null);
    const [newTypeName, setNewTypeName] = useState('');
    const [newTypeEmoji, setNewTypeEmoji] = useState('📝');
    const [newTypeLayer, setNewTypeLayer] = useState('nenhuma');

    const handleAddUser = async () => {
        const result = await addUser(newUsername, newPassword);
        if (result?.success) { setNewUsername(''); setNewPassword(''); }
    };

    const handleDeleteUser = (u) => {
        if (u.cr4a1_username === currentUsername) return;
        if (window.confirm(`Remover o usuário "${u.cr4a1_username}"? Ele perde o acesso ao sistema imediatamente.`)) {
            deleteUser(u.cr4a1_username);
        }
    };

    const startEditingType = (t) => {
        setEditingTypeId(t.id);
        setNewTypeName(t.name);
        setNewTypeEmoji(t.emoji);
        setNewTypeLayer(t.layer || 'nenhuma');
    };

    const cancelEditingType = () => {
        setEditingTypeId(null);
        setNewTypeName('');
        setNewTypeEmoji('📝');
        setNewTypeLayer('nenhuma');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg" showClose={false}>
                <DialogHeader className="pr-0">
                    <DialogTitle>
                        <Settings className="size-5 text-primary" /> Configurações
                    </DialogTitle>
                    <button
                        onClick={onClose}
                        aria-label="Fechar"
                        className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <X className="size-4" />
                    </button>
                </DialogHeader>

                <Tabs defaultValue="users">
                    <TabsList>
                        <TabsTrigger value="users">Membros</TabsTrigger>
                        <TabsTrigger value="types">Tipos de Evento</TabsTrigger>
                    </TabsList>

                    <TabsContent value="users" className="flex flex-col gap-3">
                        {isAdmin && (
                            <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-secondary/60 p-4">
                                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                                    <UserPlus className="size-3.5" /> Novo utilizador
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="Nome de utilizador" className="min-w-[140px] flex-1 bg-card" />
                                    <Input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Senha" className="min-w-[140px] flex-1 bg-card" />
                                    <Button onClick={handleAddUser} size="sm">Criar</Button>
                                </div>
                            </div>
                        )}

                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Buscar utilizador..." className="pl-10" />
                        </div>

                        <div className="flex flex-col gap-2">
                            {allUsers.filter(u => u.cr4a1_username.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                                <UserRow
                                    key={u.cr4a1_username}
                                    user={u}
                                    isAdmin={isAdmin}
                                    isSelf={u.cr4a1_username === currentUsername}
                                    updateUserColor={updateUserColor}
                                    updateUserRoles={updateUserRoles}
                                    onDelete={() => handleDeleteUser(u)}
                                />
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="types" className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3">
                            <span className={`text-[11px] font-bold uppercase tracking-wide ${editingTypeId ? 'text-primary' : 'text-muted-foreground'}`}>
                                {editingTypeId ? '✏️ Editando tipo' : 'Novo tipo'}
                            </span>
                            <div className="flex gap-2">
                                <EmojiPicker value={newTypeEmoji} onChange={setNewTypeEmoji} />
                                <Input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="Nome do novo tipo..." className="flex-1" />
                                <Button
                                    onClick={() => {
                                        if (!newTypeName) return;
                                        if (editingTypeId) updateEventType(editingTypeId, newTypeName, newTypeEmoji, newTypeLayer);
                                        else addEventType(newTypeName, newTypeEmoji, newTypeLayer);
                                        cancelEditingType();
                                    }}
                                >
                                    {editingTypeId ? 'Salvar' : 'Add'}
                                </Button>
                                {editingTypeId && <Button variant="outline" onClick={cancelEditingType}>Cancelar</Button>}
                            </div>

                            <div>
                                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Camada visual no calendário</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {layerOptions.map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setNewTypeLayer(opt.id)}
                                            title={opt.description}
                                            className={`rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors active:scale-90 duration-200 ${newTypeLayer === opt.id ? 'border-2 border-primary bg-primary/10 text-primary' : 'border border-border bg-secondary text-foreground hover:bg-muted'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            {eventTypes.map(t => (
                                <div
                                    key={t.id}
                                    className={`flex items-center justify-between rounded-2xl px-4 py-2.5 transition-colors ${editingTypeId === t.id ? 'border-2 border-primary bg-primary/10' : 'border border-border bg-secondary'}`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-base">{t.emoji}</span>
                                        <span className="text-sm font-medium text-foreground">{t.name}</span>
                                        <Badge variant="outline">{layerOptions.find(o => o.id === (t.layer || 'nenhuma'))?.label || 'Nenhuma'}</Badge>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="size-8" aria-label={`Editar tipo de evento "${t.name}"`} onClick={() => startEditingType(t)}>
                                            <Pencil className="size-4 text-primary" />
                                        </Button>
                                        <Button
                                            variant="ghost" size="icon" className="size-8" aria-label={`Remover tipo de evento "${t.name}"`}
                                            onClick={() => { if (editingTypeId === t.id) cancelEditingType(); deleteEventType(t.id); }}
                                        >
                                            <Trash2 className="size-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>

                <Button onClick={onClose} className="mt-6 w-full" size="lg">Concluído</Button>
            </DialogContent>
        </Dialog>
    );
};

const UserRow = ({ user, isAdmin, isSelf, updateUserColor, updateUserRoles, onDelete }) => {
    const [rolesOpen, setRolesOpen] = useState(false);
    const [draftRoles, setDraftRoles] = useState([]);
    const [roleSearch, setRoleSearch] = useState('');

    const openRoles = (open) => {
        setRolesOpen(open);
        if (open) { setDraftRoles(parseRoles(user.cr4a1_role)); setRoleSearch(''); }
    };

    const toggleDraftRole = (role) => setDraftRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);

    const saveRoles = () => { updateUserRoles(user.cr4a1_username, draftRoles); setRolesOpen(false); };

    const currentRoles = parseRoles(user.cr4a1_role);

    return (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-secondary/60 p-4">
            <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: user.cr4a1_cor || '#3498db' }} />
                    <span className="truncate text-sm font-medium text-foreground">{user.cr4a1_username}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {isAdmin && (
                        <Popover open={rolesOpen} onOpenChange={openRoles}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8" aria-label={`Editar roles de "${user.cr4a1_username}"`}>
                                    <Shield className="size-4 text-primary" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-72 p-0">
                                <Command shouldFilter={false}>
                                    <CommandInput value={roleSearch} onValueChange={setRoleSearch} placeholder="Buscar role..." />
                                    <CommandList>
                                        <CommandEmpty>Nenhuma role encontrada.</CommandEmpty>
                                        <CommandGroup>
                                            {ALL_KNOWN_ROLES.filter(r => r.toLowerCase().includes(roleSearch.toLowerCase())).map(role => (
                                                <CommandItem key={role} onSelect={() => toggleDraftRole(role)}>
                                                    <span className={`flex size-4 items-center justify-center rounded-md border ${draftRoles.includes(role) ? 'border-primary bg-primary' : 'border-border'}`}>
                                                        {draftRoles.includes(role) && <Check className="size-3 text-white" strokeWidth={3} />}
                                                    </span>
                                                    {role}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                                <div className="flex justify-end gap-2 border-t border-border p-2">
                                    <Button variant="ghost" size="sm" onClick={() => setRolesOpen(false)}>Cancelar</Button>
                                    <Button size="sm" onClick={saveRoles}>Salvar</Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                    {isAdmin && (
                        <Button
                            variant="ghost" size="icon" className="size-8" disabled={isSelf} onClick={onDelete}
                            aria-label={`Remover utilizador "${user.cr4a1_username}"`}
                            title={isSelf ? 'Você não pode remover a si mesmo' : undefined}
                        >
                            <UserMinus className={`size-4 ${isSelf ? 'text-muted-foreground' : 'text-destructive'}`} />
                        </Button>
                    )}
                    <input
                        type="color"
                        value={user.cr4a1_cor || '#3498db'}
                        onChange={(e) => updateUserColor(user.cr4a1_usuarios_agendaid, e.target.value)}
                        className="size-7 cursor-pointer rounded-full border-none bg-transparent p-0"
                        aria-label={`Cor de ${user.cr4a1_username}`}
                    />
                </div>
            </div>

            {isAdmin && (
                <div className="flex flex-wrap gap-1">
                    {currentRoles.length === 0
                        ? <span className="text-[11px] italic text-muted-foreground">Sem role</span>
                        : currentRoles.map(r => <Badge key={r} variant="secondary">{r}</Badge>)
                    }
                </div>
            )}
        </div>
    );
};

const EmojiPicker = ({ value, onChange }) => (
    <Popover>
        <PopoverTrigger asChild>
            <button
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-xl transition-colors hover:bg-muted active:scale-90 duration-200"
                aria-label="Escolher emoji"
            >
                {value || <Smile className="size-5 text-muted-foreground" />}
            </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64">
            <div className="grid max-h-52 grid-cols-6 gap-1 overflow-y-auto">
                {commonEmojis.map(emoji => (
                    <PopoverClose key={emoji} asChild>
                        <button
                            onClick={() => onChange(emoji)}
                            className="flex size-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-secondary active:scale-90 duration-150"
                        >
                            {emoji}
                        </button>
                    </PopoverClose>
                ))}
            </div>
        </PopoverContent>
    </Popover>
);
