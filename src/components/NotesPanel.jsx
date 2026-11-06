import { notificarMencoes, notificarCompartilhamento } from '../utils/alertas';
import { SearchField } from './ui/search-field';
import { matchesSearch } from '../utils/search';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft, Loader2, Pencil, Plus, Lock, Globe, Link2,
  VolumeX, SearchX, X, FileText, Check, CloudOff, Paperclip,
  CalendarPlus, Trash2, Users, Share2, Eye, Save, Palette, Ban,
  ExternalLink, Kanban, CheckSquare
} from 'lucide-react';
import { useConfirm } from '../hooks/useConfirm';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { AttachmentsField } from './ui/attachments-field';
import { RichTextEditor } from './ui/rich-text-editor';
import { MentionInput } from './ui/mention-autocomplete';
import { DateField } from './ui/date-field';
import { themeColors } from '../constants/materialColors';
import { parseAnexos } from '../utils/anexos';
import { htmlParaTexto } from '../utils/descricaoTarefas';
import { canUserViewNota, getNotaPermissions } from '../utils/notasCompartilhamento';
import { META_PADRAO, serializarAtividadesEMeta, registrarAtividade } from '../utils/atividades';

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
    {checked && <Check className="size-[14px] text-white" strokeWidth={3} style={{ animation: 'elasticPulse 0.18s ease-out' }} />}
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
                        <SelectTrigger className="h-8 w-[108px] sm:w-[130px] text-xs px-2 sm:px-3">
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
  isOnline = true,
  registrarCorRecenteUsuario,
  notaIdParaAbrir = null,
  onLimparNotaIdParaAbrir,
  onNavegarParaFicha
}) => {
  const [notaAberta, setNotaAberta] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompartilharOpen, setIsCompartilharOpen] = useState(false);
  const [corPopoverAberto, setCorPopoverAberto] = useState(false);
  const { confirm, ConfirmDialogHost } = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkspaceFilter, setSelectedWorkspaceFilter] = useState(null);
  const [shareFilter, setShareFilter] = useState('all'); // 'all' | 'mine' | 'shared'

  // Integração Notas ↔ Fichas do Trello
  const [isCriarFichaOpen, setIsCriarFichaOpen] = useState(false);
  const [fichaFormWs, setFichaFormWs] = useState('');
  const [fichaFormLista, setFichaFormLista] = useState('');
  const [fichaFormTitulo, setFichaFormTitulo] = useState('');
  const [fichaFormResp, setFichaFormResp] = useState('');
  const [fichaFormPrazo, setFichaFormPrazo] = useState('');
  const [fichaFormListas, setFichaFormListas] = useState([]);
  const [carregandoListas, setCarregandoListas] = useState(false);
  const [criandoFicha, setCriandoFicha] = useState(false);
  const [vincularFichaPopoverAberto, setVincularFichaPopoverAberto] = useState(false);
  const [buscaFichaParaVincular, setBuscaFichaParaVincular] = useState('');
  const [fichasParaVincular, setFichasParaVincular] = useState([]);
  const [carregandoFichasParaVincular, setCarregandoFichasParaVincular] = useState(false);

  // Se receber notaIdParaAbrir de fora (ex.: clicado dentro de uma ficha do Trello)
  useEffect(() => {
    if (!notaIdParaAbrir) return;
    const encontrada = notas.find(n => n.cr4a1_notas_kairosid === notaIdParaAbrir || n.cr4a1_id_da_nota === notaIdParaAbrir);
    if (encontrada) {
      setNotaAberta(encontrada);
      setIsEditing(false);
      onLimparNotaIdParaAbrir?.();
    }
  }, [notaIdParaAbrir, notas, onLimparNotaIdParaAbrir]);

  const currentUserName = (
    currentUser?.cr4a1_username ||
    currentUser?.login ||
    currentUser?.username ||
    (typeof currentUser === 'string' ? currentUser : '') ||
    (typeof window !== 'undefined' ? localStorage.getItem('kairos_logged_user') : '') ||
    ''
  ).trim();

  const resolvedCurrentUser = currentUser?.cr4a1_username
    ? currentUser
    : allUsers.find(u => (u.cr4a1_username || '').toLowerCase() === currentUserName.toLowerCase());

  const coresRecentesMarcaTexto = resolvedCurrentUser?.coresRecentesMarcaTexto || [];
  const coresRecentesNota = resolvedCurrentUser?.coresRecentesNota || [];
  const ultimaCorNota = coresRecentesNota[0] || '';

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
      cr4a1_cor: ultimaCorNota || '',
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
          initialNota = {
            ...parsed,
            isNew: true,
            cr4a1_cor: parsed.cr4a1_cor ?? ultimaCorNota ?? '',
            compartilhamento: parsed.compartilhamento || {}
          };
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
      cor: src.cor !== undefined ? src.cor : (src.cr4a1_cor || ''),
      fichaId: src.fichaId !== undefined ? src.fichaId : (src.cr4a1_ficha_id || ''),
      fichaTitulo: src.fichaTitulo !== undefined ? src.fichaTitulo : (src.cr4a1_ficha_titulo || ''),
      workspaceId: src.workspaceId ?? src.cr4a1_workspace_id,
      conteudo: src.conteudo ?? src.cr4a1_conteudo,
      eventoId: src.eventoId ?? src.cr4a1_evento_id ?? null,
      anexos: src.anexos ?? src.cr4a1_arquivos ?? [],
      user: src.user ?? src.cr4a1_user_login,
      user_login: src.user_login ?? src.cr4a1_user_login,
      compartilhamento: src.compartilhamento || {},

      cr4a1_notas_kairosid: src.cr4a1_notas_kairosid,
      cr4a1_titulo: src.cr4a1_titulo,
      cr4a1_private: src.cr4a1_private,
      cr4a1_cor: src.cor !== undefined ? src.cor : (src.cr4a1_cor || ''),
      cr4a1_ficha_id: src.fichaId !== undefined ? src.fichaId : (src.cr4a1_ficha_id || ''),
      cr4a1_ficha_titulo: src.fichaTitulo !== undefined ? src.fichaTitulo : (src.cr4a1_ficha_titulo || ''),
      cr4a1_workspace_id: src.workspaceId ?? src.cr4a1_workspace_id,
      cr4a1_conteudo: src.conteudo ?? src.cr4a1_conteudo,
      cr4a1_evento_id: src.eventoId ?? src.cr4a1_evento_id ?? null,
      cr4a1_arquivos: src.anexos ?? src.cr4a1_arquivos ?? [],
      cr4a1_user_login: src.user_login ?? src.cr4a1_user_login
    };
  };

  // Converte blocos ricos da nota em descrição com microtarefas e tópicos compatíveis com o Trello
  const converterBlocosParaDescricaoFicha = (conteudo = []) => {
    if (!Array.isArray(conteudo)) return '';
    const linhas = [];
    conteudo
      .filter(b => b && b.type !== '__meta__' && b.id !== '__nota_meta__')
      .forEach(b => {
        const val = (b.value || '').trim();
        if (!val) return;
        if (b.type === 'todo') {
          linhas.push(`[${b.checked ? 'x' : ' '}] ${val}`);
        } else if (b.type === 'heading') {
          linhas.push(`### ${val}`);
        } else {
          linhas.push(val);
        }
      });
    return linhas.join('\n\n');
  };

  // Carrega listas do quadro quando o workspace de destino da ficha é alterado
  useEffect(() => {
    if (!isCriarFichaOpen || !fichaFormWs) return;
    let cancelado = false;
    setCarregandoListas(true);
    fetch(`/api/dataverse-proxy?table=cr4a1_listas&$filter=cr4a1_workspace_id eq '${fichaFormWs}'`)
      .then(r => r.json())
      .then(res => {
        if (cancelado) return;
        const l = (res.value || []).sort((a, b) => (Number(a.cr4a1_ordem) || 0) - (Number(b.cr4a1_ordem) || 0));
        setFichaFormListas(l);
        if (l.length > 0) {
          setFichaFormLista(l[0].cr4a1_listaid);
        } else {
          setFichaFormLista('');
        }
      })
      .catch(() => {
        if (!cancelado) toast.error('Erro ao carregar listas do quadro.');
      })
      .finally(() => {
        if (!cancelado) setCarregandoListas(false);
      });
    return () => { cancelado = true; };
  }, [isCriarFichaOpen, fichaFormWs]);

  const abrirModalCriarFicha = () => {
    if (!notaAberta) return;
    const wsInicial = notaAberta.cr4a1_workspace_id || workspaces[0]?.cr4a1_calendarios_workspacesid || '';
    setFichaFormWs(wsInicial);
    setFichaFormTitulo(notaAberta.cr4a1_titulo || 'Nova Ficha');
    setFichaFormResp(currentUserName);
    setFichaFormPrazo('');
    setIsCriarFichaOpen(true);
  };

  const handleConfirmarCriarFicha = async () => {
    if (!fichaFormTitulo.trim()) {
      toast.error('Informe um título para a ficha.');
      return;
    }
    if (!fichaFormLista) {
      toast.error('Selecione uma lista de destino.');
      return;
    }
    setCriandoFicha(true);
    try {
      const notaId = notaAberta.cr4a1_notas_kairosid || notaAberta.cr4a1_id_da_nota;
      const meta = {
        ...META_PADRAO(),
        notasIds: notaId ? [notaId] : []
      };
      const corpo = {
        cr4a1_titulo: fichaFormTitulo.trim(),
        cr4a1_descricao: converterBlocosParaDescricaoFicha(notaAberta.cr4a1_conteudo),
        cr4a1_lista_id: fichaFormLista,
        cr4a1_workspace_id: fichaFormWs,
        cr4a1_responsavel_login: fichaFormResp || currentUserName,
        cr4a1_criador_login: currentUserName,
        cr4a1_concluida: 'Não',
        cr4a1_notificado: 'Sim',
        cr4a1_etiquetas: '',
        cr4a1_cor: notaAberta.cr4a1_cor || '',
        cr4a1_fixada: 'Não',
        cr4a1_data_inicio: fichaFormPrazo ? `${fichaFormPrazo}T09:00:00Z` : null,
        cr4a1_atividades: serializarAtividadesEMeta([], meta)
      };
      const res = await fetch('/api/dataverse-proxy?table=cr4a1_fichas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo)
      });
      if (!res.ok) throw new Error('Falha ao criar ficha');
      const criada = await res.json();
      const fichaId = criada.cr4a1_fichaid;
      const fichaTitulo = criada.cr4a1_titulo || fichaFormTitulo.trim();

      if (notaId && !notaAberta.isNew) {
        await updateNota(notaId, buildNotaPayload({ fichaId, fichaTitulo, workspaceId: fichaFormWs }));
      }
      setNotaAberta(prev => prev ? ({ ...prev, cr4a1_ficha_id: fichaId, cr4a1_ficha_titulo: fichaTitulo, cr4a1_workspace_id: fichaFormWs }) : prev);
      setIsCriarFichaOpen(false);

      toast.success(
        (t) => (
          <div className="flex items-center gap-2">
            <span>Ficha criada no Quadro!</span>
            {onNavegarParaFicha && (
              <button
                type="button"
                onClick={() => {
                  toast.dismiss(t.id);
                  onNavegarParaFicha(fichaId, fichaFormWs);
                }}
                className="rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground hover:opacity-90"
              >
                Abrir Ficha ↗
              </button>
            )}
          </div>
        ),
        { duration: 6000 }
      );
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar ficha a partir da nota.');
    } finally {
      setCriandoFicha(false);
    }
  };

  const carregarFichasParaVincular = async () => {
    setCarregandoFichasParaVincular(true);
    try {
      const ws = notaAberta?.cr4a1_workspace_id || '';
      const filtro = ws ? `cr4a1_workspace_id eq '${ws}'` : '';
      const url = `/api/dataverse-proxy?table=cr4a1_fichas${filtro ? `&$filter=${filtro}` : ''}&$top=50&$orderby=modifiedon desc`;
      const res = await fetch(url).then(r => r.json());
      setFichasParaVincular(res.value || []);
    } catch {
      toast.error('Erro ao buscar fichas.');
    } finally {
      setCarregandoFichasParaVincular(false);
    }
  };

  const handleVincularFicha = async (ficha) => {
    if (!notaAberta) return;
    const notaId = notaAberta.cr4a1_notas_kairosid || notaAberta.cr4a1_id_da_nota;
    try {
      await updateNota(notaId, buildNotaPayload({ fichaId: ficha.cr4a1_fichaid, fichaTitulo: ficha.cr4a1_titulo, workspaceId: ficha.cr4a1_workspace_id }));
      setNotaAberta(prev => ({ ...prev, cr4a1_ficha_id: ficha.cr4a1_fichaid, cr4a1_ficha_titulo: ficha.cr4a1_titulo, cr4a1_workspace_id: ficha.cr4a1_workspace_id }));

      const meta = parseFichaMeta(ficha.cr4a1_atividades);
      const notasAtuais = Array.isArray(meta.notasIds) ? meta.notasIds : [];
      if (!notasAtuais.includes(notaId)) {
        const novasNotasIds = [...notasAtuais, notaId];
        const novoAtividades = registrarAtividade(ficha.cr4a1_atividades, 'nota_vinculada', currentUserName, `Nota "${notaAberta.cr4a1_titulo || 'Sem título'}" vinculada`, { notasIds: novasNotasIds });
        await fetch(`/api/dataverse-proxy?table=cr4a1_fichas&id=${ficha.cr4a1_fichaid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cr4a1_atividades: novoAtividades })
        });
      }
      setVincularFichaPopoverAberto(false);
      toast.success(`Nota vinculada à ficha "${ficha.cr4a1_titulo}"!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao vincular nota à ficha.');
    }
  };

  const handleDesvincularFicha = async () => {
    if (!notaAberta) return;
    const notaId = notaAberta.cr4a1_notas_kairosid || notaAberta.cr4a1_id_da_nota;
    const fichaIdAntiga = notaAberta.cr4a1_ficha_id;
    try {
      await updateNota(notaId, buildNotaPayload({ fichaId: '', fichaTitulo: '' }));
      setNotaAberta(prev => ({ ...prev, cr4a1_ficha_id: '', cr4a1_ficha_titulo: '' }));

      if (fichaIdAntiga) {
        fetch(`/api/dataverse-proxy?table=cr4a1_fichas&$filter=cr4a1_fichaid eq '${fichaIdAntiga}'`)
          .then(r => r.json())
          .then(res => {
            const f = res.value?.[0];
            if (f) {
              const meta = parseFichaMeta(f.cr4a1_atividades);
              const novasNotasIds = (meta.notasIds || []).filter(id => id !== notaId);
              const novoAtividades = registrarAtividade(f.cr4a1_atividades, 'nota_desvinculada', currentUserName, 'Nota desvinculada', { notasIds: novasNotasIds });
              fetch(`/api/dataverse-proxy?table=cr4a1_fichas&id=${f.cr4a1_fichaid}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cr4a1_atividades: novoAtividades })
              }).catch(() => {});
            }
          })
          .catch(() => {});
      }
      toast.success('Vínculo com a ficha removido.');
    } catch {
      toast.error('Erro ao desvincular ficha.');
    }
  };

  const handleSelectCorNota = async (hex) => {
    if (!notaAberta) return;
    const novaCor = hex || '';
    setNotaAberta(prev => prev ? ({ ...prev, cr4a1_cor: novaCor }) : prev);
    setCorPopoverAberto(false);
    if (novaCor) {
      registrarCorRecenteUsuario?.('nota', novaCor);
    }
    if (!isEditing && notaAberta.cr4a1_notas_kairosid && !notaAberta.isNew) {
      await updateNota(notaAberta.cr4a1_notas_kairosid, buildNotaPayload({ cr4a1_cor: novaCor }));
    }
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
    const antigos = Object.keys(notaAberta?.compartilhamento || {});
    const novos = Object.keys(novoCompartilhamento || {}).filter(u => !antigos.includes(u));

    if (novos.length > 0) {
      notificarCompartilhamento({
        tipoItem: 'Nota',
        itemTitulo: notaAberta?.cr4a1_titulo || 'Nota sem título',
        autor: currentUserName,
        destinatarios: novos,
        currentUser: currentUserName,
        allUsers,
        detalhes: {
          origem: 'Notas',
          workspace: workspaces?.find(w => w.cr4a1_calendarios_workspacesid === notaAberta?.cr4a1_workspace_id)?.cr4a1_nome || ''
        }
      });
    }

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

    // Notifica mencões com @usuario adicionadas nesta nota
    const textoCompletoNovo = `${notaAberta.cr4a1_titulo || ''}\n${(notaAberta.cr4a1_conteudo || []).map(b => b.value || '').join('\n')}`;
    const notaOriginal = notas.find(n => n.cr4a1_notas_kairosid === notaAberta.cr4a1_notas_kairosid || n.cr4a1_id_da_nota === notaAberta.cr4a1_notas_kairosid);
    const textoCompletoAntigo = (notaOriginal && !notaAberta.isNew) ? `${notaOriginal.cr4a1_titulo || ''}\n${(notaOriginal.cr4a1_conteudo || []).map(b => b.value || '').join('\n')}` : '';

    await notificarMencoes({
      textoNovo: textoCompletoNovo,
      textoAntigo: textoCompletoAntigo,
      origem: 'Nota',
      itemTitulo: notaAberta.cr4a1_titulo || 'Nota sem título',
      autor: currentUserName,
      currentUser: currentUserName,
      allUsers,
      workspace: workspaces?.find(w => w.cr4a1_calendarios_workspacesid === notaAberta.cr4a1_workspace_id)?.cr4a1_nome || ''
    });

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
    const id = notaAberta?.cr4a1_notas_kairosid || notaAberta?.cr4a1_id_da_nota;
    if (!id || notaAberta.isNew) return;
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
    try {
      await deleteNota(id);
      setNotaAberta(null);
    } catch (err) {
      console.error('Erro ao excluir nota:', err);
      toast.error('Erro ao excluir nota. Tente novamente.');
    }
  };

  // TELA DE DETALHE DA NOTA (LEITURA OU EDIÇÃO)
  if (notaAberta) {
    const currentWorkspace = workspaces.find(ws => ws.cr4a1_calendarios_workspacesid === notaAberta.cr4a1_workspace_id);
    const wsColor = getWorkspaceColor(notaAberta.cr4a1_workspace_id);
    const notaColor = notaAberta.cr4a1_cor || wsColor;
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
      <div className="p-3 sm:p-6 bg-card rounded-2xl sm:rounded-3xl h-full overflow-y-auto">
        <style>{NOTES_PANEL_STYLES}</style>

        {/* CABEÇALHO COM BOTÕES DE AÇÃO */}
        <div className="sticky top-0 z-20 -mx-3 -mt-3 sm:-mx-6 sm:-mt-6 mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 bg-card/95 backdrop-blur-md p-3 sm:p-4 rounded-t-2xl sm:rounded-t-3xl border-b border-border/50">
          <div className="flex items-center gap-2.5 sm:gap-3">
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

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Botão de Criar Ficha no Trello a partir desta Nota */}
            <Button
              type="button"
              variant="outline"
              className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
              onClick={abrirModalCriarFicha}
              title="Criar Ficha no Quadro Trello a partir desta nota"
            >
              <Kanban className="size-[17px]" />
              <span>Criar Ficha</span>
            </Button>

            {/* Seletor de Cor do Cartão da Nota (com fila de cores recentes do usuário) */}
            {canEdit && (
              <Popover open={corPopoverAberto} onOpenChange={setCorPopoverAberto}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1.5"
                    title="Escolher cor do cartão da nota"
                  >
                    <Palette className="size-[17px]" style={{ color: notaColor }} />
                    <span>Cor</span>
                    <span
                      className="size-3.5 rounded-full border border-border"
                      style={{ backgroundColor: notaColor }}
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64">
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectCorNota('')}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary"
                    >
                      <Ban className="size-3.5" /> Usar cor padrão do setor
                    </button>
                    {coresRecentesNota.length > 0 && (
                      <div className="flex flex-col gap-1.5 border-b border-border pb-2">
                        <span className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Cores recentes
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 px-1">
                          {coresRecentesNota.map((hex, idx) => {
                            const corInfo = themeColors.find(c => c.hex.toLowerCase() === hex.toLowerCase());
                            const label = corInfo ? `${corInfo.label}${idx === 0 ? ' (Última usada)' : ''}` : hex;
                            const selecionada = (notaAberta.cr4a1_cor || '').toLowerCase() === hex.toLowerCase();
                            return (
                              <button
                                key={hex}
                                type="button"
                                onClick={() => handleSelectCorNota(hex)}
                                title={label}
                                aria-label={label}
                                className="size-5 shrink-0 rounded-full transition-transform hover:scale-110 active:scale-90"
                                style={{
                                  backgroundColor: hex,
                                  boxShadow: selecionada || idx === 0
                                    ? `0 0 0 2px var(--card), 0 0 0 3.5px ${hex}`
                                    : 'none'
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="grid max-h-44 grid-cols-10 gap-1.5 overflow-y-auto p-1">
                      {themeColors.map(c => {
                        const selecionada = (notaAberta.cr4a1_cor || '').toLowerCase() === c.hex.toLowerCase();
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectCorNota(c.hex)}
                            title={c.label}
                            aria-label={c.label}
                            className="size-5 shrink-0 rounded-full transition-transform active:scale-90"
                            style={{
                              backgroundColor: c.hex,
                              boxShadow: selecionada ? `0 0 0 2px var(--card), 0 0 0 3.5px ${c.hex}` : 'none'
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

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
        <div
          className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-5 border-b border-border pb-5 rounded-2xl p-4 sm:p-5"
          style={{
            borderLeft: `4px solid ${notaColor}`,
            marginTop: '-4px',
            background: `linear-gradient(135deg, ${notaColor}22, transparent 65%)`
          }}
        >

          {isEditing ? (
            <MentionInput
              allUsers={allUsers}
              type="text"
              placeholder="Título da Nota..."
              value={notaAberta.cr4a1_titulo}
              onChange={e => setNotaAberta({ ...notaAberta, cr4a1_titulo: e.target.value })}
              className="w-full sm:w-1/2 text-xl sm:text-2xl font-extrabold border-none bg-transparent outline-none text-foreground"
            />
          ) : (
            <h1 className="w-full sm:w-1/2 text-xl sm:text-2xl font-extrabold m-0 text-foreground">
              {notaAberta.cr4a1_titulo || 'Nota sem título'}
            </h1>
          )}

          <div className="flex flex-col gap-2.5 items-start sm:items-end w-full sm:w-1/2">
            {isEditing ? (
              <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2.5 w-full">
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
                    <SelectTrigger className="w-full sm:w-auto min-w-[150px]"><SelectValue placeholder="Selecione o Workspace" /></SelectTrigger>
                    <SelectContent>
                      {workspaces.map(ws => (
                        <SelectItem key={ws.cr4a1_calendarios_workspacesid} value={ws.cr4a1_calendarios_workspacesid}>{ws.cr4a1_nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select value={notaAberta.cr4a1_evento_id || '__none__'} onValueChange={(val) => setNotaAberta({ ...notaAberta, cr4a1_evento_id: val === '__none__' ? '' : val })}>
                  <SelectTrigger className="w-full sm:w-auto min-w-[180px]"><SelectValue placeholder="Associar a um Evento" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Desvincular evento</SelectItem>
                    {eventosDisponiveis.map(ev => (
                      <SelectItem key={ev.cr4a1_agenda_kairosid} value={ev.cr4a1_agenda_kairosid}>🔗 {ev.cr4a1_titulo || 'Evento sem título'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 w-full">
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

                {/* Vínculo com Ficha do Trello */}
                {notaAberta.cr4a1_ficha_id ? (
                  <div className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    <Kanban className="size-3.5 text-primary shrink-0" />
                    <span className="truncate max-w-[200px]" title={notaAberta.cr4a1_ficha_titulo || 'Ficha Vinculada'}>
                      {notaAberta.cr4a1_ficha_titulo || 'Ficha do Trello'}
                    </span>
                    {onNavegarParaFicha && (
                      <button
                        type="button"
                        onClick={() => onNavegarParaFicha(notaAberta.cr4a1_ficha_id, notaAberta.cr4a1_workspace_id)}
                        className="ml-1 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold hover:opacity-90 transition-opacity"
                        title="Abrir esta ficha no quadro Trello"
                      >
                        <span>Abrir</span>
                        <ExternalLink className="size-2.5" />
                      </button>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={handleDesvincularFicha}
                        className="ml-0.5 text-muted-foreground hover:text-destructive"
                        title="Desvincular ficha desta nota"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <Popover open={vincularFichaPopoverAberto} onOpenChange={(open) => { setVincularFichaPopoverAberto(open); if (open) carregarFichasParaVincular(); }}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        title="Vincular esta nota a uma ficha existente do Trello"
                      >
                        <Link2 className="size-3" /> Vincular Ficha
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 p-2.5">
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-foreground">Vincular a uma Ficha do Trello</span>
                        <Input
                          placeholder="Buscar ficha por título..."
                          value={buscaFichaParaVincular}
                          onChange={e => setBuscaFichaParaVincular(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <div className="flex max-h-52 flex-col gap-1 overflow-y-auto">
                          {carregandoFichasParaVincular ? (
                            <div className="flex items-center justify-center p-3 text-xs text-muted-foreground">
                              <Loader2 className="size-3.5 animate-spin mr-1.5" /> Carregando fichas...
                            </div>
                          ) : (
                            fichasParaVincular
                              .filter(f => !buscaFichaParaVincular.trim() || (f.cr4a1_titulo || '').toLowerCase().includes(buscaFichaParaVincular.toLowerCase()))
                              .map(f => (
                                <button
                                  key={f.cr4a1_fichaid}
                                  type="button"
                                  onClick={() => handleVincularFicha(f)}
                                  className="flex flex-col items-start rounded-lg p-2 text-left text-xs hover:bg-secondary transition-colors"
                                >
                                  <span className="font-semibold text-foreground line-clamp-1">{f.cr4a1_titulo}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {workspaces.find(w => w.cr4a1_calendarios_workspacesid === f.cr4a1_workspace_id)?.cr4a1_nome || 'Quadro'}
                                  </span>
                                </button>
                              ))
                          )}
                          {!carregandoFichasParaVincular && fichasParaVincular.length === 0 && (
                            <p className="p-2 text-center text-[11px] text-muted-foreground">Nenhuma ficha encontrada no setor.</p>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
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
            <TodoProgress done={todoStats.done} total={todoStats.total} color={notaColor} />
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
                        placeholder="Escreva um texto... (use @ para mencionar)"
                        minHeightClass="min-h-[44px]"
                        allUsers={allUsers}
                        coresRecentes={coresRecentesMarcaTexto}
                        onSelectCorRecente={(hex) => registrarCorRecenteUsuario?.('marcaTexto', hex)}
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

        {/* Diálogo de Confirmação (Exclusão e Descarte na tela de detalhe/edição) */}
        {ConfirmDialogHost}
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
        <Button onClick={createNewNota} style={{ background: '#f57c00', animation: 'fabEntrance 0.2s ease-out backwards' }}>
          <Plus className="size-[18px]" />
          Nova Nota
        </Button>
      </div>

      {activeNotas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Pesquisar notas..." className="w-full sm:max-w-[360px]" inputClassName="rounded-full" />

            {/* Filtro rápido: Todas / Minhas / Compartilhadas */}
            <div className="flex max-w-full overflow-x-auto rounded-full border border-border bg-secondary p-0.5 text-xs scrollbar-none">
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
            const notaColor = nota.cr4a1_cor || wsColor;
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
                  background: nota.cr4a1_cor
                    ? `linear-gradient(135deg, ${nota.cr4a1_cor}22, var(--bg-secondary) 75%)`
                    : 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderLeft: `4px solid ${notaColor}`,
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

                {stats.total > 0 && <TodoProgress done={stats.done} total={stats.total} color={notaColor} />}

                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-1.5 overflow-hidden text-[11px] text-muted-foreground" title={criadaEm ? `Criada em ${criadaEm}` : undefined}>
                    <UserAvatar login={nota.cr4a1_user_login} allUsers={allUsers} size={16} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isNoteAuthor ? 'Você' : (allUsers.find(u => u.cr4a1_username === nota.cr4a1_user_login)?.cr4a1_nome_exibicao || nota.cr4a1_user_login)}
                      {relative ? ` · ${relative}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {nota.cr4a1_ficha_id && (
                      <span
                        className="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary"
                        title={`Vinculada à Ficha: ${nota.cr4a1_ficha_titulo || 'Ficha do Trello'}`}
                      >
                        <Kanban className="size-3" />
                        Ficha
                      </span>
                    )}
                    {nota.cr4a1_evento_id && <Link2 className="size-[14px] shrink-0 text-primary" title="Nota associada a um evento" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {ConfirmDialogHost}

      {/* DIALOG: CRIAR FICHA NO QUADRO A PARTIR DA NOTA */}
      <Dialog open={isCriarFichaOpen} onOpenChange={setIsCriarFichaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Kanban className="size-5 text-primary" />
              Criar Ficha no Quadro
            </DialogTitle>
            <DialogDescription>
              Gere um cartão no quadro Trello vinculado diretamente a esta nota.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div>
              <Label className="text-xs">Título da Ficha</Label>
              <Input
                value={fichaFormTitulo}
                onChange={e => setFichaFormTitulo(e.target.value)}
                placeholder="Título da ficha..."
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Workspace</Label>
                <Select value={fichaFormWs} onValueChange={setFichaFormWs}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Workspace" /></SelectTrigger>
                  <SelectContent>
                    {workspaces.map(ws => (
                      <SelectItem key={ws.cr4a1_calendarios_workspacesid} value={ws.cr4a1_calendarios_workspacesid}>
                        {ws.cr4a1_nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Lista / Coluna</Label>
                <Select value={fichaFormLista} onValueChange={setFichaFormLista} disabled={carregandoListas || fichaFormListas.length === 0}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={carregandoListas ? 'Carregando...' : (fichaFormListas.length === 0 ? 'Sem listas' : 'Selecione a lista')} />
                  </SelectTrigger>
                  <SelectContent>
                    {fichaFormListas.map(l => (
                      <SelectItem key={l.cr4a1_listaid} value={l.cr4a1_listaid}>
                        {l.cr4a1_nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Responsável</Label>
                <Select value={fichaFormResp} onValueChange={setFichaFormResp}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Responsável" /></SelectTrigger>
                  <SelectContent>
                    {allUsers.map(u => (
                      <SelectItem key={u.cr4a1_username} value={u.cr4a1_username}>
                        {u.cr4a1_nome_exibicao || u.cr4a1_username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Prazo (opcional)</Label>
                <input
                  type="date"
                  value={fichaFormPrazo}
                  onChange={e => setFichaFormPrazo(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                />
              </div>
            </div>

            {notaAberta?.cr4a1_conteudo?.some(b => b.type === 'todo') && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
                <CheckSquare className="size-4 text-primary shrink-0" />
                <span>Os tópicos da checklist desta nota serão convertidos em microtarefas na ficha.</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCriarFichaOpen(false)} disabled={criandoFicha}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarCriarFicha} disabled={criandoFicha || !fichaFormLista || !fichaFormTitulo.trim()}>
              {criandoFicha ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Kanban className="size-4 mr-1.5" />}
              {criandoFicha ? 'Criando ficha...' : 'Criar Ficha no Quadro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
