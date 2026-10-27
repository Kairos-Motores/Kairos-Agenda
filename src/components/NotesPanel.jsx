import { SearchField } from './ui/search-field';
import { matchesSearch } from '../utils/search';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft, Loader2, Pencil, Plus, Lock, Globe, Link2,
  VolumeX, SearchX, X, FileText, Check, CloudOff, Paperclip,
  CalendarPlus, Trash2, Users, Share2, Eye, Save
} from 'lucide-react';
import { useConfirm } from '../hooks/useConfirm';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { AttachmentsField } from './ui/attachments-field';
import { RichTextEditor } from './ui/rich-text-editor';
import { parseAnexos } from '../utils/anexos';
import { htmlParaTexto } from '../utils/descricaoTarefas';
import { canUserViewNota, getNotaPermissions } from '../utils/notasCompartilhamento';

// ============================================================================
// ESTILOS LOCAIS: animações e micro-interações MD3 do Bloco de Notas
// ============================================================================
const NOTES_PANEL_STYLES = `
  @keyframes kairos-card-in { from { opacity: 0; transform: translateY(14px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes kairos-block-in { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes kairos-block-out { from { opacity: 1; transform: scale(1) translateX(0); max-height: 120px; } to { opacity: 0; transform: scale(0.92) translateX(10px); max-height: 0; } }
  @keyframes kairos-shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-4px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(3px); } }
  @keyframes kairos-empty-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

  .kairos-note-card { transition: transform 0.25s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.25s cubic-bezier(0.2,0.8,0.2,1), border-color 0.25s; }
  .kairos-note-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0,0,0,0.12); border-color: var(--border-strong); }

  .kairos-block-row:hover .kairos-block-remove { opacity: 1; transform: scale(1); }
  .kairos-block-remove { opacity: 0.55; transition: opacity 0.2s, transform 0.2s, background 0.2s; }
`;

// ============================================================================
// COMPONENTE AUXILIAR: Avatar do usuário (foto ou bolinha com inicial)
// ============================================================================
const UserAvatar = ({ login, allUsers = [], size = 24, className = '' }) => {
  const u = allUsers.find(x => x.cr4a1_username === login);
  const nome = u?.cr4a1_nome_exibicao || login || '?';
  const dimensao = `${size}px`;
  if (u?.cr4a1_foto) {
    return (
      <img
        src={u.cr4a1_foto}
        alt={nome}
        title={nome}
        className={`shrink-0 rounded-full border border-border object-cover ${className}`}
        style={{ width: dimensao, height: dimensao }}
      />
    );
  }
  return (
    <div
      title={nome}
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{
        width: dimensao,
        height: dimensao,
        backgroundColor: u?.cr4a1_cor || '#f57c00',
        fontSize: `${Math.max(10, Math.round(size * 0.42))}px`
      }}
    >
      {nome?.[0]?.toUpperCase()}
    </div>
  );
};

// ============================================================================
// COMPONENTE AUXILIAR: Checkbox animado estilo MD3
// ============================================================================
const TodoCheckbox = ({ checked, onChange, disabled = false }) => (
  <span
    onClick={(e) => {
      e.stopPropagation();
      if (!disabled && onChange) onChange();
    }}
    className={disabled ? '' : 'boing-effect'}
    style={{
      width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      border: `2px solid ${checked ? '#f57c00' : 'var(--border-strong)'}`,
      background: checked ? '#f57c00' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background 0.2s cubic-bezier(0.2,0.8,0.2,1), border-color 0.2s'
    }}
  >
    {checked && <Check className="size-[14px] text-white" strokeWidth={3} style={{ animation: 'elasticPulse 0.3s cubic-bezier(0.34,1.56,0.64,1)' }} />}
  </span>
);

// ============================================================================
// COMPONENTE AUXILIAR: Barra de progresso de tópicos concluídos
// ============================================================================
const TodoProgress = ({ done, total, color }) => {
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  const isComplete = done === total;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: '999px', width: `${pct}%`,
          background: isComplete ? '#34a853' : color,
          transition: 'width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1), background 0.3s ease'
        }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: '700', color: isComplete ? '#34a853' : 'var(--text-secondary)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '2px' }}>
        {isComplete && <Check className="size-[13px]" strokeWidth={3} />}
        {done}/{total}
      </span>
    </div>
  );
};

const getTodoStats = (conteudo = []) => {
  const todos = conteudo.filter(b => b.type === 'todo' && b.value && b.value.trim());
  const done = todos.filter(b => b.checked).length;
  return { total: todos.length, done };
};

const formatRelative = (dateStr) => {
  if (!dateStr) return null;
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  } catch {
    return null;
  }
};

const formatarDataCriacao = (dateStr) => {
  if (!dateStr) return null;
  try {
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm");
  } catch {
    return null;
  }
};

