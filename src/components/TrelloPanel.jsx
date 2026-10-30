import {
  notificarMencoes,
  notificarCompartilhamento,
  notificarCoGerencia,
  enviarAlertaEmail,
  enviarAlertaPush,
  salvarNotificacaoNoApp,
  dispararNotificacaoDispositivo,
  resolverInfoDestinatarioCredenciais
} from '../utils/alertas';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { format, addHours, addDays, addMonths } from 'date-fns';
import { Plus, Trash2, CalendarDays, X, Users, Tag, Lock, Unlock, Pencil, Check, CheckCircle2, Circle, Image as ImageIcon, Palette, ShieldOff, ShieldAlert, Paperclip, Filter, ChevronLeft, ChevronRight, UserCircle2, MessageCircle, Send, History, Pin, LayoutTemplate, Repeat, FileSpreadsheet, Zap, MoreHorizontal, Share2, FolderSync, FileDown, Loader2, ArrowUpDown, UserCheck, FolderInput, Archive, ArchiveRestore } from 'lucide-react';
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
import { RichTextEditor, aplicarAtributoTarefa } from './ui/rich-text-editor';
import { AttachmentsField, AttachmentPreviewDialog } from './ui/attachments-field';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';
import { Textarea } from './ui/textarea';
import { MentionInput, MentionTextarea } from './ui/mention-autocomplete';
import { Sticker } from './ui/sticker';
import { parseAssignees, joinAssignees } from '../utils/assignees';
import { matchesSearch } from '../utils/search';
import { themeColors } from '../constants/materialColors';
import { corUrgenciaData } from '../utils/dateUrgency';
import { extrairTarefas, alternarTarefaNaDescricao, marcarTodasTarefas, htmlParaTexto, extrairDescricaoSemTarefas } from '../utils/descricaoTarefas';
import { compressImage } from '../utils/compressImage';
import { parseAnexos, primeiraImagem } from '../utils/anexos';
import { corTextoLegivel } from '../utils/cor';
import { parseComentarios, criarComentario } from '../utils/comentarios';
import { parseAtividades, registrarAtividade, descricaoAtividade } from '../utils/atividades';
import { exportarQuadroXlsx } from '../utils/exportarQuadroXlsx';
import { parseAutomacoes, parseListaGerentes, aplicarAutomacoes, regrasPara, estadoDataAtual, TIPOS_AUTOMACAO, GATILHOS_AUTOMACAO, descricaoAutomacao, ehFichaArquivada } from '../utils/automacoes';
import { stickers } from '../constants/stickers';
import { WORKSPACE_COORD_ROLES } from '../config/roleWorkspaceMap';
import { useConfirm } from '../hooks/useConfirm';

const API_PROXY = '/api/dataverse-proxy';
const q = (valor) => encodeURIComponent(valor);
const comData = (ficha) => !!ficha.cr4a1_data_inicio;
// Opções de recorrência da ficha: ao concluir, cria sozinha a próxima ocorrência nessa
// distância da data original (só funciona em fichas com data, já que a repetição é sobre ela).
const RECORRENCIAS = { Diaria: (d) => addDays(d, 1), Semanal: (d) => addDays(d, 7), Mensal: (d) => addMonths(d, 1) };
const RECORRENCIA_LABEL = { '': 'Não repetir', Diaria: 'Diariamente', Semanal: 'Semanalmente', Mensal: 'Mensalmente' };
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

