import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { format, addHours } from 'date-fns';
import { Plus, Trash2, CalendarDays, X, Users, Tag, Lock, Unlock, Pencil, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { SearchField } from './ui/search-field';
import { DateField } from './ui/date-field';
import { TimeField } from './ui/time-field';
import { parseAssignees, joinAssignees } from '../utils/assignees';
import { matchesSearch } from '../utils/search';
import { themeColors } from '../constants/materialColors';
import { corUrgenciaData } from '../utils/dateUrgency';
import { useConfirm } from '../hooks/useConfirm';

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

export const TrelloPanel = ({ workspaces, allUsers, user, refreshEvents, isAdmin }) => {
  const [workspaceEscolhido, setWorkspaceId] = useState('');
  const [versao, setVersao] = useState(0);
  const [workspacesExtras, setWorkspacesExtras] = useState([]);
  const [listas, setListas] = useState([]);
  const [fichas, setFichas] = useState([]);
  const [quadro, setQuadro] = useState(null);
  const [etiquetas, setEtiquetas] = useState([]);
  const [novaLista, setNovaLista] = useState('');
  const [novaListaPessoal, setNovaListaPessoal] = useState(false);
  const [novaFichaPorLista, setNovaFichaPorLista] = useState({});
  const [editando, setEditando] = useState(null);
  const [compartilharAberto, setCompartilharAberto] = useState(false);
  const [etiquetasAberto, setEtiquetasAberto] = useState(false);
  const { confirm, ConfirmDialogHost } = useConfirm();

  const recarregar = useCallback(() => setVersao(v => v + 1), []);

  // Workspaces onde o usuário não é membro do calendário, mas foi convidado só pro quadro.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const filtro = q(`contains(cr4a1_colaboradores, '${user}')`);
      const res = await fetch(`${API_PROXY}?table=cr4a1_quadros&$filter=${filtro}`).then(r => r.json());
      if (cancelado) return;
      const conhecidos = new Set(workspaces.map(w => w.cr4a1_calendarios_workspacesid));
      const idsExtras = [...new Set((res.value || []).map(qd => qd.cr4a1_workspace_id))].filter(id => id && !conhecidos.has(id));
      if (idsExtras.length === 0) { setWorkspacesExtras([]); return; }
      const filtroWs = q(idsExtras.map(id => `cr4a1_calendarios_workspacesid eq '${id}'`).join(' or '));
      const resWs = await fetch(`${API_PROXY}?table=cr4a1_calendarios_workspaceses&$filter=${filtroWs}`).then(r => r.json());
      if (!cancelado) setWorkspacesExtras(resWs.value || []);
    })();
    return () => { cancelado = true; };
  }, [user, workspaces]);

  const todasOpcoes = useMemo(() => {
    const vistos = new Set();
    return [...workspaces, ...workspacesExtras].filter(w => {
      if (vistos.has(w.cr4a1_calendarios_workspacesid)) return false;
      vistos.add(w.cr4a1_calendarios_workspacesid);
      return true;
    });
  }, [workspaces, workspacesExtras]);

  const workspaceId = workspaceEscolhido || todasOpcoes[0]?.cr4a1_calendarios_workspacesid || '';
  const workspace = useMemo(
    () => todasOpcoes.find(w => w.cr4a1_calendarios_workspacesid === workspaceId),
    [todasOpcoes, workspaceId]
  );

  const colaboradoresLogins = useMemo(() => parseAssignees(quadro?.cr4a1_colaboradores), [quadro]);
  const membrosBase = useMemo(() => membrosDoWorkspace(workspace, allUsers), [workspace, allUsers]);
  const membros = useMemo(() => {
    const extras = allUsers.filter(u => colaboradoresLogins.includes(u.cr4a1_username) && !membrosBase.some(b => b.cr4a1_username === u.cr4a1_username));
    return [...membrosBase, ...extras];
  }, [membrosBase, allUsers, colaboradoresLogins]);
  const podeGerenciarColaboradores = isAdmin || (!!workspace && workspace.cr4a1_criador_login === user);

  useEffect(() => {
    if (!workspaceId) return undefined;
    let cancelado = false;
    const filtro = q(`cr4a1_workspace_id eq '${workspaceId}'`);
    Promise.all([
      fetch(`${API_PROXY}?table=cr4a1_listas&$filter=${filtro}`).then(r => r.json()),
      fetch(`${API_PROXY}?table=cr4a1_fichas&$filter=${filtro}`).then(r => r.json()),
      fetch(`${API_PROXY}?table=cr4a1_quadros&$filter=${filtro}`).then(r => r.json()),
      fetch(`${API_PROXY}?table=cr4a1_etiquetas&$filter=${filtro}`).then(r => r.json())
    ]).then(([resListas, resFichas, resQuadro, resEtiquetas]) => {
      if (cancelado) return;
      setListas(ordenar(resListas.value || []));
      setFichas(resFichas.value || []);
      setQuadro((resQuadro.value || [])[0] || null);
      setEtiquetas(resEtiquetas.value || []);
    });
    return () => { cancelado = true; };
  }, [workspaceId, versao]);

  const listasVisiveis = useMemo(
    () => listas.filter(l => l.cr4a1_pessoal !== 'Sim' || l.cr4a1_criador_login === user || isAdmin),
    [listas, user, isAdmin]
  );

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
      await post('cr4a1_listas', { cr4a1_nome: nome, cr4a1_workspace_id: workspaceId, cr4a1_ordem: listas.length, cr4a1_criador_login: user, cr4a1_pessoal: novaListaPessoal ? 'Sim' : 'Não' });
      setNovaLista('');
      setNovaListaPessoal(false);
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

  const alternarListaPessoal = async (lista) => {
    try {
      await patch('cr4a1_listas', lista.cr4a1_listaid, { cr4a1_pessoal: lista.cr4a1_pessoal === 'Sim' ? 'Não' : 'Sim' });
      recarregar();
    } catch { toast.error('Erro ao atualizar a lista.'); }
  };

  const removerEventoDaFicha = async (ficha) => {
    if (ficha.cr4a1_evento_id) await apagar('cr4a1_agenda_kairoses', ficha.cr4a1_evento_id);
  };

  const apagarLista = async (lista) => {
    const doLista = fichas.filter(f => f.cr4a1_lista_id === lista.cr4a1_listaid);
    const msg = doLista.length
      ? `Excluir a lista "${lista.cr4a1_nome}" e suas ${doLista.length} ficha(s)?`
      : `Excluir a lista "${lista.cr4a1_nome}"?`;
    if (!(await confirm(msg, { title: 'Excluir lista' }))) return;
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
        cr4a1_notificado: 'Sim',
        cr4a1_etiquetas: ''
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
        cr4a1_etiquetas: joinAssignees(form.etiquetas),
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
    if (!(await confirm(`Excluir a ficha "${ficha.cr4a1_titulo}"?`, { title: 'Excluir ficha' }))) return;
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
        concluida: ficha.cr4a1_concluida === 'Sim',
        etiquetas: parseAssignees(ficha.cr4a1_etiquetas)
      }
    });
  };

  // Colaboradores do quadro (além dos membros do workspace)
  const salvarColaboradores = async (novosLogins) => {
    const corpo = {
      cr4a1_nome: workspace?.cr4a1_nome || workspaceId,
      cr4a1_workspace_id: workspaceId,
      cr4a1_criador_login: workspace?.cr4a1_criador_login || user,
      cr4a1_colaboradores: joinAssignees(novosLogins)
    };
    try {
      if (quadro?.cr4a1_quadroid) await patch('cr4a1_quadros', quadro.cr4a1_quadroid, { cr4a1_colaboradores: corpo.cr4a1_colaboradores });
      else await post('cr4a1_quadros', corpo);
      recarregar();
    } catch { toast.error('Erro ao atualizar colaboradores.'); }
  };
  const adicionarColaborador = (login) => salvarColaboradores([...colaboradoresLogins, login]);
  const removerColaborador = (login) => salvarColaboradores(colaboradoresLogins.filter(l => l !== login));

  // Etiquetas do quadro
  const criarEtiqueta = async (dados) => {
    try {
      await post('cr4a1_etiquetas', { ...dados, cr4a1_workspace_id: workspaceId, cr4a1_criador_login: user });
      recarregar();
    } catch { toast.error('Erro ao criar etiqueta.'); }
  };
  const editarEtiqueta = async (id, dados) => {
    try {
      await patch('cr4a1_etiquetas', id, dados);
      recarregar();
    } catch { toast.error('Erro ao editar etiqueta.'); }
  };
  const apagarEtiqueta = async (etiqueta) => {
    if (!(await confirm(`Excluir a etiqueta "${etiqueta.cr4a1_nome}"? Ela sai de todas as fichas que a usam.`, { title: 'Excluir etiqueta' }))) return;
    try {
      const comEtiqueta = fichas.filter(f => parseAssignees(f.cr4a1_etiquetas).includes(etiqueta.cr4a1_etiquetaid));
      for (const f of comEtiqueta) {
        const restante = parseAssignees(f.cr4a1_etiquetas).filter(id => id !== etiqueta.cr4a1_etiquetaid);
        await patch('cr4a1_fichas', f.cr4a1_fichaid, { cr4a1_etiquetas: joinAssignees(restante) });
      }
      await apagar('cr4a1_etiquetas', etiqueta.cr4a1_etiquetaid);
      recarregar();
    } catch { toast.error('Erro ao excluir etiqueta.'); }
  };

  const fichasDaLista = (lista) => ordenar(fichas.filter(f => f.cr4a1_lista_id === lista.cr4a1_listaid));

  return (
    <div className="flex w-full flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground">Fichas</h2>
          <p className="text-sm text-muted-foreground">Listas e fichas do workspace. Fichas com data aparecem na agenda e avisam o responsável.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEtiquetasAberto(true)}>
            <Tag className="size-4" /> Etiquetas
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCompartilharAberto(true)}>
            <Users className="size-4" /> Compartilhar
          </Button>
          <Select value={workspaceId} onValueChange={setWorkspaceId}>
            <SelectTrigger className="w-60"><SelectValue placeholder="Workspace" /></SelectTrigger>
            <SelectContent>
              {todasOpcoes.map(w => (
                <SelectItem key={w.cr4a1_calendarios_workspacesid} value={w.cr4a1_calendarios_workspacesid}>{w.cr4a1_nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="flex items-start gap-3 overflow-x-auto pb-4">
        {listasVisiveis.map(lista => {
          const souDono = lista.cr4a1_criador_login === user || isAdmin;
          const pessoal = lista.cr4a1_pessoal === 'Sim';
          return (
            <section key={lista.cr4a1_listaid} className={`flex w-72 shrink-0 flex-col gap-2 rounded-2xl border p-3 ${pessoal ? 'border-primary/40 bg-primary/5' : 'border-border bg-secondary'}`}>
              <div className="flex items-center justify-between gap-2">
                <input
                  key={lista.cr4a1_nome}
                  defaultValue={lista.cr4a1_nome}
                  onBlur={e => renomearLista(lista, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                  aria-label={`Nome da lista ${lista.cr4a1_nome}`}
                  readOnly={!souDono && pessoal}
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-foreground outline-none"
                />
                <Badge variant="secondary">{fichasDaLista(lista).length}</Badge>
                {souDono && (
                  <button
                    onClick={() => alternarListaPessoal(lista)}
                    aria-label={pessoal ? `Tornar "${lista.cr4a1_nome}" visível para todos` : `Tornar "${lista.cr4a1_nome}" pessoal`}
                    title={pessoal ? 'Só você vê esta lista — clique para tornar visível' : 'Tornar pessoal (só você vê)'}
                    className={pessoal ? 'text-primary' : 'text-muted-foreground hover:text-primary'}
                  >
                    {pessoal ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                  </button>
                )}
                <button onClick={() => apagarLista(lista)} aria-label={`Excluir lista ${lista.cr4a1_nome}`} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {fichasDaLista(lista).map(ficha => {
                  const etiquetasDaFicha = parseAssignees(ficha.cr4a1_etiquetas).map(id => etiquetas.find(e => e.cr4a1_etiquetaid === id)).filter(Boolean);
                  return (
                    <button
                      key={ficha.cr4a1_fichaid}
                      onClick={() => abrirFicha(ficha)}
                      className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary"
                    >
                      {etiquetasDaFicha.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {etiquetasDaFicha.map(et => <EtiquetaChip key={et.cr4a1_etiquetaid} etiqueta={et} compacta />)}
                        </div>
                      )}
                      <span className={`text-sm font-semibold text-foreground ${ficha.cr4a1_concluida === 'Sim' ? 'line-through opacity-60' : ''}`}>{ficha.cr4a1_titulo}</span>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        {comData(ficha) && (
                          <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold ${corUrgenciaData(ficha.cr4a1_data_inicio, ficha.cr4a1_concluida === 'Sim')}`}>
                            <CalendarDays className="size-3" />
                            {format(new Date(ficha.cr4a1_data_inicio), 'dd/MM HH:mm')}
                          </span>
                        )}
                        <span>{nomeDe(ficha.cr4a1_responsavel_login, allUsers)}</span>
                      </div>
                    </button>
                  );
                })}
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
          );
        })}

        <form
          onSubmit={e => { e.preventDefault(); criarLista(); }}
          className="flex w-72 shrink-0 flex-col gap-2 rounded-2xl border border-dashed border-border p-3"
        >
          <Input value={novaLista} onChange={e => setNovaLista(e.target.value)} placeholder="Nova lista..." className="bg-card" />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={novaListaPessoal} onCheckedChange={setNovaListaPessoal} />
            Lista pessoal (só eu vejo)
          </label>
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
              listas={listasVisiveis}
              membros={membros}
              allUsers={allUsers}
              etiquetas={etiquetas}
              onCancel={() => setEditando(null)}
              onSave={(form) => salvarFicha(form, editando.original)}
              onDelete={() => excluirFicha(editando.original)}
            />
          </DialogContent>
        </Dialog>
      )}

      {compartilharAberto && (
        <CompartilharDialog
          workspace={workspace}
          membrosBase={membrosBase}
          colaboradoresLogins={colaboradoresLogins}
          allUsers={allUsers}
          podeEditar={podeGerenciarColaboradores}
          onAdd={adicionarColaborador}
          onRemove={removerColaborador}
          onClose={() => setCompartilharAberto(false)}
        />
      )}

      {ConfirmDialogHost}

      {etiquetasAberto && (
        <EtiquetasDialog
          etiquetas={etiquetas}
          onCreate={criarEtiqueta}
          onEdit={editarEtiqueta}
          onDelete={apagarEtiqueta}
          onClose={() => setEtiquetasAberto(false)}
        />
      )}
    </div>
  );
};

const EtiquetaChip = ({ etiqueta, compacta, onClick, selecionada }) => {
  const preenchida = etiqueta.cr4a1_estilo !== 'contorno';
  const estilo = preenchida
    ? { background: etiqueta.cr4a1_cor, color: '#fff', border: `1px solid ${etiqueta.cr4a1_cor}` }
    : { background: 'transparent', color: etiqueta.cr4a1_cor, border: `1.5px solid ${etiqueta.cr4a1_cor}` };
  const Comp = onClick ? 'button' : 'span';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      style={estilo}
      className={`inline-flex items-center gap-1 rounded-full font-semibold transition-transform ${compacta ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'} ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
      title={etiqueta.cr4a1_nome}
    >
      {etiqueta.cr4a1_nome}
      {onClick && selecionada && <Check className="size-3" />}
    </Comp>
  );
};

const FichaForm = ({ inicial, listas, membros, allUsers, etiquetas, onCancel, onSave, onDelete }) => {
  const [form, setForm] = useState(inicial);
  const set = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));
  const alternarEtiqueta = (id) => set('etiquetas', form.etiquetas.includes(id) ? form.etiquetas.filter(e => e !== id) : [...form.etiquetas, id]);

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

      {etiquetas.length > 0 && (
        <div>
          <Label>Etiquetas</Label>
          <div className="flex flex-wrap gap-1.5">
            {etiquetas.map(et => (
              <EtiquetaChip key={et.cr4a1_etiquetaid} etiqueta={et} onClick={() => alternarEtiqueta(et.cr4a1_etiquetaid)} selecionada={form.etiquetas.includes(et.cr4a1_etiquetaid)} />
            ))}
          </div>
        </div>
      )}

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
        <DateField label="Data (opcional)" selectedDate={form.dia} onSelect={d => set('dia', d)} allowClear />
        <TimeField label="Hora" value={form.hora} onSelect={h => set('hora', h)} disabled={!form.dia} />
      </div>
      {form.dia && <p className="text-xs text-muted-foreground">Limpar a data mantém a ficha no quadro, mas ela sai da agenda.</p>}

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

// Quem pode ver/editar o quadro, além dos membros do workspace do calendário.
const CompartilharDialog = ({ workspace, membrosBase, colaboradoresLogins, allUsers, podeEditar, onAdd, onRemove, onClose }) => {
  const [busca, setBusca] = useState('');
  const jaTemAcesso = new Set([...membrosBase.map(m => m.cr4a1_username), ...colaboradoresLogins]);
  const candidatos = busca.trim()
    ? allUsers.filter(u => !jaTemAcesso.has(u.cr4a1_username) && matchesSearch(u.cr4a1_nome_exibicao || u.cr4a1_username, busca)).slice(0, 8)
    : [];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle><Users className="size-5" /> Compartilhar quadro</DialogTitle>
          <DialogDescription>{workspace?.cr4a1_nome}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label>Membros do workspace</Label>
            <p className="mb-1.5 text-[11px] text-muted-foreground">Já veem e editam o quadro, por já fazerem parte do workspace no calendário.</p>
            <div className="flex flex-wrap gap-1.5">
              {membrosBase.map(m => <Badge key={m.cr4a1_username} variant="secondary">{m.cr4a1_nome_exibicao || m.cr4a1_username}</Badge>)}
            </div>
          </div>

          <div>
            <Label>Colaboradores só deste quadro</Label>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {colaboradoresLogins.length === 0 && <p className="text-[12px] italic text-muted-foreground">Nenhum colaborador extra ainda.</p>}
              {colaboradoresLogins.map(login => (
                <div key={login} className="flex items-center justify-between rounded-xl border border-border bg-secondary px-3 py-2 text-sm">
                  <span>{nomeDe(login, allUsers)}</span>
                  {podeEditar && (
                    <button onClick={() => onRemove(login)} aria-label={`Remover ${login}`} className="text-muted-foreground hover:text-destructive">
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {podeEditar ? (
            <div>
              <Label>Adicionar colaborador</Label>
              <SearchField value={busca} onChange={setBusca} placeholder="Buscar por nome..." />
              {candidatos.length > 0 && (
                <div className="mt-1.5 flex flex-col gap-1">
                  {candidatos.map(u => (
                    <button
                      key={u.cr4a1_username}
                      onClick={() => { onAdd(u.cr4a1_username); setBusca(''); }}
                      className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-secondary"
                    >
                      {u.cr4a1_nome_exibicao || u.cr4a1_username}
                      <Plus className="size-4 text-primary" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">Só quem criou o workspace (ou o ADMIN) pode adicionar ou remover colaboradores.</p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Concluído</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const emptyEtiqueta = () => ({ cr4a1_nome: '', cr4a1_cor: themeColors[0].hex, cr4a1_estilo: 'preenchida' });

const EtiquetasDialog = ({ etiquetas, onCreate, onEdit, onDelete, onClose }) => {
  const [editando, setEditando] = useState(null);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle><Tag className="size-5" /> Etiquetas do quadro</DialogTitle>
          <DialogDescription>Crie etiquetas com cor e estilo para organizar as fichas.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {etiquetas.length === 0 && <p className="py-2 text-center text-sm text-muted-foreground">Nenhuma etiqueta criada ainda.</p>}
            {etiquetas.map(et => (
              <div key={et.cr4a1_etiquetaid} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-secondary px-3 py-2">
                <EtiquetaChip etiqueta={et} />
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setEditando(et)} aria-label={`Editar etiqueta ${et.cr4a1_nome}`} className="text-muted-foreground hover:text-primary">
                    <Pencil className="size-4" />
                  </button>
                  <button onClick={() => onDelete(et)} aria-label={`Excluir etiqueta ${et.cr4a1_nome}`} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <EtiquetaForm
            key={editando?.cr4a1_etiquetaid || 'nova'}
            inicial={editando ? { cr4a1_nome: editando.cr4a1_nome, cr4a1_cor: editando.cr4a1_cor, cr4a1_estilo: editando.cr4a1_estilo } : emptyEtiqueta()}
            titulo={editando ? 'Editar etiqueta' : 'Nova etiqueta'}
            onCancel={editando ? () => setEditando(null) : null}
            onSave={(dados) => {
              if (editando) onEdit(editando.cr4a1_etiquetaid, dados);
              else onCreate(dados);
              setEditando(null);
            }}
          />
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Concluído</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const EtiquetaForm = ({ inicial, titulo, onCancel, onSave }) => {
  const [form, setForm] = useState(inicial);
  const set = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-border p-3">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{titulo}</span>
      <Input value={form.cr4a1_nome} onChange={e => set('cr4a1_nome', e.target.value)} placeholder="Nome da etiqueta" />

      <div className="grid max-h-36 grid-cols-10 gap-1.5 overflow-y-auto p-1">
        {themeColors.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => set('cr4a1_cor', c.hex)}
            title={c.label}
            aria-label={c.label}
            className="size-5 shrink-0 rounded-full transition-transform active:scale-90"
            style={{ backgroundColor: c.hex, boxShadow: form.cr4a1_cor === c.hex ? `0 0 0 2px var(--card), 0 0 0 4px ${c.hex}` : 'none' }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => set('cr4a1_estilo', 'preenchida')}
          className={`flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold ${form.cr4a1_estilo !== 'contorno' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
        >
          Preenchida
        </button>
        <button
          type="button"
          onClick={() => set('cr4a1_estilo', 'contorno')}
          className={`flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold ${form.cr4a1_estilo === 'contorno' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
        >
          Contorno
        </button>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>}
        <Button size="sm" onClick={() => onSave(form)} disabled={!form.cr4a1_nome.trim()}>Salvar</Button>
      </div>
    </div>
  );
};
