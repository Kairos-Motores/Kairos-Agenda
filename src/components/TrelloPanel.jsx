import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { format, addHours } from 'date-fns';
import { Plus, Trash2, CalendarDays, X, Users, Tag, Lock, Unlock, Pencil, Check, CheckCircle2, Circle, Image as ImageIcon, Palette, ShieldOff, ShieldAlert, Paperclip, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { SearchField } from './ui/search-field';
import { DateField } from './ui/date-field';
import { TimeField } from './ui/time-field';
import { RichTextEditor } from './ui/rich-text-editor';
import { AttachmentsField } from './ui/attachments-field';
import { parseAssignees, joinAssignees } from '../utils/assignees';
import { matchesSearch } from '../utils/search';
import { themeColors } from '../constants/materialColors';
import { corUrgenciaData } from '../utils/dateUrgency';
import { extrairTarefas, alternarTarefaNaDescricao, marcarTodasTarefas, htmlParaTexto } from '../utils/descricaoTarefas';
import { compressImage } from '../utils/compressImage';
import { parseAnexos } from '../utils/anexos';
import { WORKSPACE_COORD_ROLES } from '../config/roleWorkspaceMap';
import { useConfirm } from '../hooks/useConfirm';

const API_PROXY = '/api/dataverse-proxy';
const q = (valor) => encodeURIComponent(valor);
const comData = (ficha) => !!ficha.cr4a1_data_inicio;
const TRELLO_WORKSPACE_KEY = 'kairos_trello_workspace';
const TRELLO_COLAPSADAS_KEY = 'kairos_trello_listas_colapsadas';
// Intervalo do polling que mantém o quadro em sincronia entre quem está vendo o mesmo Trello.
const TRELLO_POLL_MS = 5000;

const filtrosVazios = () => ({ busca: '', responsaveis: [], etiquetasIds: [], status: 'todas', comData: 'todas', dataDe: '', dataAte: '', anexos: 'todas' });

// Estilo dos chips de filtro (e dos outros botões de alternância tipo pílula espalhados
// pelo painel) — um só lugar pra manter o ativo/inativo consistente.
const chipClass = (ativo) => `rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${ativo ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`;

// Conta quantos "grupos" de filtro estão realmente restringindo algo, pra mostrar no selo do botão.
const contarFiltrosAtivos = (f) => [
  !!f.busca.trim(),
  f.responsaveis.length > 0,
  f.etiquetasIds.length > 0,
  f.status !== 'todas',
  f.comData !== 'todas',
  !!f.dataDe,
  !!f.dataAte,
  f.anexos !== 'todas'
].filter(Boolean).length;

const fichaCombinaComFiltros = (ficha, f) => {
  if (f.busca.trim()) {
    const alvo = `${ficha.cr4a1_titulo || ''} ${htmlParaTexto(ficha.cr4a1_descricao)}`;
    if (!matchesSearch(alvo, f.busca)) return false;
  }
  if (f.responsaveis.length > 0 && !f.responsaveis.includes(ficha.cr4a1_responsavel_login)) return false;
  if (f.etiquetasIds.length > 0) {
    const etiquetasDaFicha = parseAssignees(ficha.cr4a1_etiquetas);
    if (!f.etiquetasIds.some(id => etiquetasDaFicha.includes(id))) return false;
  }
  const concluida = ficha.cr4a1_concluida === 'Sim';
  if (f.status === 'concluidas' && !concluida) return false;
  if (f.status === 'pendentes' && concluida) return false;
  if (f.status === 'atrasadas' && !(comData(ficha) && !concluida && ficha.cr4a1_data_inicio < new Date().toISOString())) return false;
  if (f.comData === 'com' && !comData(ficha)) return false;
  if (f.comData === 'sem' && comData(ficha)) return false;
  if (f.dataDe && (!ficha.cr4a1_data_inicio || ficha.cr4a1_data_inicio < f.dataDe)) return false;
  if (f.dataAte && (!ficha.cr4a1_data_inicio || ficha.cr4a1_data_inicio > `${f.dataAte}T23:59:59`)) return false;
  const temAnexos = parseAnexos(ficha.cr4a1_arquivos).length > 0;
  if (f.anexos === 'com' && !temAnexos) return false;
  if (f.anexos === 'sem' && temAnexos) return false;
  return true;
};

const membrosDoWorkspace = (ws, allUsers) => {
  const logins = new Set([ws?.cr4a1_criador_login, ...parseAssignees(ws?.cr4a1_membros_logins)].filter(Boolean));
  return allUsers.filter(u => logins.has(u.cr4a1_username));
};

const nomeDe = (login, allUsers) => {
  const u = allUsers.find(x => x.cr4a1_username === login);
  return u?.cr4a1_nome_exibicao || login || 'Sem responsável';
};

// Foto do usuário (ou bolinha com a inicial, na cor dele) em formato redondo.
const UserAvatar = ({ login, allUsers, size = 22, className = '' }) => {
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
      style={{ width: dimensao, height: dimensao, backgroundColor: u?.cr4a1_cor || '#3498db', fontSize: `${Math.round(size * 0.45)}px` }}
    >
      {nome?.[0]?.toUpperCase()}
    </div>
  );
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

export const TrelloPanel = ({ workspaces, allUsers, user, currentUser, updateTrelloFundo, refreshEvents, isAdmin, hasRole, dragEndRef }) => {
  const [workspaceEscolhido, setWorkspaceIdRaw] = useState(() => {
    try { return localStorage.getItem(TRELLO_WORKSPACE_KEY) || ''; } catch { return ''; }
  });
  const setWorkspaceId = (id) => {
    setWorkspaceIdRaw(id);
    try { localStorage.setItem(TRELLO_WORKSPACE_KEY, id); } catch { /* sem localStorage, sem persistência */ }
  };
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
  const [fundoAberto, setFundoAberto] = useState(false);
  const [filtrosAberto, setFiltrosAberto] = useState(false);
  const [filtros, setFiltros] = useState(filtrosVazios());
  const [colapsadas, setColapsadas] = useState(() => {
    try { return JSON.parse(localStorage.getItem(TRELLO_COLAPSADAS_KEY) || '[]'); } catch { return []; }
  });
  const { confirm, ConfirmDialogHost } = useConfirm();

  const alternarColapso = (listaId) => {
    setColapsadas(prev => {
      const novo = prev.includes(listaId) ? prev.filter(id => id !== listaId) : [...prev, listaId];
      try { localStorage.setItem(TRELLO_COLAPSADAS_KEY, JSON.stringify(novo)); } catch { /* sem localStorage, só não persiste */ }
      return novo;
    });
  };

  const setFiltro = (campo, valor) => setFiltros(prev => ({ ...prev, [campo]: valor }));
  const toggleFiltroArray = (campo, valor) => setFiltros(prev => ({
    ...prev,
    [campo]: prev[campo].includes(valor) ? prev[campo].filter(v => v !== valor) : [...prev[campo], valor]
  }));
  const filtrosAtivos = contarFiltrosAtivos(filtros);

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

  // O workspace lembrado (localStorage) pode ter ficado inválido (ex.: perdeu acesso) — nesse
  // caso cai pro padrão (primeira opção disponível) assim que as opções terminam de carregar.
  const escolhidoAindaValido = todasOpcoes.some(w => w.cr4a1_calendarios_workspacesid === workspaceEscolhido);
  const workspaceId = (workspaceEscolhido && escolhidoAindaValido) ? workspaceEscolhido : (todasOpcoes[0]?.cr4a1_calendarios_workspacesid || '');
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

  // Quem coordena o setor (mesmo papel "COORD X" que já libera os painéis de BI do setor)
  // pode bloquear o acesso de membros do workspace ao Trello — além do ADMIN, sempre.
  const coordRolesDoWorkspace = WORKSPACE_COORD_ROLES[workspace?.cr4a1_nome] || [];
  const podeGerenciarBloqueios = isAdmin || coordRolesDoWorkspace.some(papel => hasRole?.(papel));
  const bloqueadosLogins = useMemo(() => parseAssignees(quadro?.cr4a1_bloqueados), [quadro]);
  const estouBloqueado = !isAdmin && bloqueadosLogins.includes(user);

  // Recarrega o quadro ao trocar de workspace/versão e, enquanto a tela estiver aberta,
  // vai repetindo em segundo plano — é assim que fichas criadas/concluídas por outra
  // pessoa no mesmo Trello aparecem aqui sem precisar atualizar a página.
  useEffect(() => {
    if (!workspaceId) return undefined;
    let cancelado = false;
    const filtro = q(`cr4a1_workspace_id eq '${workspaceId}'`);
    const carregar = () => {
      if (document.hidden) return;
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
    };
    carregar();
    const intervalo = setInterval(carregar, TRELLO_POLL_MS);
    return () => { cancelado = true; clearInterval(intervalo); };
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
    // Havendo microtarefas, elas mandam no "concluída" (ex.: adicionar uma tarefa nova
    // nova e pendente reabre o cartão mesmo que o interruptor tenha ficado em "concluída").
    const tarefasDaDescricao = extrairTarefas(form.descricao);
    const concluidaFinal = tarefasDaDescricao.length > 0
      ? tarefasDaDescricao.every(t => t.concluida)
      : form.concluida;

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
          cr4a1_detalhes: htmlParaTexto(form.descricao),
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
        cr4a1_concluida: concluidaFinal ? 'Sim' : 'Não',
        cr4a1_etiquetas: joinAssignees(form.etiquetas),
        cr4a1_arquivos: JSON.stringify(form.anexos || []),
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
        etiquetas: parseAssignees(ficha.cr4a1_etiquetas),
        anexos: parseAnexos(ficha.cr4a1_arquivos)
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

  // Bloqueio de acesso ao Trello do setor (membros do workspace que não devem ver as fichas).
  const salvarBloqueados = async (novosLogins) => {
    const corpo = {
      cr4a1_nome: workspace?.cr4a1_nome || workspaceId,
      cr4a1_workspace_id: workspaceId,
      cr4a1_criador_login: workspace?.cr4a1_criador_login || user,
      cr4a1_bloqueados: joinAssignees(novosLogins)
    };
    try {
      if (quadro?.cr4a1_quadroid) await patch('cr4a1_quadros', quadro.cr4a1_quadroid, { cr4a1_bloqueados: corpo.cr4a1_bloqueados });
      else await post('cr4a1_quadros', corpo);
      recarregar();
    } catch { toast.error('Erro ao atualizar os bloqueios.'); }
  };
  const bloquearMembro = (login) => salvarBloqueados([...bloqueadosLogins, login]);
  const desbloquearMembro = (login) => salvarBloqueados(bloqueadosLogins.filter(l => l !== login));

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

  const fichasVisiveis = useMemo(
    () => (filtrosAtivos === 0 ? fichas : fichas.filter(f => fichaCombinaComFiltros(f, filtros))),
    [fichas, filtros, filtrosAtivos]
  );
  const fichasDaLista = (lista) => ordenar(fichasVisiveis.filter(f => f.cr4a1_lista_id === lista.cr4a1_listaid));

  // Marca a ficha como concluída/pendente direto no card, sem abrir o formulário.
  // Concluir o cartão também marca todas as microtarefas (o card reflete o estado delas).
  const toggleConcluida = async (ficha) => {
    const novoValor = ficha.cr4a1_concluida === 'Sim' ? 'Não' : 'Sim';
    const novaDescricao = novoValor === 'Sim' ? marcarTodasTarefas(ficha.cr4a1_descricao, true) : ficha.cr4a1_descricao;
    setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_concluida: novoValor, cr4a1_descricao: novaDescricao } : f));
    try {
      await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_concluida: novoValor, cr4a1_descricao: novaDescricao });
    } catch {
      toast.error('Erro ao atualizar ficha.');
      setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_concluida: ficha.cr4a1_concluida, cr4a1_descricao: ficha.cr4a1_descricao } : f));
    }
  };

  // Marca/desmarca uma microtarefa direto no card. O cartão segue o estado das tarefas: todas
  // concluídas marca o cartão sozinho, qualquer uma pendente reabre o cartão automaticamente.
  const toggleMicrotarefa = async (ficha, indiceTarefa) => {
    const novaDescricao = alternarTarefaNaDescricao(ficha.cr4a1_descricao, indiceTarefa);
    const tarefas = extrairTarefas(novaDescricao);
    const novoConcluida = tarefas.length > 0 && tarefas.every(t => t.concluida) ? 'Sim' : 'Não';
    setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_descricao: novaDescricao, cr4a1_concluida: novoConcluida } : f));
    try {
      await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_descricao: novaDescricao, cr4a1_concluida: novoConcluida });
    } catch {
      toast.error('Erro ao atualizar microtarefa.');
      setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_descricao: ficha.cr4a1_descricao, cr4a1_concluida: ficha.cr4a1_concluida } : f));
    }
  };

  // Arrasta a ficha entre listas (ou reordena na mesma lista), recalculando cr4a1_ordem.
  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const origemId = source.droppableId;
    const destinoId = destination.droppableId;
    const ficha = fichas.find(f => f.cr4a1_fichaid === draggableId);
    if (!ficha) return;

    // O índice do drag é relativo ao que está visível na tela — com filtro ativo, a posição
    // é calculada em cima de fichasVisiveis (não da lista completa), senão a ficha cairia na
    // posição errada contando cartões escondidos pelo filtro. Fichas escondidas da mesma
    // lista continuam no estado, só não entram no recálculo de ordem (nada mudou pra elas).
    const idsVisiveis = new Set(fichasVisiveis.map(f => f.cr4a1_fichaid));
    const outras = fichas.filter(f => f.cr4a1_fichaid !== draggableId);
    const outrasVisiveis = outras.filter(f => idsVisiveis.has(f.cr4a1_fichaid));

    const destinoListaVisivel = ordenar(outrasVisiveis.filter(f => f.cr4a1_lista_id === destinoId));
    destinoListaVisivel.splice(destination.index, 0, { ...ficha, cr4a1_lista_id: destinoId });
    const destinoComOrdem = destinoListaVisivel.map((f, i) => ({ ...f, cr4a1_ordem: i }));

    let novasFichas;
    let afetadas;
    if (origemId === destinoId) {
      const resto = outras.filter(f => f.cr4a1_lista_id !== destinoId || !idsVisiveis.has(f.cr4a1_fichaid));
      novasFichas = [...resto, ...destinoComOrdem];
      afetadas = destinoComOrdem;
    } else {
      const origemComOrdem = ordenar(outrasVisiveis.filter(f => f.cr4a1_lista_id === origemId)).map((f, i) => ({ ...f, cr4a1_ordem: i }));
      const resto = outras.filter(f => (f.cr4a1_lista_id !== destinoId && f.cr4a1_lista_id !== origemId) || !idsVisiveis.has(f.cr4a1_fichaid));
      novasFichas = [...resto, ...origemComOrdem, ...destinoComOrdem];
      afetadas = [...origemComOrdem, ...destinoComOrdem];
    }

    setFichas(novasFichas);
    afetadas.forEach(f => {
      patch('cr4a1_fichas', f.cr4a1_fichaid, { cr4a1_lista_id: f.cr4a1_lista_id, cr4a1_ordem: f.cr4a1_ordem }).catch(() => toast.error('Erro ao mover ficha.'));
    });
  };

  // O DragDropContext é único e vive no App (não pode haver dois montados ao mesmo tempo),
  // então registamos o handler aqui e o App delega pra cá quando appMode === 'trello'.
  useEffect(() => {
    if (dragEndRef) dragEndRef.current = handleDragEnd;
    return () => { if (dragEndRef) dragEndRef.current = null; };
  });

  const fundoEstilo = useMemo(() => {
    // minHeight faz o fundo já ocupar a tela toda de cara, em vez de só aparecer atrás das
    // listas curtas — mas sem limitar a altura: se as listas crescerem, o fundo cresce junto.
    if (currentUser?.cr4a1_trello_fundo_imagem) {
      return { backgroundImage: `url(${currentUser.cr4a1_trello_fundo_imagem})`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: 'calc(100vh - 220px)' };
    }
    if (currentUser?.cr4a1_trello_fundo_cor) {
      return { backgroundColor: currentUser.cr4a1_trello_fundo_cor, minHeight: 'calc(100vh - 220px)' };
    }
    return undefined;
  }, [currentUser]);

  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl p-3" style={fundoEstilo}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground">Fichas</h2>
          <p className="text-sm text-muted-foreground">Listas e fichas do workspace. Fichas com data aparecem na agenda e avisam o responsável.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {membros.length > 0 && (
            <button
              type="button"
              onClick={() => setCompartilharAberto(true)}
              title="Quem tem acesso a este quadro"
              className="flex items-center -space-x-2"
            >
              {membros.slice(0, 6).map(m => (
                <UserAvatar key={m.cr4a1_username} login={m.cr4a1_username} allUsers={allUsers} size={28} className="ring-2 ring-[var(--card)]" />
              ))}
              {membros.length > 6 && (
                <div className="flex size-[28px] items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-muted-foreground ring-2 ring-[var(--card)]">
                  +{membros.length - 6}
                </div>
              )}
            </button>
          )}
          <Popover open={filtrosAberto} onOpenChange={setFiltrosAberto}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Filter className="size-4" /> Filtros
                {filtrosAtivos > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{filtrosAtivos}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="max-h-[75vh] w-80 overflow-y-auto p-4">
              <div className="flex flex-col gap-4">
                <SearchField value={filtros.busca} onChange={v => setFiltro('busca', v)} placeholder="Buscar por título ou descrição..." />

                {membros.length > 0 && (
                  <div>
                    <Label className="mb-1.5">Responsável</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {membros.map(m => (
                        <button key={m.cr4a1_username} type="button" onClick={() => toggleFiltroArray('responsaveis', m.cr4a1_username)} className={chipClass(filtros.responsaveis.includes(m.cr4a1_username))}>
                          {m.cr4a1_nome_exibicao || m.cr4a1_username}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {etiquetas.length > 0 && (
                  <div>
                    <Label className="mb-1.5">Etiquetas</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {etiquetas.map(et => (
                        <EtiquetaChip key={et.cr4a1_etiquetaid} etiqueta={et} compacta onClick={() => toggleFiltroArray('etiquetasIds', et.cr4a1_etiquetaid)} selecionada={filtros.etiquetasIds.includes(et.cr4a1_etiquetaid)} />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="mb-1.5">Status</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {[['todas', 'Todas'], ['pendentes', 'Pendentes'], ['concluidas', 'Concluídas'], ['atrasadas', 'Atrasadas']].map(([valor, rotulo]) => (
                      <button key={valor} type="button" onClick={() => setFiltro('status', valor)} className={chipClass(filtros.status === valor)}>{rotulo}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-1.5">Data</Label>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {[['todas', 'Todas'], ['com', 'Com data'], ['sem', 'Sem data']].map(([valor, rotulo]) => (
                      <button key={valor} type="button" onClick={() => setFiltro('comData', valor)} className={chipClass(filtros.comData === valor)}>{rotulo}</button>
                    ))}
                  </div>
                  {filtros.comData !== 'sem' && (
                    <div className="grid grid-cols-2 gap-2">
                      <DateField label="De" selectedDate={filtros.dataDe} onSelect={v => setFiltro('dataDe', v)} allowClear />
                      <DateField label="Até" selectedDate={filtros.dataAte} onSelect={v => setFiltro('dataAte', v)} allowClear />
                    </div>
                  )}
                </div>

                <div>
                  <Label className="mb-1.5">Anexos</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {[['todas', 'Todas'], ['com', 'Com anexo'], ['sem', 'Sem anexo']].map(([valor, rotulo]) => (
                      <button key={valor} type="button" onClick={() => setFiltro('anexos', valor)} className={chipClass(filtros.anexos === valor)}>{rotulo}</button>
                    ))}
                  </div>
                </div>

                {filtrosAtivos > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setFiltros(filtrosVazios())}>
                    <X className="size-4" /> Limpar filtros
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={() => setFundoAberto(true)}>
            <Palette className="size-4" /> Fundo
          </Button>
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

      {estouBloqueado ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/90 p-10 text-center">
          <ShieldOff className="size-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Seu acesso ao Trello deste workspace foi bloqueado.</p>
          <p className="text-xs text-muted-foreground">Fale com o coordenador do setor ou com um ADMIN se achar que isso é um engano.</p>
        </div>
      ) : (
      <div className="flex items-start gap-3 overflow-x-auto pb-4">
        {listasVisiveis.map(lista => {
          const souDono = lista.cr4a1_criador_login === user || isAdmin;
          const pessoal = lista.cr4a1_pessoal === 'Sim';
          const colapsada = colapsadas.includes(lista.cr4a1_listaid);

          if (colapsada) {
            return (
              <Droppable key={lista.cr4a1_listaid} droppableId={lista.cr4a1_listaid}>
                {(provided) => (
                  <section
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex w-11 shrink-0 flex-col items-center gap-2 rounded-2xl border p-2 ${pessoal ? 'border-primary/40 bg-primary/5' : 'border-border bg-secondary'}`}
                  >
                    <button type="button" onClick={() => alternarColapso(lista.cr4a1_listaid)} aria-label={`Expandir lista ${lista.cr4a1_nome}`} title="Expandir lista" className="text-muted-foreground hover:text-primary">
                      <ChevronRight className="size-4" />
                    </button>
                    <Badge variant="secondary">{fichasDaLista(lista).length}</Badge>
                    <span className="mt-1 flex-1 rotate-180 whitespace-nowrap text-xs font-bold text-foreground [writing-mode:vertical-rl]">
                      {lista.cr4a1_nome}
                    </span>
                    <div className="hidden">{provided.placeholder}</div>
                  </section>
                )}
              </Droppable>
            );
          }

          return (
            <section key={lista.cr4a1_listaid} className={`flex w-72 shrink-0 flex-col gap-2 rounded-2xl border p-3 ${pessoal ? 'border-primary/40 bg-primary/5' : 'border-border bg-secondary'}`}>
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => alternarColapso(lista.cr4a1_listaid)} aria-label={`Encolher lista ${lista.cr4a1_nome}`} title="Encolher lista" className="shrink-0 text-muted-foreground hover:text-primary">
                  <ChevronLeft className="size-4" />
                </button>
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

              <Droppable droppableId={lista.cr4a1_listaid}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="flex min-h-[8px] flex-col gap-2">
                    {fichasDaLista(lista).map((ficha, index) => {
                      const etiquetasDaFicha = parseAssignees(ficha.cr4a1_etiquetas).map(id => etiquetas.find(e => e.cr4a1_etiquetaid === id)).filter(Boolean);
                      const concluida = ficha.cr4a1_concluida === 'Sim';
                      const microtarefas = extrairTarefas(ficha.cr4a1_descricao);
                      const qtdAnexos = parseAnexos(ficha.cr4a1_arquivos).length;
                      return (
                        <Draggable key={ficha.cr4a1_fichaid} draggableId={ficha.cr4a1_fichaid} index={index}>
                          {(providedCard, snapshot) => (
                            <div
                              ref={providedCard.innerRef}
                              {...providedCard.draggableProps}
                              {...providedCard.dragHandleProps}
                              className={`flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/30' : ''}`}
                            >
                              <div className="flex items-start gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); toggleConcluida(ficha); }}
                                  aria-label={concluida ? `Marcar "${ficha.cr4a1_titulo}" como não concluída` : `Marcar "${ficha.cr4a1_titulo}" como concluída`}
                                  title={concluida ? 'Marcar como não concluída' : 'Marcar como concluída'}
                                  className={`mt-0.5 shrink-0 ${concluida ? 'text-success' : 'text-muted-foreground hover:text-primary'}`}
                                >
                                  {concluida ? <CheckCircle2 className="size-[18px]" /> : <Circle className="size-[18px]" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => abrirFicha(ficha)}
                                  className="flex min-w-0 flex-1 flex-col gap-1.5 text-left"
                                >
                                  {etiquetasDaFicha.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {etiquetasDaFicha.map(et => <EtiquetaChip key={et.cr4a1_etiquetaid} etiqueta={et} compacta />)}
                                    </div>
                                  )}
                                  <span className={`text-sm font-semibold text-foreground ${concluida ? 'line-through opacity-60' : ''}`}>{ficha.cr4a1_titulo}</span>
                                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                    {comData(ficha) && (
                                      <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold ${corUrgenciaData(ficha.cr4a1_data_inicio, concluida)}`}>
                                        <CalendarDays className="size-3" />
                                        {format(new Date(ficha.cr4a1_data_inicio), 'dd/MM HH:mm')}
                                      </span>
                                    )}
                                    {qtdAnexos > 0 && (
                                      <span className="inline-flex items-center gap-0.5" title={`${qtdAnexos} anexo(s)`}>
                                        <Paperclip className="size-3" /> {qtdAnexos}
                                      </span>
                                    )}
                                    <UserAvatar login={ficha.cr4a1_responsavel_login} allUsers={allUsers} size={16} />
                                    <span>{nomeDe(ficha.cr4a1_responsavel_login, allUsers)}</span>
                                  </div>
                                </button>
                              </div>
                              {microtarefas.length > 0 && (
                                <div className="flex flex-col gap-1 pl-[26px]">
                                  {microtarefas.map(tarefa => (
                                    <button
                                      key={tarefa.index}
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); toggleMicrotarefa(ficha, tarefa.index); }}
                                      className="flex items-center gap-1.5 text-left text-[11px] text-muted-foreground"
                                    >
                                      {tarefa.concluida ? <CheckCircle2 className="size-3 shrink-0 text-success" /> : <Circle className="size-3 shrink-0" />}
                                      <span className={tarefa.concluida ? 'line-through opacity-60' : ''}>{tarefa.texto}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

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
          className="flex w-72 shrink-0 flex-col gap-2 rounded-2xl border border-dashed border-border bg-secondary p-3"
        >
          <Input value={novaLista} onChange={e => setNovaLista(e.target.value)} placeholder="Nova lista..." className="bg-card" />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={novaListaPessoal} onCheckedChange={setNovaListaPessoal} />
            Lista pessoal (só eu vejo)
          </label>
          <Button type="submit" size="sm" variant="outline">Adicionar lista</Button>
        </form>
      </div>
      )}

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
          podeBloquear={podeGerenciarBloqueios}
          bloqueadosLogins={bloqueadosLogins}
          user={user}
          onBlock={bloquearMembro}
          onUnblock={desbloquearMembro}
          onClose={() => setCompartilharAberto(false)}
        />
      )}

      {ConfirmDialogHost}

      {fundoAberto && (
        <FundoDialog
          currentUser={currentUser}
          onSave={(dados) => updateTrelloFundo?.(currentUser.cr4a1_usuarios_agendaid, dados)}
          onClose={() => setFundoAberto(false)}
        />
      )}

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

  // Com microtarefas na descrição, "concluída" deixa de ser uma escolha manual — ela
  // reflete se todas as microtarefas estão marcadas (mesma regra do card na lista).
  const tarefasDaDescricao = useMemo(() => extrairTarefas(form.descricao), [form.descricao]);
  const temTarefas = tarefasDaDescricao.length > 0;
  const concluidaDerivada = temTarefas && tarefasDaDescricao.every(t => t.concluida);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Título</Label>
        <Input value={form.titulo} onChange={e => set('titulo', e.target.value)} />
      </div>

      <div>
        <Label>Descrição</Label>
        <p className="mb-1 text-[11px] text-muted-foreground">Use o ícone de checklist para criar microtarefas — elas aparecem e podem ser marcadas direto no card.</p>
        <RichTextEditor value={form.descricao} onChange={v => set('descricao', v)} />
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
        <div>
          <Label className="mb-0">Concluída</Label>
          {temTarefas && <p className="text-[11px] text-muted-foreground">Definida automaticamente pelas microtarefas da descrição.</p>}
        </div>
        <Switch checked={temTarefas ? concluidaDerivada : form.concluida} onCheckedChange={v => set('concluida', v)} disabled={temTarefas} />
      </div>

      <AttachmentsField anexos={form.anexos || []} onChange={(novos) => set('anexos', novos)} />

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
const CompartilharDialog = ({ workspace, membrosBase, colaboradoresLogins, allUsers, podeEditar, onAdd, onRemove, podeBloquear, bloqueadosLogins = [], user, onBlock, onUnblock, onClose }) => {
  const [busca, setBusca] = useState('');
  const jaTemAcesso = new Set([...membrosBase.map(m => m.cr4a1_username), ...colaboradoresLogins]);
  const candidatos = busca.trim()
    ? allUsers.filter(u => !jaTemAcesso.has(u.cr4a1_username) && matchesSearch(u.cr4a1_nome_exibicao || u.cr4a1_username, busca)).slice(0, 8)
    : [];
  const membrosBloqueaveis = membrosBase.filter(m => m.cr4a1_username !== workspace?.cr4a1_criador_login && m.cr4a1_username !== user);

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

          {podeBloquear && membrosBloqueaveis.length > 0 && (
            <div>
              <Label className="flex items-center gap-1.5"><ShieldAlert className="size-3.5" /> Bloquear acesso ao Trello</Label>
              <p className="mb-1.5 text-[11px] text-muted-foreground">A pessoa continua no workspace (BI, agenda...), só deixa de ver este quadro.</p>
              <div className="flex flex-col gap-1.5">
                {membrosBloqueaveis.map(m => {
                  const bloqueado = bloqueadosLogins.includes(m.cr4a1_username);
                  return (
                    <div key={m.cr4a1_username} className="flex items-center justify-between rounded-xl border border-border bg-secondary px-3 py-2 text-sm">
                      <span className={bloqueado ? 'text-muted-foreground line-through' : ''}>{m.cr4a1_nome_exibicao || m.cr4a1_username}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => (bloqueado ? onUnblock : onBlock)(m.cr4a1_username)}
                        className={bloqueado ? '' : 'text-destructive'}
                      >
                        {bloqueado ? 'Desbloquear' : 'Bloquear'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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

// O fundo é por pessoa (guardado no usuário), não no quadro — cada um vê o que escolheu.
const FundoDialog = ({ currentUser, onSave, onClose }) => {
  const [cor, setCor] = useState(currentUser?.cr4a1_trello_fundo_cor || '');
  const [imagem, setImagem] = useState(currentUser?.cr4a1_trello_fundo_imagem || '');
  const [enviando, setEnviando] = useState(false);

  const escolherCor = (hex) => { setCor(hex); setImagem(''); };
  const handleUpload = (file) => {
    if (!file) return;
    setEnviando(true);
    compressImage(file, (dataUrl) => {
      setImagem(dataUrl);
      setCor('');
      setEnviando(false);
    }, { maxWidth: 1600, maxHeight: 900, quality: 0.6 });
  };
  const limpar = () => { setCor(''); setImagem(''); };

  const salvar = async () => {
    await onSave({ cor, imagem });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle><Palette className="size-5" /> Fundo do seu Trello</DialogTitle>
          <DialogDescription>É só seu — mesmo dividindo o quadro com outras pessoas, cada uma vê o fundo que escolheu.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {imagem && (
            <div className="h-28 w-full rounded-xl border border-border bg-cover bg-center" style={{ backgroundImage: `url(${imagem})` }} />
          )}

          <div>
            <Label>Cor sólida</Label>
            <div className="grid max-h-36 grid-cols-10 gap-1.5 overflow-y-auto p-1">
              {themeColors.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => escolherCor(c.hex)}
                  title={c.label}
                  aria-label={c.label}
                  className="size-5 shrink-0 rounded-full transition-transform active:scale-90"
                  style={{ backgroundColor: c.hex, boxShadow: cor === c.hex ? `0 0 0 2px var(--card), 0 0 0 4px ${c.hex}` : 'none' }}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>Ou uma imagem</Label>
            <div>
              <Button type="button" variant="outline" size="sm" className="mt-1" onClick={() => document.getElementById('trello-fundo-upload').click()} disabled={enviando}>
                <ImageIcon className="size-4" /> {enviando ? 'A preparar...' : 'Escolher imagem'}
              </Button>
              <input type="file" id="trello-fundo-upload" hidden accept="image/*" onChange={(e) => handleUpload(e.target.files[0])} />
            </div>
          </div>

          {(cor || imagem) && (
            <Button type="button" variant="ghost" size="sm" className="self-start text-destructive" onClick={limpar}>Remover fundo</Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