// Opções de um seletor de pessoa: a lista já vem sem bloqueados (pra não dar pra escolher
// alguém bloqueado de novo), mas se a pessoa já atribuída foi bloqueada DEPOIS, ela continua
// aparecendo nessa atribuição específica — senão o campo mostraria um valor "fantasma".
const opcoesComAtual = (lista, atual, allUsers) => {
  if (!atual || lista.some(m => m.cr4a1_username === atual)) return lista;
  const extra = allUsers.find(u => u.cr4a1_username === atual);
  return extra ? [...lista, extra] : lista;
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

// Fichas fixadas sempre no topo da lista, na frente das demais (mesma ideia do pin do Trello).
const ordenar = (lista) => [...lista].sort((a, b) => {
  const fixadaA = a.cr4a1_fixada === 'Sim' ? 0 : 1;
  const fixadaB = b.cr4a1_fixada === 'Sim' ? 0 : 1;
  if (fixadaA !== fixadaB) return fixadaA - fixadaB;
  return (a.cr4a1_ordem ?? 0) - (b.cr4a1_ordem ?? 0);
});

// Ordenação flexível por critério com preservação de fichas fixadas no topo
const ordenarFichasPorCriterio = (fichasLista, criterio = 'padrao') => {
  return [...fichasLista].sort((a, b) => {
    const fixadaA = a.cr4a1_fixada === 'Sim' ? 0 : 1;
    const fixadaB = b.cr4a1_fixada === 'Sim' ? 0 : 1;
    if (fixadaA !== fixadaB) return fixadaA - fixadaB;

    switch (criterio) {
      case 'data_recente': {
        if (!a.cr4a1_data_inicio && !b.cr4a1_data_inicio) return (a.cr4a1_ordem ?? 0) - (b.cr4a1_ordem ?? 0);
        if (!a.cr4a1_data_inicio) return 1;
        if (!b.cr4a1_data_inicio) return -1;
        return new Date(b.cr4a1_data_inicio).getTime() - new Date(a.cr4a1_data_inicio).getTime();
      }
      case 'data_antiga': {
        if (!a.cr4a1_data_inicio && !b.cr4a1_data_inicio) return (a.cr4a1_ordem ?? 0) - (b.cr4a1_ordem ?? 0);
        if (!a.cr4a1_data_inicio) return 1;
        if (!b.cr4a1_data_inicio) return -1;
        return new Date(a.cr4a1_data_inicio).getTime() - new Date(b.cr4a1_data_inicio).getTime();
      }
      case 'titulo_az': {
        const tA = (a.cr4a1_titulo || '').trim();
        const tB = (b.cr4a1_titulo || '').trim();
        return tA.localeCompare(tB, 'pt-BR', { sensitivity: 'base' });
      }
      case 'titulo_za': {
        const tA = (a.cr4a1_titulo || '').trim();
        const tB = (b.cr4a1_titulo || '').trim();
        return tB.localeCompare(tA, 'pt-BR', { sensitivity: 'base' });
      }
      case 'pendentes': {
        const cA = a.cr4a1_concluida === 'Sim' ? 1 : 0;
        const cB = b.cr4a1_concluida === 'Sim' ? 1 : 0;
        if (cA !== cB) return cA - cB;
        return (a.cr4a1_ordem ?? 0) - (b.cr4a1_ordem ?? 0);
      }
      case 'concluidas': {
        const cA = a.cr4a1_concluida === 'Sim' ? 0 : 1;
        const cB = b.cr4a1_concluida === 'Sim' ? 0 : 1;
        if (cA !== cB) return cA - cB;
        return (a.cr4a1_ordem ?? 0) - (b.cr4a1_ordem ?? 0);
      }
      case 'padrao':
      default:
        return (a.cr4a1_ordem ?? 0) - (b.cr4a1_ordem ?? 0);
    }
  });
};

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
  const [anexoCardPreview, setAnexoCardPreview] = useState(null);
  const [minhasFichasAberto, setMinhasFichasAberto] = useState(false);
  const [minhasFichas, setMinhasFichas] = useState([]);
  const [minhasFichasCarregando, setMinhasFichasCarregando] = useState(false);
  const [arquivadasAberto, setArquivadasAberto] = useState(false);
  const [modelosAberto, setModelosAberto] = useState(false);
  const [modelos, setModelos] = useState([]);
  const [listaAutomacao, setListaAutomacao] = useState(null);
  const [listaGerentes, setListaGerentes] = useState(null);
  const [listaMoverWorkspace, setListaMoverWorkspace] = useState(null);
  const [listaExportar, setListaExportar] = useState(null);
  const [mudarWorkspaceAberto, setMudarWorkspaceAberto] = useState(false);
  const [ordenacaoPorLista, setOrdenacaoPorLista] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kairos_trello_ordem_listas') || '{}'); } catch { return {}; }
  });

  const mudarOrdenacaoLista = (listaId, criterio) => {
    setOrdenacaoPorLista(prev => {
      const proximo = { ...prev, [listaId]: criterio };
      try { localStorage.setItem('kairos_trello_ordem_listas', JSON.stringify(proximo)); } catch {}
      return proximo;
    });
  };
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
      const condicoes = [`contains(cr4a1_colaboradores, '${user}')`];
      workspaces.forEach(w => {
        if (w.cr4a1_calendarios_workspacesid) {
          condicoes.push(`contains(cr4a1_colaboradores, 'ws:${w.cr4a1_calendarios_workspacesid}')`);
        }
      });
      const filtro = q(condicoes.join(' or '));
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

  // "Minhas fichas" cruza TODOS os workspaces de uma vez só (não só o selecionado) — busca por
  // responsável em cr4a1_fichas direto, sem precisar varrer workspace por workspace. Confere
  // também os quadros onde o usuário está bloqueado, pra não vazar fichas de um Trello que ele
  // não devia ver só porque é o responsável por alguma ficha lá.
  useEffect(() => {
    if (!minhasFichasAberto) return undefined;
    let cancelado = false;
    (async () => {
      await Promise.resolve();
      if (cancelado) return;
      setMinhasFichasCarregando(true);
      const filtroFichas = q(`cr4a1_responsavel_login eq '${user}'`);
      const filtroBloqueios = q(`contains(cr4a1_bloqueados, '${user}')`);
      try {
        const [resFichas, resBloqueios] = await Promise.all([
          fetch(`${API_PROXY}?table=cr4a1_fichas&$filter=${filtroFichas}`).then(r => r.json()),
          fetch(`${API_PROXY}?table=cr4a1_quadros&$filter=${filtroBloqueios}`).then(r => r.json())
        ]);
        if (cancelado) return;
        const workspacesBloqueados = new Set((resBloqueios.value || []).map(qd => qd.cr4a1_workspace_id));
        const idsAcessiveis = new Set(todasOpcoes.map(w => w.cr4a1_calendarios_workspacesid));
        setMinhasFichas((resFichas.value || []).filter(f => !ehFichaArquivada(f) && idsAcessiveis.has(f.cr4a1_workspace_id) && !workspacesBloqueados.has(f.cr4a1_workspace_id)));
      } catch {
        if (!cancelado) toast.error('Erro ao carregar suas fichas.');
      } finally {
        if (!cancelado) setMinhasFichasCarregando(false);
      }
    })();
    return () => { cancelado = true; };
  }, [minhasFichasAberto, user, todasOpcoes]);

  const prioridadeMinhasFichas = (f) => {
    if (f.cr4a1_concluida === 'Sim') return 2;
    return comData(f) ? 0 : 1;
  };
  const minhasFichasOrdenadas = useMemo(() => [...minhasFichas].sort((a, b) => {
    const pa = prioridadeMinhasFichas(a);
    const pb = prioridadeMinhasFichas(b);
    if (pa !== pb) return pa - pb;
    if (pa === 0) return a.cr4a1_data_inicio.localeCompare(b.cr4a1_data_inicio);
    return 0;
  }), [minhasFichas]);

  const todosColaboradores = useMemo(() => parseAssignees(quadro?.cr4a1_colaboradores), [quadro]);
  const colaboradoresLogins = useMemo(() => todosColaboradores.filter(c => !c.startsWith('ws:')), [todosColaboradores]);
  const workspacesVinculadosIds = useMemo(() => todosColaboradores.filter(c => c.startsWith('ws:')).map(c => c.slice(3)), [todosColaboradores]);
  const membrosBase = useMemo(() => membrosDoWorkspace(workspace, allUsers), [workspace, allUsers]);
  const membros = useMemo(() => {
    const todosMembros = [...membrosBase];
    workspacesVinculadosIds.forEach(wsId => {
      const wsVinculado = todasOpcoes.find(w => w.cr4a1_calendarios_workspacesid === wsId);
      if (wsVinculado) {
        const membrosWs = membrosDoWorkspace(wsVinculado, allUsers);
        membrosWs.forEach(m => {
          if (!todosMembros.some(b => b.cr4a1_username === m.cr4a1_username)) {
            todosMembros.push(m);
          }
        });
      }
    });
    const extras = allUsers.filter(u => colaboradoresLogins.includes(u.cr4a1_username) && !todosMembros.some(b => b.cr4a1_username === u.cr4a1_username));
    return [...todosMembros, ...extras];
  }, [membrosBase, workspacesVinculadosIds, todasOpcoes, allUsers, colaboradoresLogins]);
  const podeGerenciarColaboradores = isAdmin || (!!workspace && workspace.cr4a1_criador_login === user);

  // Quem coordena o setor (mesmo papel "COORD X" que já libera os painéis de BI do setor)
  // pode bloquear o acesso de membros do workspace ao Trello — além do ADMIN, sempre.
  const coordRolesDoWorkspace = WORKSPACE_COORD_ROLES[workspace?.cr4a1_nome] || [];
  const podeGerenciarBloqueios = isAdmin || coordRolesDoWorkspace.some(papel => hasRole?.(papel));
  const bloqueadosLogins = useMemo(() => parseAssignees(quadro?.cr4a1_bloqueados), [quadro]);
  const estouBloqueado = !isAdmin && bloqueadosLogins.includes(user);
  // Pra exibição geral (avatares do cabeçalho, filtro de responsável) — quem está bloqueado
  // some daqui, mas continua aparecendo no diálogo "Compartilhar" (com o status de bloqueado),
  // que é onde esse controle é gerenciado.
  const membrosVisiveis = useMemo(() => membros.filter(m => !bloqueadosLogins.includes(m.cr4a1_username)), [membros, bloqueadosLogins]);

  // Dispara os e-mails configurados nas regras de automação da lista, resolvendo o endereço
  // na tabela cr4a1_credenciaises (cr4a1_email) e notificando também no app/dispositivo.
  const dispararEmailsAutomacao = async (emails, fichaAtual, lista, gatilho) => {
    if (!emails || !emails.length || !lista) return;
    const gatilhoLabel = GATILHOS_AUTOMACAO[gatilho] || gatilho;
    const wsNome = todasOpcoes.find(w => w.cr4a1_calendarios_workspacesid === workspaceId)?.cr4a1_nome || '';
    const autorInfo = await resolverInfoDestinatarioCredenciais(user, allUsers);
    const autorNome = autorInfo.nomeExibicao || user || 'Automação Trello';

    for (const item of emails) {
      let loginsAlvo = [];
      if (item.alvo === 'responsavel') {
        if (fichaAtual.cr4a1_responsavel_login) loginsAlvo = [fichaAtual.cr4a1_responsavel_login];
      } else if (item.alvo === 'usuario') {
        if (item.usuario) loginsAlvo = [item.usuario];
      } else if (item.alvo === 'gerentes') {
        const gerentes = [lista.cr4a1_criador_login, ...parseListaGerentes(lista.cr4a1_automacao)].filter(Boolean);
        loginsAlvo = [...new Set(gerentes)];
      }

      for (const login of loginsAlvo) {
        const info = await resolverInfoDestinatarioCredenciais(login, allUsers);
        const msgExtra = item.mensagemPersonalizada
          ? `<br><br><strong>Mensagem da automação:</strong> "${item.mensagemPersonalizada}"`
          : '';
        const mensagemHtml = `A automação da lista <strong>"${lista.cr4a1_nome}"</strong> foi acionada para a ficha <strong>"${fichaAtual.cr4a1_titulo}"</strong> (Gatilho: <em>${gatilhoLabel}</em>).${msgExtra}`;
        const pushTitle = `⚡ Automação Trello: ${fichaAtual.cr4a1_titulo}`;
        const pushBody = item.mensagemPersonalizada
          ? `${lista.cr4a1_nome}: ${item.mensagemPersonalizada}`
          : `Lista "${lista.cr4a1_nome}" — ${gatilhoLabel}`;
        const pushTag = `auto-${fichaAtual.cr4a1_fichaid}-${gatilho}-${info.username}`;

        salvarNotificacaoNoApp({
          destinatario: info.username,
          tipo: 'automacao',
          titulo: `Automação: ${lista.cr4a1_nome}`,
          mensagem: pushBody,
          itemTitulo: fichaAtual.cr4a1_titulo,
          origem: 'Trello'
        });

        enviarAlertaPush({
          usuarios: [info.username],
          title: pushTitle,
          body: pushBody,
          url: '/',
          tag: pushTag
        });
        dispararNotificacaoDispositivo({
          title: pushTitle,
          body: pushBody,
          tag: pushTag,
          destinatario: info.username
        });

        if (!info.email) {
          toast.error(`Automação: @${info.username} não possui e-mail na tabela de credenciais.`, { duration: 4500 });
          continue;
        }

        const resEmail = await enviarAlertaEmail({
          usuarios: [info.username],
          destinatarios: [info.email],
          tipo: 'automacao',
          titulo: `⚡ Automação Trello: "${fichaAtual.cr4a1_titulo}" (${lista.cr4a1_nome})`,
          mensagem: mensagemHtml,
          autor: autorNome,
          detalhes: {
            origem: `Automação Trello (${gatilhoLabel})`,
            itemTitulo: fichaAtual.cr4a1_titulo,
            workspace: wsNome,
            lista: lista.cr4a1_nome,
            responsavel: nomeDe(fichaAtual.cr4a1_responsavel_login, allUsers),
            trecho: item.mensagemPersonalizada || ''
          }
        });

        if (resEmail && !resEmail.error) {
          const emailEnviado = resEmail?.destinatarios?.[0] || info.email;
          toast.success(`Automação: e-mail enviado para ${info.nomeExibicao} (${emailEnviado})`, { duration: 4000 });
        }
      }
    }
  };

  // Duplica uma ficha em outras listas quando configurado na automação
  const duplicarFichaAutomacao = async (fichaAtual, listasDestinoIds) => {
    if (!listasDestinoIds || !listasDestinoIds.length) return;
    for (const destListaId of listasDestinoIds) {
      await post('cr4a1_fichas', {
        cr4a1_titulo: fichaAtual.cr4a1_titulo,
        cr4a1_descricao: fichaAtual.cr4a1_descricao || '',
        cr4a1_lista_id: destListaId,
        cr4a1_workspace_id: fichaAtual.cr4a1_workspace_id || workspaceId,
        cr4a1_responsavel_login: fichaAtual.cr4a1_responsavel_login || user,
        cr4a1_criador_login: user,
        cr4a1_ordem: fichas.filter(f => f.cr4a1_lista_id === destListaId).length,
        cr4a1_data_inicio: fichaAtual.cr4a1_data_inicio || null,
        cr4a1_concluida: fichaAtual.cr4a1_concluida || 'Não',
        cr4a1_notificado: 'Sim',
        cr4a1_etiquetas: fichaAtual.cr4a1_etiquetas || '',
        cr4a1_cor: fichaAtual.cr4a1_cor || '',
        cr4a1_fixada: fichaAtual.cr4a1_fixada || 'Não',
        cr4a1_atividades: registrarAtividade(null, 'criada', user, 'duplicada por automação')
      });
    }
  };

  // Executa as automações de uma lista que combinam com o gatilho informado sobre uma ficha —
  // usado pelos gatilhos "ao vivo" (criar, mover, concluir, etiquetar, etc.). Não re-dispara
  // automações da lista de destino quando a própria ação é "mover" (um só salto por vez, pra
  // não entrar num loop entre duas listas que se movem uma pra outra).
  const executarAutomacoes = async (ficha, listaId, gatilho, etiquetaId) => {
    const lista = listas.find(l => l.cr4a1_listaid === listaId);
    if (!lista) return;
    const regras = regrasPara(parseAutomacoes(lista.cr4a1_automacao), gatilho, etiquetaId);
    const resultado = aplicarAutomacoes(regras, ficha.cr4a1_etiquetas);
    if (!resultado) return;
    const { patch: mudancas, comentarios, notificar, emails, duplicarPara } = resultado;
    if (mudancas.cr4a1_fixada === 'Arq') {
      mudancas.cr4a1_atividades = registrarAtividade(ficha.cr4a1_atividades, 'arquivada', user, 'por automação');
    }
    const fichaAtualizada = { ...ficha, ...mudancas };
    try {
      if (Object.keys(mudancas).length) {
        await patch('cr4a1_fichas', ficha.cr4a1_fichaid, mudancas);
        setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, ...mudancas } : f));
      }
      if (comentarios.length) {
        const todos = comentarios.reduce((acc, texto) => [...acc, criarComentario(user, texto)], parseComentarios(ficha.cr4a1_comentarios));
        const json = JSON.stringify(todos);
        await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_comentarios: json });
        setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_comentarios: json } : f));
      }
      if (duplicarPara?.length) {
        await duplicarFichaAutomacao(fichaAtualizada, duplicarPara);
      }
      if (notificar) {
        enviarAlertaPush({ fichaId: ficha.cr4a1_fichaid });
      }
      if (emails?.length) {
        await dispararEmailsAutomacao(emails, fichaAtualizada, lista, gatilho);
      }
      recarregar();
    } catch { toast.error('Erro ao executar automação.'); }
  };

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

  // Gatilhos "vencendo"/"urgente"/"atrasada" não dependem de nenhuma ação do usuário — rodam sozinhos
  // sempre que o quadro atualiza (a cada poll, já que fichas/listas trocam de referência a
  // cada busca nova). cr4a1_autodataestado guarda o último estado já processado de cada ficha,
  // pra regra não disparar de novo a cada 5s.
  useEffect(() => {
    (async () => {
      for (const ficha of fichas) {
        if (!comData(ficha) || ficha.cr4a1_concluida === 'Sim') continue;
        const estadoAtual = estadoDataAtual(ficha);
        const estadoAnterior = ficha.cr4a1_autodataestado || '';
        if (estadoAtual === estadoAnterior) continue;
        if (!estadoAtual) {
          patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_autodataestado: '' }).catch(() => {});
          continue;
        }
        const lista = listas.find(l => l.cr4a1_listaid === ficha.cr4a1_lista_id);
        const regras = regrasPara(parseAutomacoes(lista?.cr4a1_automacao), estadoAtual);
        if (!regras.length) {
          patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_autodataestado: estadoAtual }).catch(() => {});
          continue;
        }
        const resultado = aplicarAutomacoes(regras, ficha.cr4a1_etiquetas);
        try {
          const mudancas = resultado?.patch || {};
          const fichaAtualizada = { ...ficha, ...mudancas };
          await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_autodataestado: estadoAtual, ...mudancas });
          if (resultado?.comentarios.length) {
            const todos = resultado.comentarios.reduce((acc, texto) => [...acc, criarComentario(user, texto)], parseComentarios(ficha.cr4a1_comentarios));
            await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_comentarios: JSON.stringify(todos) });
          }
          if (resultado?.duplicarPara?.length) {
            await duplicarFichaAutomacao(fichaAtualizada, resultado.duplicarPara);
          }
          if (resultado?.notificar) {
            enviarAlertaPush({ fichaId: ficha.cr4a1_fichaid });
          }
          if (resultado?.emails?.length) {
            await dispararEmailsAutomacao(resultado.emails, fichaAtualizada, lista, estadoAtual);
          }
        } catch { /* falha silenciosa — tenta de novo no próximo poll */ }
      }
    })();
  }, [fichas, listas, user]);

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

  const salvarAutomacoes = async (lista, automacoes) => {
    try {
      const gerentesAtuais = parseListaGerentes(lista.cr4a1_automacao);
      const novoConteudo = JSON.stringify({ automacoes, gerentes: gerentesAtuais });
      await patch('cr4a1_listas', lista.cr4a1_listaid, { cr4a1_automacao: novoConteudo });
      recarregar();
    } catch { toast.error('Erro ao salvar automações.'); }
  };

  const salvarGerentesLista = async (lista, gerentes) => {
    try {
      const gerentesAtuais = parseListaGerentes(lista.cr4a1_automacao);
      const novosGerentes = gerentes.filter(g => !gerentesAtuais.includes(g) && g !== user);
      if (novosGerentes.length > 0) {
        notificarCoGerencia({
          listaNome: lista.cr4a1_nome,
          workspaceNome: todasOpcoes.find(w => w.cr4a1_calendarios_workspacesid === workspaceId)?.cr4a1_nome || '',
          novosGerentes,
          autor: user,
          currentUser: user,
          allUsers
        });
      }
      const automacoesAtuais = parseAutomacoes(lista.cr4a1_automacao);
      const novoConteudo = JSON.stringify({ automacoes: automacoesAtuais, gerentes });
      await patch('cr4a1_listas', lista.cr4a1_listaid, { cr4a1_automacao: novoConteudo });
      setListaGerentes(null);
      recarregar();
      toast.success('Gerentes da lista atualizados!');
    } catch {
      toast.error('Erro ao salvar gerentes da lista.');
    }
  };

  const moverListaParaWorkspace = async (lista, novoWsId) => {
    const destino = todasOpcoes.find(w => w.cr4a1_calendarios_workspacesid === novoWsId);
    const novoWsNome = destino?.cr4a1_nome || novoWsId;
    try {
      await patch('cr4a1_listas', lista.cr4a1_listaid, { cr4a1_workspace_id: novoWsId });
      const fichasDaEstaLista = fichas.filter(f => f.cr4a1_lista_id === lista.cr4a1_listaid);
      for (const f of fichasDaEstaLista) {
        await patch('cr4a1_fichas', f.cr4a1_fichaid, { cr4a1_workspace_id: novoWsId });
        if (f.cr4a1_evento_id) {
          await patch('cr4a1_agenda_kairoses', f.cr4a1_evento_id, { cr4a1_workspace_id: novoWsId }).catch(() => {});
        }
      }
      setListaMoverWorkspace(null);
      recarregar();
      refreshEvents?.();
      toast.success(`Lista "${lista.cr4a1_nome}" e fichas movidas para "${novoWsNome}"!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao mover lista para o workspace.');
    }
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

  // Modelos de quadro são guardados como registros de cr4a1_quadros marcados com
  // cr4a1_etemplate = 'Sim' — não são um quadro de verdade (sem cr4a1_workspace_id), só um
  // "molde" reutilizável com a estrutura de listas (nome + se é pessoal), sem fichas.
  const carregarModelos = async () => {
    try {
      const filtro = q("cr4a1_etemplate eq 'Sim'");
      const res = await fetch(`${API_PROXY}?table=cr4a1_quadros&$filter=${filtro}`).then(r => r.json());
      setModelos(res.value || []);
    } catch {
      toast.error('Erro ao carregar modelos de quadro.');
    }
  };

  useEffect(() => {
    if (!modelosAberto) return undefined;
    let cancelado = false;
    (async () => {
      await Promise.resolve();
      if (!cancelado) await carregarModelos();
    })();
    return () => { cancelado = true; };
  }, [modelosAberto]);

  const exportarQuadro = async () => {
    if (fichas.length === 0) { toast.error('Este quadro ainda não tem fichas pra exportar.'); return; }
    try {
      await exportarQuadroXlsx(listas, fichas, etiquetas, allUsers, workspace?.cr4a1_nome);
    } catch { toast.error('Erro ao exportar o quadro.'); }
  };

  const salvarComoModelo = async (nome) => {
    if (listas.length === 0) { toast.error('Este quadro ainda não tem listas pra salvar como modelo.'); return; }
    try {
      const estrutura = listas.map(l => ({ nome: l.cr4a1_nome, pessoal: l.cr4a1_pessoal === 'Sim' }));
      await post('cr4a1_quadros', {
        cr4a1_nome: nome,
        cr4a1_etemplate: 'Sim',
        cr4a1_criador_login: user,
        cr4a1_templatelistas: JSON.stringify(estrutura)
      });
      await carregarModelos();
      toast.success('Modelo salvo.');
    } catch { toast.error('Erro ao salvar modelo.'); }
  };

  const aplicarModelo = async (modelo) => {
    try {
      const estrutura = JSON.parse(modelo.cr4a1_templatelistas || '[]');
      let ordem = listas.length;
      for (const item of estrutura) {
        await post('cr4a1_listas', {
          cr4a1_nome: item.nome,
          cr4a1_workspace_id: workspaceId,
          cr4a1_ordem: ordem,
          cr4a1_criador_login: user,
          cr4a1_pessoal: item.pessoal ? 'Sim' : 'Não'
        });
        ordem += 1;
      }
      setModelosAberto(false);
      recarregar();
      toast.success(`Modelo "${modelo.cr4a1_nome}" aplicado.`);
    } catch { toast.error('Erro ao aplicar modelo.'); }
  };

  const apagarModelo = async (modelo) => {
    if (!(await confirm(`Excluir o modelo "${modelo.cr4a1_nome}"?`, { title: 'Excluir modelo' }))) return;
    try {
      await apagar('cr4a1_quadros', modelo.cr4a1_quadroid);
      setModelos(prev => prev.filter(m => m.cr4a1_quadroid !== modelo.cr4a1_quadroid));
    } catch { toast.error('Erro ao excluir modelo.'); }
  };

  const criarFicha = async (lista) => {
    const titulo = (novaFichaPorLista[lista.cr4a1_listaid] || '').trim();
    if (!titulo) return;
    try {
      const resCriada = await post('cr4a1_fichas', {
        cr4a1_titulo: titulo,
        cr4a1_lista_id: lista.cr4a1_listaid,
        cr4a1_workspace_id: workspaceId,
        cr4a1_responsavel_login: user,
        cr4a1_criador_login: user,
        cr4a1_ordem: fichas.filter(f => f.cr4a1_lista_id === lista.cr4a1_listaid).length,
        cr4a1_concluida: 'Não',
        cr4a1_notificado: 'Sim',
        cr4a1_etiquetas: '',
        cr4a1_fixada: 'Não',
        cr4a1_atividades: registrarAtividade(null, 'criada', user)
      });
      const criada = await resCriada.json();
      await notificarMencoes({
        textoNovo: titulo,
        textoAntigo: '',
        origem: 'Ficha do Trello',
        itemTitulo: titulo,
        autor: user,
        currentUser: user,
        allUsers,
        workspace: todasOpcoes.find(w => w.cr4a1_calendarios_workspacesid === workspaceId)?.cr4a1_nome || '',
        lista: lista.cr4a1_nome
      });
      setNovaFichaPorLista(prev => ({ ...prev, [lista.cr4a1_listaid]: '' }));
      recarregar();
      await executarAutomacoes(criada, lista.cr4a1_listaid, 'criada');
    } catch { toast.error('Erro ao criar ficha.'); }
  };

  // Ao concluir uma ficha com recorrência configurada, cria sozinha a próxima ocorrência (nova
  // ficha pendente, checklist zerado, na mesma lista) — só faz sentido em fichas com data, já
  // que a repetição conta a partir dela.
  const criarProximaRecorrencia = async (ficha) => {
    const avancar = RECORRENCIAS[ficha.cr4a1_recorrencia];
    if (!avancar || !comData(ficha)) return;
    try {
      const novaData = avancar(new Date(ficha.cr4a1_data_inicio));
      const dia = format(novaData, 'yyyy-MM-dd');
      const hora = format(novaData, 'HH:mm');
      const { inicioIso, fimIso, horaFim } = intervaloDoEvento(dia, hora);
      const resEvento = await post('cr4a1_agenda_kairoses', {
        cr4a1_event_id: crypto.randomUUID(),
        cr4a1_titulo: ficha.cr4a1_titulo,
        cr4a1_user_login: ficha.cr4a1_responsavel_login,
        cr4a1_data_inicio: inicioIso,
        cr4a1_data_fim: fimIso,
        cr4a1_hora_inicio: hora,
        cr4a1_hora_fim: horaFim,
        cr4a1_tipo: 'Tarefa',
        cr4a1_detalhes: htmlParaTexto(ficha.cr4a1_descricao),
        cr4a1_subtasks: '[]',
        cr4a1_privado: false,
        cr4a1_arquivos: '[]',
        cr4a1_workspace_id: ficha.cr4a1_workspace_id
      });
      const eventoCriado = await resEvento.json();

      await post('cr4a1_fichas', {
        cr4a1_titulo: ficha.cr4a1_titulo,
        cr4a1_descricao: marcarTodasTarefas(ficha.cr4a1_descricao || '', false),
        cr4a1_lista_id: ficha.cr4a1_lista_id,
        cr4a1_workspace_id: ficha.cr4a1_workspace_id,
        cr4a1_responsavel_login: ficha.cr4a1_responsavel_login,
        cr4a1_criador_login: ficha.cr4a1_criador_login || user,
        cr4a1_ordem: fichas.filter(f => f.cr4a1_lista_id === ficha.cr4a1_lista_id).length,
        cr4a1_data_inicio: inicioIso,
        cr4a1_evento_id: eventoCriado.cr4a1_agenda_kairosid,
        cr4a1_concluida: 'Não',
        cr4a1_notificado: 'Não',
        cr4a1_etiquetas: ficha.cr4a1_etiquetas || '',
        cr4a1_cor: ficha.cr4a1_cor || '',
        cr4a1_recorrencia: ficha.cr4a1_recorrencia,
        cr4a1_atividades: registrarAtividade(null, 'criada', user, 'repetição automática')
      });
      recarregar();
      refreshEvents?.();
      toast.success('Próxima ocorrência criada automaticamente.');
    } catch { toast.error('Erro ao criar a próxima ocorrência recorrente.'); }
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

    // Registra no histórico só as mudanças que importam pra quem acompanha a ficha (não cada
    // tecla digitada no título/descrição).
    const listaMudou = form.listaId !== original.cr4a1_lista_id;
    const concluidaMudou = concluidaFinal !== (original.cr4a1_concluida === 'Sim');
    let atividades = original.cr4a1_atividades;
    if (listaMudou) {
      const nomeLista = listas.find(l => l.cr4a1_listaid === form.listaId)?.cr4a1_nome || '';
      atividades = registrarAtividade(atividades, 'movida', user, nomeLista);
    }
    if (responsavelMudou) atividades = registrarAtividade(atividades, 'responsavel', user, nomeDe(form.responsavel, allUsers));
    if (concluidaMudou) atividades = registrarAtividade(atividades, concluidaFinal ? 'concluida' : 'reaberta', user);

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

      // Notifica mencões no título e na descrição da ficha
      const textoNovo = `${form.titulo || ''}\n${form.descricao || ''}`;
      const textoAntigo = original ? `${original.cr4a1_titulo || ''}\n${original.cr4a1_descricao || ''}` : '';
      await notificarMencoes({
        textoNovo,
        textoAntigo,
        origem: 'Ficha do Trello',
        itemTitulo: form.titulo || original?.cr4a1_titulo || 'Ficha',
        autor: user,
        currentUser: user,
        allUsers,
        workspace: todasOpcoes.find(w => w.cr4a1_calendarios_workspacesid === workspaceId)?.cr4a1_nome || '',
        lista: listas.find(l => l.cr4a1_listaid === form.listaId)?.cr4a1_nome || ''
      });

      // Notifica novo responsável atribuído à ficha
      if (form.responsavel && form.responsavel !== original.cr4a1_responsavel_login && form.responsavel !== user) {
        notificarCompartilhamento({
          tipoItem: 'Ficha do Trello',
          itemTitulo: form.titulo || original.cr4a1_titulo,
          autor: user,
          destinatarios: [form.responsavel],
          currentUser: user,
          allUsers,
          detalhes: {
            origem: 'Trello',
            workspace: todasOpcoes.find(w => w.cr4a1_calendarios_workspacesid === workspaceId)?.cr4a1_nome || '',
            lista: listas.find(l => l.cr4a1_listaid === form.listaId)?.cr4a1_nome || '',
            dataHora: form.dia ? `${form.dia} ${form.hora || ''}` : ''
          }
        });
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
        cr4a1_cor: form.cor || '',
        cr4a1_stickers: joinAssignees(form.stickers),
        cr4a1_atividades: atividades,
        cr4a1_recorrencia: form.recorrencia || '',
        cr4a1_notificado: avisar ? 'Não' : (original.cr4a1_notificado || 'Sim')
      });

      if (avisar) {
        fetch('/api/push-send', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fichaId: original.cr4a1_fichaid })
        }).catch(() => {});
      }
      if (concluidaMudou && concluidaFinal) {
        await criarProximaRecorrencia({
          cr4a1_titulo: form.titulo,
          cr4a1_descricao: form.descricao || '',
          cr4a1_lista_id: form.listaId,
          cr4a1_workspace_id: workspaceId,
          cr4a1_responsavel_login: form.responsavel,
          cr4a1_criador_login: original.cr4a1_criador_login,
          cr4a1_data_inicio: dataIso,
          cr4a1_etiquetas: joinAssignees(form.etiquetas),
          cr4a1_cor: form.cor || '',
          cr4a1_recorrencia: form.recorrencia || ''
        });
      }

      // Automações da lista: trocar de lista pelo próprio formulário dispara as mesmas regras
      // do drag-and-drop; concluir, reabrir, atribuir responsável, definir prazo e adicionar etiqueta também valem aqui.
      const fichaPosSave = {
        ...original,
        cr4a1_titulo: form.titulo,
        cr4a1_descricao: form.descricao || '',
        cr4a1_lista_id: form.listaId,
        cr4a1_responsavel_login: form.responsavel,
        cr4a1_data_inicio: dataIso,
        cr4a1_etiquetas: joinAssignees(form.etiquetas),
        cr4a1_concluida: concluidaFinal ? 'Sim' : 'Não',
        cr4a1_cor: form.cor || ''
      };
      if (listaMudou) await executarAutomacoes(fichaPosSave, form.listaId, 'entrou');
      if (concluidaMudou && concluidaFinal) {
        await executarAutomacoes(fichaPosSave, form.listaId, 'concluida');
        if (tarefasDaDescricao.length > 0) {
          await executarAutomacoes(fichaPosSave, form.listaId, 'checklist_concluida');
        }
      }
      if (concluidaMudou && !concluidaFinal) {
        await executarAutomacoes(fichaPosSave, form.listaId, 'reaberta');
      }
      if (responsavelMudou && form.responsavel) {
        await executarAutomacoes(fichaPosSave, form.listaId, 'responsavel_atribuido');
      }
      if (dataMudou && dataDefinida) {
        await executarAutomacoes(fichaPosSave, form.listaId, 'prazo_definido');
      }
      const etiquetasOriginais = parseAssignees(original.cr4a1_etiquetas);
      for (const etiquetaId of form.etiquetas.filter(id => !etiquetasOriginais.includes(id))) {
        await executarAutomacoes(fichaPosSave, form.listaId, 'etiqueta', etiquetaId);
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
        anexos: parseAnexos(ficha.cr4a1_arquivos),
        cor: ficha.cr4a1_cor || '',
        stickers: parseAssignees(ficha.cr4a1_stickers),
        recorrencia: ficha.cr4a1_recorrencia || ''
      }
    });
  };

  // Abre uma ficha que pertence a outro workspace (vindo de "Minhas fichas") — precisa trocar
  // o quadro ativo antes, já que salvarFicha grava novos eventos vinculados usando o
  // workspaceId que estiver ativo no momento do save.
  const abrirFichaDeOutroWorkspace = (ficha) => {
    setWorkspaceId(ficha.cr4a1_workspace_id);
    setMinhasFichasAberto(false);
    abrirFicha(ficha);
  };

  // Colaboradores e Workspaces vinculados do quadro (além dos membros do workspace)
  const salvarColaboradoresEWorkspaces = async (novosLogins, novosWsIds) => {
    const itens = [
      ...novosLogins.filter(l => !l.startsWith('ws:')),
      ...novosWsIds.map(id => id.startsWith('ws:') ? id : `ws:${id}`)
    ];
    const valorColaboradores = joinAssignees(itens);
    const corpo = {
      cr4a1_nome: workspace?.cr4a1_nome || workspaceId,
      cr4a1_workspace_id: workspaceId,
      cr4a1_criador_login: workspace?.cr4a1_criador_login || user,
      cr4a1_colaboradores: valorColaboradores
    };
    try {
      if (quadro?.cr4a1_quadroid) await patch('cr4a1_quadros', quadro.cr4a1_quadroid, { cr4a1_colaboradores: valorColaboradores });
      else await post('cr4a1_quadros', corpo);
      recarregar();
    } catch { toast.error('Erro ao atualizar compartilhamento.'); }
  };
  const adicionarColaborador = (login) => {
    salvarColaboradoresEWorkspaces([...colaboradoresLogins, login], workspacesVinculadosIds);
    notificarCompartilhamento({
      tipoItem: 'Quadro do Trello',
      itemTitulo: workspace?.cr4a1_nome || 'Quadro de Tarefas',
      autor: user,
      destinatarios: [login],
      currentUser: user,
      allUsers,
      detalhes: {
        origem: 'Trello',
        workspace: workspace?.cr4a1_nome || workspaceId
      }
    });
  };
  const removerColaborador = (login) => salvarColaboradoresEWorkspaces(colaboradoresLogins.filter(l => l !== login), workspacesVinculadosIds);
  const adicionarWorkspaceVinculado = (wsId) => salvarColaboradoresEWorkspaces(colaboradoresLogins, [...workspacesVinculadosIds, wsId]);
  const removerWorkspaceVinculado = (wsId) => salvarColaboradoresEWorkspaces(colaboradoresLogins, workspacesVinculadosIds.filter(id => id !== wsId));

  // Transfere o quadro inteiro (quadro, listas, fichas, etiquetas e eventos vinculados) para outro workspace
  const transferirQuadroParaWorkspace = async (novoWsId) => {
    const destino = todasOpcoes.find(w => w.cr4a1_calendarios_workspacesid === novoWsId);
    const novoWsNome = destino?.cr4a1_nome || novoWsId;
    try {
      if (quadro?.cr4a1_quadroid) {
        await patch('cr4a1_quadros', quadro.cr4a1_quadroid, {
          cr4a1_workspace_id: novoWsId,
          cr4a1_nome: novoWsNome
        });
      }

      for (const lista of listas) {
        await patch('cr4a1_listas', lista.cr4a1_listaid, { cr4a1_workspace_id: novoWsId });
      }

      for (const ficha of fichas) {
        await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_workspace_id: novoWsId });
        if (ficha.cr4a1_evento_id) {
          await patch('cr4a1_agenda_kairoses', ficha.cr4a1_evento_id, { cr4a1_workspace_id: novoWsId }).catch(() => {});
        }
      }

      for (const etiqueta of etiquetas) {
        await patch('cr4a1_etiquetas', etiqueta.cr4a1_etiquetaid, { cr4a1_workspace_id: novoWsId });
      }

      setWorkspaceId(novoWsId);
      setMudarWorkspaceAberto(false);
      recarregar();
      refreshEvents?.();
      toast.success(`Quadro transferido para "${novoWsNome}" com sucesso!`);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao transferir quadro para o novo workspace.');
      throw error;
    }
  };

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

  const fichasAtivas = useMemo(
    () => fichas.filter(f => !ehFichaArquivada(f)),
    [fichas]
  );
  const fichasArquivadas = useMemo(
    () => fichas.filter(f => ehFichaArquivada(f)),
    [fichas]
  );

  const fichasVisiveis = useMemo(
    () => (filtrosAtivos === 0 ? fichasAtivas : fichasAtivas.filter(f => fichaCombinaComFiltros(f, filtros))),
    [fichasAtivas, filtros, filtrosAtivos]
  );
  const fichasDaLista = (lista) => {
    const doLista = fichasVisiveis.filter(f => f.cr4a1_lista_id === lista.cr4a1_listaid);
    const crit = ordenacaoPorLista[lista.cr4a1_listaid] || 'padrao';
    return ordenarFichasPorCriterio(doLista, crit);
  };

  // Arquiva uma ficha individual (move para o Espaço de Fichas Arquivadas e dispara gatilho "arquivada")
  const arquivarFicha = async (ficha) => {
    const atividades = registrarAtividade(ficha.cr4a1_atividades, 'arquivada', user);
    setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_fixada: 'Arq', cr4a1_atividades: atividades } : f));
    setEditando(null);
    try {
      await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_fixada: 'Arq', cr4a1_atividades: atividades });
      await executarAutomacoes({ ...ficha, cr4a1_fixada: 'Arq', cr4a1_atividades: atividades }, ficha.cr4a1_lista_id, 'arquivada');
      toast.success(`Ficha "${ficha.cr4a1_titulo}" arquivada.`);
    } catch {
      toast.error('Erro ao arquivar ficha.');
      setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_fixada: ficha.cr4a1_fixada, cr4a1_atividades: ficha.cr4a1_atividades } : f));
    }
  };

  // Restaura uma ficha arquivada de volta para sua lista original (ou outra lista escolhida)
  const desarquivarFicha = async (ficha, destinoListaId) => {
    const listaOriginalExiste = listas.some(l => l.cr4a1_listaid === ficha.cr4a1_lista_id);
    const listaAlvoId = destinoListaId || (listaOriginalExiste ? ficha.cr4a1_lista_id : listas[0]?.cr4a1_listaid || ficha.cr4a1_lista_id);
    const atividades = registrarAtividade(ficha.cr4a1_atividades, 'desarquivada', user);
    const corpo = { cr4a1_fixada: 'Não', cr4a1_lista_id: listaAlvoId, cr4a1_atividades: atividades };
    setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, ...corpo } : f));
    setEditando(null);
    try {
      await patch('cr4a1_fichas', ficha.cr4a1_fichaid, corpo);
      toast.success(`Ficha "${ficha.cr4a1_titulo}" restaurada ao quadro!`);
    } catch {
      toast.error('Erro ao restaurar ficha.');
      recarregar();
    }
  };

  // Arquiva todas as fichas concluídas de uma lista específica
  const arquivarConcluidasDaLista = async (lista) => {
    const concluidas = fichasAtivas.filter(f => f.cr4a1_lista_id === lista.cr4a1_listaid && f.cr4a1_concluida === 'Sim');
    if (concluidas.length === 0) {
      toast('Não há fichas concluídas nesta lista para arquivar.');
      return;
    }
    if (!(await confirm(`Arquivar ${concluidas.length} ficha(s) concluída(s) da lista "${lista.cr4a1_nome}"?`, { title: 'Arquivar concluídas' }))) return;
    try {
      for (const f of concluidas) {
        const atividades = registrarAtividade(f.cr4a1_atividades, 'arquivada', user, 'lote de concluídas');
        await patch('cr4a1_fichas', f.cr4a1_fichaid, { cr4a1_fixada: 'Arq', cr4a1_atividades: atividades });
      }
      recarregar();
      toast.success(`${concluidas.length} ficha(s) concluída(s) arquivada(s)!`);
    } catch {
      toast.error('Erro ao arquivar fichas concluídas.');
    }
  };

  // Arquiva todas as fichas ativas de uma lista específica
  const arquivarTodasDaLista = async (lista) => {
    const daLista = fichasAtivas.filter(f => f.cr4a1_lista_id === lista.cr4a1_listaid);
    if (daLista.length === 0) {
      toast('Esta lista já está vazia.');
      return;
    }
    if (!(await confirm(`Arquivar todas as ${daLista.length} ficha(s) da lista "${lista.cr4a1_nome}"?`, { title: 'Arquivar fichas da lista' }))) return;
    try {
      for (const f of daLista) {
        const atividades = registrarAtividade(f.cr4a1_atividades, 'arquivada', user, `lista ${lista.cr4a1_nome}`);
        await patch('cr4a1_fichas', f.cr4a1_fichaid, { cr4a1_fixada: 'Arq', cr4a1_atividades: atividades });
      }
      recarregar();
      toast.success(`${daLista.length} ficha(s) arquivada(s)!`);
    } catch {
      toast.error('Erro ao arquivar fichas da lista.');
    }
  };

  // Restaura todas as fichas arquivadas do workspace
  const restaurarTodasArquivadas = async () => {
    if (fichasArquivadas.length === 0) return;
    if (!(await confirm(`Restaurar todas as ${fichasArquivadas.length} ficha(s) arquivada(s) para o quadro?`, { title: 'Restaurar todas' }))) return;
    try {
      for (const f of fichasArquivadas) {
        const listaOriginalExiste = listas.some(l => l.cr4a1_listaid === f.cr4a1_lista_id);
        const listaAlvoId = listaOriginalExiste ? f.cr4a1_lista_id : (listas[0]?.cr4a1_listaid || f.cr4a1_lista_id);
        const atividades = registrarAtividade(f.cr4a1_atividades, 'desarquivada', user);
        await patch('cr4a1_fichas', f.cr4a1_fichaid, { cr4a1_fixada: 'Não', cr4a1_lista_id: listaAlvoId, cr4a1_atividades: atividades });
      }
      recarregar();
      toast.success('Todas as fichas foram restauradas ao quadro!');
    } catch {
      toast.error('Erro ao restaurar fichas arquivadas.');
    }
  };

  // Exclui permanentemente todas as fichas arquivadas do workspace
  const excluirTodasArquivadas = async () => {
    if (fichasArquivadas.length === 0) return;
    if (!(await confirm(`Excluir permanentemente todas as ${fichasArquivadas.length} ficha(s) arquivada(s)? Esta ação não pode ser desfeita.`, { title: 'Esvaziar arquivo' }))) return;
    try {
      for (const f of fichasArquivadas) {
        await removerEventoDaFicha(f);
        await apagar('cr4a1_fichas', f.cr4a1_fichaid);
      }
      recarregar();
      refreshEvents?.();
      toast.success('Espaço de arquivadas esvaziado.');
    } catch {
      toast.error('Erro ao excluir fichas arquivadas.');
    }
  };

  // Marca a ficha como concluída/pendente direto no card, sem abrir o formulário.
  // Concluir o cartão também marca todas as microtarefas (o card reflete o estado delas).
  const toggleConcluida = async (ficha) => {
    const novoValor = ficha.cr4a1_concluida === 'Sim' ? 'Não' : 'Sim';
    const novaDescricao = novoValor === 'Sim' ? marcarTodasTarefas(ficha.cr4a1_descricao, true) : ficha.cr4a1_descricao;
    const atividades = registrarAtividade(ficha.cr4a1_atividades, novoValor === 'Sim' ? 'concluida' : 'reaberta', user);
    setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_concluida: novoValor, cr4a1_descricao: novaDescricao, cr4a1_atividades: atividades } : f));
    try {
      await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_concluida: novoValor, cr4a1_descricao: novaDescricao, cr4a1_atividades: atividades });
      if (novoValor === 'Sim') {
        await criarProximaRecorrencia(ficha);
        await executarAutomacoes({ ...ficha, cr4a1_concluida: 'Sim', cr4a1_descricao: novaDescricao }, ficha.cr4a1_lista_id, 'concluida');
      } else {
        await executarAutomacoes({ ...ficha, cr4a1_concluida: 'Não', cr4a1_descricao: novaDescricao }, ficha.cr4a1_lista_id, 'reaberta');
      }
    } catch {
      toast.error('Erro ao atualizar ficha.');
      setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_concluida: ficha.cr4a1_concluida, cr4a1_descricao: ficha.cr4a1_descricao, cr4a1_atividades: ficha.cr4a1_atividades } : f));
    }
  };

  // Fixa/desafixa a ficha no topo da lista, direto no card (igual ao pin do Trello).
  const alternarFixada = async (ficha) => {
    const novoValor = ficha.cr4a1_fixada === 'Sim' ? 'Não' : 'Sim';
    const atividades = registrarAtividade(ficha.cr4a1_atividades, novoValor === 'Sim' ? 'fixada' : 'desafixada', user);
    setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_fixada: novoValor, cr4a1_atividades: atividades } : f));
    try {
      await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_fixada: novoValor, cr4a1_atividades: atividades });
    } catch {
      toast.error('Erro ao fixar ficha.');
      setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_fixada: ficha.cr4a1_fixada, cr4a1_atividades: ficha.cr4a1_atividades } : f));
    }
  };

  // Marca/desmarca uma microtarefa direto no card. O cartão segue o estado das tarefas: todas
  // concluídas marca o cartão sozinho, qualquer uma pendente reabre o cartão automaticamente.
  const toggleMicrotarefa = async (ficha, indiceTarefa) => {
    const concluidaAntes = ficha.cr4a1_concluida === 'Sim';
    const novaDescricao = alternarTarefaNaDescricao(ficha.cr4a1_descricao, indiceTarefa);
    const tarefas = extrairTarefas(novaDescricao);
    const novoConcluida = tarefas.length > 0 && tarefas.every(t => t.concluida) ? 'Sim' : 'Não';
    setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_descricao: novaDescricao, cr4a1_concluida: novoConcluida } : f));
    try {
      await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_descricao: novaDescricao, cr4a1_concluida: novoConcluida });
      const fichaAtualizada = { ...ficha, cr4a1_descricao: novaDescricao, cr4a1_concluida: novoConcluida };
      if (!concluidaAntes && novoConcluida === 'Sim') {
        await criarProximaRecorrencia(ficha);
        await executarAutomacoes(fichaAtualizada, ficha.cr4a1_lista_id, 'concluida');
        await executarAutomacoes(fichaAtualizada, ficha.cr4a1_lista_id, 'checklist_concluida');
      } else if (concluidaAntes && novoConcluida === 'Não') {
        await executarAutomacoes(fichaAtualizada, ficha.cr4a1_lista_id, 'reaberta');
      }
    } catch {
      toast.error('Erro ao atualizar microtarefa.');
      setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_descricao: ficha.cr4a1_descricao, cr4a1_concluida: ficha.cr4a1_concluida } : f));
    }
  };

  // Comentários ficam guardados como JSON na própria ficha e são salvos na hora (não esperam
  // o botão "Salvar" do formulário) — igual ao toggle de concluída/microtarefa, pra não se
  // perderem se o usuário fechar a ficha sem salvar o resto.
  const adicionarComentario = async (ficha, texto) => {
    const comentarios = [...parseComentarios(ficha.cr4a1_comentarios), criarComentario(user, texto)];
    const json = JSON.stringify(comentarios);
    const atividades = registrarAtividade(ficha.cr4a1_atividades, 'comentario', user);

    // Notifica mencões em comentários da ficha
    await notificarMencoes({
      textoNovo: texto,
      textoAntigo: '',
      origem: 'Comentário no Trello',
      itemTitulo: ficha.cr4a1_titulo,
      autor: user,
      currentUser: user,
      allUsers,
      workspace: todasOpcoes.find(w => w.cr4a1_calendarios_workspacesid === ficha.cr4a1_workspace_id)?.cr4a1_nome || '',
      lista: listas.find(l => l.cr4a1_listaid === ficha.cr4a1_lista_id)?.cr4a1_nome || ''
    });
    setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_comentarios: json, cr4a1_atividades: atividades } : f));
    setEditando(prev => (prev && prev.original.cr4a1_fichaid === ficha.cr4a1_fichaid) ? { ...prev, original: { ...prev.original, cr4a1_comentarios: json, cr4a1_atividades: atividades } } : prev);
    try {
      await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_comentarios: json, cr4a1_atividades: atividades });
      await executarAutomacoes({ ...ficha, cr4a1_comentarios: json, cr4a1_atividades: atividades }, ficha.cr4a1_lista_id, 'comentario_adicionado');
    } catch {
      toast.error('Erro ao comentar.');
    }
  };

  const removerComentario = async (ficha, comentarioId) => {
    const json = JSON.stringify(parseComentarios(ficha.cr4a1_comentarios).filter(c => c.id !== comentarioId));
    setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_comentarios: json } : f));
    setEditando(prev => (prev && prev.original.cr4a1_fichaid === ficha.cr4a1_fichaid) ? { ...prev, original: { ...prev.original, cr4a1_comentarios: json } } : prev);
    try {
      await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_comentarios: json });
    } catch {
      toast.error('Erro ao excluir comentário.');
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

    mudarOrdenacaoLista(destinoId, 'padrao');
    if (origemId !== destinoId) mudarOrdenacaoLista(origemId, 'padrao');

    // O índice do drag é relativo ao que está visível na tela — com filtro ativo, a posição
    // é calculada em cima de fichasVisiveis (não da lista completa), senão a ficha cairia na
    // posição errada contando cartões escondidos pelo filtro. Fichas escondidas da mesma
    // lista continuam no estado, só não entram no recálculo de ordem (nada mudou pra elas).
    const idsVisiveis = new Set(fichasVisiveis.map(f => f.cr4a1_fichaid));
    const outras = fichas.filter(f => f.cr4a1_fichaid !== draggableId);
    const outrasVisiveis = outras.filter(f => idsVisiveis.has(f.cr4a1_fichaid));

    const mudouDeLista = origemId !== destinoId;
    const atividadesFicha = mudouDeLista
      ? registrarAtividade(ficha.cr4a1_atividades, 'movida', user, listas.find(l => l.cr4a1_listaid === destinoId)?.cr4a1_nome || '')
      : ficha.cr4a1_atividades;

    const destinoListaVisivel = ordenar(outrasVisiveis.filter(f => f.cr4a1_lista_id === destinoId));
    destinoListaVisivel.splice(destination.index, 0, { ...ficha, cr4a1_lista_id: destinoId, cr4a1_atividades: atividadesFicha });
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
      const corpo = { cr4a1_lista_id: f.cr4a1_lista_id, cr4a1_ordem: f.cr4a1_ordem };
      if (f.cr4a1_fichaid === draggableId && mudouDeLista) corpo.cr4a1_atividades = atividadesFicha;
      patch('cr4a1_fichas', f.cr4a1_fichaid, corpo)
        .then(() => {
          if (f.cr4a1_fichaid === draggableId && mudouDeLista) executarAutomacoes({ ...f, cr4a1_atividades: atividadesFicha }, destinoId, 'entrou');
        })
        .catch(() => toast.error('Erro ao mover ficha.'));
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
          {membrosVisiveis.length > 0 && (
            <button
              type="button"
              onClick={() => setCompartilharAberto(true)}
              title="Quem tem acesso a este quadro"
              className="flex items-center -space-x-2"
            >
              {membrosVisiveis.slice(0, 6).map(m => (
                <UserAvatar key={m.cr4a1_username} login={m.cr4a1_username} allUsers={allUsers} size={28} className="ring-2 ring-[var(--card)]" />
              ))}
              {membrosVisiveis.length > 6 && (
                <div className="flex size-[28px] items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-muted-foreground ring-2 ring-[var(--card)]">
                  +{membrosVisiveis.length - 6}
                </div>
              )}
            </button>
          )}
          <Popover open={filtrosAberto} onOpenChange={setFiltrosAberto}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="relative" aria-label="Filtros">
                <Filter className="size-4" /> <span className="hidden sm:inline">Filtros</span>
                {filtrosAtivos > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{filtrosAtivos}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 max-w-[90vw] overflow-y-auto p-4" style={{ maxHeight: 'var(--radix-popover-content-available-height)' }}>
              <div className="flex flex-col gap-4">
                <SearchField value={filtros.busca} onChange={v => setFiltro('busca', v)} placeholder="Buscar por título ou descrição..." />

                {membrosVisiveis.length > 0 && (
                  <div>
                    <Label className="mb-1.5">Responsável</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {membrosVisiveis.map(m => (
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
          {/* Ações secundárias (menos usadas no dia a dia) — fica como botões soltos a partir
              de sm, e some pra dentro de um menu "Mais" só no mobile, pra não lotar o
              cabeçalho de linhas de botão com texto antes mesmo do quadro aparecer. */}
          <div className="hidden items-center gap-3 sm:flex">
            <Button variant="outline" size="sm" onClick={() => setFundoAberto(true)}>
              <Palette className="size-4" /> Fundo
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEtiquetasAberto(true)}>
              <Tag className="size-4" /> Etiquetas
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCompartilharAberto(true)}>
              <Users className="size-4" /> Compartilhar
            </Button>
            {podeGerenciarColaboradores && (
              <Button variant="outline" size="sm" onClick={() => setMudarWorkspaceAberto(true)} title="Mudar Workspace do Quadro">
                <FolderSync className="size-4" /> Mudar Workspace
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setModelosAberto(true)}>
              <LayoutTemplate className="size-4" /> Modelos
            </Button>
            <Button variant="outline" size="sm" onClick={exportarQuadro}>
              <FileSpreadsheet className="size-4" /> Exportar
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="sm:hidden" aria-label="Mais ações">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFundoAberto(true)}><Palette className="size-4" /> Fundo</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEtiquetasAberto(true)}><Tag className="size-4" /> Etiquetas</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCompartilharAberto(true)}><Users className="size-4" /> Compartilhar</DropdownMenuItem>
              {podeGerenciarColaboradores && (
                <DropdownMenuItem onClick={() => setMudarWorkspaceAberto(true)}><FolderSync className="size-4" /> Mudar Workspace</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setModelosAberto(true)}><LayoutTemplate className="size-4" /> Modelos</DropdownMenuItem>
              <DropdownMenuItem onClick={exportarQuadro}><FileSpreadsheet className="size-4" /> Exportar</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setArquivadasAberto(true)}>
                <Archive className="size-4" /> Arquivadas ({fichasArquivadas.length})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant={arquivadasAberto ? 'default' : 'outline'}
            size="sm"
            onClick={() => setArquivadasAberto(true)}
            aria-label="Fichas arquivadas"
            title="Abrir espaço de fichas arquivadas"
            className="relative"
          >
            <Archive className="size-4" />
            <span className="hidden sm:inline">Arquivadas</span>
            {fichasArquivadas.length > 0 && (
              <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px]">
                {fichasArquivadas.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={minhasFichasAberto ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMinhasFichasAberto(v => !v)}
            aria-label="Minhas fichas"
          >
            <UserCircle2 className="size-4" /> <span className="hidden sm:inline">Minhas fichas</span>
          </Button>
          <Select value={workspaceId} onValueChange={setWorkspaceId}>
            <SelectTrigger className="w-36 sm:w-60"><SelectValue placeholder="Workspace" /></SelectTrigger>
            <SelectContent>
              {todasOpcoes.map(w => {
                const ehExtra = workspacesExtras.some(e => e.cr4a1_calendarios_workspacesid === w.cr4a1_calendarios_workspacesid);
                return (
                  <SelectItem key={w.cr4a1_calendarios_workspacesid} value={w.cr4a1_calendarios_workspacesid}>
                    {w.cr4a1_nome}{ehExtra ? ' (Compartilhado)' : ''}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </header>

      {minhasFichasAberto ? (
        <div className="flex flex-col gap-4">
          {minhasFichasCarregando ? (
            <p className="text-sm text-muted-foreground">Carregando suas fichas...</p>
          ) : minhasFichasOrdenadas.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/90 p-10 text-center">
              <UserCircle2 className="size-8 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Nenhuma ficha atribuída a você no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {minhasFichasOrdenadas.map(ficha => {
                const etiquetasDaFicha = parseAssignees(ficha.cr4a1_etiquetas).map(id => etiquetas.find(e => e.cr4a1_etiquetaid === id)).filter(Boolean);
                const concluida = ficha.cr4a1_concluida === 'Sim';
                const stickersDaFicha = parseAssignees(ficha.cr4a1_stickers);
                const corCard = ficha.cr4a1_cor ? corTextoLegivel(ficha.cr4a1_cor) : null;
                const workspaceDaFicha = todasOpcoes.find(w => w.cr4a1_calendarios_workspacesid === ficha.cr4a1_workspace_id);
                return (
                  <button
                    key={ficha.cr4a1_fichaid}
                    type="button"
                    onClick={() => abrirFichaDeOutroWorkspace(ficha)}
                    className="flex flex-col gap-1.5 overflow-hidden rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary"
                    style={corCard ? {
                      backgroundColor: ficha.cr4a1_cor,
                      borderColor: ficha.cr4a1_cor,
                      '--text-primary': corCard.principal,
                      '--text-secondary': corCard.suave
                    } : undefined}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{workspaceDaFicha?.cr4a1_nome || 'Workspace'}</span>
                    {(etiquetasDaFicha.length > 0 || stickersDaFicha.length > 0) && (
                      <div className="flex flex-wrap items-center gap-1">
                        {etiquetasDaFicha.map(et => <EtiquetaChip key={et.cr4a1_etiquetaid} etiqueta={et} compacta />)}
                        {stickersDaFicha.map((emoji, i) => <Sticker key={i} emoji={emoji} size={16} />)}
                      </div>
                    )}
                    <span className={`text-sm font-semibold text-foreground ${concluida ? 'line-through opacity-60' : ''}`}>{ficha.cr4a1_titulo}</span>
                    {comData(ficha) && (
                      <span className={`inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${corUrgenciaData(ficha.cr4a1_data_inicio, concluida)}`}>
                        <CalendarDays className="size-3" />
                        {format(new Date(ficha.cr4a1_data_inicio), 'dd/MM HH:mm')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : estouBloqueado ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/90 p-10 text-center">
          <ShieldOff className="size-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Seu acesso ao Trello deste workspace foi bloqueado.</p>
          <p className="text-xs text-muted-foreground">Fale com o coordenador do setor ou com um ADMIN se achar que isso é um engano.</p>
        </div>
      ) : (
      <div className="flex items-start gap-3 overflow-x-auto pb-4">
        {listasVisiveis.map(lista => {
          const souCriadorLista = !lista.cr4a1_criador_login || lista.cr4a1_criador_login === user;
          const gerentesDaLista = parseListaGerentes(lista.cr4a1_automacao);
          const souGerente = gerentesDaLista.includes(user);
          const souDono = souCriadorLista || isAdmin;
          const podeGerenciar = souDono || souGerente || workspace?.cr4a1_criador_login === user;
          const podeGerenciarAutomacoes = podeGerenciar;
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
            <section key={lista.cr4a1_listaid} className={`flex w-72 shrink-0 flex-col gap-2 rounded-2xl border p-3 max-h-[calc(100vh-210px)] ${pessoal ? 'border-primary/40 bg-primary/5' : 'border-border bg-secondary'}`}>
              <div className="flex items-start justify-between gap-1.5 shrink-0">
                <button type="button" onClick={() => alternarColapso(lista.cr4a1_listaid)} aria-label={`Encolher lista ${lista.cr4a1_nome}`} title="Encolher lista" className="shrink-0 mt-1 text-muted-foreground hover:text-primary">
                  <ChevronLeft className="size-4" />
                </button>
                <textarea
                  key={lista.cr4a1_nome}
                  defaultValue={lista.cr4a1_nome}
                  rows={1}
                  onBlur={e => renomearLista(lista, e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  onInput={e => {
                    e.currentTarget.style.height = 'auto';
                    e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                  }}
                  ref={el => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = `${el.scrollHeight}px`;
                    }
                  }}
                  aria-label={`Nome da lista ${lista.cr4a1_nome}`}
                  readOnly={!podeGerenciar}
                  className="min-w-0 flex-1 resize-none overflow-hidden bg-transparent text-sm font-bold leading-snug text-foreground outline-none break-words [word-break:normal] hyphens-none focus:ring-1 focus:ring-primary/40 rounded px-1"
                />
                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                  <Badge variant="secondary" className="px-1.5 py-0 text-[11px]">{fichasDaLista(lista).length}</Badge>

                  <ListaOrdenacaoMenu
                    criterioAtual={ordenacaoPorLista[lista.cr4a1_listaid] || 'padrao'}
                    onChange={(crit) => mudarOrdenacaoLista(lista.cr4a1_listaid, crit)}
                  />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Opções da lista ${lista.cr4a1_nome}`}
                        title="Opções da lista"
                        className="shrink-0 rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {podeGerenciarAutomacoes && (
                        <DropdownMenuItem onClick={() => setListaAutomacao(lista)} className="cursor-pointer">
                          <Zap className={`size-4 mr-2 ${parseAutomacoes(lista.cr4a1_automacao).length > 0 ? 'text-primary' : ''}`} />
                          Automações
                          {parseAutomacoes(lista.cr4a1_automacao).length > 0 && (
                            <Badge variant="secondary" className="ml-auto text-[10px] px-1 py-0">
                              {parseAutomacoes(lista.cr4a1_automacao).length}
                            </Badge>
                          )}
                        </DropdownMenuItem>
                      )}

                      {podeGerenciar && (
                        <DropdownMenuItem onClick={() => setListaGerentes(lista)} className="cursor-pointer">
                          <UserCheck className={`size-4 mr-2 ${gerentesDaLista.length > 0 ? 'text-primary' : ''}`} />
                          Gerentes da Lista
                          {gerentesDaLista.length > 0 && (
                            <Badge variant="secondary" className="ml-auto text-[10px] px-1 py-0">
                              {gerentesDaLista.length}
                            </Badge>
                          )}
                        </DropdownMenuItem>
                      )}

                      {souDono && (
                        <DropdownMenuItem onClick={() => alternarListaPessoal(lista)} className="cursor-pointer">
                          {pessoal ? <Unlock className="size-4 mr-2" /> : <Lock className="size-4 mr-2" />}
                          {pessoal ? 'Tornar Visível para Todos' : 'Tornar Lista Pessoal'}
                        </DropdownMenuItem>
                      )}

                      {podeGerenciar && (
                        <DropdownMenuItem onClick={() => setListaMoverWorkspace(lista)} className="cursor-pointer">
                          <FolderInput className="size-4 mr-2" />
                          Mover para outro Workspace
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem onClick={() => setListaExportar(lista)} className="cursor-pointer">
                        <Share2 className="size-4 mr-2" />
                        Exportar ou Enviar Lista
                      </DropdownMenuItem>

                      {podeGerenciar && (
                        <DropdownMenuItem onClick={() => arquivarConcluidasDaLista(lista)} className="cursor-pointer">
                          <Archive className="size-4 mr-2" />
                          Arquivar Concluídas da Lista
                        </DropdownMenuItem>
                      )}

                      {podeGerenciar && (
                        <DropdownMenuItem onClick={() => arquivarTodasDaLista(lista)} className="cursor-pointer">
                          <Archive className="size-4 mr-2" />
                          Arquivar Todas as Fichas
                        </DropdownMenuItem>
                      )}

                      {podeGerenciar && (
                        <DropdownMenuItem onClick={() => apagarLista(lista)} className="cursor-pointer text-destructive focus:text-destructive">
                          <Trash2 className="size-4 mr-2" />
                          Excluir Lista
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <Droppable droppableId={lista.cr4a1_listaid}>
                {(provided, snapshotDroppable) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{ minHeight: fichasDaLista(lista).length === 0 ? '48px' : '0px' }}
                    className={`trello-card-list flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1.5 flex flex-col gap-2 transition-colors rounded-lg overscroll-contain ${snapshotDroppable.isDraggingOver ? 'bg-primary/5 ring-1 ring-primary/20' : ''}`}
                  >
                    {fichasDaLista(lista).map((ficha, index) => {
                      const etiquetasDaFicha = parseAssignees(ficha.cr4a1_etiquetas).map(id => etiquetas.find(e => e.cr4a1_etiquetaid === id)).filter(Boolean);
                      const concluida = ficha.cr4a1_concluida === 'Sim';
                      const microtarefas = extrairTarefas(ficha.cr4a1_descricao);
                      const microtarefasFeitas = microtarefas.filter(t => t.concluida).length;
                      const anexosDaFicha = parseAnexos(ficha.cr4a1_arquivos);
                      const qtdAnexos = anexosDaFicha.length;
                      const qtdComentarios = parseComentarios(ficha.cr4a1_comentarios).length;
                      const capaImagem = primeiraImagem(anexosDaFicha);
                      const stickersDaFicha = parseAssignees(ficha.cr4a1_stickers);
                      const corCard = ficha.cr4a1_cor ? corTextoLegivel(ficha.cr4a1_cor) : null;
                      const fixada = ficha.cr4a1_fixada === 'Sim';
                      return (
                        <Draggable key={ficha.cr4a1_fichaid} draggableId={ficha.cr4a1_fichaid} index={index}>
                          {(providedCard, snapshot) => (
                            <div
                              ref={providedCard.innerRef}
                              {...providedCard.draggableProps}
                              {...providedCard.dragHandleProps}
                              className={`flex flex-col shrink-0 min-h-fit gap-1.5 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/30 z-50' : ''}`}
                              style={{
                                ...providedCard.draggableProps.style,
                                ...(corCard ? {
                                  backgroundColor: ficha.cr4a1_cor,
                                  borderColor: ficha.cr4a1_cor,
                                  '--text-primary': corCard.principal,
                                  '--text-secondary': corCard.suave
                                } : {})
                              }}
                            >
                              {capaImagem && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setAnexoCardPreview(capaImagem); }}
                                  className="-mx-3 -mt-3 mb-0.5 block overflow-hidden rounded-t-xl"
                                  aria-label={`Visualizar ${capaImagem.name}`}
                                >
                                  <img src={capaImagem.base64} alt={capaImagem.name} className="h-28 w-full object-cover" />
                                </button>
                              )}
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
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => abrirFicha(ficha)}
                                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirFicha(ficha); } }}
                                  className="flex min-w-0 flex-1 flex-col gap-1.5 text-left cursor-pointer select-none"
                                >
                                  {(etiquetasDaFicha.length > 0 || stickersDaFicha.length > 0) && (
                                    <div className="flex flex-wrap items-center gap-1">
                                      {etiquetasDaFicha.map(et => <EtiquetaChip key={et.cr4a1_etiquetaid} etiqueta={et} compacta />)}
                                      {stickersDaFicha.map((emoji, i) => <Sticker key={i} emoji={emoji} size={16} />)}
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
                                    {ficha.cr4a1_recorrencia && (
                                      <span title={`Repete ${RECORRENCIA_LABEL[ficha.cr4a1_recorrencia]?.toLowerCase() || ''}`}>
                                        <Repeat className="size-3" />
                                      </span>
                                    )}
                                    {qtdAnexos > 0 && (
                                      <span className="inline-flex items-center gap-0.5" title={`${qtdAnexos} anexo(s)`}>
                                        <Paperclip className="size-3" /> {qtdAnexos}
                                      </span>
                                    )}
                                    {qtdComentarios > 0 && (
                                      <span className="inline-flex items-center gap-0.5" title={`${qtdComentarios} comentário(s)`}>
                                        <MessageCircle className="size-3" /> {qtdComentarios}
                                      </span>
                                    )}
                                    <UserAvatar login={ficha.cr4a1_responsavel_login} allUsers={allUsers} size={16} />
                                    <span>{nomeDe(ficha.cr4a1_responsavel_login, allUsers)}</span>
                                  </div>
                                </div>
                                <div className="mt-0.5 flex shrink-0 items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); alternarFixada(ficha); }}
                                    aria-label={fixada ? `Desafixar "${ficha.cr4a1_titulo}"` : `Fixar "${ficha.cr4a1_titulo}" no topo da lista`}
                                    title={fixada ? 'Desafixar' : 'Fixar no topo da lista'}
                                    className={`shrink-0 ${fixada ? 'text-primary' : 'text-muted-foreground/40 hover:text-primary'}`}
                                  >
                                    <Pin className="size-[15px]" fill={fixada ? 'currentColor' : 'none'} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); arquivarFicha(ficha); }}
                                    aria-label={`Arquivar "${ficha.cr4a1_titulo}"`}
                                    title="Arquivar ficha"
                                    className="shrink-0 text-muted-foreground/40 hover:text-primary"
                                  >
                                    <Archive className="size-[15px]" />
                                  </button>
                                </div>
                              </div>
                              {microtarefas.length > 0 && (
                                <div className="flex flex-col gap-1.5 pl-[26px]">
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                                      <div className="h-full rounded-full bg-success transition-all" style={{ width: `${(microtarefasFeitas / microtarefas.length) * 100}%` }} />
                                    </div>
                                    <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">{microtarefasFeitas}/{microtarefas.length}</span>
                                  </div>
                                  {microtarefas.map(tarefa => {
                                    const vencimentoIso = tarefa.dataVencimento ? `${tarefa.dataVencimento}T12:00:00` : null;
                                    return (
                                      <button
                                        key={tarefa.index}
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); toggleMicrotarefa(ficha, tarefa.index); }}
                                        className="flex items-center gap-1.5 text-left text-[11px] text-muted-foreground"
                                      >
                                        {tarefa.concluida ? <CheckCircle2 className="size-3 shrink-0 text-success" /> : <Circle className="size-3 shrink-0" />}
                                        <span className={`min-w-0 flex-1 truncate ${tarefa.concluida ? 'line-through opacity-60' : ''}`}>{tarefa.texto}</span>
                                        {vencimentoIso && (
                                          <span className={`inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 ${corUrgenciaData(vencimentoIso, tarefa.concluida)}`}>
                                            <CalendarDays className="size-2.5" /> {format(new Date(vencimentoIso), 'dd/MM')}
                                          </span>
                                        )}
                                        {tarefa.responsavel && <UserAvatar login={tarefa.responsavel} allUsers={allUsers} size={14} className="shrink-0" />}
                                      </button>
                                    );
                                  })}
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
                className="flex gap-1.5 mt-auto pt-1 shrink-0"
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
            <FichaForm
              inicial={editando.form}
              listas={listasVisiveis}
              membros={membrosVisiveis}
              allUsers={allUsers}
              etiquetas={etiquetas}
              workspaceNome={workspace?.cr4a1_nome}
              comentarios={parseComentarios(editando.original.cr4a1_comentarios)}
              atividades={parseAtividades(editando.original.cr4a1_atividades)}
              usuarioAtual={user}
              isAdmin={isAdmin}
              arquivada={ehFichaArquivada(editando.original)}
              onToggleArquivo={() => ehFichaArquivada(editando.original) ? desarquivarFicha(editando.original) : arquivarFicha(editando.original)}
              onAddComentario={(texto) => adicionarComentario(editando.original, texto)}
              onRemoverComentario={(id) => removerComentario(editando.original, id)}
              onCancel={() => setEditando(null)}
              onSave={(form) => salvarFicha(form, editando.original)}
              onDelete={() => excluirFicha(editando.original)}
            />
          </DialogContent>
        </Dialog>
      )}

      {arquivadasAberto && (
        <ArquivadasDialog
          fichasArquivadas={fichasArquivadas}
          listas={listas}
          etiquetas={etiquetas}
          allUsers={allUsers}
          workspaceNome={workspace?.cr4a1_nome}
          podeGerenciar={podeGerenciarColaboradores}
          onAbrirFicha={(ficha) => abrirFicha(ficha)}
          onRestaurar={(ficha, destinoListaId) => desarquivarFicha(ficha, destinoListaId)}
          onExcluir={(ficha) => excluirFicha(ficha)}
          onRestaurarTodas={restaurarTodasArquivadas}
          onExcluirTodas={excluirTodasArquivadas}
          onClose={() => setArquivadasAberto(false)}
        />
      )}

      {compartilharAberto && (
        <CompartilharDialog
          workspace={workspace}
          membrosBase={membrosBase}
          colaboradoresLogins={colaboradoresLogins}
          workspacesVinculadosIds={workspacesVinculadosIds}
          todosWorkspaces={todasOpcoes}
          allUsers={allUsers}
          podeEditar={podeGerenciarColaboradores}
          onAdd={adicionarColaborador}
          onRemove={removerColaborador}
          onAddWorkspaceVinculado={adicionarWorkspaceVinculado}
          onRemoveWorkspaceVinculado={removerWorkspaceVinculado}
          podeBloquear={podeGerenciarBloqueios}
          bloqueadosLogins={bloqueadosLogins}
          user={user}
          onBlock={bloquearMembro}
          onUnblock={desbloquearMembro}
          onClose={() => setCompartilharAberto(false)}
        />
      )}

      {listaExportar && (
        <ExportarListaDialog
          lista={listaExportar}
          fichas={fichasDaLista(listaExportar)}
          etiquetas={etiquetas}
          allUsers={allUsers}
          workspaceNome={workspace?.cr4a1_nome || 'Workspace'}
          onClose={() => setListaExportar(null)}
        />
      )}

      {mudarWorkspaceAberto && (
        <MudarWorkspaceDialog
          workspaceAtual={workspace}
          todosWorkspaces={todasOpcoes}
          listas={listas}
          fichas={fichas}
          etiquetas={etiquetas}
          onTransferir={transferirQuadroParaWorkspace}
          onClose={() => setMudarWorkspaceAberto(false)}
        />
      )}

      {ConfirmDialogHost}

      <AttachmentPreviewDialog anexo={anexoCardPreview} onClose={() => setAnexoCardPreview(null)} />

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

      {modelosAberto && (
        <ModelosDialog
          modelos={modelos}
          podeGerenciar={podeGerenciarColaboradores}
          onSalvarComoModelo={salvarComoModelo}
          onAplicar={aplicarModelo}
          onApagar={apagarModelo}
          onClose={() => setModelosAberto(false)}
        />
      )}

      {listaAutomacao && (
        <AutomacaoDialog
          lista={listas.find(l => l.cr4a1_listaid === listaAutomacao.cr4a1_listaid) || listaAutomacao}
          listas={listas}
          etiquetas={etiquetas}
          membros={membrosVisiveis.length ? membrosVisiveis : allUsers}
          onSave={(automacoes) => salvarAutomacoes(listaAutomacao, automacoes)}
          onClose={() => setListaAutomacao(null)}
        />
      )}

      {listaGerentes && (
        <GerentesListaDialog
          lista={listas.find(l => l.cr4a1_listaid === listaGerentes.cr4a1_listaid) || listaGerentes}
          allUsers={allUsers}
          onClose={() => setListaGerentes(null)}
          onSave={(novosGerentes) => salvarGerentesLista(listaGerentes, novosGerentes)}
        />
      )}

      {listaMoverWorkspace && (
        <MoverListaWorkspaceDialog
          lista={listaMoverWorkspace}
          workspaces={todasOpcoes}
          onClose={() => setListaMoverWorkspace(null)}
          onConfirm={(novoWsId) => moverListaParaWorkspace(listaMoverWorkspace, novoWsId)}
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

const MAX_STICKERS_POR_FICHA = 8;

const FichaForm = ({ inicial, listas, membros, allUsers, etiquetas, workspaceNome, comentarios = [], atividades = [], usuarioAtual, isAdmin, arquivada = false, onToggleArquivo, onAddComentario, onRemoverComentario, onCancel, onSave, onDelete }) => {
  const [atividadesAbertas, setAtividadesAbertas] = useState(false);
  const [form, setForm] = useState(inicial);
  const [novoComentario, setNovoComentario] = useState('');
  const [editorDescricao, setEditorDescricao] = useState(null);
  const comentarEnviar = () => {
    const texto = novoComentario.trim();
    if (!texto) return;
    onAddComentario(texto);
    setNovoComentario('');
  };
  const set = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));
  const alternarEtiqueta = (id) => set('etiquetas', form.etiquetas.includes(id) ? form.etiquetas.filter(e => e !== id) : [...form.etiquetas, id]);
  const alternarSticker = (emoji) => {
    const atuais = form.stickers || [];
    if (atuais.includes(emoji)) { set('stickers', atuais.filter(s => s !== emoji)); return; }
    if (atuais.length >= MAX_STICKERS_POR_FICHA) return;
    set('stickers', [...atuais, emoji]);
  };

  // Com microtarefas na descrição, "concluída" deixa de ser uma escolha manual — ela
  // reflete se todas as microtarefas estão marcadas (mesma regra do card na lista).
  const tarefasDaDescricao = useMemo(() => extrairTarefas(form.descricao), [form.descricao]);
  const temTarefas = tarefasDaDescricao.length > 0;
  const concluidaDerivada = temTarefas && tarefasDaDescricao.every(t => t.concluida);

  // A cor é escolhida aqui dentro (no form), então o cabeçalho também mora aqui — assim ele
  // já reflete a cor escolhida na hora, igual ao Trello faz ao editar o cover do card.
  const corCabecalho = form.cor ? corTextoLegivel(form.cor) : null;

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader
        className="rounded-2xl p-4"
        style={corCabecalho ? {
          backgroundColor: form.cor,
          '--text-primary': corCabecalho.principal,
          '--text-secondary': corCabecalho.suave
        } : undefined}
      >
        <DialogTitle>Ficha</DialogTitle>
        <DialogDescription>{workspaceNome}</DialogDescription>
      </DialogHeader>

      <div>
        <Label>Título</Label>
        <MentionInput allUsers={allUsers} value={form.titulo} onChange={e => set('titulo', e.target.value)} />
      </div>

      <div>
        <Label>Descrição</Label>
        <p className="mb-1 text-[11px] text-muted-foreground">Use o ícone de checklist para criar microtarefas — elas aparecem e podem ser marcadas direto no card.</p>
        <RichTextEditor value={form.descricao} onChange={v => set('descricao', v)} onEditorReady={setEditorDescricao} allUsers={allUsers} />
      </div>

      {temTarefas && (
        <div>
          <Label>Microtarefas — prazo e responsável</Label>
          <div className="flex flex-col gap-1.5">
            {tarefasDaDescricao.map(t => (
              <div key={t.index} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-1.5 text-sm">
                <span className={`min-w-0 flex-1 truncate ${t.concluida ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{t.texto}</span>
                <input
                  type="date"
                  value={t.dataVencimento || ''}
                  onChange={e => aplicarAtributoTarefa(editorDescricao, t.index, { due: e.target.value || null })}
                  aria-label={`Prazo de "${t.texto}"`}
                  className="h-8 shrink-0 rounded-lg border border-border bg-card px-2 text-xs text-foreground outline-none"
                />
                <Select
                  value={t.responsavel || '__nenhum__'}
                  onValueChange={v => aplicarAtributoTarefa(editorDescricao, t.index, { assignee: v === '__nenhum__' ? null : v })}
                >
                  <SelectTrigger className="h-8 w-36 shrink-0 text-xs"><SelectValue placeholder="Responsável" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__nenhum__">Sem responsável</SelectItem>
                    {opcoesComAtual(membros.length ? membros : allUsers, t.responsavel, allUsers).map(u => (
                      <SelectItem key={u.cr4a1_username} value={u.cr4a1_username}>{u.cr4a1_nome_exibicao || u.cr4a1_username}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}

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

      <div>
        <Label>Cor da ficha</Label>
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-secondary p-2">
          <button
            type="button"
            onClick={() => set('cor', '')}
            title="Sem cor"
            aria-label="Sem cor"
            className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-card"
          >
            {!form.cor && <Check className="size-3.5 text-muted-foreground" />}
          </button>
          {themeColors.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => set('cor', c.hex)}
              title={c.label}
              aria-label={c.label}
              className="size-6 shrink-0 rounded-full transition-transform active:scale-90"
              style={{ backgroundColor: c.hex, boxShadow: form.cor === c.hex ? `0 0 0 2px var(--card), 0 0 0 4px ${c.hex}` : 'none' }}
            />
          ))}
        </div>
      </div>

      <div>
        <Label className="flex items-center justify-between">
          <span>Stickers</span>
          <span className="text-[10px] font-normal normal-case text-muted-foreground">{(form.stickers || []).length}/{MAX_STICKERS_POR_FICHA}</span>
        </Label>
        <div className="grid max-h-32 grid-cols-10 gap-1 overflow-y-auto rounded-xl border border-border bg-secondary p-2">
          {stickers.map(emoji => {
            const selecionado = (form.stickers || []).includes(emoji);
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => alternarSticker(emoji)}
                title={emoji}
                aria-label={emoji}
                className={`flex size-7 items-center justify-center rounded-lg transition-transform active:scale-90 ${selecionado ? 'bg-primary/15 ring-2 ring-primary' : 'hover:bg-card'}`}
              >
                <Sticker emoji={emoji} size={20} />
              </button>
            );
          })}
        </div>
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
              {opcoesComAtual(membros.length ? membros : allUsers, form.responsavel, allUsers).map(u => (
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

      <div>
        <Label className="flex items-center gap-1.5"><Repeat className="size-3.5" /> Repetir</Label>
        <p className="mb-1 text-[11px] text-muted-foreground">Ao concluir, cria sozinha a próxima ocorrência na data seguinte (precisa de uma data definida).</p>
        <Select value={form.recorrencia || '__nenhuma__'} onValueChange={v => set('recorrencia', v === '__nenhuma__' ? '' : v)} disabled={!form.dia}>
          <SelectTrigger><SelectValue placeholder="Não repetir" /></SelectTrigger>
          <SelectContent>
            {Object.entries(RECORRENCIA_LABEL).map(([valor, label]) => (
              <SelectItem key={valor || '__nenhuma__'} value={valor || '__nenhuma__'}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-secondary px-4 py-3">
        <div>
          <Label className="mb-0">Concluída</Label>
          {temTarefas && <p className="text-[11px] text-muted-foreground">Definida automaticamente pelas microtarefas da descrição.</p>}
        </div>
        <Switch checked={temTarefas ? concluidaDerivada : form.concluida} onCheckedChange={v => set('concluida', v)} disabled={temTarefas} />
      </div>

      <AttachmentsField anexos={form.anexos || []} onChange={(novos) => set('anexos', novos)} />

      <div>
        <Label className="flex items-center gap-1.5"><MessageCircle className="size-3.5" /> Comentários</Label>
        <div className="flex flex-col gap-2">
          {comentarios.length === 0 && <p className="text-[12px] italic text-muted-foreground">Nenhum comentário ainda.</p>}
          {comentarios.map(c => (
            <div key={c.id} className="flex items-start gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-sm">
              <UserAvatar login={c.autor} allUsers={allUsers} size={22} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">{nomeDe(c.autor, allUsers)}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{format(new Date(c.data), 'dd/MM/yyyy HH:mm')}</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-foreground">{c.texto}</p>
              </div>
              {(c.autor === usuarioAtual || isAdmin) && (
                <button type="button" onClick={() => onRemoverComentario(c.id)} aria-label="Excluir comentário" className="shrink-0 text-muted-foreground hover:text-destructive">
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-end gap-2">
          <MentionTextarea
            allUsers={allUsers}
            value={novoComentario}
            onChange={e => setNovoComentario(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); comentarEnviar(); } }}
            placeholder="Escreva um comentário... Use @ para mencionar alguém"
            className="min-h-[40px] py-2"
          />
          <Button type="button" size="sm" onClick={comentarEnviar} disabled={!novoComentario.trim()} aria-label="Comentar">
            <Send className="size-4" />
          </Button>
        </div>
      </div>

      {atividades.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setAtividadesAbertas(v => !v)}
            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground hover:text-primary"
          >
            <History className="size-3.5" /> {atividadesAbertas ? 'Ocultar histórico' : 'Ver histórico de atividades'}
          </button>
          {atividadesAbertas && (
            <div className="mt-2 flex flex-col gap-1.5 border-l-2 border-border pl-3">
              {[...atividades].reverse().map(a => (
                <div key={a.id} className="text-[12px] text-muted-foreground">
                  <span>{descricaoAtividade(a, (login) => nomeDe(login, allUsers))}</span>
                  <span className="ml-1.5 text-[10px]">— {format(new Date(a.data), 'dd/MM/yyyy HH:mm')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <DialogFooter className="flex-wrap justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button type="button" variant="ghost" className="text-destructive" onClick={onDelete}>
            <Trash2 className="size-4" /> Excluir
          </Button>
          {onToggleArquivo && (
            <Button type="button" variant="outline" size="sm" onClick={onToggleArquivo}>
              {arquivada ? (
                <>
                  <ArchiveRestore className="size-4" /> Restaurar ao quadro
                </>
              ) : (
                <>
                  <Archive className="size-4" /> Arquivar
                </>
              )}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.titulo.trim() || !form.listaId}>Salvar</Button>
        </div>
      </DialogFooter>
    </div>
  );
};

// Espaço de Fichas Arquivadas do workspace: permite pesquisar, filtrar por lista original,
// inspecionar a ficha, restaurá-la para sua lista (ou para outra lista) e excluir permanentemente.
const ArquivadasDialog = ({
  fichasArquivadas = [],
  listas = [],
  etiquetas = [],
  allUsers = [],
  workspaceNome = '',
  podeGerenciar = false,
  onAbrirFicha,
  onRestaurar,
  onExcluir,
  onRestaurarTodas,
  onExcluirTodas,
  onClose
}) => {
  const [busca, setBusca] = useState('');
  const [listaFiltro, setListaFiltro] = useState('__todas__');

  const filtradas = useMemo(() => {
    return fichasArquivadas.filter(ficha => {
      if (listaFiltro !== '__todas__' && ficha.cr4a1_lista_id !== listaFiltro) return false;
      if (busca.trim()) {
        const nomeLista = listas.find(l => l.cr4a1_listaid === ficha.cr4a1_lista_id)?.cr4a1_nome || '';
        const resp = nomeDe(ficha.cr4a1_responsavel_login, allUsers);
        const alvo = `${ficha.cr4a1_titulo || ''} ${htmlParaTexto(ficha.cr4a1_descricao)} ${nomeLista} ${resp}`;
        if (!matchesSearch(alvo, busca)) return false;
      }
      return true;
    });
  }, [fichasArquivadas, listaFiltro, busca, listas, allUsers]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="size-5 text-primary" /> Espaço de Fichas Arquivadas
            <Badge variant="secondary" className="ml-1">{fichasArquivadas.length}</Badge>
          </DialogTitle>
          <DialogDescription>
            Fichas arquivadas do workspace &quot;{workspaceNome || 'Atual'}&quot;. Você pode restaurá-las ao quadro a qualquer momento ou excluí-las permanentemente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <SearchField value={busca} onChange={setBusca} placeholder="Buscar ficha arquivada por título, descrição ou responsável..." />
          </div>
          {listas.length > 0 && (
            <Select value={listaFiltro} onValueChange={setListaFiltro}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Filtrar por lista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todas__">Todas as listas</SelectItem>
                {listas.map(l => (
                  <SelectItem key={l.cr4a1_listaid} value={l.cr4a1_listaid}>{l.cr4a1_nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-2.5 py-1">
          {filtradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-secondary/40 p-10 text-center">
              <Archive className="size-8 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">
                {fichasArquivadas.length === 0
                  ? 'Nenhuma ficha arquivada neste workspace.'
                  : 'Nenhuma ficha arquivada corresponde ao filtro.'}
              </p>
              <p className="text-xs text-muted-foreground">
                Você pode arquivar fichas pelo ícone no cartão, pelo menu da lista ou usando regras de automação.
              </p>
            </div>
          ) : (
            filtradas.map(ficha => {
              const listaOrig = listas.find(l => l.cr4a1_listaid === ficha.cr4a1_lista_id);
              const etiquetasDaFicha = parseAssignees(ficha.cr4a1_etiquetas).map(id => etiquetas.find(e => e.cr4a1_etiquetaid === id)).filter(Boolean);
              const concluida = ficha.cr4a1_concluida === 'Sim';
              const stickersDaFicha = parseAssignees(ficha.cr4a1_stickers);
              const atividadesFicha = parseAtividades(ficha.cr4a1_atividades);
              const ultimaArquivada = [...atividadesFicha].reverse().find(a => a.tipo === 'arquivada');

              return (
                <div
                  key={ficha.cr4a1_fichaid}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-primary/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onAbrirFicha(ficha)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbrirFicha(ficha); } }}
                    className="flex min-w-0 flex-1 flex-col gap-1.5 cursor-pointer text-left"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        Lista: {listaOrig?.cr4a1_nome || 'Lista removida'}
                      </Badge>
                      {concluida && (
                        <Badge variant="secondary" className="text-[10px] text-success">
                          Concluída
                        </Badge>
                      )}
                      {etiquetasDaFicha.map(et => <EtiquetaChip key={et.cr4a1_etiquetaid} etiqueta={et} compacta />)}
                      {stickersDaFicha.map((emoji, i) => <Sticker key={i} emoji={emoji} size={15} />)}
                    </div>

                    <span className={`text-sm font-semibold text-foreground ${concluida ? 'line-through opacity-70' : ''}`}>
                      {ficha.cr4a1_titulo}
                    </span>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <div className="inline-flex items-center gap-1">
                        <UserAvatar login={ficha.cr4a1_responsavel_login} allUsers={allUsers} size={16} />
                        <span>{nomeDe(ficha.cr4a1_responsavel_login, allUsers)}</span>
                      </div>
                      {comData(ficha) && (
                        <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 font-medium">
                          <CalendarDays className="size-3" />
                          {format(new Date(ficha.cr4a1_data_inicio), 'dd/MM/yyyy HH:mm')}
                        </span>
                      )}
                      {ultimaArquivada?.data && (
                        <span className="text-[10px] opacity-75">
                          Arquivada em {format(new Date(ultimaArquivada.data), 'dd/MM/yyyy HH:mm')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 pt-1 sm:pt-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRestaurar(ficha)}
                      title="Restaurar ficha para a lista"
                    >
                      <ArchiveRestore className="size-4" /> Restaurar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onExcluir(ficha)}
                      title="Excluir ficha permanentemente"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="flex-wrap justify-between gap-2 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            {fichasArquivadas.length > 0 && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={onRestaurarTodas}>
                  <ArchiveRestore className="size-4" /> Restaurar todas ({fichasArquivadas.length})
                </Button>
                {podeGerenciar && (
                  <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onExcluirTodas}>
                    <Trash2 className="size-4" /> Esvaziar arquivo
                  </Button>
                )}
              </>
            )}
          </div>
          <Button type="button" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Quem pode ver/editar o quadro, além dos membros do workspace do calendário.
const CompartilharDialog = ({
  workspace,
  membrosBase,
  colaboradoresLogins,
  workspacesVinculadosIds = [],
  todosWorkspaces = [],
  allUsers,
  podeEditar,
  onAdd,
  onRemove,
  onAddWorkspaceVinculado,
  onRemoveWorkspaceVinculado,
  podeBloquear,
  bloqueadosLogins = [],
  user,
  onBlock,
  onUnblock,
  onClose
}) => {
  const [busca, setBusca] = useState('');
  const [workspaceParaVincular, setWorkspaceParaVincular] = useState('');
  const jaTemAcesso = new Set([...membrosBase.map(m => m.cr4a1_username), ...colaboradoresLogins]);
  const candidatos = busca.trim()
    ? allUsers.filter(u => !jaTemAcesso.has(u.cr4a1_username) && matchesSearch(u.cr4a1_nome_exibicao || u.cr4a1_username, busca)).slice(0, 8)
    : [];
  const membrosBloqueaveis = membrosBase.filter(m => m.cr4a1_username !== workspace?.cr4a1_criador_login && m.cr4a1_username !== user);

  const workspacesDisponiveisParaVincular = useMemo(() => {
    return (todosWorkspaces || []).filter(w =>
      w.cr4a1_calendarios_workspacesid !== workspace?.cr4a1_calendarios_workspacesid &&
      !workspacesVinculadosIds.includes(w.cr4a1_calendarios_workspacesid)
    );
  }, [todosWorkspaces, workspace, workspacesVinculadosIds]);

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
            <Label className="flex items-center gap-1.5">
              <FolderSync className="size-3.5" /> Workspaces vinculados (compartilhamento)
            </Label>
            <p className="mb-1.5 text-[11px] text-muted-foreground">
              Membros destes workspaces também verão e poderão colaborar neste quadro do Trello.
            </p>
            <div className="flex flex-col gap-1.5">
              {workspacesVinculadosIds.length === 0 && (
                <p className="text-[12px] italic text-muted-foreground">Nenhum outro workspace vinculado ainda.</p>
              )}
              {workspacesVinculadosIds.map(wsId => {
                const ws = (todosWorkspaces || []).find(w => w.cr4a1_calendarios_workspacesid === wsId);
                const nomeWs = ws?.cr4a1_nome || 'Workspace vinculado';
                return (
                  <div key={wsId} className="flex items-center justify-between rounded-xl border border-border bg-secondary px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{nomeWs}</span>
                      <Badge variant="outline" className="text-[10px]">Vinculado</Badge>
                    </div>
                    {podeEditar && onRemoveWorkspaceVinculado && (
                      <button
                        type="button"
                        onClick={() => onRemoveWorkspaceVinculado(wsId)}
                        aria-label={`Desvincular workspace ${nomeWs}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {podeEditar && onAddWorkspaceVinculado && workspacesDisponiveisParaVincular.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <Select value={workspaceParaVincular} onValueChange={setWorkspaceParaVincular}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Vincular outro workspace..." />
                  </SelectTrigger>
                  <SelectContent>
                    {workspacesDisponiveisParaVincular.map(w => (
                      <SelectItem key={w.cr4a1_calendarios_workspacesid} value={w.cr4a1_calendarios_workspacesid}>
                        {w.cr4a1_nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!workspaceParaVincular}
                  onClick={() => {
                    if (workspaceParaVincular) {
                      onAddWorkspaceVinculado(workspaceParaVincular);
                      setWorkspaceParaVincular('');
                    }
                  }}
                >
                  <Plus className="size-4" /> Vincular
                </Button>
              </div>
            )}
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

// Gera resumo em texto puro formatado para cópia rápida na área de transferência
const gerarResumoTexto = (lista, fichas, workspaceNome, allUsers) => {
  const dataHoje = format(new Date(), 'dd/MM/yyyy HH:mm');
  const linhas = [
    `📋 Lista: ${lista.cr4a1_nome} (${workspaceNome})`,
    `Emitido em: ${dataHoje}`,
    `Total de fichas: ${fichas.length}`,
    '----------------------------------------'
  ];

  fichas.forEach((f, i) => {
    const concluida = f.cr4a1_concluida === 'Sim';
    const status = concluida ? '✅ Concluída' : '⏳ Pendente';
    const resp = nomeDe(f.cr4a1_responsavel_login, allUsers);
    const data = f.cr4a1_data_inicio ? ` | Vencimento: ${format(new Date(f.cr4a1_data_inicio), 'dd/MM/yyyy HH:mm')}` : '';
    linhas.push(`\n${i + 1}. ${f.cr4a1_titulo} [${status}]`);
    linhas.push(`   Responsável: ${resp}${data}`);

    const textoDesc = extrairDescricaoSemTarefas(f.cr4a1_descricao);
    if (textoDesc) {
      linhas.push(`   Descrição: ${textoDesc.slice(0, 200)}${textoDesc.length > 200 ? '...' : ''}`);
    }

    const tarefas = extrairTarefas(f.cr4a1_descricao);
    if (tarefas.length > 0) {
      tarefas.forEach(t => {
        linhas.push(`     ${t.concluida ? '☑️' : '◻️'} ${t.texto}`);
      });
    }
  });

  return linhas.join('\n');
};

const ExportarListaDialog = ({ lista, fichas, etiquetas, allUsers, workspaceNome, onClose }) => {
  const relatorioRef = useRef(null);
  const [incluirDescricao, setIncluirDescricao] = useState(true);
  const [incluirChecklists, setIncluirChecklists] = useState(true);
  const [incluirMetadados, setIncluirMetadados] = useState(true);
  const [incluirComentarios, setIncluirComentarios] = useState(false);
  const [gerando, setGerando] = useState(null); // 'pdf' | 'imagem' | 'compartilhar' | null

  const concluidas = fichas.filter(f => f.cr4a1_concluida === 'Sim').length;
  const pendentes = fichas.length - concluidas;
  const atrasadas = fichas.filter(f => comData(f) && f.cr4a1_concluida !== 'Sim' && f.cr4a1_data_inicio < new Date().toISOString()).length;

  const handleExportarPng = async () => {
    if (!relatorioRef.current) return;
    setGerando('imagem');
    try {
      const { default: html2canvas } = await import('html2canvas-pro');
      const canvas = await html2canvas(relatorioRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
      const slugLista = (lista.cr4a1_nome || 'lista').toLowerCase().replace(/[^\w-]+/g, '_');
      const link = document.createElement('a');
      link.download = `trello-lista-${slugLista}-${format(new Date(), 'yyyy-MM-dd')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Imagem baixada com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar imagem.');
    } finally {
      setGerando(null);
    }
  };

  const handleExportarPdf = async () => {
    if (!relatorioRef.current) return;
    setGerando('pdf');
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas-pro')
      ]);
      const canvas = await html2canvas(relatorioRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 28;
      const contentWidth = pageWidth - (margin * 2);
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      if (contentHeight + (margin * 2) <= pageHeight) {
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, contentWidth, contentHeight);
      } else {
        const pageUsableHeight = pageHeight - (margin * 2);
        const sliceHeightInCanvas = (pageUsableHeight * canvas.width) / contentWidth;
        let yCanvas = 0;
        let pageNum = 0;

        while (yCanvas < canvas.height) {
          const sliceH = Math.min(sliceHeightInCanvas, canvas.height - yCanvas);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceH;
          const ctx = pageCanvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0, yCanvas, canvas.width, sliceH,
            0, 0, canvas.width, sliceH
          );

          if (pageNum > 0) pdf.addPage();
          const sliceContentH = (sliceH * contentWidth) / canvas.width;
          pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', margin, margin, contentWidth, sliceContentH);

          yCanvas += sliceH;
          pageNum++;
        }
      }

      const slugLista = (lista.cr4a1_nome || 'lista').toLowerCase().replace(/[^\w-]+/g, '_');
      pdf.save(`trello-lista-${slugLista}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF baixado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF.');
    } finally {
      setGerando(null);
    }
  };

  const handleCompartilhar = async () => {
    if (!relatorioRef.current) return;
    setGerando('compartilhar');
    try {
      const { default: html2canvas } = await import('html2canvas-pro');
      const canvas = await html2canvas(relatorioRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });

      const slugLista = (lista.cr4a1_nome || 'lista').toLowerCase().replace(/[^\w-]+/g, '_');
      const resumoTexto = gerarResumoTexto(lista, fichas, workspaceNome, allUsers);

      let compartilhouNativo = false;
      if (navigator.share) {
        try {
          const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
          if (blob) {
            const file = new File([blob], `trello-lista-${slugLista}.png`, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: `Lista: ${lista.cr4a1_nome}`,
                text: resumoTexto,
                files: [file]
              });
              compartilhouNativo = true;
              toast.success('Compartilhado com sucesso!');
            }
          }
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') return;
          console.warn('Compartilhamento nativo com arquivo falhou:', shareErr);
        }
      }

      if (!compartilhouNativo) {
        const link = document.createElement('a');
        link.download = `trello-lista-${slugLista}-${format(new Date(), 'yyyy-MM-dd')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(resumoTexto);
          toast.success('Imagem baixada e resumo copiado para a área de transferência!');
        } else {
          toast.success('Imagem baixada com sucesso!');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao compartilhar lista.');
    } finally {
      setGerando(null);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-5 text-primary" />
            Exportar ou Enviar Lista
          </DialogTitle>
          <DialogDescription>
            {lista.cr4a1_nome} • {workspaceNome}
          </DialogDescription>
        </DialogHeader>

        {/* Barra de opções de conteúdo */}
        <div className="flex flex-wrap items-center gap-4 py-2 border-y border-border text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Switch checked={incluirDescricao} onCheckedChange={setIncluirDescricao} />
            <span>Descrição</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Switch checked={incluirChecklists} onCheckedChange={setIncluirChecklists} />
            <span>Checklists</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Switch checked={incluirMetadados} onCheckedChange={setIncluirMetadados} />
            <span>Responsáveis e Datas</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Switch checked={incluirComentarios} onCheckedChange={setIncluirComentarios} />
            <span>Comentários</span>
          </label>
        </div>

        {/* Container rolável com a visualização do documento */}
        <div className="flex-1 overflow-auto bg-muted/40 p-3 sm:p-4 rounded-xl border border-border flex justify-center">
          <div
            ref={relatorioRef}
            style={{
              width: '680px',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              padding: '32px 36px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          >
            {/* Cabeçalho do relatório */}
            <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
                    {lista.cr4a1_nome}
                  </h2>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                    Workspace: <strong>{workspaceNome}</strong> • Gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569' }}>
                    {fichas.length} {fichas.length === 1 ? 'cartão' : 'cartões'}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px', background: '#dcfce7', color: '#166534' }}>
                    {concluidas} conc.
                  </span>
                  {pendentes > 0 && (
                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px', background: '#fef3c7', color: '#92400e' }}>
                      {pendentes} pend.
                    </span>
                  )}
                  {atrasadas > 0 && (
                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px', background: '#fee2e2', color: '#991b1b' }}>
                      {atrasadas} atras.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Listagem de cards */}
            {fichas.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', padding: '24px 0' }}>
                Esta lista não possui cartões no momento.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {fichas.map((ficha, idx) => {
                  const concluida = ficha.cr4a1_concluida === 'Sim';
                  const atrasada = comData(ficha) && !concluida && ficha.cr4a1_data_inicio < new Date().toISOString();
                  const etiquetasDaFicha = parseAssignees(ficha.cr4a1_etiquetas)
                    .map(id => etiquetas.find(e => e.cr4a1_etiquetaid === id))
                    .filter(Boolean);
                  const tarefas = extrairTarefas(ficha.cr4a1_descricao);
                  const tarefasConcluidas = tarefas.filter(t => t.concluida).length;
                  const descTexto = extrairDescricaoSemTarefas(ficha.cr4a1_descricao);
                  const anexos = parseAnexos(ficha.cr4a1_arquivos);
                  const comentarios = parseComentarios(ficha.cr4a1_comentarios);

                  return (
                    <div
                      key={ficha.cr4a1_fichaid || idx}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderLeft: ficha.cr4a1_cor ? `5px solid ${ficha.cr4a1_cor}` : (concluida ? '5px solid #22c55e' : '5px solid #94a3b8'),
                        borderRadius: '8px',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      {/* Topo do card: título e status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{
                          fontSize: '15px',
                          fontWeight: '700',
                          color: concluida ? '#64748b' : '#0f172a',
                          textDecoration: concluida ? 'line-through' : 'none'
                        }}>
                          {ficha.cr4a1_titulo}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          {concluida ? (
                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: '#dcfce7', color: '#166534' }}>
                              ✓ Concluída
                            </span>
                          ) : atrasada ? (
                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b' }}>
                              ⚠ Atrasada
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>
                              Pendente
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Etiquetas */}
                      {incluirMetadados && etiquetasDaFicha.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {etiquetasDaFicha.map(et => (
                            <span
                              key={et.cr4a1_etiquetaid}
                              style={{
                                fontSize: '10px',
                                fontWeight: '700',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: et.cr4a1_cor || '#e2e8f0',
                                color: '#ffffff'
                              }}
                            >
                              {et.cr4a1_nome}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Metadados */}
                      {incluirMetadados && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#64748b' }}>
                          <span>👤 <strong>{nomeDe(ficha.cr4a1_responsavel_login, allUsers)}</strong></span>
                          {comData(ficha) && (
                            <span style={{ color: atrasada ? '#dc2626' : 'inherit' }}>
                              📅 {format(new Date(ficha.cr4a1_data_inicio), 'dd/MM/yyyy HH:mm')}
                            </span>
                          )}
                          {ficha.cr4a1_recorrencia && (
                            <span>🔁 {RECORRENCIA_LABEL[ficha.cr4a1_recorrencia]}</span>
                          )}
                          {anexos.length > 0 && (
                            <span>📎 {anexos.length} anexo(s)</span>
                          )}
                          {comentarios.length > 0 && (
                            <span>💬 {comentarios.length} comentário(s)</span>
                          )}
                        </div>
                      )}

                      {/* Descrição */}
                      {incluirDescricao && descTexto && (
                        <div style={{
                          fontSize: '12px',
                          color: '#334155',
                          backgroundColor: '#f8fafc',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #f1f5f9',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.4'
                        }}>
                          {descTexto}
                        </div>
                      )}

                      {/* Checklists */}
                      {incluirChecklists && tarefas.length > 0 && (
                        <div style={{
                          backgroundColor: '#f8fafc',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #f1f5f9',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', color: '#475569' }}>
                            <span>Checklist</span>
                            <span>{tarefasConcluidas}/{tarefas.length} ({Math.round((tarefasConcluidas / tarefas.length) * 100)}%)</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {tarefas.map(t => (
                              <div key={t.index} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '11px' }}>
                                <span style={{
                                  fontSize: '12px',
                                  color: t.concluida ? '#16a34a' : '#94a3b8',
                                  fontWeight: 'bold',
                                  lineHeight: '1'
                                }}>
                                  {t.concluida ? '☑' : '☐'}
                                </span>
                                <span style={{
                                  color: t.concluida ? '#94a3b8' : '#1e293b',
                                  textDecoration: t.concluida ? 'line-through' : 'none',
                                  flex: 1
                                }}>
                                  {t.texto}
                                </span>
                                {t.dataVencimento && (
                                  <span style={{ fontSize: '10px', color: '#64748b' }}>
                                    {format(new Date(`${t.dataVencimento}T12:00:00`), 'dd/MM')}
                                  </span>
                                )}
                                {t.responsavel && (
                                  <span style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>
                                    {nomeDe(t.responsavel, allUsers)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Comentários */}
                      {incluirComentarios && comentarios.length > 0 && (
                        <div style={{
                          backgroundColor: '#f8fafc',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #f1f5f9',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                            Comentários ({comentarios.length}):
                          </span>
                          {comentarios.map(c => (
                            <div key={c.id} style={{ fontSize: '11px', color: '#334155' }}>
                              <strong>{nomeDe(c.autor, allUsers)}:</strong> {c.texto}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
          <Button variant="outline" onClick={onClose} disabled={!!gerando}>
            Fechar
          </Button>
          <Button
            variant="outline"
            onClick={handleExportarPng}
            disabled={!!gerando || fichas.length === 0}
            className="gap-1.5"
          >
            {gerando === 'imagem' ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
            {gerando === 'imagem' ? 'Gerando Imagem...' : 'Baixar Imagem (PNG)'}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportarPdf}
            disabled={!!gerando || fichas.length === 0}
            className="gap-1.5"
          >
            {gerando === 'pdf' ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
            {gerando === 'pdf' ? 'Gerando PDF...' : 'Baixar PDF'}
          </Button>
          <Button
            onClick={handleCompartilhar}
            disabled={!!gerando || fichas.length === 0}
            className="gap-1.5"
          >
            {gerando === 'compartilhar' ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
            {gerando === 'compartilhar' ? 'Enviando...' : 'Enviar / Compartilhar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MudarWorkspaceDialog = ({ workspaceAtual, todosWorkspaces, listas, fichas, etiquetas, onTransferir, onClose }) => {
  const [destinoId, setDestinoId] = useState('');
  const [transferindo, setTransferindo] = useState(false);

  const workspacesDisponiveis = useMemo(() => {
    return (todosWorkspaces || []).filter(w => w.cr4a1_calendarios_workspacesid !== workspaceAtual?.cr4a1_calendarios_workspacesid);
  }, [todosWorkspaces, workspaceAtual]);

  const handleConfirmar = async () => {
    if (!destinoId || transferindo) return;
    setTransferindo(true);
    try {
      await onTransferir(destinoId);
    } catch {
      setTransferindo(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !transferindo && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderSync className="size-5 text-primary" />
            Mudar Workspace do Quadro
          </DialogTitle>
          <DialogDescription>
            Transfira este quadro de Trello com todas as suas listas, fichas e etiquetas para outro workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="rounded-xl border border-border bg-secondary p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs uppercase font-bold">Workspace atual</span>
              <Badge variant="outline">{workspaceAtual?.cr4a1_nome || 'Workspace'}</Badge>
            </div>
            <div className="mt-2.5 flex items-center justify-around border-t border-border/60 pt-2 text-center text-xs">
              <div>
                <span className="block font-bold text-foreground text-sm">{listas.length}</span>
                <span className="text-muted-foreground text-[11px]">listas</span>
              </div>
              <div className="h-6 w-px bg-border/60" />
              <div>
                <span className="block font-bold text-foreground text-sm">{fichas.length}</span>
                <span className="text-muted-foreground text-[11px]">fichas</span>
              </div>
              <div className="h-6 w-px bg-border/60" />
              <div>
                <span className="block font-bold text-foreground text-sm">{etiquetas.length}</span>
                <span className="text-muted-foreground text-[11px]">etiquetas</span>
              </div>
            </div>
          </div>

          <div>
            <Label>Novo workspace de destino</Label>
            {workspacesDisponiveis.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground italic">Nenhum outro workspace disponível para transferência.</p>
            ) : (
              <Select value={destinoId} onValueChange={setDestinoId} disabled={transferindo}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o workspace de destino..." />
                </SelectTrigger>
                <SelectContent>
                  {workspacesDisponiveis.map(w => (
                    <SelectItem key={w.cr4a1_calendarios_workspacesid} value={w.cr4a1_calendarios_workspacesid}>
                      {w.cr4a1_nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Todos os cartões e automações serão migrados para o workspace selecionado e os membros daquele workspace passarão a ter acesso.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={transferindo}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={!destinoId || transferindo || workspacesDisponiveis.length === 0}
            className="gap-1.5"
          >
            {transferindo ? <Loader2 className="size-4 animate-spin" /> : <FolderSync className="size-4" />}
            {transferindo ? 'Transferindo...' : 'Transferir Quadro'}
          </Button>
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

// Modelos valem pra qualquer workspace (não só o atual) — a lista vem de cr4a1_quadros
// marcados como template, sem ficha nenhuma envolvida, só a estrutura de listas.
const ModelosDialog = ({ modelos, podeGerenciar, onSalvarComoModelo, onAplicar, onApagar, onClose }) => {
  const [nomeModelo, setNomeModelo] = useState('');

  const salvar = () => {
    const nome = nomeModelo.trim();
    if (!nome) return;
    onSalvarComoModelo(nome);
    setNomeModelo('');
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle><LayoutTemplate className="size-5" /> Modelos de quadro</DialogTitle>
          <DialogDescription>Reaproveite a estrutura de listas de um quadro em qualquer workspace.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {modelos.length === 0 && <p className="py-2 text-center text-sm text-muted-foreground">Nenhum modelo salvo ainda.</p>}
            {modelos.map(m => {
              const qtdListas = (() => { try { return JSON.parse(m.cr4a1_templatelistas || '[]').length; } catch { return 0; } })();
              return (
                <div key={m.cr4a1_quadroid} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-secondary px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{m.cr4a1_nome}</p>
                    <p className="text-[11px] text-muted-foreground">{qtdListas} lista(s)</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => onAplicar(m)}>Usar</Button>
                    {podeGerenciar && (
                      <button type="button" onClick={() => onApagar(m)} aria-label={`Excluir modelo ${m.cr4a1_nome}`} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {podeGerenciar && (
            <div className="flex flex-col gap-2 rounded-2xl border border-border p-3">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Salvar o quadro atual como modelo</span>
              <p className="text-[11px] text-muted-foreground">Guarda só os nomes das listas (e se são pessoais) — nenhuma ficha é copiada.</p>
              <div className="flex gap-2">
                <Input value={nomeModelo} onChange={e => setNomeModelo(e.target.value)} placeholder="Nome do modelo" />
                <Button type="button" size="sm" onClick={salvar} disabled={!nomeModelo.trim()}>Salvar</Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Concluído</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Regras "quando X acontecer com uma ficha desta lista, faça Y" — disparadas tanto por eventos
// ao vivo quanto pelos gatilhos de tempo (vencendo, urgente, atrasada).
const AutomacaoDialog = ({ lista, listas, etiquetas, membros, onSave, onClose }) => {
  const automacoes = parseAutomacoes(lista.cr4a1_automacao);
  const [gatilho, setGatilho] = useState('entrou');
  const [etiquetaGatilho, setEtiquetaGatilho] = useState('');
  const [tipo, setTipo] = useState('email_responsavel');
  const [valor, setValor] = useState('');
  const [mensagemEmail, setMensagemEmail] = useState('');

  const precisaValor = [
    'responsavel',
    'email_usuario',
    'etiqueta',
    'remover_etiqueta',
    'cor',
    'mover',
    'duplicar_para',
    'prazo_dias',
    'comentar'
  ].includes(tipo);
  const aceitaMensagemEmail = ['email_responsavel', 'email_usuario', 'email_gerentes'].includes(tipo);
  const precisaEtiquetaGatilho = gatilho === 'etiqueta';
  const outrasListas = listas.filter(l => l.cr4a1_listaid !== lista.cr4a1_listaid);
  const podeAdicionar = (!precisaValor || !!valor) && (!precisaEtiquetaGatilho || !!etiquetaGatilho);

  const adicionar = () => {
    if (!podeAdicionar) return;
    const regra = { id: crypto.randomUUID(), gatilho, tipo };
    if (precisaEtiquetaGatilho) regra.etiquetaGatilho = etiquetaGatilho;
    if (precisaValor) regra.valor = valor;
    if (aceitaMensagemEmail && mensagemEmail.trim()) regra.mensagemEmail = mensagemEmail.trim();
    onSave([...automacoes, regra]);
    setValor('');
    setMensagemEmail('');
  };
  const remover = (idx) => onSave(automacoes.filter((_, i) => i !== idx));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle><Zap className="size-5" /> Automações da lista</DialogTitle>
          <DialogDescription>Regras aplicadas às fichas da lista &quot;{lista.cr4a1_nome}&quot;.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {automacoes.length === 0 && <p className="py-2 text-center text-sm text-muted-foreground">Nenhuma automação configurada.</p>}
            {automacoes.map((regra, idx) => (
              <div key={regra.id || idx} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-sm">
                <span className="leading-snug">{descricaoAutomacao(regra, { etiquetas, allUsers: membros, listas })}</span>
                <button type="button" onClick={() => remover(idx)} aria-label="Remover regra" className="shrink-0 text-muted-foreground hover:text-destructive">
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-border p-3">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Nova regra</span>

            <Label className="mb-0 text-[11px]">Quando (Gatilho)</Label>
            <Select value={gatilho} onValueChange={(v) => { setGatilho(v); setEtiquetaGatilho(''); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(GATILHOS_AUTOMACAO).map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
              </SelectContent>
            </Select>

            {precisaEtiquetaGatilho && (
              <Select value={etiquetaGatilho} onValueChange={setEtiquetaGatilho}>
                <SelectTrigger><SelectValue placeholder="Qual etiqueta" /></SelectTrigger>
                <SelectContent>
                  {etiquetas.map(et => <SelectItem key={et.cr4a1_etiquetaid} value={et.cr4a1_etiquetaid}>{et.cr4a1_nome}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            <Label className="mb-0 mt-1 text-[11px]">Faça (Ação)</Label>
            <Select value={tipo} onValueChange={(v) => { setTipo(v); setValor(v === 'prazo_dias' ? '3' : ''); setMensagemEmail(''); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TIPOS_AUTOMACAO).map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
              </SelectContent>
            </Select>

            {(tipo === 'responsavel' || tipo === 'email_usuario') && (
              <Select value={valor} onValueChange={setValor}>
                <SelectTrigger><SelectValue placeholder="Escolher pessoa (e-mail via tabela de credenciais)" /></SelectTrigger>
                <SelectContent>
                  {membros.map(m => (
                    <SelectItem key={m.cr4a1_username} value={m.cr4a1_username}>
                      {m.cr4a1_nome_exibicao || m.cr4a1_username}{m.cr4a1_email ? ` (${m.cr4a1_email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {aceitaMensagemEmail && (
              <Input
                value={mensagemEmail}
                onChange={e => setMensagemEmail(e.target.value)}
                placeholder="Mensagem adicional no e-mail (opcional)"
                className="text-xs"
              />
            )}

            {(tipo === 'etiqueta' || tipo === 'remover_etiqueta') && (
              <Select value={valor} onValueChange={setValor}>
                <SelectTrigger><SelectValue placeholder="Escolher etiqueta" /></SelectTrigger>
                <SelectContent>
                  {etiquetas.map(et => <SelectItem key={et.cr4a1_etiquetaid} value={et.cr4a1_etiquetaid}>{et.cr4a1_nome}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {(tipo === 'mover' || tipo === 'duplicar_para') && (
              <Select value={valor} onValueChange={setValor}>
                <SelectTrigger><SelectValue placeholder="Escolher lista de destino" /></SelectTrigger>
                <SelectContent>
                  {outrasListas.map(l => <SelectItem key={l.cr4a1_listaid} value={l.cr4a1_listaid}>{l.cr4a1_nome}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {tipo === 'prazo_dias' && (
              <Select value={valor} onValueChange={setValor}>
                <SelectTrigger><SelectValue placeholder="Quantos dias a partir de agora?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">+1 dia (Amanhã às 09:00)</SelectItem>
                  <SelectItem value="2">+2 dias</SelectItem>
                  <SelectItem value="3">+3 dias</SelectItem>
                  <SelectItem value="5">+5 dias</SelectItem>
                  <SelectItem value="7">+7 dias (1 semana)</SelectItem>
                  <SelectItem value="15">+15 dias</SelectItem>
                  <SelectItem value="30">+30 dias (1 mês)</SelectItem>
                </SelectContent>
              </Select>
            )}

            {tipo === 'comentar' && (
              <Textarea value={valor} onChange={e => setValor(e.target.value)} placeholder="Texto do comentário automático" className="min-h-[60px]" />
            )}

            {tipo === 'cor' && (
              <div className="flex flex-wrap items-center gap-1.5">
                {themeColors.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setValor(c.hex)}
                    title={c.label}
                    aria-label={c.label}
                    className="size-6 shrink-0 rounded-full transition-transform active:scale-90"
                    style={{ backgroundColor: c.hex, boxShadow: valor === c.hex ? `0 0 0 2px var(--card), 0 0 0 4px ${c.hex}` : 'none' }}
                  />
                ))}
              </div>
            )}

            <Button type="button" size="sm" onClick={adicionar} disabled={!podeAdicionar}>Adicionar regra</Button>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Concluído</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

// ==========================================
// COMPONENTES AUXILIARES PARA LISTAS DO TRELLO
// ==========================================

const CRITERIOS_ORDENACAO = [
  { id: 'padrao', rotulo: 'Padrão (Manual)' },
  { id: 'data_recente', rotulo: 'Data: Mais recente primeiro' },
  { id: 'data_antiga', rotulo: 'Data: Mais antiga primeiro' },
  { id: 'titulo_az', rotulo: 'Título: A → Z' },
  { id: 'titulo_za', rotulo: 'Título: Z → A' },
  { id: 'pendentes', rotulo: 'Pendentes primeiro' },
  { id: 'concluidas', rotulo: 'Concluídas primeiro' }
];

const ListaOrdenacaoMenu = ({ criterioAtual = 'padrao', onChange }) => {
  const isCustom = criterioAtual !== 'padrao';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Organizar lista"
          title={`Organizar lista (${CRITERIOS_ORDENACAO.find(c => c.id === criterioAtual)?.rotulo || 'Padrão'})`}
          className={`shrink-0 rounded p-1 transition-colors ${isCustom ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-secondary'}`}
        >
          <ArrowUpDown className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border">
          Organizar lista por:
        </div>
        {CRITERIOS_ORDENACAO.map(crit => (
          <DropdownMenuItem
            key={crit.id}
            onClick={() => onChange(crit.id)}
            className="flex items-center justify-between text-xs cursor-pointer py-1.5"
          >
            <span className={criterioAtual === crit.id ? 'font-bold text-primary' : ''}>
              {crit.rotulo}
            </span>
            {criterioAtual === crit.id && <Check className="size-3.5 text-primary shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const GerentesListaDialog = ({ lista, allUsers = [], onClose, onSave }) => {
  const gerentesAtuais = useMemo(() => parseListaGerentes(lista?.cr4a1_automacao), [lista]);
  const [selecionados, setSelecionados] = useState(gerentesAtuais);
  const [busca, setBusca] = useState('');

  const toggleUsuario = (login) => {
    setSelecionados(prev => prev.includes(login) ? prev.filter(l => l !== login) : [...prev, login]);
  };

  const usuariosFiltrados = useMemo(() => {
    return allUsers.filter(u => {
      if (u.cr4a1_username === lista?.cr4a1_criador_login) return false;
      if (!busca.trim()) return true;
      const termo = busca.toLowerCase();
      return (u.cr4a1_nome_exibicao || '').toLowerCase().includes(termo) ||
             (u.cr4a1_username || '').toLowerCase().includes(termo);
    });
  }, [allUsers, busca, lista]);

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="size-5 text-primary" />
            Gerentes da Lista
          </DialogTitle>
          <DialogDescription>
            Defina outros usuários para ter os mesmos privilégios de gerenciamento que o criador na lista <strong>{lista?.cr4a1_nome}</strong> (renomear, excluir, automações, ordenação e mover de workspace).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <Input
            placeholder="Buscar usuário por nome ou login..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="h-9"
          />

          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 border border-border rounded-lg p-2">
            {usuariosFiltrados.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum usuário encontrado.</p>
            ) : (
              usuariosFiltrados.map(u => {
                const isSelected = selecionados.includes(u.cr4a1_username);
                return (
                  <label
                    key={u.cr4a1_username}
                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-xs ${isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-secondary border border-transparent'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <UserAvatar login={u.cr4a1_username} allUsers={allUsers} size={22} />
                      <div className="truncate">
                        <span className="font-semibold block truncate">{u.cr4a1_nome_exibicao || u.cr4a1_username}</span>
                        <span className="text-[11px] text-muted-foreground truncate block">@{u.cr4a1_username}</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleUsuario(u.cr4a1_username)}
                      className="size-4 rounded text-primary focus:ring-primary accent-primary"
                    />
                  </label>
                );
              })
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Criador da lista: <strong>{lista?.cr4a1_criador_login || 'Admin'}</strong>
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={() => onSave(selecionados)}>Salvar Gerentes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MoverListaWorkspaceDialog = ({ lista, workspaces = [], onClose, onConfirm }) => {
  const [workspaceDestinoId, setWorkspaceDestinoId] = useState('');
  const [salvando, setSalvando] = useState(false);

  const opcoesValidas = useMemo(() => {
    return workspaces.filter(w => w.cr4a1_calendarios_workspacesid !== lista?.cr4a1_workspace_id);
  }, [workspaces, lista]);

  const handleMover = async () => {
    if (!workspaceDestinoId) {
      toast.error('Selecione o workspace de destino.');
      return;
    }
    setSalvando(true);
    try {
      await onConfirm(workspaceDestinoId);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => { if (!open && !salvando) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="size-5 text-primary" />
            Mover Lista para outro Workspace
          </DialogTitle>
          <DialogDescription>
            Transferir a lista <strong>{lista?.cr4a1_nome}</strong> para outro workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <Label className="text-xs font-semibold">Workspace de destino:</Label>
          <Select value={workspaceDestinoId} onValueChange={setWorkspaceDestinoId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o novo workspace..." />
            </SelectTrigger>
            <SelectContent>
              {opcoesValidas.map(w => (
                <SelectItem key={w.cr4a1_calendarios_workspacesid} value={w.cr4a1_calendarios_workspacesid}>
                  {w.cr4a1_nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="rounded-lg border border-border bg-secondary/50 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">O que acontece ao mover:</p>
            <p>• A lista e todas as suas fichas serão movidas para o novo workspace.</p>
            <p>• Quaisquer eventos criados a partir dessas fichas na agenda também serão transferidos para o novo workspace automaticamente.</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" disabled={salvando} onClick={onClose}>Cancelar</Button>
          <Button type="button" disabled={!workspaceDestinoId || salvando} onClick={handleMover}>
            {salvando ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
            Mover Lista
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