// ============================================================================
// DIÁLOGO DE COMPARTILHAMENTO / VINCULAÇÃO DE NOTAS
// ============================================================================
const CompartilharNotaDialog = ({
  isOpen,
  onClose,
  nota,
  allUsers = [],
  onUpdateSharing
}) => {
  const [novoUsuario, setNovoUsuario] = useState('');
  const [novaPermissao, setNovaPermissao] = useState('leitura');

  const compartilhamento = nota?.compartilhamento || {};
  const autorLogin = nota?.cr4a1_user_login;

  const getNome = (login) => allUsers.find(u => u.cr4a1_username === login)?.cr4a1_nome_exibicao || login;

  const usuariosJaVinculados = new Set([autorLogin, ...Object.keys(compartilhamento)]);

  const candidatos = allUsers.filter(u => {
    if (!u.cr4a1_username) return false;
    return !usuariosJaVinculados.has(u.cr4a1_username);
  });

  const handleAddUser = () => {
    if (!novoUsuario) return;
    const updated = {
      ...compartilhamento,
      [novoUsuario]: novaPermissao
    };
    onUpdateSharing(updated);
    toast.success(`Usuário @${novoUsuario} vinculado com sucesso!`);
    setNovoUsuario('');
    setNovaPermissao('leitura');
  };

  const handleRemoverUser = (login) => {
    const updated = { ...compartilhamento };
    delete updated[login];
    onUpdateSharing(updated);
    toast('Vínculo removido.', { icon: '🗑️' });
  };

  const handleChangePermissao = (login, permissao) => {
    const updated = {
      ...compartilhamento,
      [login]: permissao
    };
    onUpdateSharing(updated);
    toast.success(`Permissão de @${login} alterada para ${permissao === 'edicao' ? 'Edição' : 'Leitura'}.`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5 text-[#f57c00]" />
            Compartilhar Nota
          </DialogTitle>
          <DialogDescription>
            {nota?.cr4a1_titulo ? `"${nota.cr4a1_titulo}"` : 'Vincule usuários e escolha quem pode apenas ler ou editar'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* Aviso sobre privacidade da nota */}
          <div className="rounded-2xl border border-border bg-secondary/50 p-3 text-xs flex items-start gap-2.5">
            {nota?.cr4a1_private ? (
              <>
                <Lock className="size-4 shrink-0 text-[#f57c00] mt-0.5" />
                <span className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground font-semibold">Nota Privada:</strong> Apenas você (autor) e os usuários vinculados abaixo conseguem ver e acessar esta nota.
                </span>
              </>
            ) : (
              <>
                <Globe className="size-4 shrink-0 text-primary mt-0.5" />
                <span className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground font-semibold">Nota Pública:</strong> Visível para o workspace. Usuários vinculados com permissão de &quot;Leitura&quot; terão apenas permissão de leitura garantida.
                </span>
              </>
            )}
          </div>

          {/* Autor / Dono da nota */}
          <div>
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Autor da Nota</Label>
            <div className="mt-1.5 flex items-center justify-between rounded-2xl border border-border bg-card p-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar login={autorLogin} allUsers={allUsers} size={30} />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate">{getNome(autorLogin)}</span>
                  <span className="text-[11px] text-muted-foreground truncate">@{autorLogin}</span>
                </div>
              </div>
              <Badge variant="outline" className="border-[#f57c00]/30 bg-[#f57c00]/10 text-[#f57c00] text-xs font-semibold shrink-0">
                Autor (Proprietário)
              </Badge>
            </div>
          </div>

          {/* Lista de usuários com acesso vinculado */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Usuários Vinculados ({Object.keys(compartilhamento).length})
              </Label>
            </div>

            <div className="flex flex-col gap-2 max-h-[190px] overflow-y-auto pr-1">
              {Object.keys(compartilhamento).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Nenhum usuário vinculado ainda. Vincule alguém abaixo para compartilhar esta nota.
                </div>
              ) : (
                Object.entries(compartilhamento).map(([login, perm]) => (
                  <div key={login} className="flex items-center justify-between rounded-2xl border border-border bg-card p-2.5 transition-colors hover:border-border/80">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <UserAvatar login={login} allUsers={allUsers} size={28} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-foreground truncate">{getNome(login)}</span>
                        <span className="text-[11px] text-muted-foreground truncate">@{login}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Select
                        value={perm}
                        onValueChange={(novaPerm) => handleChangePermissao(login, novaPerm)}
                      >
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="leitura">
                            <span className="flex items-center gap-1.5">
                              <Eye className="size-3 text-muted-foreground" />
                              Apenas Ler
                            </span>
                          </SelectItem>
                          <SelectItem value="edicao">
                            <span className="flex items-center gap-1.5">
                              <Pencil className="size-3 text-[#f57c00]" />
                              Ler e Editar
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:bg-destructive/15 hover:text-destructive rounded-lg"
                        title="Remover vínculo"
                        onClick={() => handleRemoverUser(login)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Adicionar novo usuário vinculado */}
          <div className="border-t border-border pt-3">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
              Vincular novo usuário
            </Label>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Select
                  value={novoUsuario}
                  onValueChange={setNovoUsuario}
                >
                  <SelectTrigger className="flex-1 text-xs">
                    <SelectValue placeholder="Selecione um usuário..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {candidatos.length === 0 ? (
                      <div className="p-2 text-xs text-muted-foreground text-center">Nenhum outro usuário disponível</div>
                    ) : (
                      candidatos.map(u => (
                        <SelectItem key={u.cr4a1_username} value={u.cr4a1_username}>
                          <div className="flex items-center gap-2">
                            <UserAvatar login={u.cr4a1_username} allUsers={allUsers} size={18} />
                            <span>{u.cr4a1_nome_exibicao || u.cr4a1_username}</span>
                            <span className="text-[10px] text-muted-foreground">(@{u.cr4a1_username})</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                <Select
                  value={novaPermissao}
                  onValueChange={setNovaPermissao}
                >
                  <SelectTrigger className="w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leitura">
                      <span className="flex items-center gap-1.5">
                        <Eye className="size-3 text-muted-foreground" />
                        Apenas Ler
                      </span>
                    </SelectItem>
                    <SelectItem value="edicao">
                      <span className="flex items-center gap-1.5">
                        <Pencil className="size-3 text-[#f57c00]" />
                        Ler e Editar
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                onClick={handleAddUser}
                disabled={!novoUsuario}
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                style={{ borderColor: novoUsuario ? '#f57c00' : undefined, color: novoUsuario ? '#f57c00' : undefined }}
              >
                <Plus className="size-4 mr-1.5" />
                Vincular à nota
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="default" size="sm" style={{ background: '#f57c00' }}>
            Concluído
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL: NotesPanel
// ============================================================================
export const NotesPanel = ({
  notas = [],
  eventos = [],
  addNota,
  updateNota,
  deleteNota,
  currentUser,
  allUsers = [],
  workspaces = [],
  activeWorkspaces = [],
  eventId = null,
  isOnline = true
}) => {
  const [notaAberta, setNotaAberta] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompartilharOpen, setIsCompartilharOpen] = useState(false);
  const { confirm, ConfirmDialogHost } = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkspaceFilter, setSelectedWorkspaceFilter] = useState(null);
  const [shareFilter, setShareFilter] = useState('all'); // 'all' | 'mine' | 'shared'

  const currentUserName = currentUser?.cr4a1_username || currentUser?.login || currentUser?.nome || currentUser?.name || '';

  // Chave do rascunho temporário
  const draftStorageKey = notaAberta
    ? `kairos_draft_note_${notaAberta.cr4a1_notas_kairosid || 'new'}`
    : null;

  // Autosalvamento do rascunho a cada alteração enquanto em edição
  useEffect(() => {
    if (!isEditing || !notaAberta || !draftStorageKey) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(draftStorageKey, JSON.stringify(notaAberta));
      } catch (e) { void e; }
    }, 700);
    return () => clearTimeout(timer);
  }, [isEditing, notaAberta, draftStorageKey]);

  const getWorkspaceColor = (wsId) => workspaces.find(w => w.cr4a1_calendarios_workspacesid === wsId)?.cr4a1_cor_hex || '#f57c00';

  // Lógica de Privacidade, Compartilhamento, Workspace e Filtro de Evento
  const activeNotas = notas.filter(n => {
    if (eventId && n.cr4a1_evento_id !== eventId) return false;
    const isInWorkspace = activeWorkspaces.includes(n.cr4a1_workspace_id);
    if (!isInWorkspace) return false;

    return canUserViewNota(n, currentUserName);
  });

  const visibleNotas = activeNotas.filter(n => {
    const matchesQuery = !searchTerm || matchesSearch(n.cr4a1_titulo || '', searchTerm);
    const matchesWorkspace = !selectedWorkspaceFilter || n.cr4a1_workspace_id === selectedWorkspaceFilter;
    if (!matchesQuery || !matchesWorkspace) return false;

    if (shareFilter === 'mine') {
      return n.cr4a1_user_login === currentUserName;
    }
    if (shareFilter === 'shared') {
      const isSharedWithMe = Boolean(n.compartilhamento && n.compartilhamento[currentUserName]);
      const isSharedByMe = n.cr4a1_user_login === currentUserName && Object.keys(n.compartilhamento || {}).length > 0;
      return isSharedWithMe || isSharedByMe;
    }
    return true;
  });

  const availableWorkspaces = workspaces.filter(ws => activeWorkspaces.includes(ws.cr4a1_calendarios_workspacesid));

  const openNota = (nota) => {
    const draftKey = `kairos_draft_note_${nota.cr4a1_notas_kairosid}`;
    let notaToOpen = { ...nota, isNew: false, compartilhamento: nota.compartilhamento || {} };
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        if (draft && (draft.cr4a1_titulo !== nota.cr4a1_titulo || JSON.stringify(draft.cr4a1_conteudo) !== JSON.stringify(nota.cr4a1_conteudo))) {
          notaToOpen = { ...draft, isNew: false, compartilhamento: draft.compartilhamento || nota.compartilhamento || {} };
          toast('Rascunho recente recuperado.', { icon: '📝' });
        }
      }
    } catch (e) { void e; }
    setNotaAberta(notaToOpen);
    setIsEditing(false);
  };

  const createNewNota = () => {
    const defaultWorkspace = (activeWorkspaces && activeWorkspaces[0]) || (workspaces && workspaces[0]?.cr4a1_calendarios_workspacesid) || '';
    let initialNota = {
      cr4a1_notas_kairosid: crypto.randomUUID(),
      isNew: true,
      cr4a1_titulo: '',
      cr4a1_private: false,
      cr4a1_workspace_id: defaultWorkspace,
      cr4a1_evento_id: eventId || '',
      cr4a1_user_login: currentUserName || 'Usuário Atual',
      compartilhamento: {},
      cr4a1_conteudo: [{ id: crypto.randomUUID(), type: 'text', value: '' }],
      cr4a1_arquivos: []
    };

    try {
      const savedNewDraft = localStorage.getItem('kairos_draft_note_new');
      if (savedNewDraft) {
        const parsed = JSON.parse(savedNewDraft);
        if (parsed && (parsed.cr4a1_titulo?.trim() || parsed.cr4a1_conteudo?.some(b => b.value?.trim()))) {
          initialNota = { ...parsed, isNew: true, compartilhamento: parsed.compartilhamento || {} };
          toast('Rascunho anterior recuperado.', { icon: '📝' });
        }
      }
    } catch (e) { void e; }

    setNotaAberta(initialNota);
    setIsEditing(true);
  };

  const handleBlockChange = (id, value) => {
    setNotaAberta(prev => ({
      ...prev, cr4a1_conteudo: prev.cr4a1_conteudo.map(b => b.id === id ? { ...b, value } : b)
    }));
  };

  const handleTypeChange = (id, type) => {
    setNotaAberta(prev => ({
      ...prev, cr4a1_conteudo: prev.cr4a1_conteudo.map(b => b.id === id ? { ...b, type } : b)
    }));
  };

  const addBlock = (type = 'text') => {
    setNotaAberta(prev => ({
      ...prev, cr4a1_conteudo: [...(prev.cr4a1_conteudo || []), { id: crypto.randomUUID(), type, value: '', checked: false }]
    }));
  };

  const removeBlock = (id) => {
    setNotaAberta(prev => prev ? ({
      ...prev, cr4a1_conteudo: prev.cr4a1_conteudo.map(b => b.id === id ? { ...b, removing: true } : b)
    }) : prev);
    setTimeout(() => {
      setNotaAberta(prev => prev ? ({
        ...prev, cr4a1_conteudo: prev.cr4a1_conteudo.filter(b => b.id !== id)
      }) : prev);
    }, 200);
  };

  const buildNotaPayload = (overrides = {}) => {
    const src = { ...notaAberta, ...overrides };
    return {
      titulo: src.cr4a1_titulo,
      privado: src.cr4a1_private,
      private: src.cr4a1_private,
      workspaceId: src.cr4a1_workspace_id,
      conteudo: src.cr4a1_conteudo,
      eventoId: src.cr4a1_evento_id || null,
      anexos: src.cr4a1_arquivos || [],
      user: src.cr4a1_user_login,
      user_login: src.cr4a1_user_login,
      compartilhamento: src.compartilhamento || {},

      cr4a1_notas_kairosid: src.cr4a1_notas_kairosid,
      cr4a1_titulo: src.cr4a1_titulo,
      cr4a1_private: src.cr4a1_private,
      cr4a1_workspace_id: src.cr4a1_workspace_id,
      cr4a1_conteudo: src.cr4a1_conteudo,
      cr4a1_evento_id: src.cr4a1_evento_id || null,
      cr4a1_arquivos: src.cr4a1_arquivos || [],
      cr4a1_user_login: src.cr4a1_user_login
    };
  };

  // Alterna o estado de um tópico na checklist
  const toggleTodoChecked = async (blockId) => {
    const permissions = getNotaPermissions(notaAberta, currentUserName);
    if (!permissions.canEdit) {
      toast.error('Você tem permissão apenas de leitura nesta nota.');
      return;
    }

    const updatedConteudo = notaAberta.cr4a1_conteudo.map(b => b.id === blockId ? { ...b, checked: !b.checked } : b);
    setNotaAberta(prev => prev ? ({ ...prev, cr4a1_conteudo: updatedConteudo }) : prev);

    if (!isEditing && notaAberta.cr4a1_notas_kairosid && !notaAberta.isNew) {
      await updateNota(notaAberta.cr4a1_notas_kairosid, buildNotaPayload({ cr4a1_conteudo: updatedConteudo }));
    }
  };

  const handleUpdateSharing = async (novoCompartilhamento) => {
    setNotaAberta(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        compartilhamento: novoCompartilhamento
      };
      if (draftStorageKey) {
        try { localStorage.setItem(draftStorageKey, JSON.stringify(updated)); } catch (e) { void e; }
      }
      return updated;
    });

    if (notaAberta && notaAberta.cr4a1_notas_kairosid && !notaAberta.isNew) {
      await updateNota(notaAberta.cr4a1_notas_kairosid, buildNotaPayload({ compartilhamento: novoCompartilhamento }));
    }
  };

  const handleSave = async (stayInEditing = false) => {
    const permissions = getNotaPermissions(notaAberta, currentUserName);
    if (!permissions.canEdit) {
      toast.error('Você não tem permissão para editar esta nota.');
      return;
    }

    setIsSaving(true);
    const data = buildNotaPayload();

    let idGerado = null;
    if (notaAberta.cr4a1_notas_kairosid && !notaAberta.isNew) {
      await updateNota(notaAberta.cr4a1_notas_kairosid, data);
    } else {
      idGerado = await addNota(data);
    }

    if (draftStorageKey) {
      try { localStorage.removeItem(draftStorageKey); } catch (e) { void e; }
    }

    setIsSaving(false);
    setNotaAberta(prev => prev ? ({ ...prev, isNew: false, ...(idGerado ? { cr4a1_notas_kairosid: idGerado } : {}) }) : prev);

    if (stayInEditing) {
      toast.success('Nota salva!', { icon: '💾' });
    } else {
      setIsEditing(false);
    }
  };

  const handleBack = async () => {
    if (isEditing && notaAberta) {
      const hasContent = Boolean(
        notaAberta.cr4a1_titulo?.trim() ||
        notaAberta.cr4a1_conteudo?.some(b => b.value?.trim())
      );
      if (hasContent) {
        await handleSave();
        return;
      }
    }
    if (draftStorageKey) {
      try { localStorage.removeItem(draftStorageKey); } catch (e) { void e; }
    }
    setNotaAberta(null);
  };

  // Atalho de teclado rápido: Ctrl+S (ou Cmd+S) salva sem fechar o modo de edição
  useEffect(() => {
    if (!isEditing || !notaAberta) return;
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, notaAberta, currentUserName]);

  const handleDeleteClick = async () => {
    if (!notaAberta?.cr4a1_notas_kairosid || notaAberta.isNew) return;
    const permissions = getNotaPermissions(notaAberta, currentUserName);
    if (!permissions.canDelete) {
      toast.error('Apenas o autor pode excluir esta nota.');
      return;
    }

    const titulo = notaAberta.cr4a1_titulo?.trim() || 'esta nota';
    const confirmado = await confirm(`Tem certeza que deseja excluir "${titulo}"?`, {
      title: 'Excluir nota',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      destructive: true,
    });
    if (!confirmado) return;

    if (draftStorageKey) {
      try { localStorage.removeItem(draftStorageKey); } catch (e) { void e; }
    }
    await deleteNota(notaAberta.cr4a1_notas_kairosid);
    setNotaAberta(null);
  };

  // TELA DE DETALHE DA NOTA (LEITURA OU EDIÇÃO)
  if (notaAberta) {
    const currentWorkspace = workspaces.find(ws => ws.cr4a1_calendarios_workspacesid === notaAberta.cr4a1_workspace_id);
    const wsColor = getWorkspaceColor(notaAberta.cr4a1_workspace_id);
    const eventosDisponiveis = eventos.length > 0 ? eventos : [];
    const eventoAssociado = eventos.find(ev => ev.cr4a1_agenda_kairosid === notaAberta.cr4a1_evento_id);

    const blockTypeOptions = [
      { value: 'text', label: 'Texto' },
      { value: 'todo', label: 'Tópico' },
      { value: 'heading', label: 'Cabeçalho' }
    ];

    const todoStats = getTodoStats(notaAberta.cr4a1_conteudo);
    const relative = formatRelative(notaAberta.modifiedon || notaAberta.createdon);
    const criadaEm = formatarDataCriacao(notaAberta.createdon);

    const permissions = getNotaPermissions(notaAberta, currentUserName);
    const { isAuthor, canEdit, canManagePermissions, canDelete, userPermission } = permissions;
    const numVinculados = Object.keys(notaAberta.compartilhamento || {}).length;

    return (
      <div style={{ padding: '24px', background: 'var(--bg-primary)', borderRadius: '24px', height: '100%', overflowY: 'auto' }}>
        <style>{NOTES_PANEL_STYLES}</style>

        {/* CABEÇALHO COM BOTÕES DE AÇÃO */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button onClick={handleBack} variant="outline" title="Voltar para a lista de notas (salva automaticamente se em edição)">
              <ArrowLeft className="size-[18px]" />
              Voltar
            </Button>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  <span>Salvando...</span>
                </>
              ) : (!isOnline || notaAberta?._pendenteSync) ? (
                <>
                  <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-amber-600 dark:text-amber-400">Salvo no dispositivo (offline)</span>
                </>
              ) : (
                <>
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Salvo na nuvem</span>
                </>
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Botão de Compartilhar: exclusivo do autor da nota */}
            {canManagePermissions && (
              <Button
                onClick={() => setIsCompartilharOpen(true)}
                variant="outline"
                className="gap-1.5"
                title="Vincular outros usuários e gerenciar permissões (apenas autor)"
              >
                <Share2 className="size-[17px] text-[#f57c00]" />
                <span>Compartilhar</span>
                {numVinculados > 0 && (
                  <span className="rounded-full bg-[#f57c00]/20 px-1.5 py-0.2 text-[10px] font-bold text-[#f57c00]">
                    {numVinculados}
                  </span>
                )}
              </Button>
            )}

            {isEditing ? (
              <>
                {canDelete && (
                  <Button
                    onClick={handleDeleteClick}
                    variant="destructive"
                  >
                    <Trash2 className="size-[18px]" />
                    Excluir
                  </Button>
                )}
                <Button
                  onClick={async () => {
                    if (notaAberta.isNew) {
                      const temConteudo = (notaAberta.cr4a1_titulo && notaAberta.cr4a1_titulo.trim()) ||
                        notaAberta.cr4a1_conteudo?.some(b => b.value && b.value.trim());
                      if (temConteudo) {
                        const descartar = await confirm('Deseja descartar as alterações desta nova nota?', {
                          title: 'Descartar nota',
                          confirmLabel: 'Descartar',
                          cancelLabel: 'Continuar editando',
                          destructive: true,
                        });
                        if (!descartar) return;
                      }
                      if (draftStorageKey) {
                        try { localStorage.removeItem(draftStorageKey); } catch (e) { void e; }
                      }
                      setNotaAberta(null);
                    } else {
                      setIsEditing(false);
                    }
                  }}
                  variant="outline"
                >
                  Cancelar
                </Button>
                {/* Botão de salvamento rápido estilo disquete do Windows */}
                <Button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={isSaving || !canEdit}
                  variant="outline"
                  className="gap-1.5 border-[#f57c00] text-[#f57c00] hover:bg-[#f57c00]/10 font-semibold"
                  title="Salvamento Rápido (Ctrl+S): Salva as alterações sem sair do modo de edição"
                >
                  {isSaving ? <Loader2 className="size-[18px] animate-spin" /> : <Save className="size-[18px]" />}
                  <span>Salvar</span>
                </Button>
                <Button onClick={() => handleSave(false)} disabled={isSaving || !canEdit} style={{ background: '#f57c00' }} title="Salvar e concluir a edição">
                  {isSaving && <Loader2 className="size-[18px] animate-spin" />}
                  {isSaving ? 'Salvando...' : 'Concluir'}
                </Button>
              </>
            ) : (
              <>
                {canDelete && (
                  <Button
                    onClick={handleDeleteClick}
                    variant="destructive"
                  >
                    <Trash2 className="size-[18px]" />
                    Excluir
                  </Button>
                )}
                {canEdit ? (
                  <Button onClick={() => setIsEditing(true)} style={{ background: '#f57c00' }}>
                    <Pencil className="size-[18px]" />
                    Editar Nota
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                    <Eye className="size-4 text-[#f57c00]" />
                    <span>Apenas Leitura</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ÁREA DO TÍTULO E METADADOS */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px',
          borderRadius: '20px', padding: '20px', marginTop: '-4px',
          background: `linear-gradient(135deg, ${wsColor}14, transparent 65%)`
        }}>

          {isEditing ? (
            <input
              type="text"
              placeholder="Título da Nota..."
              value={notaAberta.cr4a1_titulo}
              onChange={e => setNotaAberta({ ...notaAberta, cr4a1_titulo: e.target.value })}
              style={{ fontSize: '28px', fontWeight: '800', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-title)', width: '50%' }}
            />
          ) : (
            <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: 'var(--text-title)', width: '50%' }}>
              {notaAberta.cr4a1_titulo || 'Nota sem título'}
            </h1>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end', width: '50%' }}>
            {isEditing ? (
              <div className="flex flex-wrap items-center justify-end gap-3">
                {/* Switch de Nota Privada: editável exclusivamente pelo autor */}
                {isAuthor ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2">
                    {notaAberta.cr4a1_private ? <Lock className="size-4 text-[#f57c00]" /> : <Globe className="size-4 text-muted-foreground" />}
                    <Label htmlFor="nota-private-switch" className="cursor-pointer text-xs font-semibold" style={{ color: notaAberta.cr4a1_private ? '#f57c00' : 'var(--text-secondary)' }}>
                      {notaAberta.cr4a1_private ? 'Nota Privada' : 'Nota Pública'}
                    </Label>
                    <Switch id="nota-private-switch" checked={!!notaAberta.cr4a1_private} onCheckedChange={(val) => setNotaAberta({ ...notaAberta, cr4a1_private: val })} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold" style={{ color: notaAberta.cr4a1_private ? '#f57c00' : 'var(--text-secondary)' }}>
                    {notaAberta.cr4a1_private ? <Lock className="size-4 text-[#f57c00]" /> : <Globe className="size-4 text-muted-foreground" />}
                    <span>{notaAberta.cr4a1_private ? 'Nota Privada' : 'Nota Pública'}</span>
                  </div>
                )}

                {workspaces.length > 0 && (
                  <Select value={notaAberta.cr4a1_workspace_id} onValueChange={(val) => setNotaAberta({ ...notaAberta, cr4a1_workspace_id: val })}>
                    <SelectTrigger className="w-auto min-w-[170px]"><SelectValue placeholder="Selecione o Workspace" /></SelectTrigger>
                    <SelectContent>
                      {workspaces.map(ws => (
                        <SelectItem key={ws.cr4a1_calendarios_workspacesid} value={ws.cr4a1_calendarios_workspacesid}>{ws.cr4a1_nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select value={notaAberta.cr4a1_evento_id || '__none__'} onValueChange={(val) => setNotaAberta({ ...notaAberta, cr4a1_evento_id: val === '__none__' ? '' : val })}>
                  <SelectTrigger className="w-auto min-w-[220px]"><SelectValue placeholder="Associar a um Evento" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Desvincular evento</SelectItem>
                    {eventosDisponiveis.map(ev => (
                      <SelectItem key={ev.cr4a1_agenda_kairosid} value={ev.cr4a1_agenda_kairosid}>🔗 {ev.cr4a1_titulo || 'Evento sem título'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                {notaAberta._pendenteSync && (
                  <span className="flex items-center gap-1 text-[12px] font-semibold text-warning">
                    <CloudOff className="size-[14px]" /> Salva offline — aguardando sincronização
                  </span>
                )}
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {notaAberta.cr4a1_private ? (
                    <><Lock className="size-[14px] text-[#f57c00]" /> {isAuthor ? 'Nota Privada' : 'Nota Privada (Compartilhada com você)'}</>
                  ) : (
                    <><Globe className="size-[14px]" /> Nota Pública</>
                  )}
                </span>

                {/* Status de compartilhamento */}
                {isAuthor && numVinculados > 0 && (
                  <span style={{ fontSize: '11px', color: '#f57c00', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                    <Users className="size-[13px]" /> Vinculada a {numVinculados} usuário(s)
                  </span>
                )}

                {!isAuthor && (
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {userPermission === 'edicao' ? (
                      <><Pencil className="size-[13px] text-[#f57c00]" /> Permissão: Ler e Editar</>
                    ) : (
                      <><Eye className="size-[13px] text-muted-foreground" /> Permissão: Apenas Leitura</>
                    )}
                  </span>
                )}

                <span style={{ fontSize: '11px', fontWeight: '700', color: wsColor, padding: '4px 8px', background: 'var(--bg-secondary)', borderRadius: '6px', textTransform: 'uppercase' }}>
                  {currentWorkspace?.cr4a1_nome || 'Sem Setor'}
                </span>

                {eventoAssociado && (
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)', padding: '4px 8px', background: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Link2 className="size-[14px] text-primary" />
                    {eventoAssociado.cr4a1_titulo}
                  </span>
                )}

                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Escrito por {notaAberta.cr4a1_user_login}{relative ? ` · editado ${relative}` : ''}
                </span>
                {criadaEm && (
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CalendarPlus className="size-[14px]" /> Criada em {criadaEm}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* PROGRESSO DA CHECKLIST (quando a nota tem tópicos) */}
        {todoStats.total > 0 && (
          <div style={{ marginBottom: '24px', padding: '0 4px' }}>
            <TodoProgress done={todoStats.done} total={todoStats.total} color={wsColor} />
          </div>
        )}

        {/* CORPO DA NOTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '300px' }}>

          {isEditing ? (
            <>
              {(notaAberta.cr4a1_conteudo || []).map((bloco) => (
                <div
                  key={bloco.id}
                  className="kairos-block-row"
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'var(--bg-primary)', padding: '4px', borderRadius: '12px',
                    transition: 'background 0.2s',
                    animation: bloco.removing ? 'kairos-block-out 0.2s cubic-bezier(0.4,0,1,1) forwards' : 'kairos-block-in 0.3s cubic-bezier(0.2,0.8,0.2,1) both',
                    pointerEvents: bloco.removing ? 'none' : 'auto',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => { if (!bloco.removing) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
                >

                  <Select value={bloco.type} onValueChange={(val) => handleTypeChange(bloco.id, val)}>
                    <SelectTrigger className="w-auto min-w-[120px] shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {blockTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  {bloco.type === 'heading' ? (
                    <input
                      type="text"
                      value={bloco.value}
                      onChange={e => handleBlockChange(bloco.id, e.target.value)}
                      placeholder="Cabeçalho principal..."
                      style={{ flex: 1, fontSize: '22px', fontWeight: '800', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-title)', padding: '8px 0' }}
                    />
                  ) : bloco.type === 'todo' ? (
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '10px', padding: '8px 0' }}>
                      <TodoCheckbox checked={!!bloco.checked} onChange={() => toggleTodoChecked(bloco.id)} disabled={!canEdit} />
                      <input
                        type="text"
                        value={bloco.value}
                        onChange={e => handleBlockChange(bloco.id, e.target.value)}
                        placeholder="Listar item..."
                        style={{
                          flex: 1, fontSize: '15px', border: 'none', background: 'transparent', outline: 'none',
                          color: bloco.checked ? 'var(--text-secondary)' : 'var(--text-primary)',
                          textDecoration: bloco.checked ? 'line-through' : 'none',
                          transition: 'color 0.2s'
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <RichTextEditor
                        value={bloco.value}
                        onChange={v => handleBlockChange(bloco.id, v)}
                        placeholder="Escreva um texto..."
                        minHeightClass="min-h-[44px]"
                      />
                    </div>
                  )}

                  <Button onClick={() => removeBlock(bloco.id)} variant="ghost" size="icon" className="kairos-block-remove mt-1 size-8 shrink-0 rounded-[10px] text-destructive hover:bg-destructive/15 hover:text-destructive" title="Remover bloco">
                    <X className="size-[18px]" />
                  </Button>
                </div>
              ))}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button type="button" onClick={() => addBlock('text')} variant="outline" size="sm" className="border-dashed text-muted-foreground">+ Texto</Button>
                <Button type="button" onClick={() => addBlock('todo')} variant="outline" size="sm" className="border-dashed text-muted-foreground">+ Tópico</Button>
                <Button type="button" onClick={() => addBlock('heading')} variant="outline" size="sm" className="border-dashed text-muted-foreground">+ Cabeçalho</Button>
                <span className="ml-auto text-xs text-muted-foreground">
                  {(notaAberta.cr4a1_conteudo || []).filter(b => !b.removing).length} bloco(s)
                </span>
              </div>

              <div className="mt-4">
                <AttachmentsField
                  anexos={notaAberta.cr4a1_arquivos || []}
                  onChange={(novos) => setNotaAberta({ ...notaAberta, cr4a1_arquivos: novos })}
                />
              </div>
            </>

          ) : (

            /* MODO LEITURA */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 8px' }}>
              {(notaAberta.cr4a1_conteudo || []).length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic' }}>Esta nota está vazia.</p>
              )}
              {(notaAberta.cr4a1_conteudo || []).map((bloco) => {
                if (bloco.type === 'text') {
                  if (!htmlParaTexto(bloco.value).trim()) return null;
                  return <RichTextEditor key={bloco.id} value={bloco.value} editable={false} minHeightClass="min-h-0" />;
                }
                if (!bloco.value.trim()) return null;

                if (bloco.type === 'heading') {
                  return <h2 key={bloco.id} style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-title)', margin: '8px 0 0 0' }}>{bloco.value}</h2>;
                }
                return (
                  <div key={bloco.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <TodoCheckbox checked={!!bloco.checked} onChange={() => toggleTodoChecked(bloco.id)} disabled={!canEdit} />
                    <span style={{ fontSize: '15px', color: bloco.checked ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: bloco.checked ? 'line-through' : 'none', transition: 'color 0.2s' }}>
                      {bloco.value}
                    </span>
                  </div>
                );
              })}

              <AttachmentsField anexos={notaAberta.cr4a1_arquivos || []} readOnly />
            </div>
          )}
        </div>

        {/* Modal de Compartilhamento / Vínculos (apenas autor) */}
        {isCompartilharOpen && (
          <CompartilharNotaDialog
            isOpen={isCompartilharOpen}
            onClose={() => setIsCompartilharOpen(false)}
            nota={notaAberta}
            allUsers={allUsers}
            currentUser={currentUser}
            onUpdateSharing={handleUpdateSharing}
          />
        )}
      </div>
    );
  }

  // TELA INICIAL: LISTAGEM DE NOTAS
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', padding: '24px', background: 'var(--bg-primary)', borderRadius: '24px' }}>
      <style>{NOTES_PANEL_STYLES}</style>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 style={{ margin: 0, color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText className="size-5 text-[#f57c00]" />
          Notas / Hub
        </h2>
        <Button onClick={createNewNota} style={{ background: '#f57c00', animation: 'fabEntrance 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) backwards' }}>
          <Plus className="size-[18px]" />
          Nova Nota
        </Button>
      </div>

      {activeNotas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Pesquisar notas..." className="max-w-[360px]" inputClassName="rounded-full" />

            {/* Filtro rápido: Todas / Minhas / Compartilhadas */}
            <div className="flex rounded-full border border-border bg-secondary p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setShareFilter('all')}
                className={`rounded-full px-3 py-1 font-semibold transition-colors ${shareFilter === 'all' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Todas ({activeNotas.length})
              </button>
              <button
                type="button"
                onClick={() => setShareFilter('mine')}
                className={`rounded-full px-3 py-1 font-semibold transition-colors ${shareFilter === 'mine' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Minhas ({activeNotas.filter(n => n.cr4a1_user_login === currentUserName).length})
              </button>
              <button
                type="button"
                onClick={() => setShareFilter('shared')}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold transition-colors ${shareFilter === 'shared' ? 'bg-card text-[#f57c00] shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Users className="size-3" />
                Compartilhadas ({activeNotas.filter(n => (n.compartilhamento && n.compartilhamento[currentUserName]) || (n.cr4a1_user_login === currentUserName && Object.keys(n.compartilhamento || {}).length > 0)).length})
              </button>
            </div>
          </div>

          {availableWorkspaces.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
              <button
                onClick={() => setSelectedWorkspaceFilter(null)}
                className="boing-effect shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  border: !selectedWorkspaceFilter ? 'none' : '1px solid var(--border-color)',
                  background: !selectedWorkspaceFilter ? '#f57c00' : 'var(--bg-secondary)', color: !selectedWorkspaceFilter ? 'white' : 'var(--text-title)'
                }}
              >
                Todos Setores
              </button>
              {availableWorkspaces.map(ws => (
                <button
                  key={ws.cr4a1_calendarios_workspacesid}
                  onClick={() => setSelectedWorkspaceFilter(ws.cr4a1_calendarios_workspacesid)}
                  className="boing-effect flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
                  style={{
                    border: selectedWorkspaceFilter === ws.cr4a1_calendarios_workspacesid ? 'none' : '1px solid var(--border-color)',
                    background: selectedWorkspaceFilter === ws.cr4a1_calendarios_workspacesid ? (ws.cr4a1_cor_hex || '#f57c00') : 'var(--bg-secondary)',
                    color: selectedWorkspaceFilter === ws.cr4a1_calendarios_workspacesid ? 'white' : 'var(--text-title)'
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: selectedWorkspaceFilter === ws.cr4a1_calendarios_workspacesid ? 'rgba(255,255,255,0.8)' : (ws.cr4a1_cor_hex || '#f57c00') }} />
                  {ws.cr4a1_nome}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeNotas.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 text-center text-muted-foreground">
          <VolumeX className="size-14 opacity-50" style={{ animation: 'kairos-empty-float 3s ease-in-out infinite' }} />
          <p className="m-0">Nenhuma nota encontrada neste workspace. Crie a sua primeira anotação!</p>
          <Button onClick={createNewNota} variant="outline" className="mt-1 border-dashed" style={{ color: '#f57c00', borderColor: '#f57c00' }}>
            <Plus className="size-[18px]" />
            Criar primeira nota
          </Button>
        </div>
      ) : visibleNotas.length === 0 ? (
        <div className="mt-10 text-center text-muted-foreground">
          <SearchX className="mx-auto size-12 opacity-50" />
          <p>Nenhuma nota corresponde à sua busca ou filtro.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', overflowY: 'auto', paddingBottom: '24px' }}>
          {visibleNotas.map((nota, idx) => {
            const stats = getTodoStats(nota.cr4a1_conteudo);
            const wsColor = getWorkspaceColor(nota.cr4a1_workspace_id);
            const relative = formatRelative(nota.modifiedon || nota.createdon);
            const criadaEm = formatarDataCriacao(nota.createdon);
            const blocoPreview = nota.cr4a1_conteudo?.find(b => b.type === 'text' || b.type === 'todo');
            const textoPreview = blocoPreview ? (blocoPreview.type === 'text' ? htmlParaTexto(blocoPreview.value) : blocoPreview.value) : '';
            const isNoteAuthor = nota.cr4a1_user_login === currentUserName;
            const sharedCount = Object.keys(nota.compartilhamento || {}).length;
            const sharedWithMePerm = nota.compartilhamento?.[currentUserName];

            return (
              <div
                key={nota.cr4a1_notas_kairosid}
                onClick={() => openNota(nota)}
                style={{
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderLeft: `4px solid ${wsColor}`,
                  borderRadius: '16px', padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px',
                  animation: 'kairos-card-in 0.4s cubic-bezier(0.2,0.8,0.2,1) both',
                  animationDelay: `${Math.min(idx, 14) * 35}ms`
                }}
                className="boing-effect kairos-note-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ margin: 0, color: 'var(--text-title)', fontSize: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {nota.cr4a1_titulo || 'Sem Título'}
                  </h4>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {nota._pendenteSync && <CloudOff className="size-4 text-warning" title="Salva offline — ainda não sincronizada" />}
                    {parseAnexos(nota.cr4a1_arquivos).length > 0 && <Paperclip className="size-4 shrink-0 text-muted-foreground" title={`${parseAnexos(nota.cr4a1_arquivos).length} anexo(s)`} />}
                    {nota.cr4a1_private && <Lock className="size-4 shrink-0 text-[#f57c00]" title={isNoteAuthor ? "Nota Privada" : "Nota Privada (Compartilhada com você)"} />}
                    {isNoteAuthor && sharedCount > 0 && (
                      <span className="flex items-center gap-1 rounded bg-[#f57c00]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#f57c00]" title={`Vinculada a ${sharedCount} usuário(s)`}>
                        <Users className="size-3" />
                        {sharedCount}
                      </span>
                    )}
                    {!isNoteAuthor && sharedWithMePerm && (
                      sharedWithMePerm === 'edicao' ? (
                        <span className="flex items-center gap-1 rounded bg-[#f57c00]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#f57c00]" title="Compartilhada com você (Ler e Editar)">
                          <Pencil className="size-3" />
                          Edição
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground" title="Compartilhada com você (Apenas Leitura)">
                          <Eye className="size-3" />
                          Leitura
                        </span>
                      )
                    )}
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {nota.cr4a1_conteudo && nota.cr4a1_conteudo.length > 0 ? (textoPreview || '...') : 'Vazio...'}
                </p>

                {stats.total > 0 && <TodoProgress done={stats.done} total={stats.total} color={wsColor} />}

                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-1.5 overflow-hidden text-[11px] text-muted-foreground" title={criadaEm ? `Criada em ${criadaEm}` : undefined}>
                    <UserAvatar login={nota.cr4a1_user_login} allUsers={allUsers} size={16} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isNoteAuthor ? 'Você' : (allUsers.find(u => u.cr4a1_username === nota.cr4a1_user_login)?.cr4a1_nome_exibicao || nota.cr4a1_user_login)}
                      {relative ? ` · ${relative}` : ''}
                    </span>
                  </div>
                  {nota.cr4a1_evento_id && <Link2 className="size-[14px] shrink-0 text-primary" title="Nota associada a um evento" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {ConfirmDialogHost}
    </div>
  );
};
