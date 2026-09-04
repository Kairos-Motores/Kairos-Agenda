import React, { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft, AlertTriangle, Loader2, Pencil, Plus, Lock, Globe, Link2,
  Search, VolumeX, SearchX, X, FileText, User as UserIcon, Check
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';

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
// COMPONENTE AUXILIAR: Checkbox animado estilo MD3
// ============================================================================
const TodoCheckbox = ({ checked, onChange }) => (
  <span
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    className="boing-effect"
    style={{
      width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0, cursor: 'pointer',
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
// ============================================================================


export const NotesPanel = ({
  notas = [],
  eventos = [],
  addNota,
  updateNota,
  deleteNota,
  currentUser,
  workspaces = [],
  activeWorkspaces = [],
  eventId = null
}) => {
  const [notaAberta, setNotaAberta] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const confirmDeleteTimerRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkspaceFilter, setSelectedWorkspaceFilter] = useState(null);

  useEffect(() => () => { if (confirmDeleteTimerRef.current) clearTimeout(confirmDeleteTimerRef.current); }, []);

  const getWorkspaceColor = (wsId) => workspaces.find(w => w.cr4a1_calendarios_workspacesid === wsId)?.cr4a1_cor_hex || '#f57c00';

  // Lógica de Privacidade, Workspace e Filtro de Evento
  const activeNotas = notas.filter(n => {
    if (eventId && n.cr4a1_evento_id !== eventId) return false;
    const isInWorkspace = activeWorkspaces.includes(n.cr4a1_workspace_id);
    if (!isInWorkspace) return false;

    const isPrivate = n.cr4a1_private === true || n.cr4a1_private === 'true';
    const currentUserName = currentUser?.cr4a1_username || currentUser?.login || currentUser?.nome || currentUser?.name || '';
    const isAuthor = n.cr4a1_user_login === currentUserName;
    if (isPrivate && !isAuthor) return false;

    return true;
  });

  const visibleNotas = activeNotas.filter(n => {
    const matchesSearch = !searchTerm || (n.cr4a1_titulo || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWorkspace = !selectedWorkspaceFilter || n.cr4a1_workspace_id === selectedWorkspaceFilter;
    return matchesSearch && matchesWorkspace;
  });

  const availableWorkspaces = workspaces.filter(ws => activeWorkspaces.includes(ws.cr4a1_calendarios_workspacesid));

  const openNota = (nota) => {
    setNotaAberta({ ...nota, isNew: false }); // Garante que a flag de edição saiba que a nota já existe
    setIsEditing(false);
    setConfirmingDelete(false);
  };

  const createNewNota = () => {
    setNotaAberta({
      cr4a1_notas_kairosid: crypto.randomUUID(),
      isNew: true,
      cr4a1_titulo: '',
      cr4a1_private: false,
      cr4a1_workspace_id: activeWorkspaces[0] || '',
      cr4a1_evento_id: eventId || '',
      cr4a1_user_login: currentUser?.cr4a1_username || currentUser?.login || currentUser?.nome || currentUser?.name || 'Usuário Atual',
      cr4a1_conteudo: [{ id: crypto.randomUUID(), type: 'text', value: '' }]
    });
    setIsEditing(true);
    setConfirmingDelete(false);
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

  // Remove o bloco com uma pequena animação de saída antes de tirá-lo da lista
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
      user: src.cr4a1_user_login,
      user_login: src.cr4a1_user_login,

      cr4a1_notas_kairosid: src.cr4a1_notas_kairosid,
      cr4a1_titulo: src.cr4a1_titulo,
      cr4a1_private: src.cr4a1_private,
      cr4a1_workspace_id: src.cr4a1_workspace_id,
      cr4a1_conteudo: src.cr4a1_conteudo,
      cr4a1_evento_id: src.cr4a1_evento_id || null,
      cr4a1_user_login: src.cr4a1_user_login
    };
  };

  // Alterna o estado de um tópico. Se a nota não estiver em edição, salva a mudança na hora
  // (permite marcar/desmarcar itens direto na leitura, como uma checklist viva).
  const toggleTodoChecked = async (blockId) => {
    const updatedConteudo = notaAberta.cr4a1_conteudo.map(b => b.id === blockId ? { ...b, checked: !b.checked } : b);
    setNotaAberta(prev => prev ? ({ ...prev, cr4a1_conteudo: updatedConteudo }) : prev);

    if (!isEditing && notaAberta.cr4a1_notas_kairosid && !notaAberta.isNew) {
      await updateNota(notaAberta.cr4a1_notas_kairosid, buildNotaPayload({ cr4a1_conteudo: updatedConteudo }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const data = buildNotaPayload();

    // CORREÇÃO DA EDIÇÃO: Valida se a nota possui ID válido e NÃO é uma nova criação
    if (notaAberta.cr4a1_notas_kairosid && !notaAberta.isNew) {
      await updateNota(notaAberta.cr4a1_notas_kairosid, data);
    } else {
      await addNota(data);
    }

    setIsSaving(false);
    setNotaAberta(prev => prev ? ({ ...prev, isNew: false }) : prev);
    setIsEditing(false);
  };

  const handleDeleteClick = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      if (confirmDeleteTimerRef.current) clearTimeout(confirmDeleteTimerRef.current);
      confirmDeleteTimerRef.current = setTimeout(() => setConfirmingDelete(false), 3000);
      return;
    }
    if (confirmDeleteTimerRef.current) clearTimeout(confirmDeleteTimerRef.current);
    if (notaAberta.cr4a1_notas_kairosid && !notaAberta.isNew) {
      deleteNota(notaAberta.cr4a1_notas_kairosid);
    }
    setNotaAberta(null);
  };

  // TELA DE DETALHE DA NOTA (LEITURA OU EDIÇÃO)
  if (notaAberta) {
    const currentWorkspace = workspaces.find(ws => ws.cr4a1_calendarios_workspacesid === notaAberta.cr4a1_workspace_id);
    const wsColor = getWorkspaceColor(notaAberta.cr4a1_workspace_id);

    // CORREÇÃO DA LISTAGEM DE EVENTOS: Se não filtrar estritamente por workspace, traz todos os eventos disponíveis para evitar tela vazia
    const eventosDisponiveis = eventos.length > 0 ? eventos : [];

    const eventoAssociado = eventos.find(ev => ev.cr4a1_agenda_kairosid === notaAberta.cr4a1_evento_id);

    const blockTypeOptions = [
      { value: 'text', label: 'Texto' },
      { value: 'todo', label: 'Tópico' },
      { value: 'heading', label: 'Cabeçalho' }
    ];

    const todoStats = getTodoStats(notaAberta.cr4a1_conteudo);
    const relative = formatRelative(notaAberta.modifiedon || notaAberta.createdon);

    return (
      <div style={{ padding: '24px', background: 'var(--bg-primary)', borderRadius: '24px', height: '100%', overflowY: 'auto' }}>

        <style>{NOTES_PANEL_STYLES}</style>

        {/* CABEÇALHO COM BOTÕES DE AÇÃO */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Button onClick={() => setNotaAberta(null)} variant="outline">
            <ArrowLeft className="size-[18px]" />
            Voltar
          </Button>

          <div className="flex gap-3">
            {isEditing ? (
              <>
                {notaAberta.cr4a1_notas_kairosid && !notaAberta.isNew && (
                  <Button
                    onClick={handleDeleteClick}
                    variant="destructive"
                    style={confirmingDelete ? { animation: 'kairos-shake 0.4s' } : undefined}
                  >
                    {confirmingDelete && <AlertTriangle className="size-[18px]" />}
                    {confirmingDelete ? 'Confirmar exclusão?' : 'Excluir'}
                  </Button>
                )}
                <Button onClick={() => { if (!notaAberta.isNew) setIsEditing(false); }} variant="outline">
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isSaving} style={{ background: '#f57c00' }}>
                  {isSaving && <Loader2 className="size-[18px] animate-spin" />}
                  {isSaving ? 'Salvando...' : 'Salvar Nota'}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} style={{ background: '#f57c00' }}>
                <Pencil className="size-[18px]" />
                Editar Nota
              </Button>
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
                <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2">
                  {notaAberta.cr4a1_private ? <Lock className="size-4 text-[#f57c00]" /> : <Globe className="size-4 text-muted-foreground" />}
                  <Label htmlFor="nota-private-switch" className="cursor-pointer text-xs font-semibold" style={{ color: notaAberta.cr4a1_private ? '#f57c00' : 'var(--text-secondary)' }}>
                    {notaAberta.cr4a1_private ? 'Nota Privada' : 'Nota Pública'}
                  </Label>
                  <Switch id="nota-private-switch" checked={!!notaAberta.cr4a1_private} onCheckedChange={(val) => setNotaAberta({ ...notaAberta, cr4a1_private: val })} />
                </div>

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
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {notaAberta.cr4a1_private ? <><Lock className="size-[14px] text-[#f57c00]" /> Nota Pessoal</> : <><Globe className="size-[14px]" /> Nota Pública</>}
                </span>
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
                      <TodoCheckbox checked={!!bloco.checked} onChange={() => toggleTodoChecked(bloco.id)} />
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
                    <textarea
                      value={bloco.value}
                      onChange={e => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                        handleBlockChange(bloco.id, e.target.value);
                      }}
                      placeholder="Escreva um texto..."
                      style={{ flex: 1, fontSize: '15px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', padding: '10px 0', resize: 'none', overflow: 'hidden', minHeight: '38px', lineHeight: '1.5' }}
                      rows={1}
                    />
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
            </>

          ) : (

            /* MODO LEITURA */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 8px' }}>
              {(notaAberta.cr4a1_conteudo || []).length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic' }}>Esta nota está vazia.</p>
              )}
              {(notaAberta.cr4a1_conteudo || []).map((bloco) => {
                if (!bloco.value.trim()) return null;

                if (bloco.type === 'heading') {
                  return <h2 key={bloco.id} style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-title)', margin: '8px 0 0 0' }}>{bloco.value}</h2>;
                }
                if (bloco.type === 'todo') {
                  return (
                    <div key={bloco.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <TodoCheckbox checked={!!bloco.checked} onChange={() => toggleTodoChecked(bloco.id)} />
                      <span style={{ fontSize: '15px', color: bloco.checked ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: bloco.checked ? 'line-through' : 'none', transition: 'color 0.2s' }}>
                        {bloco.value}
                      </span>
                    </div>
                  );
                }
                return (
                  <p key={bloco.id} style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {bloco.value}
                  </p>
                );
              })}
            </div>
          )}
        </div>
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
          <div className="relative flex max-w-[360px] items-center">
            <Search className="pointer-events-none absolute left-3 size-[18px] text-muted-foreground" />
            <Input
              type="text"
              placeholder="Pesquisar notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-full pl-10"
            />
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
                Todas
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
          <p>Nenhuma nota corresponde à sua busca.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', overflowY: 'auto', paddingBottom: '24px' }}>
          {visibleNotas.map((nota, idx) => {
            const stats = getTodoStats(nota.cr4a1_conteudo);
            const wsColor = getWorkspaceColor(nota.cr4a1_workspace_id);
            const relative = formatRelative(nota.modifiedon || nota.createdon);
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
                  {nota.cr4a1_private && <Lock className="size-4 shrink-0 text-[#f57c00]" title="Nota Privada" />}
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {nota.cr4a1_conteudo && nota.cr4a1_conteudo.length > 0 ? nota.cr4a1_conteudo.find(b => b.type === 'text' || b.type === 'todo')?.value || '...' : 'Vazio...'}
                </p>

                {stats.total > 0 && <TodoProgress done={stats.done} total={stats.total} color={wsColor} />}

                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-1.5 overflow-hidden text-[11px] text-muted-foreground">
                    <UserIcon className="size-[14px] shrink-0" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{relative ? `editado ${relative}` : nota.cr4a1_user_login}</span>
                  </div>
                  {nota.cr4a1_evento_id && <Link2 className="size-[14px] shrink-0 text-primary" title="Nota associada a um evento" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
