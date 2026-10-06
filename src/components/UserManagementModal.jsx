import { SearchField } from './ui/search-field';
import { matchesSearch } from '../utils/search';
import React, { useState } from 'react';
import { Settings, X, Search, UserPlus, Shield, UserMinus, Pencil, Trash2, Check, Smile, BarChart3, RotateCcw, Lock, Plus } from 'lucide-react';
import { parseRoles } from '../utils/permissions';
import { PROTECTED_ROLES } from '../config/roleWorkspaceMap';
import { BI_CONFIG } from '../config/biConfig';
import { buildBiRolesOverrideMap, getEffectiveAllowedRoles, hasBiOverride, isBiVisibleForRoles } from '../utils/biPermissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from './ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from './ui/command';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';

const layerOptions = [
    { id: 'icone', label: 'Ícone', description: 'Mostra o emoji do tipo no card do evento' },
    { id: 'borda', label: 'Borda', description: 'Faixa colorida na lateral do card' },
    { id: 'padrao', label: 'Padrão', description: 'Textura sutil sobre a cor do responsável' },
    { id: 'nenhuma', label: 'Nenhuma', description: 'Sem destaque extra além da cor do responsável' }
];

// Mesma checagem que o DashboardPanel usa para decidir se um painel aparece
// (respeitando overrides de cr4a1_bi_permissaos) — reaproveitada aqui para o editor
// de roles mostrar, em tempo real, quais painéis aquela combinação libera. Não
// considera a adesão ao workspace (isso é sincronizado automaticamente ao salvar,
// ver reconcileWorkspacesForRoleChange em useCalendar.js), só a permissão da role.
const getBisForRoles = (roles, overridesMap) => BI_CONFIG.filter(bi => isBiVisibleForRoles(bi, roles, overridesMap));

const groupBisByWorkspace = (bis) => bis.reduce((acc, bi) => {
    (acc[bi.workspaceName] = acc[bi.workspaceName] || []).push(bi);
    return acc;
}, {});

const commonEmojis = [
    '🤝', '📞', '👥', '💬', '📢', '💻', '🖥️', '📅', '📊', '📝', '💡', '🏢',
    '🚗', '🏍️', '✈️', '🏨', '📍', '🗺️', '⛽', '🚚', '📦', '🔑', '🏠',
    '🛠️', '🏗️', '🔧', '🔨', '⚡', '🔋', '🛡️', '🎨', '🔍', '🧪',
    '⚠️', '✅', '❌', '🚩', '🕒', '⏳', '🔥', '💎', '🎯', '🚀',
    '✉️', '📄', '⚖️', '💰', '💵', '💳', '📈', '📌', '🔔', '📱',
    '☕', '🍱', '🍕', '🥤', '🏋️', '🥋', '🧘', '🚶', '🎉', '🏆'
];

