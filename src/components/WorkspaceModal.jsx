import React, { useState, useEffect, useMemo } from 'react';
import { Rocket, Globe, MapPin, Search } from 'lucide-react';
import { checkAccess, parseRoles } from '../utils/permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';

const COLORS = [
    '#1a73e8', '#d93025', '#f9ab00', '#188038', '#af5cf7',
    '#00acc1', '#ff6d00', '#e91e63', '#607d8b', '#3f51b5',
    '#009688', '#8bc34a', '#ff9800', '#795548', '#9c27b0',
    '#2196f3', '#4caf50', '#ff5722', '#673ab7', '#00bcd4',
    '#cddc39', '#ffeb3b', '#9e9e9e', '#b71c1c', '#0d47a1'
];
const UNIDADES = ['São Luís', 'Barcarena', 'Parauapebas', 'São José dos Campos', 'Aveiro'];

export const WorkspaceModal = ({ isOpen, onClose, onSave, allUsers = [], userRole, editingWorkspace = null }) => {
    const [formData, setFormData] = useState({ nome: '', tipo: 'COMPARTILHADO', cor: '#1a73e8', membros: '' });
    const [memberMode, setMemberMode] = useState('text');
    const [userFilter, setUserFilter] = useState('');

    useEffect(() => {
        if (editingWorkspace) {
            setFormData({
                nome: editingWorkspace.cr4a1_nome || '',
                tipo: editingWorkspace.cr4a1_tipo_workspace || 'COMPARTILHADO',
                cor: editingWorkspace.cr4a1_cor_hex || '#1a73e8',
                membros: editingWorkspace.cr4a1_membros_logins || ''
            });
        } else {
            setFormData({ nome: '', tipo: 'COMPARTILHADO', cor: '#1a73e8', membros: '' });
        }
        setMemberMode('text');
        setUserFilter('');
    }, [editingWorkspace, isOpen]);

    const selectedMembers = useMemo(() => {
        if (!formData.membros) return [];
        return formData.membros.split(',').map(s => s.trim()).filter(Boolean);
    }, [formData.membros]);

    const toggleMember = (login) => {
        const current = [...selectedMembers];
        const index = current.indexOf(login);
        if (index > -1) current.splice(index, 1);
        else current.push(login);
        setFormData({ ...formData, membros: current.join(',') });
    };

    const handleAddAll = () => {
        if (!checkAccess(userRole, ['ADMIN', 'RH'])) return;
        const allLogins = allUsers.map(u => u.cr4a1_username);
        setFormData({ ...formData, membros: [...new Set([...selectedMembers, ...allLogins])].join(',') });
    };

    const handleAddUnit = (unit) => {
        const unitLogins = allUsers.filter(u => u.cr4a1_unidade === unit).map(u => u.cr4a1_username);
        setFormData({ ...formData, membros: [...new Set([...selectedMembers, ...unitLogins])].join(',') });
    };

    const filteredUsers = useMemo(() => {
        if (!userFilter) return allUsers;
        const lower = userFilter.toLowerCase();
        return allUsers.filter(u =>
            u.cr4a1_username.toLowerCase().includes(lower) ||
            (u.cr4a1_nome_exibicao || '').toLowerCase().includes(lower) ||
            (u.cr4a1_unidade || '').toLowerCase().includes(lower)
        );
    }, [allUsers, userFilter]);

    const handleSubmit = async () => {
        if (!formData.nome) return;
        const payloadDataverse = {
            cr4a1_nome: formData.nome,
            cr4a1_tipo_workspace: formData.tipo,
            cr4a1_cor_hex: formData.cor,
            cr4a1_membros_logins: formData.membros
        };
        if (editingWorkspace?.cr4a1_calendarios_workspacesid) {
            payloadDataverse.cr4a1_calendarios_workspacesid = editingWorkspace.cr4a1_calendarios_workspacesid;
        }
        try {
            await onSave(payloadDataverse);
            onClose();
        } catch (error) {
            console.error("Falha ao salvar workspace:", error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle><Rocket className="size-5 text-primary" /> {editingWorkspace ? 'Editar Workspace' : 'Novo Workspace'}</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-5">
                    <div>
                        <Label>Nome do ambiente</Label>
                        <Input placeholder="Ex: Projetos TI, Consultas..." value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} />
                    </div>

                    <div>
                        <Label>Tipo</Label>
                        <Select value={formData.tipo} onValueChange={v => setFormData({ ...formData, tipo: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="COMPARTILHADO">Compartilhado (Equipe)</SelectItem>
                                {parseRoles(userRole).includes('RH') && <SelectItem value="RH">Institucional (RH)</SelectItem>}
                                <SelectItem value="PESSOAL">Pessoal (Privado)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {formData.tipo !== 'PESSOAL' && (
                        <div className="flex flex-col gap-3">
                            <div>
                                <Label>Adicionar por grupo</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {checkAccess(userRole, ['ADMIN', 'RH']) && (
                                        <Button type="button" size="sm" onClick={handleAddAll} className="justify-start">
                                            <Globe className="size-3.5" /> Toda a Kairós
                                        </Button>
                                    )}
                                    {UNIDADES.map(u => (
                                        <Button type="button" key={u} size="sm" variant="outline" onClick={() => handleAddUnit(u)} className="justify-start">
                                            <MapPin className="size-3.5" /> {u}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <Tabs value={memberMode} onValueChange={setMemberMode}>
                                <div className="flex items-center justify-between">
                                    <Label className="mb-0">Membros ({selectedMembers.length})</Label>
                                    <TabsList className="border-b-0 bg-secondary rounded-full p-1">
                                        <TabsTrigger value="text" className="px-3 py-1.5 text-xs">Digitar</TabsTrigger>
                                        <TabsTrigger value="visual" className="px-3 py-1.5 text-xs">Selecionar</TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="text" className="mt-2">
                                    <Textarea
                                        placeholder="usuario1, usuario2..."
                                        value={formData.membros}
                                        onChange={e => setFormData({ ...formData, membros: e.target.value })}
                                        className="h-16"
                                    />
                                </TabsContent>
                                <TabsContent value="visual" className="mt-2">
                                    <div className="relative mb-2">
                                        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input placeholder="Procurar usuário..." value={userFilter} onChange={e => setUserFilter(e.target.value)} className="pl-10" />
                                    </div>
                                    <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                                        {filteredUsers.map(u => {
                                            const isChecked = selectedMembers.includes(u.cr4a1_username);
                                            return (
                                                <label
                                                    key={u.cr4a1_username}
                                                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl p-2.5 text-[13px] font-medium text-foreground transition-colors ${isChecked ? 'bg-muted' : 'hover:bg-secondary'}`}
                                                >
                                                    <Checkbox checked={isChecked} onCheckedChange={() => toggleMember(u.cr4a1_username)} />
                                                    <span className="flex-1">{u.cr4a1_nome_exibicao || u.cr4a1_username}</span>
                                                    <span className="text-[11px] text-muted-foreground">{u.cr4a1_unidade}</span>
                                                </label>
                                            );
                                        })}
                                        {filteredUsers.length === 0 && <p className="p-3 text-center text-xs text-muted-foreground">Nenhum usuário encontrado.</p>}
                                    </div>
                                </TabsContent>
                            </Tabs>
                            <p className="text-[11px] text-muted-foreground">{selectedMembers.length} usuários selecionados.</p>
                        </div>
                    )}

                    <div>
                        <Label>Cor de identificação</Label>
                        <div className="flex flex-wrap gap-2">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, cor: c })}
                                    aria-label={`Cor ${c}`}
                                    className="size-8 rounded-full transition-transform active:scale-90"
                                    style={{ background: c, outline: formData.cor === c ? '3px solid var(--foreground)' : 'none', outlineOffset: '2px' }}
                                />
                            ))}
                        </div>
                    </div>

                    <Button className="w-full" size="lg" onClick={handleSubmit}>
                        {editingWorkspace ? 'Guardar Alterações' : 'Criar Workspace'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
