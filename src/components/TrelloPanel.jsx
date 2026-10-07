import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { format, addHours } from 'date-fns';
import { Plus, Trash2, CalendarDays, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { parseAssignees } from '../utils/assignees';

const API_PROXY = '/api/dataverse-proxy';
const q = (valor) => encodeURIComponent(valor);
const comData = (ficha) => !!ficha.cr4a1_data_inicio;

const membrosDoWorkspace = (ws, allUsers) => {
  const logins = new Set([ws?.cr4a1_criador_login, ...parseAssignees(ws?.cr4a1_membros_logins)].filter(Boolean));
  return allUsers.filter(u => logins.has(u.cr4a1_username));
};

const nomeDe = (login, allUsers) => {
  const u = allUsers.find(x => x.cr4a1_username === login);
  return u?.cr4a1_nome_exibicao || login || 'Sem responsável';
};

const ordenar = (lista) => [...lista].sort((a, b) => (a.cr4a1_ordem ?? 0) - (b.cr4a1_ordem ?? 0));

// Monta o horário de início e fim (1 hora) a partir da data e hora escolhidas no formulário.
const intervaloDoEvento = (dia, hora) => {
  const inicio = new Date(`${dia}T${hora}:00`);
  const fim = addHours(inicio, 1);
  return {
    inicioIso: inicio.toISOString(),
    fimIso: fim.toISOString(),
    horaFim: format(fim, 'HH:mm')
  };
};

export const TrelloPanel = ({ workspaces, allUsers, user, refreshEvents }) => {
  const [workspaceEscolhido, setWorkspaceId] = useState('');
  const [versao, setVersao] = useState(0);
  const workspaceId = workspaceEscolhido || workspaces[0]?.cr4a1_calendarios_workspacesid || '';
  const [listas, setListas] = useState([]);
  const [fichas, setFichas] = useState([]);
  const [novaLista, setNovaLista] = useState('');
  const [novaFichaPorLista, setNovaFichaPorLista] = useState({});
  const [editando, setEditando] = useState(null);

  const workspace = useMemo(
    () => workspaces.find(w => w.cr4a1_calendarios_workspacesid === workspaceId),
    [workspaces, workspaceId]
  );
  const membros = useMemo(() => membrosDoWorkspace(workspace, allUsers), [workspace, allUsers]);

  const recarregar = useCallback(() => setVersao(v => v + 1), []);

  useEffect(() => {
    if (!workspaceId) return undefined;
    let cancelado = false;
    const filtro = q(`cr4a1_workspace_id eq '${workspaceId}'`);
    Promise.all([
      fetch(`${API_PROXY}?table=cr4a1_listas&$filter=${filtro}`).then(r => r.json()),
      fetch(`${API_PROXY}?table=cr4a1_fichas&$filter=${filtro}`).then(r => r.json())
    ]).then(([resListas, resFichas]) => {
      if (cancelado) return;
      setListas(ordenar(resListas.value || []));
      setFichas(resFichas.value || []);
    });
    return () => { cancelado = true; };
  }, [workspaceId, versao]);

  const post = (tabela, corpo) => fetch(`${API_PROXY}?table=${tabela}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo)
  });
  const patch = (tabela, id, corpo) => fetch(`${API_PROXY}?table=${tabela}&id=${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo)
  });
  const apagar = (tabela, id) => fetch(`${API_PROXY}?table=${tabela}&id=${id}`, { method: 'DELETE' });

  const criarLista = async () => {
    const nome = novaLista.trim();
    if (!nome) return;
    try {
      await post('cr4a1_listas', { cr4a1_nome: nome, cr4a1_workspace_id: workspaceId, cr4a1_ordem: listas.length, cr4a1_criador_login: user });
      setNovaLista('');
      recarregar();
    } catch { toast.error('Erro ao criar lista.'); }
  };

  const renomearLista = async (lista, nome) => {
    const limpo = nome.trim();
    if (!limpo || limpo === lista.cr4a1_nome) return;
    try {
      await patch('cr4a1_listas', lista.cr4a1_listaid, { cr4a1_nome: limpo });
      recarregar();
    } catch { toast.error('Erro ao renomear lista.'); }
  };

  const removerEventoDaFicha = async (ficha) => {
    if (ficha.cr4a1_evento_id) await apagar('cr4a1_agenda_kairoses', ficha.cr4a1_evento_id);
  };

  const apagarLista = async (lista) => {
    const doLista = fichas.filter(f => f.cr4a1_lista_id === lista.cr4a1_listaid);
    const msg = doLista.length
      ? `Excluir a lista "${lista.cr4a1_nome}" e suas ${doLista.length} ficha(s)?`
      : `Excluir a lista "${lista.cr4a1_nome}"?`;
    if (!window.confirm(msg)) return;
    try {
      for (const f of doLista) {
        await removerEventoDaFicha(f);
        await apagar('cr4a1_fichas', f.cr4a1_fichaid);
      }
      await apagar('cr4a1_listas', lista.cr4a1_listaid);
      recarregar();
      refreshEvents?.();
    } catch { toast.error('Erro ao excluir lista.'); }
  };

  const criarFicha = async (lista) => {
    const titulo = (novaFichaPorLista[lista.cr4a1_listaid] || '').trim();
    if (!titulo) return;
    try {
      await post('cr4a1_fichas', {
        cr4a1_titulo: titulo,
        cr4a1_lista_id: lista.cr4a1_listaid,
        cr4a1_workspace_id: workspaceId,
        cr4a1_responsavel_login: user,
        cr4a1_criador_login: user,
        cr4a1_ordem: fichas.filter(f => f.cr4a1_lista_id === lista.cr4a1_listaid).length,
        cr4a1_concluida: 'Não',
        cr4a1_notificado: 'Sim'
      });
      setNovaFichaPorLista(prev => ({ ...prev, [lista.cr4a1_listaid]: '' }));
      recarregar();
    } catch { toast.error('Erro ao criar ficha.'); }
  };

  // Salva a ficha e mantém o evento da agenda em sintonia com a data escolhida.
  const salvarFicha = async (form, original) => {
    const dataDefinida = !!form.dia;
    const dataIso = dataDefinida ? new Date(`${form.dia}T${form.hora || '08:00'}:00`).toISOString() : null;
    const responsavelMudou = form.responsavel !== original.cr4a1_responsavel_login;
    const dataMudou = (dataIso || '') !== (original.cr4a1_data_inicio || '');
    const avisar = dataDefinida && (!comData(original) || responsavelMudou || dataMudou);

    let eventoId = original.cr4a1_evento_id || '';
    try {
      if (!dataDefinida && eventoId) {
        await apagar('cr4a1_agenda_kairoses', eventoId);
        eventoId = '';
      } else if (dataDefinida && eventoId) {
        const { inicioIso, fimIso, horaFim } = intervaloDoEvento(form.dia, form.hora || '08:00');
        await patch('cr4a1_agenda_kairoses', eventoId, {
          cr4a1_titulo: form.titulo,
          cr4a1_user_login: form.responsavel,
          cr4a1_data_inicio: inicioIso,
          cr4a1_data_fim: fimIso,
          cr4a1_hora_inicio: form.hora || '08:00',
          cr4a1_hora_fim: horaFim
        });
      } else if (dataDefinida) {
        const { inicioIso, fimIso, horaFim } = intervaloDoEvento(form.dia, form.hora || '08:00');
        const resCriado = await post('cr4a1_agenda_kairoses', {
          cr4a1_event_id: crypto.randomUUID(),
          cr4a1_titulo: form.titulo,
          cr4a1_user_login: form.responsavel,
          cr4a1_data_inicio: inicioIso,
          cr4a1_data_fim: fimIso,
          cr4a1_hora_inicio: form.hora || '08:00',
          cr4a1_hora_fim: horaFim,
          cr4a1_tipo: 'Tarefa',
          cr4a1_detalhes: form.descricao || '',
          cr4a1_subtasks: '[]',
          cr4a1_privado: false,
          cr4a1_arquivos: '[]',
          cr4a1_workspace_id: workspaceId
        });
        const criado = await resCriado.json();
        eventoId = criado.cr4a1_agenda_kairosid;
      }

      await patch('cr4a1_fichas', original.cr4a1_fichaid, {
        cr4a1_titulo: form.titulo,
        cr4a1_descricao: form.descricao || '',
        cr4a1_lista_id: form.listaId,
        cr4a1_responsavel_login: form.responsavel,
        cr4a1_data_inicio: dataIso,
        cr4a1_evento_id: eventoId,
        cr4a1_concluida: form.concluida ? 'Sim' : 'Não',
        cr4a1_notificado: avisar ? 'Não' : (original.cr4a1_notificado || 'Sim')
      });

      if (avisar) {
        fetch('/api/push-send', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fichaId: original.cr4a1_fichaid })
        }).catch(() => {});
      }
      setEditando(null);
      recarregar();
      refreshEvents?.();
      toast.success('Ficha salva.');
    } catch {
      toast.error('Erro ao salvar ficha.');
    }
  };

  const excluirFicha = async (ficha) => {
    if (!window.confirm(`Excluir a ficha "${ficha.cr4a1_titulo}"?`)) return;
    try {
      await removerEventoDaFicha(ficha);
      await apagar('cr4a1_fichas', ficha.cr4a1_fichaid);
      setEditando(null);
      recarregar();
      refreshEvents?.();
    } catch { toast.error('Erro ao excluir ficha.'); }
  };

  const abrirFicha = (ficha) => {
    const dataIso = ficha.cr4a1_data_inicio;
    const data = dataIso ? new Date(dataIso) : null;
    setEditando({
      original: ficha,
      form: {
        titulo: ficha.cr4a1_titulo || '',
        descricao: ficha.cr4a1_descricao || '',
        listaId: ficha.cr4a1_lista_id || '',
        responsavel: ficha.cr4a1_responsavel_login || user,
        dia: data ? format(data, 'yyyy-MM-dd') : '',
        hora: data ? format(data, 'HH:mm') : '08:00',
        concluida: ficha.cr4a1_concluida === 'Sim'
      }
    });
  };

  const fichasDaLista = (lista) => ordenar(fichas.filter(f => f.cr4a1_lista_id === lista.cr4a1_listaid));

  return (
    <div className="flex w-full flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground">Fichas</h2>
          <p className="text-sm text-muted-foreground">Listas e fichas do workspace. Fichas com data aparecem na agenda e avisam o responsável.</p>
        </div>
        <Select value={workspaceId} onValueChange={setWorkspaceId}>
          <SelectTrigger className="w-60"><SelectValue placeholder="Workspace" /></SelectTrigger>
          <SelectContent>
            {workspaces.map(w => (
              <SelectItem key={w.cr4a1_calendarios_workspacesid} value={w.cr4a1_calendarios_workspacesid}>{w.cr4a1_nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      <div className="flex items-start gap-3 overflow-x-auto pb-4">
        {listas.map(lista => (
          <section key={lista.cr4a1_listaid} className="flex w-72 shrink-0 flex-col gap-2 rounded-2xl border border-border bg-secondary p-3">
            <div className="flex items-center justify-between gap-2">
              <input
                key={lista.cr4a1_nome}
                defaultValue={lista.cr4a1_nome}
                onBlur={e => renomearLista(lista, e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                aria-label={`Nome da lista ${lista.cr4a1_nome}`}
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-foreground outline-none"
              />
              <Badge variant="secondary">{fichasDaLista(lista).length}</Badge>
              <button onClick={() => apagarLista(lista)} aria-label={`Excluir lista ${lista.cr4a1_nome}`} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {fichasDaLista(lista).map(ficha => (
                <button
                  key={ficha.cr4a1_fichaid}
                  onClick={() => abrirFicha(ficha)}
                  className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary"
                >
                  <span className={`text-sm font-semibold text-foreground ${ficha.cr4a1_concluida === 'Sim' ? 'line-through opacity-60' : ''}`}>{ficha.cr4a1_titulo}</span>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    {comData(ficha) && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                        <CalendarDays className="size-3" />
                        {format(new Date(ficha.cr4a1_data_inicio), 'dd/MM HH:mm')}
                      </span>
                    )}
                    <span>{nomeDe(ficha.cr4a1_responsavel_login, allUsers)}</span>
                  </div>
                </button>
              ))}
            </div>

            <form
              onSubmit={e => { e.preventDefault(); criarFicha(lista); }}
              className="flex gap-1.5"
            >
              <Input
                value={novaFichaPorLista[lista.cr4a1_listaid] || ''}
                onChange={e => setNovaFichaPorLista(prev => ({ ...prev, [lista.cr4a1_listaid]: e.target.value }))}
                placeholder="Nova ficha..."
                className="h-9 bg-card"
              />
              <Button type="submit" size="sm" variant="outline" aria-label="Adicionar ficha"><Plus className="size-4" /></Button>
            </form>
          </section>
        ))}

        <form
          onSubmit={e => { e.preventDefault(); criarLista(); }}
          className="flex w-72 shrink-0 flex-col gap-2 rounded-2xl border border-dashed border-border p-3"
        >
          <Input value={novaLista} onChange={e => setNovaLista(e.target.value)} placeholder="Nova lista..." className="bg-card" />
          <Button type="submit" size="sm" variant="outline">Adicionar lista</Button>
        </form>
      </div>

      {editando && (
        <Dialog open onOpenChange={(open) => !open && setEditando(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Ficha</DialogTitle>
              <DialogDescription>{workspace?.cr4a1_nome}</DialogDescription>
            </DialogHeader>
            <FichaForm
              inicial={editando.form}
              listas={listas}
              membros={membros}
              allUsers={allUsers}
              onCancel={() => setEditando(null)}
              onSave={(form) => salvarFicha(form, editando.original)}
              onDelete={() => excluirFicha(editando.original)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const FichaForm = ({ inicial, listas, membros, allUsers, onCancel, onSave, onDelete }) => {
  const [form, setForm] = useState(inicial);
  const set = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Título</Label>
        <Input value={form.titulo} onChange={e => set('titulo', e.target.value)} />
      </div>

      <div>
        <Label>Descrição</Label>
        <Textarea rows={3} value={form.descricao} onChange={e => set('descricao', e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Lista</Label>
          <Select value={form.listaId} onValueChange={v => set('listaId', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {listas.map(l => <SelectItem key={l.cr4a1_listaid} value={l.cr4a1_listaid}>{l.cr4a1_nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Responsável</Label>
          <Select value={form.responsavel} onValueChange={v => set('responsavel', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(membros.length ? membros : allUsers.filter(u => u.cr4a1_username === form.responsavel)).map(u => (
                <SelectItem key={u.cr4a1_username} value={u.cr4a1_username}>{u.cr4a1_nome_exibicao || u.cr4a1_username}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Data (opcional)</Label>
          <Input type="date" value={form.dia} onChange={e => set('dia', e.target.value)} />
        </div>
        <div>
          <Label>Hora</Label>
          <Input type="time" value={form.hora} onChange={e => set('hora', e.target.value)} disabled={!form.dia} />
        </div>
      </div>
      {form.dia && (
        <button type="button" onClick={() => set('dia', '')} className="inline-flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground">
          <X className="size-3" /> Remover data (a ficha continua no quadro e sai da agenda)
        </button>
      )}

      <div className="flex items-center justify-between rounded-xl border border-border bg-secondary px-4 py-3">
        <Label className="mb-0">Concluída</Label>
        <Switch checked={form.concluida} onCheckedChange={v => set('concluida', v)} />
      </div>

      <DialogFooter className="justify-between">
        <Button variant="ghost" className="text-destructive" onClick={onDelete}>
          <Trash2 className="size-4" /> Excluir
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.titulo.trim() || !form.listaId}>Salvar</Button>
        </div>
      </DialogFooter>
    </div>
  );
};