export const UserManagementModal = ({ isOpen, onClose, allUsers, updateUserColor, eventTypes = [], addEventType, updateEventType, deleteEventType, isAdmin = false, updateUserRoles, addUser, deleteUser, currentUsername, biPermissoes = [], upsertBiPermission, resetBiPermission, availableRoles = [], appRoles = [], addAppRole, renameAppRole, deleteAppRole }) => {
    const [userSearch, setUserSearch] = useState('');
    // BI_CONFIG e biPermissoes têm só algumas dezenas de itens — reconstruir o mapa
    // de overrides a cada render sai barato, sem necessidade de useMemo.
    const biRolesOverrideMap = buildBiRolesOverrideMap(biPermissoes);
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
            <DialogContent className="max-w-2xl" showClose={false}>
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
                        {isAdmin && <TabsTrigger value="roles">Roles</TabsTrigger>}
                        {isAdmin && <TabsTrigger value="bi">Painéis BI</TabsTrigger>}
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

                        <SearchField value={userSearch} onChange={setUserSearch} placeholder="Buscar utilizador..." />

                        <div className="flex flex-col gap-2">
                            {allUsers.filter(u => matchesSearch(u.cr4a1_username, userSearch) || matchesSearch(u.cr4a1_nome_exibicao || '', userSearch)).map(u => (
                                <UserRow
                                    key={u.cr4a1_username}
                                    user={u}
                                    isAdmin={isAdmin}
                                    isSelf={u.cr4a1_username === currentUsername}
                                    updateUserColor={updateUserColor}
                                    updateUserRoles={updateUserRoles}
                                    onDelete={() => handleDeleteUser(u)}
                                    biRolesOverrideMap={biRolesOverrideMap}
                                    availableRoles={availableRoles}
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

                    {isAdmin && (
                        <TabsContent value="roles">
                            <RolesPanel
                                availableRoles={availableRoles}
                                appRoles={appRoles}
                                allUsers={allUsers}
                                biRolesOverrideMap={biRolesOverrideMap}
                                addAppRole={addAppRole}
                                renameAppRole={renameAppRole}
                                deleteAppRole={deleteAppRole}
                            />
                        </TabsContent>
                    )}

                    {isAdmin && (
                        <TabsContent value="bi">
                            <BiPermissionsPanel
                                availableRoles={availableRoles}
                                biRolesOverrideMap={biRolesOverrideMap}
                                upsertBiPermission={upsertBiPermission}
                                resetBiPermission={resetBiPermission}
                            />
                        </TabsContent>
                    )}
                </Tabs>

                <Button onClick={onClose} className="mt-6 w-full" size="lg">Concluído</Button>
            </DialogContent>
        </Dialog>
    );
};

const UserRow = ({ user, isAdmin, isSelf, updateUserColor, updateUserRoles, onDelete, biRolesOverrideMap, availableRoles }) => {
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
    // BI_CONFIG tem só algumas dezenas de itens — filtrar a cada render sai barato,
    // sem necessidade de useMemo.
    const currentBis = getBisForRoles(currentRoles, biRolesOverrideMap);
    const draftBisByWorkspace = groupBisByWorkspace(getBisForRoles(draftRoles, biRolesOverrideMap));
    const draftBisCount = Object.values(draftBisByWorkspace).reduce((n, list) => n + list.length, 0);

    return (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-secondary/60 p-4">
            <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: user.cr4a1_cor || '#3498db' }} />
                    <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium text-foreground">{user.cr4a1_nome_exibicao || user.cr4a1_username}</span>
                        {user.cr4a1_nome_exibicao && <span className="truncate text-[11px] text-muted-foreground">@{user.cr4a1_username}</span>}
                    </span>
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
                                            {availableRoles.filter(r => matchesSearch(r, roleSearch)).map(role => (
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
                                <div className="flex flex-col gap-1 border-t border-border p-2.5">
                                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                        <BarChart3 className="size-3" /> Painéis BI liberados ({draftBisCount})
                                    </span>
                                    {draftBisCount === 0 ? (
                                        <p className="text-[11px] italic text-muted-foreground">Nenhum painel com estas roles.</p>
                                    ) : (
                                        <div className="flex max-h-24 flex-col gap-1 overflow-y-auto">
                                            {Object.entries(draftBisByWorkspace).map(([wsName, bis]) => (
                                                <div key={wsName} className="text-[11px] leading-snug">
                                                    <span className="font-semibold text-foreground">{wsName}:</span>{' '}
                                                    <span className="text-muted-foreground">{bis.map(bi => bi.title).join(', ')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
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
                <div className="flex flex-wrap items-center gap-1">
                    {currentRoles.length === 0
                        ? <span className="text-[11px] italic text-muted-foreground">Sem role</span>
                        : currentRoles.map(r => <Badge key={r} variant="secondary">{r}</Badge>)
                    }
                    {currentBis.length > 0 && (
                        <span className="ml-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground" title={currentBis.map(bi => bi.title).join(', ')}>
                            <BarChart3 className="size-3" /> {currentBis.length} {currentBis.length > 1 ? 'painéis' : 'painel'} BI
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

// Aba "Painéis BI" (só ADMIN): lista todos os painéis do biConfig.js, com busca e
// filtro por workspace/role — filtrar por role responde direto "que BIs essa role
// pode ver?" — e um editor por painel para liberar/proibir roles específicas.
const BiPermissionsPanel = ({ availableRoles, biRolesOverrideMap, upsertBiPermission, resetBiPermission }) => {
    const [search, setSearch] = useState('');
    const [workspaceFilter, setWorkspaceFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');

    const workspaceNames = [...new Set(BI_CONFIG.map(bi => bi.workspaceName))].sort();

    const filteredBis = BI_CONFIG.filter(bi => {
        const matchesQuery = matchesSearch(bi.title, search);
        const matchesWorkspace = workspaceFilter === 'all' || bi.workspaceName === workspaceFilter;
        const matchesRole = roleFilter === 'all' || isBiVisibleForRoles(bi, [roleFilter], biRolesOverrideMap);
        return matchesQuery && matchesWorkspace && matchesRole;
    });

    return (
        <div className="flex flex-col gap-3">
            <p className="text-[12px] text-muted-foreground">
                Escolha quais roles podem ver cada painel. Alterações aqui valem para todo mundo, na hora — sem precisar de deploy.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                    <SearchField value={search} onChange={setSearch} placeholder="Buscar painel..." />
                </div>
                <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
                    <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os workspaces</SelectItem>
                        {workspaceNames.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as roles</SelectItem>
                        {availableRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex max-h-[380px] flex-col gap-2 overflow-y-auto pr-1">
                {filteredBis.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Nenhum painel encontrado.</p>
                ) : (
                    filteredBis.map(bi => (
                        <BiPermissionRow
                            key={bi.id}
                            bi={bi}
                            overridesMap={biRolesOverrideMap}
                            availableRoles={availableRoles}
                            upsertBiPermission={upsertBiPermission}
                            resetBiPermission={resetBiPermission}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

const BiPermissionRow = ({ bi, overridesMap, availableRoles, upsertBiPermission, resetBiPermission }) => {
    const [open, setOpen] = useState(false);
    const [draftRoles, setDraftRoles] = useState([]);
    const [roleSearch, setRoleSearch] = useState('');

    const effectiveRoles = getEffectiveAllowedRoles(bi, overridesMap);
    const overridden = hasBiOverride(bi, overridesMap);
    const isAllRoles = effectiveRoles.includes('ALL');

    const openEditor = (isOpening) => {
        setOpen(isOpening);
        if (isOpening) { setDraftRoles(isAllRoles ? [] : effectiveRoles); setRoleSearch(''); }
    };

    const toggleDraftRole = (role) => setDraftRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);

    const save = () => { upsertBiPermission(bi.id, bi.title, draftRoles); setOpen(false); };
    const reset = () => { resetBiPermission(bi.id); setOpen(false); };

    return (
        <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-secondary/60 p-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="material-symbols-rounded shrink-0 text-primary" style={{ fontSize: '17px' }}>{bi.icon}</span>
                    <span className="truncate text-[13px] font-semibold text-foreground">{bi.title}</span>
                </div>
                <Popover open={open} onOpenChange={openEditor}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Editar roles do painel "${bi.title}"`}>
                            <Shield className="size-4 text-primary" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72 p-0">
                        {isAllRoles && (
                            <p className="border-b border-border p-2.5 text-[11px] leading-snug text-muted-foreground">
                                Hoje liberado para <strong className="text-foreground">todas as roles</strong>. Marcar roles abaixo troca isso por uma lista específica.
                            </p>
                        )}
                        <Command shouldFilter={false}>
                            <CommandInput value={roleSearch} onValueChange={setRoleSearch} placeholder="Buscar role..." />
                            <CommandList>
                                <CommandEmpty>Nenhuma role encontrada.</CommandEmpty>
                                <CommandGroup>
                                    {availableRoles.filter(r => matchesSearch(r, roleSearch)).map(role => (
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
                        <div className="flex items-center justify-between gap-2 border-t border-border p-2">
                            {overridden ? (
                                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={reset}>
                                    <RotateCcw className="size-3.5" /> Padrão
                                </Button>
                            ) : <span />}
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
                                <Button size="sm" onClick={save}>Salvar</Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
            <div className="flex flex-wrap items-center gap-1">
                <Badge variant="outline">{bi.workspaceName}</Badge>
                {overridden && <Badge variant="warning">Personalizado</Badge>}
                {isAllRoles ? (
                    <Badge variant="info">Todas as roles</Badge>
                ) : effectiveRoles.length === 0 ? (
                    <span className="text-[11px] italic text-muted-foreground">Nenhuma role (só ADMIN)</span>
                ) : (
                    effectiveRoles.map(r => <Badge key={r} variant="secondary">{r}</Badge>)
                )}
            </div>
        </div>
    );
};

// Aba "Roles" (só ADMIN): cria, renomeia e exclui roles. As mesmas roles alimentam o
// seletor de roles dos usuários e o dos painéis de BI. Roles do sistema (as que o código
// confere pelo nome) aparecem travadas — renomear/apagar uma delas quebraria permissões.
// Renomear/excluir uma customizada propaga para os usuários e overrides de BI que a usam.
const RolesPanel = ({ availableRoles, appRoles, allUsers, biRolesOverrideMap, addAppRole, renameAppRole, deleteAppRole }) => {
    const [search, setSearch] = useState('');
    const [newRole, setNewRole] = useState('');
    const [editingRole, setEditingRole] = useState(null);
    const [draftName, setDraftName] = useState('');

    const rows = availableRoles
        .filter(name => matchesSearch(name, search))
        .map(name => ({
            name,
            record: appRoles.find(r => r.cr4a1_nome === name),
            isProtected: PROTECTED_ROLES.includes(name),
            users: allUsers.filter(u => parseRoles(u.cr4a1_role).includes(name)),
            bis: BI_CONFIG.filter(bi => getEffectiveAllowedRoles(bi, biRolesOverrideMap).includes(name))
        }));

    const handleCreate = async () => {
        const result = await addAppRole(newRole);
        if (result?.success) setNewRole('');
    };

    const startEdit = (row) => { setEditingRole(row.name); setDraftName(row.name); };

    const saveEdit = async (row) => {
        const result = await renameAppRole(row.record.cr4a1_app_roleid, row.name, draftName);
        if (result?.success) setEditingRole(null);
    };

    const handleDelete = (row) => {
        const message = `Excluir a role "${row.name}"?\n\nEla será removida de ${row.users.length} usuário(s) e de ${row.bis.length} painel(éis) de BI.`;
        if (window.confirm(message)) deleteAppRole(row.record.cr4a1_app_roleid, row.name);
    };

    return (
        <div className="flex flex-col gap-3">
            <p className="text-[12px] text-muted-foreground">
                Crie as roles que quiser — elas passam a aparecer na escolha de roles dos usuários e na liberação dos painéis de BI. Roles do sistema (com cadeado) são conferidas pelo código e não podem ser renomeadas nem excluídas.
            </p>

            <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-secondary/60 p-4">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    <Plus className="size-3.5" /> Nova role
                </span>
                <div className="flex gap-2">
                    <Input
                        value={newRole}
                        onChange={e => setNewRole(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        placeholder="Ex: TECNICO SSMA"
                        className="flex-1 bg-card"
                    />
                    <Button onClick={handleCreate} size="sm">Criar</Button>
                </div>
            </div>

            <div className="relative">
                <SearchField value={search} onChange={setSearch} placeholder="Buscar role..." />
            </div>

            <div className="flex max-h-[380px] flex-col gap-2 overflow-y-auto pr-1">
                {rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma role encontrada.</p>}
                {rows.map(row => {
                    const editing = editingRole === row.name;
                    return (
                        <div key={row.name} className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-secondary/60 px-4 py-2.5">
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                {editing ? (
                                    <Input
                                        value={draftName}
                                        onChange={e => setDraftName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(row); if (e.key === 'Escape') setEditingRole(null); }}
                                        autoFocus
                                        className="h-9 bg-card"
                                    />
                                ) : (
                                    <span className="truncate text-sm font-semibold text-foreground">{row.name}</span>
                                )}
                                <span className="text-[11px] text-muted-foreground" title={row.bis.map(bi => bi.title).join(', ')}>
                                    {row.users.length} {row.users.length === 1 ? 'usuário' : 'usuários'} · {row.bis.length} {row.bis.length === 1 ? 'painel' : 'painéis'} BI
                                </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                {row.isProtected ? (
                                    <Badge variant="outline"><Lock className="size-3" /> Sistema</Badge>
                                ) : editing ? (
                                    <>
                                        <Button variant="ghost" size="sm" onClick={() => setEditingRole(null)}>Cancelar</Button>
                                        <Button size="sm" onClick={() => saveEdit(row)}>Salvar</Button>
                                    </>
                                ) : (
                                    <>
                                        <Button variant="ghost" size="icon" className="size-8" aria-label={`Editar role "${row.name}"`} onClick={() => startEdit(row)}>
                                            <Pencil className="size-4 text-primary" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="size-8" aria-label={`Excluir role "${row.name}"`} onClick={() => handleDelete(row)}>
                                            <Trash2 className="size-4 text-destructive" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
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
