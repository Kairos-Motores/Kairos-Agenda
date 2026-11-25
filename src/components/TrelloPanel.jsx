import {
  notificarMencoes,
  notificarCompartilhamento,
  notificarCoGerencia,
  notificarSubtaskAtribuida,
  notificarLembreteSubtask,
  notificarConviteTrello,
  enviarAlertaEmail,
  enviarAlertaPush,
  salvarNotificacaoNoApp,
  dispararNotificacaoDispositivo,
  resolverInfoDestinatarioCredenciais
} from '../utils/alertas';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { format, addHours, addDays, addMonths } from 'date-fns';
import { Plus, Trash2, Ban, GripVertical, CalendarDays, RefreshCw, X, Users, UserPlus, Tag, Lock, Unlock, Pencil, Check, CheckCircle2, Circle, Image as ImageIcon, Palette, ShieldOff, ShieldAlert, Paperclip, Filter, ChevronLeft, ChevronRight, ChevronDown, UserCircle2, MessageCircle, Send, History, Pin, LayoutTemplate, Repeat, FileSpreadsheet, Zap, MoreHorizontal, Share2, FolderSync, FileDown, Loader2, ArrowUpDown, UserCheck, FolderInput, Archive, ArchiveRestore, Copy, Bell, BellOff, BellRing, Play, Pause, Clock, Timer, Flag, ExternalLink, Link2, DollarSign, Kanban, Columns3, Table2, CalendarRange, GanttChart, BarChart3, Sparkles, ArrowRightLeft, FileText, Eye, Type } from 'lucide-react';
import {
  GOOGLE_FONTS_FICHAS,
  carregarGoogleFont,
  carregarCatalogoGoogleFonts,
  getFichasFontCss
} from '../utils/googleFontsFichas';
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
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from './ui/dropdown-menu';
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
import { parseComentarios, criarComentario, EMOJIS_REACAO_COMENTARIO, alternarReacaoComentario } from '../utils/comentarios';
import {
  parseAtividades,
  registrarAtividade,
  descricaoAtividade,
  parseFichaMeta,
  atualizarFichaMeta,
  PRIORIDADES_FICHA,
  STATUS_APROVACAO_FICHA,
  calcularTempoTotalMin,
  formatarDuracaoMin,
  calcularProgressoFicha,
  detectarCicloDependencia,
  META_PADRAO
} from '../utils/atividades';
import { exportarQuadroXlsx } from '../utils/exportarQuadroXlsx';
import {
  parseAutomacoes,
  parseListaGerentes,
  parseListaCor,
  parseListaConvidados,
  parseListaNotificacoes,
  parseListaSyncAgenda,
  serializarConfigLista,
  aplicarAutomacoes,
  regrasPara,
  estadoDataAtual,
  TIPOS_AUTOMACAO,
  GATILHOS_AUTOMACAO,
  descricaoAutomacao,
  ehFichaArquivada
} from '../utils/automacoes';
import { TrelloTabelaView, TrelloCronogramaView, TrelloPainelView } from './TrelloViews';
import { stickers } from '../constants/stickers';
import { WORKSPACE_COORD_ROLES } from '../config/roleWorkspaceMap';
import { useConfirm } from '../hooks/useConfirm';

const obterMetaPadrao = () => {
  try {
    if (typeof META_PADRAO === 'function') return META_PADRAO();
  } catch {}
  return parseFichaMeta('');
};

const API_PROXY = '/api/dataverse-proxy';
export const VIRTUAL_WORKSPACE_CONVIDADOS_ID = '__espaco_convidados__';
const q = (valor) => encodeURIComponent(valor);
const comData = (ficha) => !!ficha.cr4a1_data_inicio;
// A lista padrão "A Fazer" deve ser ocultada do módulo de Fichas (sem apagar eventos da Agenda)
const ehListaAFazer = (lista) => (lista?.cr4a1_nome || '').trim().toLowerCase() === 'a fazer';
// Opções de recorrência da ficha: ao concluir, cria sozinha a próxima ocorrência nessa
// distância da data original (só funciona em fichas com data, já que a repetição é sobre ela).
const RECORRENCIAS = { Diaria: (d) => addDays(d, 1), Semanal: (d) => addDays(d, 7), Mensal: (d) => addMonths(d, 1) };
const RECORRENCIA_LABEL = { '': 'Não repetir', Diaria: 'Diariamente', Semanal: 'Semanalmente', Mensal: 'Mensalmente' };
const TRELLO_WORKSPACE_KEY = 'kairos_trello_workspace';
const TRELLO_COLAPSADAS_KEY = 'kairos_trello_listas_colapsadas';
// Intervalo do polling que mantém o quadro em sincronia entre quem está vendo o mesmo Trello.
const TRELLO_POLL_MS = 5000;

const filtrosVazios = () => ({ busca: '', responsaveis: [], etiquetasIds: [], status: 'todas', comData: 'todas', dataDe: '', dataAte: '', anexos: 'todas', prioridade: 'todas', seguindo: false, apenasModelos: false });

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
  f.anexos !== 'todas',
  (f.prioridade || 'todas') !== 'todas',
  !!f.seguindo,
  !!f.apenasModelos
].filter(Boolean).length;

const fichaCombinaComFiltros = (ficha, f, usuarioAtual = '') => {
  const meta = parseFichaMeta(ficha.cr4a1_atividades);
  if (f.busca.trim()) {
    const alvo = `${ficha.cr4a1_titulo || ''} ${htmlParaTexto(ficha.cr4a1_descricao)} ${meta.campoTexto || ''}`;
    if (!matchesSearch(alvo, f.busca)) return false;
  }
  if (f.responsaveis.length > 0) {
    const resps = [ficha.cr4a1_responsavel_login, ...(meta.coResponsaveis || [])].filter(Boolean);
    if (!f.responsaveis.some(r => resps.includes(r))) return false;
  }
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
  if (f.prioridade && f.prioridade !== 'todas') {
    if (f.prioridade === 'sem' && meta.prioridade) return false;
    if (f.prioridade !== 'sem' && meta.prioridade !== f.prioridade) return false;
  }
  if (f.seguindo && !(meta.observadores || []).includes(usuarioAtual)) return false;
  if (f.apenasModelos && !meta.ehModelo) return false;
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

const PESO_PRIORIDADE = { critica: 4, alta: 3, media: 2, baixa: 1, '': 0 };

// Compara dois itens por um critério individual
const compararFichasIndividual = (a, b, crit) => {
  switch (crit) {
    case 'prioridade_alta': {
      const pA = PESO_PRIORIDADE[parseFichaMeta(a.cr4a1_atividades).prioridade || ''] || 0;
      const pB = PESO_PRIORIDADE[parseFichaMeta(b.cr4a1_atividades).prioridade || ''] || 0;
      if (pA !== pB) return pB - pA;
      return 0;
    }
    case 'prioridade_baixa': {
      const rawA = parseFichaMeta(a.cr4a1_atividades).prioridade || '';
      const rawB = parseFichaMeta(b.cr4a1_atividades).prioridade || '';
      const pA = rawA ? PESO_PRIORIDADE[rawA] : 99;
      const pB = rawB ? PESO_PRIORIDADE[rawB] : 99;
      if (pA !== pB) return pA - pB;
      return 0;
    }
    case 'data_recente':
    case 'prazo_urgente': {
      // Prazo mais próximo (Urgência: Hoje antes de amanhã)
      if (!a.cr4a1_data_inicio && !b.cr4a1_data_inicio) return 0;
      if (!a.cr4a1_data_inicio) return 1;
      if (!b.cr4a1_data_inicio) return -1;
      const diff = new Date(a.cr4a1_data_inicio).getTime() - new Date(b.cr4a1_data_inicio).getTime();
      return diff !== 0 ? diff : 0;
    }
    case 'data_antiga':
    case 'prazo_distante': {
      // Prazo mais distante no futuro
      if (!a.cr4a1_data_inicio && !b.cr4a1_data_inicio) return 0;
      if (!a.cr4a1_data_inicio) return 1;
      if (!b.cr4a1_data_inicio) return -1;
      const diff = new Date(b.cr4a1_data_inicio).getTime() - new Date(a.cr4a1_data_inicio).getTime();
      return diff !== 0 ? diff : 0;
    }
    case 'criacao_recente': {
      const dataA = a.createdon ? new Date(a.createdon).getTime() : 0;
      const dataB = b.createdon ? new Date(b.createdon).getTime() : 0;
      return dataB - dataA;
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
    default:
      return 0;
  }
};

// Ordenação flexível com suporte a múltiplos critérios simultâneos
// Regra mandatória: fichas concluídas SEMPRE ficam no final de cada lista!
const ordenarFichasPorCriterio = (fichasLista, criterio = 'padrao') => {
  const listaCriterios = Array.isArray(criterio)
    ? criterio.filter(c => c && c !== 'padrao')
    : (criterio && criterio !== 'padrao' ? [criterio] : []);

  return [...fichasLista].sort((a, b) => {
    // 1. REGRA MANDATÓRIA: Fichas concluídas SEMPRE ficam no final!
    const cA = a.cr4a1_concluida === 'Sim' ? 1 : 0;
    const cB = b.cr4a1_concluida === 'Sim' ? 1 : 0;
    if (cA !== cB) return cA - cB;

    // 2. Fichas fixadas no topo (dentro do grupo pendente ou concluído)
    const fixadaA = a.cr4a1_fixada === 'Sim' ? 0 : 1;
    const fixadaB = b.cr4a1_fixada === 'Sim' ? 0 : 1;
    if (fixadaA !== fixadaB) return fixadaA - fixadaB;

    // 3. Aplica os múltiplos critérios selecionados em ordem de precedência
    for (const crit of listaCriterios) {
      const res = compararFichasIndividual(a, b, crit);
      if (res !== 0) return res;
    }

    // 4. Desempate: ordem manual pré-definida
    return (a.cr4a1_ordem ?? 0) - (b.cr4a1_ordem ?? 0);
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

export const TrelloPanel = ({
  workspaces,
  allUsers,
  user,
  currentUser,
  registrarCorRecenteUsuario,
  updateTrelloFundo,
  refreshEvents,
  isAdmin,
  hasRole,
  dragEndRef,
  notas = [],
  addNota,
  updateNota,
  fichaIdParaAbrir = null,
  onLimparFichaIdParaAbrir,
  onNavegarParaNota
}) => {
  const currentUserName = (
    (typeof user === 'string' ? user : '') ||
    (typeof currentUser === 'string' ? currentUser : '') ||
    (typeof window !== 'undefined' ? localStorage.getItem('kairos_logged_user') : '') ||
    ''
  ).trim();

  const resolvedCurrentUser = currentUser?.cr4a1_username
    ? currentUser
    : (allUsers || []).find(u => (u.cr4a1_username || '').toLowerCase() === currentUserName.toLowerCase());

  const coresRecentesMarcaTexto = resolvedCurrentUser?.coresRecentesMarcaTexto || [];

  const coresRecentesFicha = useMemo(() => {
    if (Array.isArray(resolvedCurrentUser?.coresRecentesNota) && resolvedCurrentUser.coresRecentesNota.length > 0) {
      return resolvedCurrentUser.coresRecentesNota;
    }
    try {
      const local = JSON.parse(localStorage.getItem('kairos_cores_recentes_fichas') || '[]');
      if (Array.isArray(local) && local.length > 0) return local;
    } catch {}
    return [];
  }, [resolvedCurrentUser?.coresRecentesNota]);

  const handleRegistrarCorRecente = useCallback((tipo, hex) => {
    if (tipo === 'ficha' || tipo === 'nota') {
      try {
        const local = JSON.parse(localStorage.getItem('kairos_cores_recentes_fichas') || '[]');
        const semDup = [hex, ...local.filter(c => c && c.toLowerCase() !== hex.toLowerCase())].slice(0, 6);
        localStorage.setItem('kairos_cores_recentes_fichas', JSON.stringify(semDup));
      } catch {}
      registrarCorRecenteUsuario?.('nota', hex);
    } else {
      registrarCorRecenteUsuario?.(tipo, hex);
    }
  }, [registrarCorRecenteUsuario]);

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
  const fichasRef = useRef([]);
  useEffect(() => { fichasRef.current = fichas; }, [fichas]);
  const syncLockPorFichaRef = useRef(new Map());
  const executarComLockFicha = useCallback((fichaId, fn) => {
    if (!fichaId) return fn();
    const anterior = syncLockPorFichaRef.current.get(fichaId) || Promise.resolve();
    const proxima = anterior.catch(() => {}).then(fn);
    syncLockPorFichaRef.current.set(fichaId, proxima);
    proxima.finally(() => {
      if (syncLockPorFichaRef.current.get(fichaId) === proxima) {
        syncLockPorFichaRef.current.delete(fichaId);
      }
    });
    return proxima;
  }, []);
  const [quadro, setQuadro] = useState(null);
  const [etiquetas, setEtiquetas] = useState([]);
  const [novaLista, setNovaLista] = useState('');
  const [novaListaPessoal, setNovaListaPessoal] = useState(false);
  const [novaFichaPorLista, setNovaFichaPorLista] = useState({});
  const [composerAbertoListaId, setComposerAbertoListaId] = useState(null);
  const [editando, setEditando] = useState(null);
  const [compartilharAberto, setCompartilharAberto] = useState(false);
  const [etiquetasAberto, setEtiquetasAberto] = useState(false);
  const [fundoAberto, setFundoAberto] = useState(false);

  const fonteUsuarioFichas = useMemo(() => {
    if (currentUser?.cr4a1_fonte_fichas !== undefined && currentUser?.cr4a1_fonte_fichas !== null) {
      return currentUser.cr4a1_fonte_fichas;
    }
    try {
      return localStorage.getItem(`kairos_fichas_font_${String(user || '').toLowerCase()}`) || '';
    } catch {
      return '';
    }
  }, [currentUser?.cr4a1_fonte_fichas, user]);

  const fichasFontCss = useMemo(() => getFichasFontCss(fonteUsuarioFichas), [fonteUsuarioFichas]);

  useEffect(() => {
    if (fonteUsuarioFichas) {
      carregarGoogleFont(fonteUsuarioFichas);
    }
    try {
      if (user && currentUser?.cr4a1_fonte_fichas !== undefined) {
        localStorage.setItem(`kairos_fichas_font_${String(user).toLowerCase()}`, currentUser.cr4a1_fonte_fichas || '');
      }
    } catch {}
  }, [fonteUsuarioFichas, currentUser?.cr4a1_fonte_fichas, user]);

  // Aplica a fonte escolhida apenas enquanto o usuário está no módulo Fichas (inclusive modais/portais),
  // restaurando o padrão global (Poppins) ao sair do Fichas.
  useEffect(() => {
    const temCustom = Boolean(fonteUsuarioFichas && fonteUsuarioFichas !== 'Poppins');
    document.body.style.fontFamily = temCustom ? fichasFontCss : '';
    return () => {
      document.body.style.fontFamily = '';
    };
  }, [fichasFontCss, fonteUsuarioFichas]);
  const [filtrosAberto, setFiltrosAberto] = useState(false);
  const [anexoCardPreview, setAnexoCardPreview] = useState(null);
  const [minhasFichasAberto, setMinhasFichasAberto] = useState(false);
  const [minhasFichas, setMinhasFichas] = useState([]);
  const [minhasFichasCarregando, setMinhasFichasCarregando] = useState(false);
  const [arquivadasAberto, setArquivadasAberto] = useState(false);
  const [modoVisao, setModoVisao] = useState('kanban');
  const [listaMoverFichas, setListaMoverFichas] = useState(null);
  const [modelosAberto, setModelosAberto] = useState(false);
  const [modelos, setModelos] = useState([]);
  const [listaAutomacao, setListaAutomacao] = useState(null);
  const [listaGerentes, setListaGerentes] = useState(null);
  const [listaConvidados, setListaConvidados] = useState(null);
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

  // Workspaces onde o usuário não é membro do calendário, mas foi convidado pro quadro,
  // ou possui fichas/listas onde foi convidado externamente (reunidas no Espaço do Convidado).
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const userLower = String(user || '').trim().toLowerCase();
      if (!userLower) return;

      const userVariants = Array.from(new Set([user, userLower, user?.toUpperCase()].filter(Boolean)));
      const condicoesQuadros = [`contains(cr4a1_colaboradores, '${user}')`];
      workspaces.forEach(w => {
        if (w.cr4a1_calendarios_workspacesid && !w._virtual && w.cr4a1_calendarios_workspacesid !== VIRTUAL_WORKSPACE_CONVIDADOS_ID) {
          condicoesQuadros.push(`contains(cr4a1_colaboradores, 'ws:${w.cr4a1_calendarios_workspacesid}')`);
        }
      });
      const filtroQuadros = q(condicoesQuadros.join(' or '));
      const filtroConvidadoFicha = q(userVariants.map(u => `contains(cr4a1_atividades, '${u}')`).join(' or '));
      const filtroConvidadoLista = q(userVariants.map(u => `contains(cr4a1_automacao, '${u}')`).join(' or '));

      const [resQuadros, resFichasConv, resListasConv] = await Promise.all([
        fetch(`${API_PROXY}?table=cr4a1_quadros&$filter=${filtroQuadros}`).then(r => r.ok ? r.json() : { value: [] }).catch(() => ({ value: [] })),
        fetch(`${API_PROXY}?table=cr4a1_fichas&$select=cr4a1_fichaid,cr4a1_workspace_id,cr4a1_atividades,cr4a1_fixada&$filter=${filtroConvidadoFicha}`).then(r => r.ok ? r.json() : { value: [] }).catch(() => ({ value: [] })),
        fetch(`${API_PROXY}?table=cr4a1_listas&$select=cr4a1_listaid,cr4a1_workspace_id,cr4a1_automacao,cr4a1_nome&$filter=${filtroConvidadoLista}`).then(r => r.ok ? r.json() : { value: [] }).catch(() => ({ value: [] }))
      ]);
      if (cancelado) return;

      const wsIdsConvidadosFichas = (resFichasConv.value || [])
        .filter(f => {
          if (ehFichaArquivada(f)) return false;
          const meta = parseFichaMeta(f.cr4a1_atividades);
          return (meta.convidados || []).some(c => String(c).toLowerCase() === userLower);
        })
        .map(f => f.cr4a1_workspace_id)
        .filter(Boolean);

      const wsIdsConvidadosListas = (resListasConv.value || [])
        .filter(l => {
          if (ehListaAFazer(l)) return false;
          return parseListaConvidados(l.cr4a1_automacao).some(c => String(c).toLowerCase() === userLower);
        })
        .map(l => l.cr4a1_workspace_id)
        .filter(Boolean);

      const conhecidos = new Set(workspaces.map(w => w.cr4a1_calendarios_workspacesid));
      const wsIdsConvidadosExternos = [...new Set([...wsIdsConvidadosFichas, ...wsIdsConvidadosListas])].filter(id => !conhecidos.has(id));

      // Workspaces extras onde o usuário é colaborador de todo o quadro
      const idsQuadrosExtras = (resQuadros.value || []).map(qd => qd.cr4a1_workspace_id).filter(id => id && !conhecidos.has(id) && !wsIdsConvidadosExternos.includes(id));

      const extras = [];
      if (idsQuadrosExtras.length > 0) {
        const filtroWs = q(idsQuadrosExtras.map(id => `cr4a1_calendarios_workspacesid eq '${id}'`).join(' or '));
        const resWs = await fetch(`${API_PROXY}?table=cr4a1_calendarios_workspaceses&$filter=${filtroWs}`).then(r => r.json()).catch(() => ({ value: [] }));
        if (Array.isArray(resWs.value)) extras.push(...resWs.value);
      }

      // Conforme solicitado: quem for convidado para fichas/listas não entra diretamente no workspace externo.
      // Em vez disso, existe o workspace virtual "Espaço do Convidado", reunindo tudo o que foi compartilhado com ele.
      const jaTemVirtualNoWorkspaces = workspaces.some(w => w.cr4a1_calendarios_workspacesid === VIRTUAL_WORKSPACE_CONVIDADOS_ID);
      if (wsIdsConvidadosExternos.length > 0 || jaTemVirtualNoWorkspaces) {
        extras.push({
          cr4a1_calendarios_workspacesid: VIRTUAL_WORKSPACE_CONVIDADOS_ID,
          cr4a1_nome: 'Espaço do Convidado',
          cr4a1_cor_hex: '#6366f1',
          _virtual: true,
          _apenasFichasConvidado: true,
          _workspacesOrigemIds: wsIdsConvidadosExternos
        });
      }

      if (!cancelado) setWorkspacesExtras(extras);
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
  const podeMudarWorkspace = isAdmin || (!!workspace && workspace.cr4a1_criador_login === user);
  const historicoCompartilhamento = useMemo(() => {
    try {
      const parsed = quadro?.cr4a1_historico_compartilhamento ? JSON.parse(quadro.cr4a1_historico_compartilhamento) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [quadro?.cr4a1_historico_compartilhamento]);

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

  // Controle de Convidados Externos: se o usuário já virou membro do workspace, deixa de ser convidado automaticamente!
  const userLower = String(user || '').trim().toLowerCase();
  const membrosBaseLoginsSet = useMemo(
    () => new Set(membrosBase.map(m => String(m.cr4a1_username || '').toLowerCase())),
    [membrosBase]
  );
  const souMembroOuColaboradorQuadro = useMemo(() => {
    if (workspaceId === VIRTUAL_WORKSPACE_CONVIDADOS_ID || workspace?._virtual) return false;
    if (isAdmin) return true;
    if (!workspace) return true;
    if (membrosBaseLoginsSet.has(userLower)) return true;
    if (colaboradoresLogins.some(c => String(c).toLowerCase() === userLower)) return true;
    if (workspaces.some(w => workspacesVinculadosIds.includes(w.cr4a1_calendarios_workspacesid))) return true;
    return false;
  }, [workspaceId, isAdmin, workspace, membrosBaseLoginsSet, userLower, colaboradoresLogins, workspaces, workspacesVinculadosIds]);
  const souApenasConvidado = !souMembroOuColaboradorQuadro;
  const podeGerenciarColaboradores = !souApenasConvidado && !estouBloqueado;

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

    const carregar = async () => {
      if (document.hidden) return;

      if (workspaceId === VIRTUAL_WORKSPACE_CONVIDADOS_ID) {
        // === CARREGAMENTO DO ESPAÇO VIRTUAL DO CONVIDADO ===
        try {
          const userLower = String(user || '').trim().toLowerCase();
          const userVariants = Array.from(new Set([user, userLower, user?.toUpperCase()].filter(Boolean)));
          const condicoesFichas = userVariants.map(u => `contains(cr4a1_atividades, '${u}')`).join(' or ');
          const condicoesListas = userVariants.map(u => `contains(cr4a1_automacao, '${u}')`).join(' or ');

          const [resFichasConv, resListasConv] = await Promise.all([
            fetch(`${API_PROXY}?table=cr4a1_fichas&$filter=${q(condicoesFichas)}`).then(r => r.ok ? r.json() : { value: [] }).catch(() => ({ value: [] })),
            fetch(`${API_PROXY}?table=cr4a1_listas&$filter=${q(condicoesListas)}`).then(r => r.ok ? r.json() : { value: [] }).catch(() => ({ value: [] }))
          ]);
          if (cancelado) return;

          // Fichas onde o usuário foi convidado diretamente
          const fichasConvidadas = (resFichasConv.value || []).filter(f => {
            if (ehFichaArquivada(f)) return false;
            const meta = parseFichaMeta(f.cr4a1_atividades);
            return (meta.convidados || []).some(c => String(c).toLowerCase() === userLower);
          });

          // Listas onde o usuário foi convidado para a lista inteira
          const listasConvidadas = (resListasConv.value || []).filter(l => {
            if (ehListaAFazer(l)) return false;
            return parseListaConvidados(l.cr4a1_automacao).some(c => String(c).toLowerCase() === userLower);
          });

          // Para listas convidadas inteiras, busca todas as fichas dessas listas
          const listasConvIds = listasConvidadas.map(l => l.cr4a1_listaid).filter(Boolean);
          let fichasDasListas = [];
          if (listasConvIds.length > 0) {
            const filtroFichasListas = q(listasConvIds.map(id => `cr4a1_lista_id eq '${id}'`).join(' or '));
            const resFichasListas = await fetch(`${API_PROXY}?table=cr4a1_fichas&$filter=${filtroFichasListas}`).then(r => r.ok ? r.json() : { value: [] }).catch(() => ({ value: [] }));
            fichasDasListas = (resFichasListas.value || []).filter(f => !ehFichaArquivada(f));
          }

          // Unifica todas as fichas acessíveis ao convidado (sem duplicatas)
          const mapaFichas = new Map();
          [...fichasConvidadas, ...fichasDasListas].forEach(f => {
            if (f?.cr4a1_fichaid && !mapaFichas.has(f.cr4a1_fichaid)) {
              mapaFichas.set(f.cr4a1_fichaid, f);
            }
          });
          const fichasFinais = Array.from(mapaFichas.values());

          // Garante que todas as listas-pai das fichas convidadas estejam carregadas (para renderizar as colunas)
          const listasIdsNecessarios = new Set(fichasFinais.map(f => f.cr4a1_lista_id).filter(Boolean));
          const listasIdsFaltantes = Array.from(listasIdsNecessarios).filter(id => !listasConvidadas.some(l => l.cr4a1_listaid === id));
          let listasExtras = [];
          if (listasIdsFaltantes.length > 0) {
            const filtroFaltantes = q(listasIdsFaltantes.map(id => `cr4a1_listaid eq '${id}'`).join(' or '));
            const resFaltantes = await fetch(`${API_PROXY}?table=cr4a1_listas&$filter=${filtroFaltantes}`).then(r => r.ok ? r.json() : { value: [] }).catch(() => ({ value: [] }));
            listasExtras = (resFaltantes.value || []).filter(l => !ehListaAFazer(l));
          }

          const todasAsListas = [...listasConvidadas, ...listasExtras];

          // Descobre o nome do workspace de origem de cada lista para exibir no badge
          const wsIdsOrigem = [...new Set([...todasAsListas.map(l => l.cr4a1_workspace_id), ...fichasFinais.map(f => f.cr4a1_workspace_id)].filter(Boolean))];
          const mapaNomesWs = new Map();
          todasOpcoes.forEach(w => {
            if (w.cr4a1_calendarios_workspacesid && w.cr4a1_nome) {
              mapaNomesWs.set(w.cr4a1_calendarios_workspacesid, w.cr4a1_nome);
            }
          });
          const wsIdsFaltantes = wsIdsOrigem.filter(id => !mapaNomesWs.has(id));
          if (wsIdsFaltantes.length > 0) {
            const filtroWs = q(wsIdsFaltantes.map(id => `cr4a1_calendarios_workspacesid eq '${id}'`).join(' or '));
            const resWs = await fetch(`${API_PROXY}?table=cr4a1_calendarios_workspaceses&$select=cr4a1_calendarios_workspacesid,cr4a1_nome&$filter=${filtroWs}`).then(r => r.json()).catch(() => ({ value: [] }));
            (resWs.value || []).forEach(w => mapaNomesWs.set(w.cr4a1_calendarios_workspacesid, w.cr4a1_nome));
          }

          const listasComOrigem = todasAsListas.map(l => ({
            ...l,
            _origemWorkspaceNome: mapaNomesWs.get(l.cr4a1_workspace_id) || 'Workspace'
          }));

          if (cancelado) return;
          setListas(ordenar(listasComOrigem));
          setFichas(fichasFinais);
          setQuadro({
            cr4a1_nome: 'Espaço do Convidado',
            cr4a1_workspace_id: VIRTUAL_WORKSPACE_CONVIDADOS_ID,
            _virtual: true
          });
          setEtiquetas([]);
        } catch (err) {
          console.error('[carregarEspacoConvidado]', err);
        }
        return;
      }

      // === CARREGAMENTO NORMAL DE WORKSPACE ESPECÍFICO ===
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
      }).catch(err => {
        console.error('[carregarQuadro]', err);
      });
    };

    carregar();
    const intervalo = setInterval(carregar, TRELLO_POLL_MS);
    return () => { cancelado = true; clearInterval(intervalo); };
  }, [workspaceId, versao, user, todasOpcoes]);

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

  // Verificação em tempo real de lembretes de subtarefas (48h, 24h ou 12h antes do prazo)
  // enquanto o quadro está aberto — utiliza a mesma chave do cron do servidor para nunca duplicar.
  const lembretesSubtaskEmAndamentoRef = useRef(new Set());
  useEffect(() => {
    if (!fichas.length) return;
    (async () => {
      const agoraMs = Date.now();
      const wsNome = todasOpcoes.find(w => w.cr4a1_calendarios_workspacesid === workspaceId)?.cr4a1_nome || '';
      for (const ficha of fichas) {
        if (ehFichaArquivada(ficha) || ficha.cr4a1_concluida === 'Sim') continue;
        const tarefas = extrairTarefas(ficha.cr4a1_descricao);
        if (!tarefas.length) continue;

        const meta = parseFichaMeta(ficha.cr4a1_atividades);
        const enviados = new Set(meta.lembretesSubtasksEnviados || []);
        const inbox = [...(meta.notificacoesInbox || [])];
        let alterou = false;
        const listaNome = listas.find(l => l.cr4a1_listaid === ficha.cr4a1_lista_id)?.cr4a1_nome || '';

        for (const t of tarefas) {
          if (t.concluida || !t.responsavel || !t.dataVencimento || !t.lembreteHoras) continue;
          const textoSubtask = (t.texto || '').trim();
          if (!textoSubtask) continue;
          const horasAntes = Number(t.lembreteHoras);
          if (![48, 24, 12].includes(horasAntes)) continue;

          const prazoIso = t.dataVencimento.includes('T')
            ? t.dataVencimento
            : `${t.dataVencimento}T08:00:00`;
          const prazoMs = new Date(prazoIso).getTime();
          if (Number.isNaN(prazoMs)) continue;

          const horasRestantes = (prazoMs - agoraMs) / 3600000;
          if (horasRestantes > horasAntes || horasRestantes < -24) continue;

          const loginLower = String(t.responsavel).trim().toLowerCase();
          const chave = `${t.index}_${loginLower}_${t.dataVencimento}_${horasAntes}`;
          const lockKey = `${ficha.cr4a1_fichaid}:${chave}`;
          if (enviados.has(chave) || lembretesSubtaskEmAndamentoRef.current.has(lockKey)) continue;

          lembretesSubtaskEmAndamentoRef.current.add(lockKey);
          try {
            const inboxItem = await notificarLembreteSubtask({
              destinatario: t.responsavel,
              subtaskTexto: t.texto,
              fichaTitulo: ficha.cr4a1_titulo || 'Ficha',
              dataVencimento: t.dataVencimento,
              lembreteHoras: horasAntes,
              workspaceNome: wsNome,
              listaNome,
              allUsers
            });
            enviados.add(chave);
            if (inboxItem) inbox.push(inboxItem);
            alterou = true;
          } catch {
            lembretesSubtaskEmAndamentoRef.current.delete(lockKey);
          }
        }

        if (alterou) {
          const novasAtividades = atualizarFichaMeta(ficha.cr4a1_atividades, {
            lembretesSubtasksEnviados: [...enviados],
            notificacoesInbox: inbox.slice(-30)
          });
          await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_atividades: novasAtividades }).catch(() => {});
        }
      }
    })();
  }, [fichas, listas, workspaceId, todasOpcoes, allUsers]);

  const listasVisiveis = useMemo(() => {
    return listas.filter(l => {
      // A lista "A Fazer" não deve aparecer no módulo de Fichas (mantendo intactos os eventos da Agenda)
      if (ehListaAFazer(l)) return false;

      // Se o usuário é apenas convidado externo neste workspace, só vê listas onde foi
      // convidado para a lista inteira ou listas que contenham alguma ficha onde foi convidado.
      if (souApenasConvidado) {
        const convsLista = parseListaConvidados(l.cr4a1_automacao).map(c => String(c).toLowerCase());
        if (convsLista.includes(userLower)) return true;
        return fichas.some(f => {
          if (ehFichaArquivada(f) || f.cr4a1_lista_id !== l.cr4a1_listaid) return false;
          const meta = parseFichaMeta(f.cr4a1_atividades);
          return (meta.convidados || []).some(c => String(c).toLowerCase() === userLower);
        });
      }

      return l.cr4a1_pessoal !== 'Sim' || l.cr4a1_criador_login === user || isAdmin;
    });
  }, [listas, fichas, user, userLower, isAdmin, souApenasConvidado]);

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
      const novoConteudo = serializarConfigLista(lista.cr4a1_automacao, { automacoes });
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
      const novoConteudo = serializarConfigLista(lista.cr4a1_automacao, { gerentes });
      await patch('cr4a1_listas', lista.cr4a1_listaid, { cr4a1_automacao: novoConteudo });
      setListaGerentes(null);
      recarregar();
      toast.success('Gerentes da lista atualizados!');
    } catch {
      toast.error('Erro ao salvar gerentes da lista.');
    }
  };

  const definirCorLista = async (lista, corHex) => {
    try {
      const novoConteudo = serializarConfigLista(lista.cr4a1_automacao, { cor: corHex || '' });
      setListas(prev => prev.map(l => l.cr4a1_listaid === lista.cr4a1_listaid ? { ...l, cr4a1_automacao: novoConteudo } : l));
      await patch('cr4a1_listas', lista.cr4a1_listaid, { cr4a1_automacao: novoConteudo });
    } catch {
      toast.error('Erro ao atualizar cor da lista.');
    }
  };

  // Clona uma lista inteira com todas as suas fichas ativas
  const clonarListaInteira = async (lista) => {
    const fichasParaClonar = fichasAtivas.filter(f => f.cr4a1_lista_id === lista.cr4a1_listaid);
    try {
      const resLista = await post('cr4a1_listas', {
        cr4a1_nome: `${lista.cr4a1_nome} (Cópia)`,
        cr4a1_workspace_id: workspaceId,
        cr4a1_ordem: listas.length,
        cr4a1_criador_login: user,
        cr4a1_pessoal: lista.cr4a1_pessoal || 'Não',
        cr4a1_automacao: lista.cr4a1_automacao || ''
      });
      const novaListaCriada = await resLista.json();
      const novoListaId = novaListaCriada.cr4a1_listaid;

      for (let i = 0; i < fichasParaClonar.length; i += 1) {
        const f = fichasParaClonar[i];
        await post('cr4a1_fichas', {
          cr4a1_titulo: f.cr4a1_titulo,
          cr4a1_descricao: f.cr4a1_descricao || '',
          cr4a1_lista_id: novoListaId,
          cr4a1_workspace_id: workspaceId,
          cr4a1_responsavel_login: f.cr4a1_responsavel_login || user,
          cr4a1_criador_login: user,
          cr4a1_ordem: i,
          cr4a1_data_inicio: f.cr4a1_data_inicio || null,
          cr4a1_concluida: f.cr4a1_concluida || 'Não',
          cr4a1_notificado: 'Sim',
          cr4a1_etiquetas: f.cr4a1_etiquetas || '',
          cr4a1_arquivos: f.cr4a1_arquivos || '[]',
          cr4a1_cor: f.cr4a1_cor || '',
          cr4a1_stickers: f.cr4a1_stickers || '',
          cr4a1_recorrencia: f.cr4a1_recorrencia || '',
          cr4a1_fixada: f.cr4a1_fixada === 'Sim' ? 'Sim' : 'Não',
          cr4a1_atividades: registrarAtividade(f.cr4a1_atividades, 'duplicada', user, `clonada da lista ${lista.cr4a1_nome}`)
        });
      }
      recarregar();
      toast.success(`Lista "${lista.cr4a1_nome}" clonada com ${fichasParaClonar.length} ficha(s)!`);
    } catch {
      toast.error('Erro ao clonar lista.');
    }
  };

  // Move todas as fichas ativas de uma lista para outra lista de destino
  const moverTodasFichasDeLista = async (listaOrigem, listaDestinoId) => {
    if (!listaOrigem || !listaDestinoId || listaOrigem.cr4a1_listaid === listaDestinoId) return;
    const daOrigem = fichasAtivas.filter(f => f.cr4a1_lista_id === listaOrigem.cr4a1_listaid);
    const destinoObj = listas.find(l => l.cr4a1_listaid === listaDestinoId);
    if (daOrigem.length === 0) {
      toast('Não há fichas nesta lista para mover.');
      setListaMoverFichas(null);
      return;
    }
    try {
      let ordemBase = fichasAtivas.filter(f => f.cr4a1_lista_id === listaDestinoId).length;
      for (const f of daOrigem) {
        const atividades = registrarAtividade(f.cr4a1_atividades, 'movida', user, destinoObj?.cr4a1_nome || '');
        await patch('cr4a1_fichas', f.cr4a1_fichaid, {
          cr4a1_lista_id: listaDestinoId,
          cr4a1_ordem: ordemBase,
          cr4a1_atividades: atividades
        });
        ordemBase += 1;
      }
      setListaMoverFichas(null);
      recarregar();
      toast.success(`${daOrigem.length} ficha(s) movida(s) para "${destinoObj?.cr4a1_nome || 'lista de destino'}"!`);
    } catch {
      toast.error('Erro ao mover fichas entre listas.');
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
    if (ficha.cr4a1_evento_id) await apagar('cr4a1_agenda_kairoses', ficha.cr4a1_evento_id).catch(() => {});
    const meta = parseFichaMeta(ficha.cr4a1_atividades);
    const subIds = Object.values(meta.subtasksEventosIds || {}).filter(Boolean);
    for (const subEvId of subIds) {
      await apagar('cr4a1_agenda_kairoses', subEvId).catch(() => {});
    }
  };

  // Busca eventos de Tarefa existentes no workspace na Agenda (usado para evitar duplicação e limpar duplicatas antigas)
  const buscarEventosTarefaWorkspace = async (wsId) => {
    if (!wsId) return [];
    try {
      const filtroEv = q(`cr4a1_workspace_id eq '${wsId}' and cr4a1_tipo eq 'Tarefa'`);
      const res = await fetch(`${API_PROXY}?table=cr4a1_agenda_kairoses&$select=cr4a1_agenda_kairosid,cr4a1_event_id,cr4a1_titulo,cr4a1_data_inicio,cr4a1_detalhes&$filter=${filtroEv}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.value) ? data.value : [];
    } catch {
      return [];
    }
  };

  // Sincroniza (ou remove) os eventos no Calendário para cada subtask com prazo de uma ficha checklist.
  // Usa cr4a1_event_id determinístico e deduplicação automática contra o Dataverse para nunca repetir subtasks na Agenda.
  const sincronizarEventosSubtasksFicha = async ({
    fichaId,
    tituloFicha,
    responsavelFicha,
    horaPadrao = '08:00',
    tarefas = [],
    subtasksEventosIdsAtuais = {},
    ativar = false,
    eventosWorkspaceCache = null,
    workspaceIdFicha = null
  }) => {
    const mapaAtual = (subtasksEventosIdsAtuais && typeof subtasksEventosIdsAtuais === 'object') ? subtasksEventosIdsAtuais : {};
    const novosIds = {};
    const prefixoEventId = fichaId ? `subtask-${fichaId}-` : '';
    const detalheSubtask = `Subtask da checklist da ficha "${tituloFicha || 'Ficha'}"`;
    const targetWsId = workspaceIdFicha || (workspaceId !== VIRTUAL_WORKSPACE_CONVIDADOS_ID ? workspaceId : null);

    let eventosExistentes = [];
    if (Array.isArray(eventosWorkspaceCache)) {
      eventosExistentes = eventosWorkspaceCache;
    } else {
      const promessas = [];
      if (targetWsId) promessas.push(buscarEventosTarefaWorkspace(targetWsId));
      if (prefixoEventId) {
        promessas.push(
          fetch(`${API_PROXY}?table=cr4a1_agenda_kairoses&$select=cr4a1_agenda_kairosid,cr4a1_event_id,cr4a1_titulo,cr4a1_data_inicio,cr4a1_detalhes&$filter=${q(`contains(cr4a1_event_id, '${prefixoEventId}')`)}`)
            .then(r => r.ok ? r.json() : { value: [] })
            .then(d => d.value || [])
            .catch(() => [])
        );
      }
      const resultados = await Promise.all(promessas);
      const mapaEvs = new Map();
      resultados.flat().forEach(ev => {
        if (ev?.cr4a1_agenda_kairosid && !mapaEvs.has(ev.cr4a1_agenda_kairosid)) {
          mapaEvs.set(ev.cr4a1_agenda_kairosid, ev);
        }
      });
      eventosExistentes = Array.from(mapaEvs.values());
    }

    const removerDaCache = (idApagado) => {
      const idx = eventosExistentes.findIndex(e => e.cr4a1_agenda_kairosid === idApagado);
      if (idx !== -1) eventosExistentes.splice(idx, 1);
    };

    if (!ativar) {
      const idsParaApagar = new Set(Object.values(mapaAtual).filter(Boolean));
      for (const ev of eventosExistentes) {
        const evId = ev.cr4a1_agenda_kairosid;
        if (!evId) continue;
        if (
          (prefixoEventId && String(ev.cr4a1_event_id || '').startsWith(prefixoEventId)) ||
          (ev.cr4a1_detalhes === detalheSubtask)
        ) {
          idsParaApagar.add(evId);
        }
      }
      for (const evId of idsParaApagar) {
        await apagar('cr4a1_agenda_kairoses', evId).catch(() => {});
        removerDaCache(evId);
      }
      return {};
    }

    const chavesAtivas = new Set();
    const idsMantidos = new Set();

    for (const t of tarefas) {
      const chave = String(t.index);
      const eventKey = prefixoEventId ? `${prefixoEventId}${chave}` : '';
      const diaLimpo = t.dataVencimento ? String(t.dataVencimento).slice(0, 10) : '';
      const tituloEvento = `${t.texto || 'Subtask'} (${tituloFicha || 'Ficha'})`;
      const evIdSalvo = mapaAtual[chave] || '';

      // Localiza TODOS os eventos existentes desta subtask (por ID salvo, por cr4a1_event_id determinístico ou duplicata legada)
      const matches = eventosExistentes.filter(ev => {
        if (!ev?.cr4a1_agenda_kairosid) return false;
        if (idsMantidos.has(ev.cr4a1_agenda_kairosid)) return false;
        if (evIdSalvo && ev.cr4a1_agenda_kairosid === evIdSalvo) return true;
        if (eventKey && ev.cr4a1_event_id === eventKey) return true;
        const tituloEvLimpo = (ev.cr4a1_titulo || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const tituloNovoLimpo = tituloEvento.trim().toLowerCase().replace(/\s+/g, ' ');
        const textoSubtaskLimpo = (t.texto || '').trim().toLowerCase().replace(/\s+/g, ' ');
        if (tituloEvLimpo === tituloNovoLimpo) return true;
        if (textoSubtaskLimpo && tituloEvLimpo.startsWith(textoSubtaskLimpo) && (ev.cr4a1_detalhes?.includes('Subtask da checklist') || ev.cr4a1_tipo === 'Tarefa')) return true;
        return false;
      });

      if (!diaLimpo) {
        for (const m of matches) {
          await apagar('cr4a1_agenda_kairoses', m.cr4a1_agenda_kairosid).catch(() => {});
          removerDaCache(m.cr4a1_agenda_kairosid);
        }
        if (evIdSalvo && !matches.some(m => m.cr4a1_agenda_kairosid === evIdSalvo)) {
          await apagar('cr4a1_agenda_kairoses', evIdSalvo).catch(() => {});
        }
        continue;
      }

      chavesAtivas.add(chave);
      const { inicioIso, fimIso, horaFim } = intervaloDoEvento(diaLimpo, horaPadrao || '08:00');
      const respEvento = t.responsavel || responsavelFicha || user;

      // Se houver duplicatas (ex.: de sincronizações anteriores), mantém a primeira e apaga todas as cópias extras!
      if (matches.length > 1) {
        for (const dup of matches.slice(1)) {
          await apagar('cr4a1_agenda_kairoses', dup.cr4a1_agenda_kairosid).catch(() => {});
          removerDaCache(dup.cr4a1_agenda_kairosid);
        }
      }

      const evPrincipalId = matches[0]?.cr4a1_agenda_kairosid || '';

      if (evPrincipalId) {
        const resPatch = await patch('cr4a1_agenda_kairoses', evPrincipalId, {
          ...(eventKey ? { cr4a1_event_id: eventKey } : {}),
          cr4a1_titulo: tituloEvento,
          cr4a1_user_login: respEvento,
          cr4a1_data_inicio: inicioIso,
          cr4a1_data_fim: fimIso,
          cr4a1_hora_inicio: horaPadrao || '08:00',
          cr4a1_hora_fim: horaFim,
          cr4a1_detalhes: detalheSubtask
        }).catch(() => null);
        if (resPatch && resPatch.ok) {
          novosIds[chave] = evPrincipalId;
          idsMantidos.add(evPrincipalId);
          if (matches[0]) {
            matches[0].cr4a1_event_id = eventKey || matches[0].cr4a1_event_id;
            matches[0].cr4a1_titulo = tituloEvento;
            matches[0].cr4a1_data_inicio = inicioIso;
          }
          continue;
        }
      }

      const resCriado = await post('cr4a1_agenda_kairoses', {
        cr4a1_event_id: eventKey || crypto.randomUUID(),
        cr4a1_titulo: tituloEvento,
        cr4a1_user_login: respEvento,
        cr4a1_data_inicio: inicioIso,
        cr4a1_data_fim: fimIso,
        cr4a1_hora_inicio: horaPadrao || '08:00',
        cr4a1_hora_fim: horaFim,
        cr4a1_tipo: 'Tarefa',
        cr4a1_detalhes: detalheSubtask,
        cr4a1_subtasks: '[]',
        cr4a1_privado: false,
        cr4a1_arquivos: '[]',
        cr4a1_workspace_id: targetWsId
      });
      if (resCriado.ok) {
        const criado = await resCriado.json();
        if (criado?.cr4a1_agenda_kairosid) {
          novosIds[chave] = criado.cr4a1_agenda_kairosid;
          idsMantidos.add(criado.cr4a1_agenda_kairosid);
          eventosExistentes.push({
            cr4a1_agenda_kairosid: criado.cr4a1_agenda_kairosid,
            cr4a1_event_id: eventKey || criado.cr4a1_event_id,
            cr4a1_titulo: tituloEvento,
            cr4a1_data_inicio: inicioIso,
            cr4a1_detalhes: detalheSubtask
          });
        }
      }
    }

    // Remove eventos órfãos ou duplicatas residuais de subtasks excluídas desta ficha
    for (const [chave, evId] of Object.entries(mapaAtual)) {
      if (!chavesAtivas.has(chave) && evId && !idsMantidos.has(evId)) {
        await apagar('cr4a1_agenda_kairoses', evId).catch(() => {});
        removerDaCache(evId);
      }
    }
    for (const ev of [...eventosExistentes]) {
      const evId = ev.cr4a1_agenda_kairosid;
      if (!evId || idsMantidos.has(evId)) continue;
      if (
        (prefixoEventId && String(ev.cr4a1_event_id || '').startsWith(prefixoEventId)) ||
        (ev.cr4a1_detalhes === detalheSubtask)
      ) {
        await apagar('cr4a1_agenda_kairoses', evId).catch(() => {});
        removerDaCache(evId);
      }
    }

    return novosIds;
  };

  // Sincronização opcional acionada pelo botão no cabeçalho de uma lista (prazos das fichas e/ou subtasks)
  const sincronizarListaComAgenda = async (lista, { fichas: syncFichas, subtasks: syncSubtasks }) => {
    try {
      const novoConfigLista = serializarConfigLista(lista.cr4a1_automacao, {
        syncAgenda: { fichas: Boolean(syncFichas), subtasks: Boolean(syncSubtasks) }
      });
      await patch('cr4a1_listas', lista.cr4a1_listaid, { cr4a1_automacao: novoConfigLista });

      const eventosWorkspaceCache = await buscarEventosTarefaWorkspace(workspaceId);
      const fichasDaColuna = fichasRef.current.filter(f => f.cr4a1_lista_id === lista.cr4a1_listaid && !ehFichaArquivada(f));
      let totalFichasSync = 0;
      let totalSubtasksSync = 0;

      for (const fichaBase of fichasDaColuna) {
        await executarComLockFicha(fichaBase.cr4a1_fichaid, async () => {
          const ficha = fichasRef.current.find(f => f.cr4a1_fichaid === fichaBase.cr4a1_fichaid) || fichaBase;
          const meta = parseFichaMeta(ficha.cr4a1_atividades);
          const tarefas = extrairTarefas(ficha.cr4a1_descricao);
          const dataIsoFicha = ficha.cr4a1_data_inicio;
          const dataObj = dataIsoFicha ? new Date(dataIsoFicha) : null;
          const dia = dataObj ? format(dataObj, 'yyyy-MM-dd') : '';
          const hora = dataObj ? format(dataObj, 'HH:mm') : '08:00';

          // 1. Prazo principal da ficha
          let eventoId = ficha.cr4a1_evento_id || '';
          const fichaEventKey = `ficha-${ficha.cr4a1_fichaid}`;
          if (!syncFichas && eventoId) {
            await apagar('cr4a1_agenda_kairoses', eventoId).catch(() => {});
            eventoId = '';
          } else if (syncFichas && dia) {
            const { inicioIso, fimIso, horaFim } = intervaloDoEvento(dia, hora);
            const evMatch = eventosWorkspaceCache.find(e =>
              (eventoId && e.cr4a1_agenda_kairosid === eventoId) || e.cr4a1_event_id === fichaEventKey
            );
            const idAlvo = evMatch?.cr4a1_agenda_kairosid || eventoId;
            if (idAlvo) {
              const targetWsLista = ficha.cr4a1_workspace_id || (workspaceId !== VIRTUAL_WORKSPACE_CONVIDADOS_ID ? workspaceId : null);
              const resP = await patch('cr4a1_agenda_kairoses', idAlvo, {
                cr4a1_event_id: fichaEventKey,
                cr4a1_titulo: ficha.cr4a1_titulo,
                cr4a1_user_login: ficha.cr4a1_responsavel_login || user,
                cr4a1_data_inicio: inicioIso,
                cr4a1_data_fim: fimIso,
                cr4a1_hora_inicio: hora,
                cr4a1_hora_fim: horaFim,
                cr4a1_privado: false,
                ...(targetWsLista ? { cr4a1_workspace_id: targetWsLista } : {})
              }).catch(() => null);
              eventoId = (resP && resP.ok) ? idAlvo : '';
            }
            if (!eventoId) {
              const resEv = await post('cr4a1_agenda_kairoses', {
                cr4a1_event_id: fichaEventKey,
                cr4a1_titulo: ficha.cr4a1_titulo,
                cr4a1_user_login: ficha.cr4a1_responsavel_login || user,
                cr4a1_data_inicio: inicioIso,
                cr4a1_data_fim: fimIso,
                cr4a1_hora_inicio: hora,
                cr4a1_hora_fim: horaFim,
                cr4a1_tipo: 'Tarefa',
                cr4a1_detalhes: htmlParaTexto(ficha.cr4a1_descricao),
                cr4a1_subtasks: '[]',
                cr4a1_privado: false,
                cr4a1_arquivos: '[]',
                cr4a1_workspace_id: ficha.cr4a1_workspace_id || (workspaceId !== VIRTUAL_WORKSPACE_CONVIDADOS_ID ? workspaceId : null)
              });
              if (resEv.ok) {
                const criado = await resEv.json();
                eventoId = criado?.cr4a1_agenda_kairosid || '';
              }
            }
            if (eventoId) totalFichasSync += 1;
          }

          // 2. Prazos das subtasks (checklists) — com deduplicação automática
          const novosSubtasksIds = await sincronizarEventosSubtasksFicha({
            fichaId: ficha.cr4a1_fichaid,
            tituloFicha: ficha.cr4a1_titulo,
            responsavelFicha: ficha.cr4a1_responsavel_login || user,
            horaPadrao: hora,
            tarefas,
            subtasksEventosIdsAtuais: meta.subtasksEventosIds || {},
            ativar: Boolean(syncSubtasks),
            eventosWorkspaceCache,
            workspaceIdFicha: ficha.cr4a1_workspace_id
          });
          totalSubtasksSync += Object.keys(novosSubtasksIds).length;

          const novasAtividades = atualizarFichaMeta(ficha.cr4a1_atividades, {
            sincronizarAgenda: Boolean(syncFichas && dia),
            sincronizarSubtasksAgenda: Boolean(syncSubtasks),
            subtasksEventosIds: novosSubtasksIds
          });

          await patch('cr4a1_fichas', ficha.cr4a1_fichaid, {
            cr4a1_evento_id: eventoId,
            cr4a1_atividades: novasAtividades
          });
          setFichas(prev => prev.map(item =>
            item.cr4a1_fichaid === ficha.cr4a1_fichaid
              ? { ...item, cr4a1_evento_id: eventoId, cr4a1_atividades: novasAtividades }
              : item
          ));
        });
      }

      recarregar();
      refreshEvents?.();
      if (!syncFichas && !syncSubtasks) {
        toast.success(`Sincronização desativada para "${lista.cr4a1_nome}". Eventos removidos da Agenda.`);
      } else {
        toast.success(`Lista "${lista.cr4a1_nome}" sincronizada: ${totalFichasSync} ficha(s) e ${totalSubtasksSync} subtask(s) na Agenda.`);
      }
    } catch (err) {
      console.error('[sincronizarListaComAgenda]', err);
      toast.error('Erro ao sincronizar lista com a Agenda.');
    }
  };

  const apagarLista = async (lista) => {
    const doLista = fichas.filter(f => f.cr4a1_lista_id === lista.cr4a1_listaid);
    const msg = doLista.length
      ? `Excluir a lista "${lista.cr4a1_nome}" e suas ${doLista.length} ficha(s)? (Os eventos já existentes na Agenda serão preservados.)`
      : `Excluir a lista "${lista.cr4a1_nome}"?`;
    if (!(await confirm(msg, { title: 'Excluir lista' }))) return;
    try {
      for (const f of doLista) {
        // Preserva os eventos na Agenda ao apagar uma lista no módulo de Fichas
        await apagar('cr4a1_fichas', f.cr4a1_fichaid);
      }
      await apagar('cr4a1_listas', lista.cr4a1_listaid);
      recarregar();
    } catch { toast.error('Erro ao excluir lista.'); }
  };

  // Convida uma pessoa de fora do workspace para ver SOMENTE uma ficha ou a LISTA inteira, notificando-a.
  const convidarExterno = async ({ login, escopo = 'ficha', ficha = null, lista = null }) => {
    const loginLimpo = String(login || '').trim();
    if (!loginLimpo) return;
    if (membrosBaseLoginsSet.has(loginLimpo.toLowerCase())) {
      toast('Esta pessoa já é membro do workspace.');
      return;
    }

    const wsNome = workspace?.cr4a1_nome || '';
    const listaAlvo = lista || listas.find(l => l.cr4a1_listaid === ficha?.cr4a1_lista_id);

    try {
      if (escopo === 'lista' && listaAlvo) {
        const atuais = parseListaConvidados(listaAlvo.cr4a1_automacao);
        const jaEsta = atuais.some(c => String(c).toLowerCase() === loginLimpo.toLowerCase());
        const novos = jaEsta ? atuais : [...atuais, loginLimpo];
        const inboxItem = await notificarConviteTrello({
          destinatario: loginLimpo,
          escopo: 'lista',
          listaNome: listaAlvo.cr4a1_nome || 'Lista',
          workspaceNome: wsNome,
          autor: user,
          currentUser: user,
          allUsers
        });
        const inboxAtual = parseListaNotificacoes(listaAlvo.cr4a1_automacao);
        const novoJson = serializarConfigLista(listaAlvo.cr4a1_automacao, {
          convidados: novos,
          notificacoesInbox: inboxItem ? [...inboxAtual, inboxItem] : inboxAtual
        });
        await patch('cr4a1_listas', listaAlvo.cr4a1_listaid, { cr4a1_automacao: novoJson });

        // Se estava convidado apenas na ficha individual, limpa duplicidade mantendo o acesso maior (lista inteira)
        if (ficha) {
          const metaF = parseFichaMeta(ficha.cr4a1_atividades);
          if ((metaF.convidados || []).some(c => String(c).toLowerCase() === loginLimpo.toLowerCase())) {
            const novasAtiv = atualizarFichaMeta(ficha.cr4a1_atividades, {
              convidados: (metaF.convidados || []).filter(c => String(c).toLowerCase() !== loginLimpo.toLowerCase())
            });
            await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_atividades: novasAtiv });
          }
        }
        recarregar();
      } else if (escopo === 'ficha' && ficha) {
        const metaF = parseFichaMeta(ficha.cr4a1_atividades);
        const atuais = metaF.convidados || [];
        const jaEsta = atuais.some(c => String(c).toLowerCase() === loginLimpo.toLowerCase());
        const novos = jaEsta ? atuais : [...atuais, loginLimpo];
        const inboxItem = await notificarConviteTrello({
          destinatario: loginLimpo,
          escopo: 'ficha',
          fichaTitulo: ficha.cr4a1_titulo || 'Ficha',
          listaNome: listaAlvo?.cr4a1_nome || '',
          workspaceNome: wsNome,
          autor: user,
          currentUser: user,
          allUsers
        });
        const inboxAtual = metaF.notificacoesInbox || [];
        const novasAtiv = registrarAtividade(
          ficha.cr4a1_atividades,
          'convidado',
          user,
          nomeDe(loginLimpo, allUsers),
          {
            convidados: novos,
            notificacoesInbox: inboxItem ? [...inboxAtual, inboxItem].slice(-30) : inboxAtual
          }
        );
        await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_atividades: novasAtiv });
        setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_atividades: novasAtiv } : f));
        setEditando(prev => {
          if (!prev || prev.original?.cr4a1_fichaid !== ficha.cr4a1_fichaid) return prev;
          return {
            original: { ...prev.original, cr4a1_atividades: novasAtiv },
            form: { ...prev.form, convidados: novos }
          };
        });
        recarregar();
      }
    } catch {
      toast.error('Erro ao convidar pessoa externa.');
    }
  };

  const removerConvidado = async ({ login, escopo = 'ficha', ficha = null, lista = null }) => {
    const loginLower = String(login || '').trim().toLowerCase();
    if (!loginLower) return;
    const listaAlvo = lista || listas.find(l => l.cr4a1_listaid === ficha?.cr4a1_lista_id);
    try {
      if (escopo === 'lista' && listaAlvo) {
        const restantes = parseListaConvidados(listaAlvo.cr4a1_automacao).filter(c => String(c).toLowerCase() !== loginLower);
        const novoJson = serializarConfigLista(listaAlvo.cr4a1_automacao, { convidados: restantes });
        await patch('cr4a1_listas', listaAlvo.cr4a1_listaid, { cr4a1_automacao: novoJson });
        toast.success('Convidado removido da lista.');
        recarregar();
      } else if (escopo === 'ficha' && ficha) {
        const metaF = parseFichaMeta(ficha.cr4a1_atividades);
        const restantes = (metaF.convidados || []).filter(c => String(c).toLowerCase() !== loginLower);
        const novasAtiv = atualizarFichaMeta(ficha.cr4a1_atividades, { convidados: restantes });
        await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_atividades: novasAtiv });
        setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_atividades: novasAtiv } : f));
        setEditando(prev => {
          if (!prev || prev.original?.cr4a1_fichaid !== ficha.cr4a1_fichaid) return prev;
          return {
            original: { ...prev.original, cr4a1_atividades: novasAtiv },
            form: { ...prev.form, convidados: restantes }
          };
        });
        toast.success('Convidado removido da ficha.');
        recarregar();
      }
    } catch {
      toast.error('Erro ao remover convidado.');
    }
  };

  const salvarConvidadosDaLista = async (lista, novosConvidados) => {
    try {
      const anteriores = new Set(parseListaConvidados(lista.cr4a1_automacao).map(c => String(c).toLowerCase()));
      const filtrados = novosConvidados.filter(c => !membrosBaseLoginsSet.has(String(c).toLowerCase()));
      const recemAdicionados = filtrados.filter(c => !anteriores.has(String(c).toLowerCase()));
      const inboxAtual = parseListaNotificacoes(lista.cr4a1_automacao);
      const novosInbox = [...inboxAtual];

      for (const novoLogin of recemAdicionados) {
        const inboxItem = await notificarConviteTrello({
          destinatario: novoLogin,
          escopo: 'lista',
          listaNome: lista.cr4a1_nome || 'Lista',
          workspaceNome: workspace?.cr4a1_nome || '',
          autor: user,
          currentUser: user,
          allUsers
        });
        if (inboxItem) novosInbox.push(inboxItem);
      }

      const novoJson = serializarConfigLista(lista.cr4a1_automacao, {
        convidados: filtrados,
        notificacoesInbox: novosInbox
      });
      await patch('cr4a1_listas', lista.cr4a1_listaid, { cr4a1_automacao: novoJson });
      setListaConvidados(null);
      recarregar();
    } catch {
      toast.error('Erro ao atualizar convidados da lista.');
    }
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
      await exportarQuadroXlsx(listasVisiveis, fichas, etiquetas, allUsers, workspace?.cr4a1_nome);
    } catch { toast.error('Erro ao exportar o quadro.'); }
  };

  const salvarComoModelo = async (nome) => {
    if (listasVisiveis.length === 0) { toast.error('Este quadro ainda não tem listas pra salvar como modelo.'); return; }
    try {
      const estrutura = listasVisiveis.map(l => ({ nome: l.cr4a1_nome, pessoal: l.cr4a1_pessoal === 'Sim' }));
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

    // Limpa o rascunho de imediato para permitir digitação contínua estilo Trello
    setNovaFichaPorLista(prev => ({ ...prev, [lista.cr4a1_listaid]: '' }));

    // Card temporário para aparecer instantaneamente na lista sem delay de rede
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fichaOtimista = {
      cr4a1_fichaid: tempId,
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
    };
    setFichas(prev => [...prev, fichaOtimista]);

    try {
      const resCriada = await post('cr4a1_fichas', {
        cr4a1_titulo: titulo,
        cr4a1_lista_id: lista.cr4a1_listaid,
        cr4a1_workspace_id: workspaceId,
        cr4a1_responsavel_login: user,
        cr4a1_criador_login: user,
        cr4a1_ordem: fichaOtimista.cr4a1_ordem,
        cr4a1_concluida: 'Não',
        cr4a1_notificado: 'Sim',
        cr4a1_etiquetas: '',
        cr4a1_fixada: 'Não',
        cr4a1_atividades: fichaOtimista.cr4a1_atividades
      });
      const criada = await resCriada.json();
      setFichas(prev => prev.map(f => f.cr4a1_fichaid === tempId ? { ...f, ...criada } : f));
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
      recarregar();
      await executarAutomacoes(criada, lista.cr4a1_listaid, 'criada');
    } catch {
      setFichas(prev => prev.filter(f => f.cr4a1_fichaid !== tempId));
      toast.error('Erro ao criar ficha.');
    }
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

  // Notifica os observadores ("Seguindo ficha") e co-responsáveis sobre atualizações na ficha
  const notificarObservadoresECoResponsaveis = async (fichaAtual, descricaoAcao) => {
    const meta = parseFichaMeta(fichaAtual.cr4a1_atividades);
    const alvos = [...new Set([...(meta.observadores || []), ...(meta.coResponsaveis || [])])]
      .map(l => String(l).trim().toLowerCase())
      .filter(l => l && l !== (user || '').toLowerCase());
    if (alvos.length === 0) return;

    const wsNome = todasOpcoes.find(w => w.cr4a1_calendarios_workspacesid === workspaceId)?.cr4a1_nome || '';
    const listaNome = listas.find(l => l.cr4a1_listaid === fichaAtual.cr4a1_lista_id)?.cr4a1_nome || '';
    const autorNome = nomeDe(user, allUsers);

    for (const login of alvos) {
      const info = await resolverInfoDestinatarioCredenciais(login, allUsers);
      const pushTitle = `🔔 Ficha atualizada: ${fichaAtual.cr4a1_titulo}`;
      const pushBody = `${autorNome} ${descricaoAcao} na ficha "${fichaAtual.cr4a1_titulo}".`;
      const pushTag = `watch-${fichaAtual.cr4a1_fichaid}-${Date.now()}`;

      salvarNotificacaoNoApp({
        destinatario: info.username,
        tipo: 'compartilhamento',
        titulo: `Atualização em Ficha Seguida`,
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

      if (info.email) {
        enviarAlertaEmail({
          usuarios: [info.username],
          destinatarios: [info.email],
          tipo: 'compartilhamento',
          titulo: `🔔 Atualização na ficha "${fichaAtual.cr4a1_titulo}"`,
          mensagem: `<strong>${autorNome}</strong> ${descricaoAcao} na ficha <strong>"${fichaAtual.cr4a1_titulo}"</strong> que você acompanha.`,
          autor: autorNome,
          detalhes: {
            origem: 'Ficha Seguida / Co-responsável (Trello)',
            itemTitulo: fichaAtual.cr4a1_titulo,
            workspace: wsNome,
            lista: listaNome
          }
        });
      }
    }
  };

  // Duplica uma ficha imediatamente com 1 clique
  const duplicarFicha = async (ficha, destinoListaId) => {
    const listaAlvo = destinoListaId || ficha.cr4a1_lista_id;
    const metaAtual = parseFichaMeta(ficha.cr4a1_atividades);
    const atividadesNova = registrarAtividade(null, 'duplicada', user, '', {
      ...metaAtual,
      ehModelo: false,
      tempoGastoMin: 0,
      cronometroInicio: null
    });
    try {
      await post('cr4a1_fichas', {
        cr4a1_titulo: `${ficha.cr4a1_titulo} (Cópia)`,
        cr4a1_descricao: ficha.cr4a1_descricao || '',
        cr4a1_lista_id: listaAlvo,
        cr4a1_workspace_id: ficha.cr4a1_workspace_id || workspaceId,
        cr4a1_responsavel_login: ficha.cr4a1_responsavel_login || user,
        cr4a1_criador_login: user,
        cr4a1_ordem: fichas.filter(f => f.cr4a1_lista_id === listaAlvo).length,
        cr4a1_data_inicio: ficha.cr4a1_data_inicio || null,
        cr4a1_concluida: 'Não',
        cr4a1_notificado: 'Sim',
        cr4a1_etiquetas: ficha.cr4a1_etiquetas || '',
        cr4a1_arquivos: ficha.cr4a1_arquivos || '[]',
        cr4a1_cor: ficha.cr4a1_cor || '',
        cr4a1_stickers: ficha.cr4a1_stickers || '',
        cr4a1_recorrencia: ficha.cr4a1_recorrencia || '',
        cr4a1_fixada: 'Não',
        cr4a1_atividades: atividadesNova
      });
      setEditando(null);
      recarregar();
      toast.success('Ficha duplicada com sucesso!');
    } catch {
      toast.error('Erro ao duplicar ficha.');
    }
  };

  // Cria uma nova ficha em qualquer lista a partir de uma Ficha Modelo
  const criarFichaAPartirDeModelo = async (modeloFicha, listaDestinoId) => {
    const metaModelo = parseFichaMeta(modeloFicha.cr4a1_atividades);
    const atividadesNova = registrarAtividade(null, 'criada', user, `a partir do modelo "${modeloFicha.cr4a1_titulo}"`, {
      ...metaModelo,
      ehModelo: false,
      tempoGastoMin: 0,
      cronometroInicio: null
    });
    try {
      const resCriada = await post('cr4a1_fichas', {
        cr4a1_titulo: modeloFicha.cr4a1_titulo,
        cr4a1_descricao: marcarTodasTarefas(modeloFicha.cr4a1_descricao || '', false),
        cr4a1_lista_id: listaDestinoId,
        cr4a1_workspace_id: workspaceId,
        cr4a1_responsavel_login: modeloFicha.cr4a1_responsavel_login || user,
        cr4a1_criador_login: user,
        cr4a1_ordem: fichas.filter(f => f.cr4a1_lista_id === listaDestinoId).length,
        cr4a1_concluida: 'Não',
        cr4a1_notificado: 'Sim',
        cr4a1_etiquetas: modeloFicha.cr4a1_etiquetas || '',
        cr4a1_arquivos: modeloFicha.cr4a1_arquivos || '[]',
        cr4a1_cor: modeloFicha.cr4a1_cor || '',
        cr4a1_stickers: modeloFicha.cr4a1_stickers || '',
        cr4a1_recorrencia: modeloFicha.cr4a1_recorrencia || '',
        cr4a1_fixada: 'Não',
        cr4a1_atividades: atividadesNova
      });
      const criada = await resCriada.json();
      recarregar();
      await executarAutomacoes(criada, listaDestinoId, 'criada');
      toast.success(`Ficha criada a partir do modelo "${modeloFicha.cr4a1_titulo}"!`);
    } catch {
      toast.error('Erro ao criar ficha a partir do modelo.');
    }
  };

  // Seguir / Parar de seguir ficha (Observador)
  const alternarSeguirFicha = async (ficha) => {
    const meta = parseFichaMeta(ficha.cr4a1_atividades);
    const jaSegue = (meta.observadores || []).includes(user);
    const novosObs = jaSegue
      ? meta.observadores.filter(u => u !== user)
      : [...(meta.observadores || []), user];
    const novoAtividades = atualizarFichaMeta(ficha.cr4a1_atividades, { observadores: novosObs });
    setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_atividades: novoAtividades } : f));
    setEditando(prev => (prev && prev.original.cr4a1_fichaid === ficha.cr4a1_fichaid)
      ? {
        ...prev,
        original: { ...prev.original, cr4a1_atividades: novoAtividades },
        form: { ...prev.form, observadores: novosObs }
      }
      : prev);
    try {
      await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_atividades: novoAtividades });
      toast.success(jaSegue ? 'Você deixou de seguir esta ficha.' : 'Você agora está seguindo esta ficha 🔔');
    } catch {
      toast.error('Erro ao atualizar acompanhamento da ficha.');
    }
  };

  // Play / Pause do cronômetro de tempo da ficha
  const alternarCronometroFicha = async (ficha) => {
    const meta = parseFichaMeta(ficha.cr4a1_atividades);
    let patchMeta;
    if (meta.cronometroInicio) {
      const totalAcumulado = calcularTempoTotalMin(meta);
      patchMeta = { tempoGastoMin: totalAcumulado, cronometroInicio: null };
    } else {
      patchMeta = { cronometroInicio: new Date().toISOString() };
    }
    const novoAtividades = atualizarFichaMeta(ficha.cr4a1_atividades, patchMeta);
    setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_atividades: novoAtividades } : f));
    setEditando(prev => (prev && prev.original.cr4a1_fichaid === ficha.cr4a1_fichaid)
      ? {
        ...prev,
        original: { ...prev.original, cr4a1_atividades: novoAtividades },
        form: { ...prev.form, ...patchMeta }
      }
      : prev);
    try {
      await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_atividades: novoAtividades });
      toast.success(patchMeta.cronometroInicio ? 'Cronômetro iniciado ⏱️' : 'Cronômetro pausado e tempo registrado!');
    } catch {
      toast.error('Erro ao atualizar cronômetro.');
    }
  };

  // Atualiza rapidamente metadados da ficha (ex.: prioridade no menu rápido ou na tabela)
  const atualizarMetaRapidoFicha = async (ficha, patchMeta) => {
    const novoAtividades = atualizarFichaMeta(ficha.cr4a1_atividades, patchMeta);
    setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_atividades: novoAtividades } : f));
    try {
      await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_atividades: novoAtividades });
    } catch {
      toast.error('Erro ao atualizar ficha.');
    }
  };

  // Move ficha rapidamente de lista (pela tabela ou menu rápido do cartão)
  const moverFichaRapido = async (ficha, novaListaId) => {
    if (!novaListaId || novaListaId === ficha.cr4a1_lista_id) return;
    const nomeLista = listas.find(l => l.cr4a1_listaid === novaListaId)?.cr4a1_nome || '';
    const atividades = registrarAtividade(ficha.cr4a1_atividades, 'movida', user, nomeLista);
    setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_lista_id: novaListaId, cr4a1_atividades: atividades } : f));
    try {
      await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_lista_id: novaListaId, cr4a1_atividades: atividades });
      await executarAutomacoes({ ...ficha, cr4a1_lista_id: novaListaId, cr4a1_atividades: atividades }, novaListaId, 'entrou');
      notificarObservadoresECoResponsaveis({ ...ficha, cr4a1_lista_id: novaListaId }, `moveu a ficha para a lista "${nomeLista}"`);
    } catch {
      toast.error('Erro ao mover ficha.');
    }
  };

  // Altera o responsável principal rapidamente (pela tabela ou menu rápido do cartão)
  const mudarResponsavelRapido = async (ficha, novoLogin) => {
    if (!novoLogin || novoLogin === ficha.cr4a1_responsavel_login) return;
    const atividades = registrarAtividade(ficha.cr4a1_atividades, 'responsavel', user, nomeDe(novoLogin, allUsers));
    setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_responsavel_login: novoLogin, cr4a1_atividades: atividades } : f));
    try {
      await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_responsavel_login: novoLogin, cr4a1_atividades: atividades });
      if (novoLogin !== user) {
        notificarCompartilhamento({
          tipoItem: 'Ficha do Trello',
          itemTitulo: ficha.cr4a1_titulo,
          autor: user,
          destinatarios: [novoLogin],
          currentUser: user,
          allUsers,
          detalhes: {
            origem: 'Trello',
            workspace: workspace?.cr4a1_nome || '',
            lista: listas.find(l => l.cr4a1_listaid === ficha.cr4a1_lista_id)?.cr4a1_nome || ''
          }
        });
      }
      await executarAutomacoes({ ...ficha, cr4a1_responsavel_login: novoLogin, cr4a1_atividades: atividades }, ficha.cr4a1_lista_id, 'responsavel_atribuido');
    } catch {
      toast.error('Erro ao alterar responsável.');
    }
  };

  // Salva a ficha e mantém o evento da agenda em sintonia com a data escolhida (serializado por fichaId para evitar duplicação).
  const salvarFicha = async (form, originalBase, options = {}) => executarComLockFicha(originalBase?.cr4a1_fichaid, async () => {
    const original = fichasRef.current.find(f => f.cr4a1_fichaid === originalBase?.cr4a1_fichaid) || originalBase;
    const isAutosave = Boolean(options.autosave);
    const manterAberto = Boolean(options.manterAberto);
    const tarefasDaDescricao = extrairTarefas(form.descricao);
    const tarefasOriginais = extrairTarefas(original?.cr4a1_descricao || '');
    const metaOriginal = parseFichaMeta(original.cr4a1_atividades);

    const dataDefinida = !!form.dia;
    const dataIso = dataDefinida ? new Date(`${form.dia}T${form.hora || '08:00'}:00`).toISOString() : null;
    const responsavelMudou = form.responsavel !== original.cr4a1_responsavel_login;
    const dataMudou = (dataIso || '') !== (original.cr4a1_data_inicio || '');
    const avisar = !isAutosave && dataDefinida && (form.notificarSistema !== false) && (!comData(original) || responsavelMudou || dataMudou);

    // Convidados externos: remove automaticamente quem já virou membro do workspace (sem perder nada nas fichas!)
    const convidadosLimpos = (Array.isArray(form.convidados) ? form.convidados : metaOriginal.convidados || [])
      .filter(c => c && !membrosBaseLoginsSet.has(String(c).toLowerCase()));

    const notificacoesInboxAtual = Array.isArray(metaOriginal.notificacoesInbox) ? [...metaOriginal.notificacoesInbox] : [];
    const lembretesSubtasksEnviadosAtual = Array.isArray(metaOriginal.lembretesSubtasksEnviados) ? [...metaOriginal.lembretesSubtasksEnviados] : [];

    // Ao salvar (não no autosave de digitação), notifica responsáveis recém-atribuídos em subtarefas da checklist
    if (!isAutosave && tarefasDaDescricao.length > 0) {
      const wsNome = todasOpcoes.find(w => w.cr4a1_calendarios_workspacesid === workspaceId)?.cr4a1_nome || '';
      const listaNome = listas.find(l => l.cr4a1_listaid === form.listaId)?.cr4a1_nome || '';
      for (const t of tarefasDaDescricao) {
        if (!t.responsavel || t.concluida) continue;
        const antigaMesmaPos = tarefasOriginais[t.index];
        const antigaMesmoTexto = tarefasOriginais.find(x => x.texto === t.texto);
        const refAntiga = (antigaMesmaPos && antigaMesmaPos.texto === t.texto) ? antigaMesmaPos : antigaMesmoTexto;
        const respMudou = !refAntiga || String(refAntiga.responsavel || '').toLowerCase() !== String(t.responsavel).toLowerCase();
        if (respMudou) {
          const inboxItem = await notificarSubtaskAtribuida({
            destinatario: t.responsavel,
            subtaskTexto: t.texto,
            fichaTitulo: form.titulo || original?.cr4a1_titulo || 'Ficha',
            dataVencimento: t.dataVencimento || form.dia || '',
            lembreteHoras: t.lembreteHoras || '',
            autor: user,
            currentUser: user,
            workspaceNome: wsNome,
            listaNome,
            allUsers
          });
          if (inboxItem) notificacoesInboxAtual.push(inboxItem);
        }
      }
    }

    const novoMeta = {
      coResponsaveis: form.coResponsaveis || [],
      observadores: form.observadores || [],
      prioridade: form.prioridade || '',
      custo: form.custo || '',
      linkUrl: form.linkUrl || '',
      statusAprovacao: form.statusAprovacao || '',
      campoTexto: form.campoTexto || '',
      capaModo: form.capaModo || 'inteiro',
      capaImagemIndex: form.capaImagemIndex ?? 0,
      dataInicioTrabalho: form.dataInicioTrabalho || '',
      ehModelo: !!form.ehModelo,
      tempoEstimadoMin: Number(form.tempoEstimadoMin) || 0,
      tempoGastoMin: Number(form.tempoGastoMin) || 0,
      cronometroInicio: form.cronometroInicio || null,
      notasIds: Array.isArray(form.notasIds) ? form.notasIds : [],
      dependenciasFichasIds: Array.isArray(form.dependenciasFichasIds) ? form.dependenciasFichasIds : [],
      sincronizarAgenda: Boolean(form.sincronizarAgenda),
      sincronizarSubtasksAgenda: Boolean(form.sincronizarSubtasksAgenda),
      subtasksEventosIds: metaOriginal.subtasksEventosIds || {},
      notificarSistema: form.notificarSistema !== false,
      notificarEmail: Boolean(form.notificarEmail),
      convidados: convidadosLimpos,
      lembretesSubtasksEnviados: lembretesSubtasksEnviadosAtual,
      notificacoesInbox: notificacoesInboxAtual.slice(-30)
    };

    // Avalia progresso combinado e dependências
    const fichaSimulada = {
      ...original,
      cr4a1_descricao: form.descricao || '',
      cr4a1_atividades: atualizarFichaMeta(original.cr4a1_atividades, novoMeta),
      cr4a1_concluida: form.concluida ? 'Sim' : 'Não'
    };
    const infoProgresso = calcularProgressoFicha(fichaSimulada, fichas);

    let concluidaFinal = form.concluida;
    if (tarefasDaDescricao.length > 0) {
      concluidaFinal = tarefasDaDescricao.every(t => t.concluida);
    }
    if (infoProgresso.temDependencias) {
      if (!infoProgresso.podeConcluir) {
        concluidaFinal = false;
        if (!isAutosave && form.concluida) {
          toast.error(`Esta ficha depende de ${infoProgresso.depsTotal - infoProgresso.depsConcluidas} outra(s) ficha(s) pendente(s). Conclua as dependências primeiro!`);
        }
      } else if (!infoProgresso.temTarefasProprias && infoProgresso.podeConcluir) {
        concluidaFinal = true;
      }
    }

    // Registra no histórico só as mudanças que importam pra quem acompanha a ficha (não cada
    // tecla digitada no título/descrição).
    const listaMudou = form.listaId !== original.cr4a1_lista_id;
    const concluidaMudou = concluidaFinal !== (original.cr4a1_concluida === 'Sim');
    let atividades = atualizarFichaMeta(original.cr4a1_atividades, novoMeta);
    if (listaMudou) {
      const nomeLista = listas.find(l => l.cr4a1_listaid === form.listaId)?.cr4a1_nome || '';
      atividades = registrarAtividade(atividades, 'movida', user, nomeLista, novoMeta);
    }
    if (responsavelMudou) atividades = registrarAtividade(atividades, 'responsavel', user, nomeDe(form.responsavel, allUsers), novoMeta);
    if (concluidaMudou) atividades = registrarAtividade(atividades, concluidaFinal ? 'concluida' : 'reaberta', user, '', novoMeta);

    let eventoId = original.cr4a1_evento_id || '';
    try {
      // Sincronização com o Calendário da Agenda é 100% OPCIONAL (conforme solicitado pelo usuário)
      const deveSincronizarAgenda = Boolean(form.sincronizarAgenda);

      if ((!dataDefinida || !deveSincronizarAgenda) && eventoId) {
        await apagar('cr4a1_agenda_kairoses', eventoId);
        eventoId = '';
      } else if (dataDefinida && deveSincronizarAgenda) {
        const { inicioIso, fimIso, horaFim } = intervaloDoEvento(form.dia, form.hora || '08:00');
        const targetWsFicha = original.cr4a1_workspace_id || (workspaceId !== VIRTUAL_WORKSPACE_CONVIDADOS_ID ? workspaceId : null);
        let patchOk = false;
        if (eventoId) {
          const resPatchEv = await patch('cr4a1_agenda_kairoses', eventoId, {
            cr4a1_titulo: form.titulo,
            cr4a1_user_login: form.responsavel,
            cr4a1_data_inicio: inicioIso,
            cr4a1_data_fim: fimIso,
            cr4a1_hora_inicio: form.hora || '08:00',
            cr4a1_hora_fim: horaFim,
            cr4a1_privado: false,
            ...(targetWsFicha ? { cr4a1_workspace_id: targetWsFicha } : {})
          }).catch(() => null);
          patchOk = Boolean(resPatchEv && resPatchEv.ok);
          if (!patchOk) eventoId = '';
        }
        if (!patchOk) {
          const fichaEventKey = `ficha-${original.cr4a1_fichaid}`;
          let idExistente = null;
          try {
            const resBusca = await fetch(`${API_PROXY}?table=cr4a1_agenda_kairoses&$select=cr4a1_agenda_kairosid&$filter=${q(`cr4a1_event_id eq '${fichaEventKey}'`)}`);
            if (resBusca.ok) {
              const dataBusca = await resBusca.json();
              if (dataBusca.value && dataBusca.value.length > 0) {
                idExistente = dataBusca.value[0].cr4a1_agenda_kairosid;
              }
            }
          } catch {}

          if (idExistente) {
            await patch('cr4a1_agenda_kairoses', idExistente, {
              cr4a1_titulo: form.titulo,
              cr4a1_user_login: form.responsavel,
              cr4a1_data_inicio: inicioIso,
              cr4a1_data_fim: fimIso,
              cr4a1_hora_inicio: form.hora || '08:00',
              cr4a1_hora_fim: horaFim,
              cr4a1_detalhes: htmlParaTexto(form.descricao),
              cr4a1_privado: false,
              cr4a1_workspace_id: targetWsFicha
            });
            eventoId = idExistente;
          } else {
            const resCriado = await post('cr4a1_agenda_kairoses', {
              cr4a1_event_id: fichaEventKey,
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
              cr4a1_workspace_id: targetWsFicha
            });
            const criado = await resCriado.json();
            eventoId = criado.cr4a1_agenda_kairosid;
          }
        }
      }

      // Sincronização opcional das subtasks (checklists) com prazo para o Calendário da Agenda
      const deveSincronizarSubtasks = Boolean(form.sincronizarSubtasksAgenda);
      const novosSubtasksEventosIds = await sincronizarEventosSubtasksFicha({
        fichaId: original.cr4a1_fichaid,
        tituloFicha: form.titulo || original.cr4a1_titulo,
        responsavelFicha: form.responsavel || user,
        horaPadrao: form.hora || '08:00',
        tarefas: tarefasDaDescricao,
        subtasksEventosIdsAtuais: metaOriginal.subtasksEventosIds || {},
        ativar: deveSincronizarSubtasks,
        workspaceIdFicha: original.cr4a1_workspace_id
      });
      novoMeta.subtasksEventosIds = novosSubtasksEventosIds;
      atividades = atualizarFichaMeta(atividades, {
        sincronizarSubtasksAgenda: deveSincronizarSubtasks,
        subtasksEventosIds: novosSubtasksEventosIds
      });

      if (!isAutosave) {
        // Notificações opcionais no sistema e no e-mail (conforme solicitado pelo usuário)
        const enviarSistema = form.notificarSistema !== false;
        const enviarEmail = Boolean(form.notificarEmail);

        if (enviarSistema || enviarEmail) {
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
            lista: listas.find(l => l.cr4a1_listaid === form.listaId)?.cr4a1_nome || '',
            enviarSistema,
            enviarEmail
          });

          // Notifica novo responsável e novos co-responsáveis atribuídos à ficha
          const metaAntigo = parseFichaMeta(original.cr4a1_atividades);
          const novosCoResp = (form.coResponsaveis || []).filter(c => !(metaAntigo.coResponsaveis || []).includes(c) && c !== user);
          const destinatariosAtribuicao = [
            ...(form.responsavel && form.responsavel !== original.cr4a1_responsavel_login && form.responsavel !== user ? [form.responsavel] : []),
            ...novosCoResp
          ];
          if (destinatariosAtribuicao.length > 0) {
            notificarCompartilhamento({
              tipoItem: 'Ficha do Trello',
              itemTitulo: form.titulo || original.cr4a1_titulo,
              autor: user,
              destinatarios: [...new Set(destinatariosAtribuicao)],
              currentUser: user,
              allUsers,
              detalhes: {
                origem: 'Trello',
                workspace: todasOpcoes.find(w => w.cr4a1_calendarios_workspacesid === workspaceId)?.cr4a1_nome || '',
                lista: listas.find(l => l.cr4a1_listaid === form.listaId)?.cr4a1_nome || '',
                dataHora: form.dia ? `${form.dia} ${form.hora || ''}` : ''
              },
              enviarSistema,
              enviarEmail
            });
          }
        }
      } // fim do if (!isAutosave)

      const anexosParaSalvar = (form.anexos || []).map(a => {
        if (a && a.annotationId) {
          return {
            id: a.id || a.annotationId,
            annotationId: a.annotationId,
            name: a.name,
            size: a.size,
            type: a.type,
            thumbnail: a.thumbnail || (a.type?.startsWith('image/') && a.base64 && a.base64.length < 40000 ? a.base64 : undefined)
          };
        }
        return a;
      });

      await patch('cr4a1_fichas', original.cr4a1_fichaid, {
        cr4a1_titulo: form.titulo,
        cr4a1_descricao: form.descricao || '',
        cr4a1_lista_id: form.listaId,
        cr4a1_responsavel_login: form.responsavel,
        cr4a1_data_inicio: dataIso,
        cr4a1_evento_id: eventoId,
        cr4a1_concluida: concluidaFinal ? 'Sim' : 'Não',
        cr4a1_etiquetas: joinAssignees(form.etiquetas),
        cr4a1_arquivos: JSON.stringify(anexosParaSalvar),
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

      const fichaPosSave = {
        ...original,
        cr4a1_titulo: form.titulo,
        cr4a1_descricao: form.descricao || '',
        cr4a1_lista_id: form.listaId,
        cr4a1_responsavel_login: form.responsavel,
        cr4a1_data_inicio: dataIso,
        cr4a1_etiquetas: joinAssignees(form.etiquetas),
        cr4a1_concluida: concluidaFinal ? 'Sim' : 'Não',
        cr4a1_arquivos: JSON.stringify(anexosParaSalvar),
        cr4a1_cor: form.cor || '',
        cr4a1_atividades: atividades
      };
      if (listaMudou) {
        await executarAutomacoes(fichaPosSave, form.listaId, 'entrou');
        notificarObservadoresECoResponsaveis(fichaPosSave, `moveu a ficha para "${listas.find(l => l.cr4a1_listaid === form.listaId)?.cr4a1_nome || ''}"`);
      }
      if (concluidaMudou && concluidaFinal) {
        await executarAutomacoes(fichaPosSave, form.listaId, 'concluida');
        notificarObservadoresECoResponsaveis(fichaPosSave, 'marcou a ficha como concluída');
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

      if (isAutosave || manterAberto) {
        const fichaComEvento = { ...fichaPosSave, cr4a1_evento_id: eventoId };
        setEditando(prev => (prev && prev.original.cr4a1_fichaid === original.cr4a1_fichaid ? { ...prev, original: fichaComEvento, ...(manterAberto ? { form } : {}) } : prev));
        setFichas(prev => prev.map(f => f.cr4a1_fichaid === original.cr4a1_fichaid ? fichaComEvento : f));
        if (manterAberto) {
          refreshEvents?.();
          toast.success(options.toastMensagem || 'Ficha atualizada.');
        }
        return fichaComEvento;
      }

      setEditando(null);
      recarregar();
      refreshEvents?.();
      toast.success('Ficha salva.');
    } catch {
      toast.error('Erro ao salvar ficha.');
    }
  });

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
    const meta = parseFichaMeta(ficha.cr4a1_atividades);
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
        recorrencia: ficha.cr4a1_recorrencia || '',
        ...meta,
        notasIds: Array.isArray(meta.notasIds) ? meta.notasIds : [],
        dependenciasFichasIds: Array.isArray(meta.dependenciasFichasIds) ? meta.dependenciasFichasIds : [],
        sincronizarAgenda: meta.sincronizarAgenda ?? Boolean(ficha.cr4a1_evento_id),
        sincronizarSubtasksAgenda: Boolean(meta.sincronizarSubtasksAgenda),
        notificarSistema: meta.notificarSistema !== false,
        notificarEmail: Boolean(meta.notificarEmail),
        convidados: (Array.isArray(meta.convidados) ? meta.convidados : []).filter(c => !membrosBaseLoginsSet.has(String(c).toLowerCase()))
      }
    });
  };

  // Se receber fichaIdParaAbrir externamente (ex.: clicado a partir de uma Nota)
  useEffect(() => {
    if (!fichaIdParaAbrir) return;
    const local = fichas.find(f => f.cr4a1_fichaid === fichaIdParaAbrir);
    if (local) {
      abrirFicha(local);
      onLimparFichaIdParaAbrir?.();
      return;
    }
    fetch(`${API_PROXY}?table=cr4a1_fichas&$filter=cr4a1_fichaid eq '${fichaIdParaAbrir}'`)
      .then(r => r.json())
      .then(res => {
        const encontrada = res.value?.[0];
        if (encontrada) {
          if (encontrada.cr4a1_workspace_id && encontrada.cr4a1_workspace_id !== workspaceId) {
            setWorkspaceId(encontrada.cr4a1_workspace_id);
          }
          abrirFicha(encontrada);
          onLimparFichaIdParaAbrir?.();
        }
      })
      .catch(() => {});
  }, [fichaIdParaAbrir, fichas, workspaceId, onLimparFichaIdParaAbrir]);

  // Abre uma ficha que pertence a outro workspace (vindo de "Minhas fichas") — precisa trocar
  // o quadro ativo antes, já que salvarFicha grava novos eventos vinculados usando o
  // workspaceId que estiver ativo no momento do save.
  const abrirFichaDeOutroWorkspace = (ficha) => {
    setWorkspaceId(ficha.cr4a1_workspace_id);
    setMinhasFichasAberto(false);
    abrirFicha(ficha);
  };

  // Colaboradores e Workspaces vinculados do quadro (além dos membros do workspace)
  const salvarColaboradoresEWorkspaces = async (novosLogins, novosWsIds, eventoRegistro = null) => {
    const itens = [
      ...novosLogins.filter(l => !l.startsWith('ws:')),
      ...novosWsIds.map(id => id.startsWith('ws:') ? id : `ws:${id}`)
    ];
    const valorColaboradores = joinAssignees(itens);
    const novoHistorico = eventoRegistro
      ? [
          {
            id: crypto.randomUUID(),
            ...eventoRegistro,
            ator: user,
            timestamp: new Date().toISOString()
          },
          ...historicoCompartilhamento
        ].slice(0, 100)
      : historicoCompartilhamento;
    const historicoJson = JSON.stringify(novoHistorico);

    const corpo = {
      cr4a1_nome: workspace?.cr4a1_nome || workspaceId,
      cr4a1_workspace_id: workspaceId,
      cr4a1_criador_login: workspace?.cr4a1_criador_login || user,
      cr4a1_colaboradores: valorColaboradores,
      cr4a1_historico_compartilhamento: historicoJson
    };
    try {
      if (quadro?.cr4a1_quadroid) {
        await patch('cr4a1_quadros', quadro.cr4a1_quadroid, {
          cr4a1_colaboradores: valorColaboradores,
          cr4a1_historico_compartilhamento: historicoJson
        });
      } else {
        await post('cr4a1_quadros', corpo);
      }
      recarregar();
    } catch { toast.error('Erro ao atualizar compartilhamento.'); }
  };
  const adicionarColaborador = (login) => {
    salvarColaboradoresEWorkspaces(
      [...colaboradoresLogins, login],
      workspacesVinculadosIds,
      { tipo: 'add_user', alvo: login, alvoNome: nomeDe(login, allUsers) }
    );
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
  const removerColaborador = (login) => salvarColaboradoresEWorkspaces(
    colaboradoresLogins.filter(l => l !== login),
    workspacesVinculadosIds,
    { tipo: 'remove_user', alvo: login, alvoNome: nomeDe(login, allUsers) }
  );
  const adicionarWorkspaceVinculado = (wsId) => {
    const wsAlvo = todasOpcoes.find(w => w.cr4a1_calendarios_workspacesid === wsId);
    salvarColaboradoresEWorkspaces(
      colaboradoresLogins,
      [...workspacesVinculadosIds, wsId],
      { tipo: 'add_ws', alvo: wsId, alvoNome: wsAlvo?.cr4a1_nome || wsId }
    );
  };
  const removerWorkspaceVinculado = (wsId) => {
    const wsAlvo = todasOpcoes.find(w => w.cr4a1_calendarios_workspacesid === wsId);
    salvarColaboradoresEWorkspaces(
      colaboradoresLogins,
      workspacesVinculadosIds.filter(id => id !== wsId),
      { tipo: 'remove_ws', alvo: wsId, alvoNome: wsAlvo?.cr4a1_nome || wsId }
    );
  };

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
  const fichasModelos = useMemo(
    () => fichasAtivas.filter(f => parseFichaMeta(f.cr4a1_atividades).ehModelo),
    [fichasAtivas]
  );

  const fichasVisiveis = useMemo(
    () => (filtrosAtivos === 0 ? fichasAtivas : fichasAtivas.filter(f => fichaCombinaComFiltros(f, filtros, user))),
    [fichasAtivas, filtros, filtrosAtivos, user]
  );
  const fichasDaLista = (lista) => {
    let doLista = fichasVisiveis.filter(f => f.cr4a1_lista_id === lista.cr4a1_listaid);
    if (souApenasConvidado) {
      const convsLista = parseListaConvidados(lista.cr4a1_automacao).map(c => String(c).toLowerCase());
      if (!convsLista.includes(userLower)) {
        doLista = doLista.filter(f => {
          const meta = parseFichaMeta(f.cr4a1_atividades);
          return (meta.convidados || []).some(c => String(c).toLowerCase() === userLower);
        });
      }
    }
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
    const infoProgresso = calcularProgressoFicha(ficha, fichas);
    if (ficha.cr4a1_concluida !== 'Sim' && !infoProgresso.podeConcluir) {
      if (infoProgresso.temDependencias) {
        toast.error(`Esta ficha depende de ${infoProgresso.depsTotal - infoProgresso.depsConcluidas} outra(s) ficha(s) pendente(s). Conclua as dependências primeiro!`);
      } else {
        toast.error('Esta ficha possui microtarefas pendentes.');
      }
      return;
    }
    const novoValor = ficha.cr4a1_concluida === 'Sim' ? 'Não' : 'Sim';
    const novaDescricao = novoValor === 'Sim' ? marcarTodasTarefas(ficha.cr4a1_descricao, true) : ficha.cr4a1_descricao;
    const atividades = registrarAtividade(ficha.cr4a1_atividades, novoValor === 'Sim' ? 'concluida' : 'reaberta', user);
    setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_concluida: novoValor, cr4a1_descricao: novaDescricao, cr4a1_atividades: atividades } : f));
    try {
      await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_concluida: novoValor, cr4a1_descricao: novaDescricao, cr4a1_atividades: atividades });
      if (novoValor === 'Sim') {
        await criarProximaRecorrencia(ficha);
        await executarAutomacoes({ ...ficha, cr4a1_concluida: 'Sim', cr4a1_descricao: novaDescricao }, ficha.cr4a1_lista_id, 'concluida');
        notificarObservadoresECoResponsaveis(ficha, 'marcou a ficha como concluída');
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
    const fichaSimulada = { ...ficha, cr4a1_descricao: novaDescricao };
    const infoProgresso = calcularProgressoFicha(fichaSimulada, fichas);
    const novoConcluida = infoProgresso.podeConcluir ? 'Sim' : 'Não';
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
      notificarObservadoresECoResponsaveis(ficha, `comentou: "${texto.slice(0, 80)}"`);
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

  // Alterna reação de emoji num comentário da ficha
  const alternarReacaoNoComentario = async (ficha, comentarioId, emoji) => {
    const json = alternarReacaoComentario(ficha.cr4a1_comentarios, comentarioId, emoji, user);
    setFichas(prev => prev.map(f => f.cr4a1_fichaid === ficha.cr4a1_fichaid ? { ...f, cr4a1_comentarios: json } : f));
    setEditando(prev => (prev && prev.original.cr4a1_fichaid === ficha.cr4a1_fichaid) ? { ...prev, original: { ...prev.original, cr4a1_comentarios: json } } : prev);
    try {
      await patch('cr4a1_fichas', ficha.cr4a1_fichaid, { cr4a1_comentarios: json });
    } catch {
      toast.error('Erro ao reagir ao comentário.');
    }
  };

  // Arrasta a ficha entre listas (ou reordena a lista inteira), recalculando cr4a1_ordem.
  const handleDragEnd = (result) => {
    const { source, destination, draggableId, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Reordenar listas inteiras arrastando horizontalmente
    if (type === 'LIST' || source.droppableId === 'trello-board-columns') {
      const reordenadas = Array.from(listasVisiveis);
      const [removida] = reordenadas.splice(source.index, 1);
      if (!removida) return;
      reordenadas.splice(destination.index, 0, removida);

      const listasComOrdem = reordenadas.map((l, idx) => ({ ...l, cr4a1_ordem: idx }));

      setListas(prev => {
        const mapa = new Map(listasComOrdem.map(l => [l.cr4a1_listaid, l]));
        return prev.map(l => mapa.get(l.cr4a1_listaid) || l).sort((a, b) => (Number(a.cr4a1_ordem) || 0) - (Number(b.cr4a1_ordem) || 0));
      });

      listasComOrdem.forEach(l => {
        patch('cr4a1_listas', l.cr4a1_listaid, { cr4a1_ordem: l.cr4a1_ordem })
          .catch(() => toast.error('Erro ao salvar nova ordem das listas.'));
      });
      return;
    }

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

  const [imagemLuminancia, setImagemLuminancia] = useState(null);

  useEffect(() => {
    const imgSrc = currentUser?.cr4a1_trello_fundo_imagem;
    if (!imgSrc) {
      setImagemLuminancia(null);
      return;
    }
    let cancelado = false;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelado) return;
      try {
        const canvas = document.createElement('canvas');
        const w = 64;
        const h = 24;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, Math.max(1, Math.round(img.height * 0.35)), 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        let soma = 0;
        const pixels = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          soma += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
        }
        setImagemLuminancia(pixels > 0 ? soma / pixels : 0.4);
      } catch {
        setImagemLuminancia(0.4);
      }
    };
    img.onerror = () => {
      if (!cancelado) setImagemLuminancia(0.4);
    };
    img.src = imgSrc;
    return () => { cancelado = true; };
  }, [currentUser?.cr4a1_trello_fundo_imagem]);

  const headerTemaFundo = useMemo(() => {
    const temImagem = !!currentUser?.cr4a1_trello_fundo_imagem;
    const temCor = !!currentUser?.cr4a1_trello_fundo_cor;
    if (!temImagem && !temCor) return null;

    let fundoClaro = false;
    if (temImagem) {
      fundoClaro = imagemLuminancia !== null ? imagemLuminancia > 0.68 : false;
    } else if (temCor) {
      const info = corTextoLegivel(currentUser.cr4a1_trello_fundo_cor);
      fundoClaro = info ? info.principal === '#1a1a1a' : false;
    }

    if (fundoClaro) {
      return {
        tituloStyle: { color: '#0f172a', textShadow: '0 1px 3px rgba(255,255,255,0.85)' },
        subtituloStyle: { color: 'rgba(15, 23, 42, 0.85)', fontWeight: 500, textShadow: '0 1px 2px rgba(255,255,255,0.8)' },
        btnOutlineClass: 'bg-white/80 !text-slate-900 !border-slate-900/25 backdrop-blur-md shadow-xs hover:bg-white/95'
      };
    }
    return {
      tituloStyle: { color: '#ffffff', textShadow: '0 1px 6px rgba(0,0,0,0.65), 0 0 2px rgba(0,0,0,0.5)' },
      subtituloStyle: { color: 'rgba(255, 255, 255, 0.92)', fontWeight: 500, textShadow: '0 1px 4px rgba(0,0,0,0.65), 0 0 2px rgba(0,0,0,0.5)' },
      btnOutlineClass: 'bg-slate-900/55 !text-white !border-white/35 backdrop-blur-md shadow-xs hover:bg-slate-900/75'
    };
  }, [currentUser?.cr4a1_trello_fundo_imagem, currentUser?.cr4a1_trello_fundo_cor, imagemLuminancia]);

  const fundoEstilo = useMemo(() => {
    // minHeight faz o fundo já ocupar a tela toda de cara, em vez de só aparecer atrás das
    // listas curtas — mas sem limitar a altura: se as listas crescerem, o fundo cresce junto.
    if (currentUser?.cr4a1_trello_fundo_imagem) {
      return { backgroundImage: `url(${currentUser.cr4a1_trello_fundo_imagem})`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: 'calc(100vh - 60px)' };
    }
    if (currentUser?.cr4a1_trello_fundo_cor) {
      return { backgroundColor: currentUser.cr4a1_trello_fundo_cor, minHeight: 'calc(100vh - 60px)' };
    }
    return undefined;
  }, [currentUser]);

  const headerOutlineBtnClass = headerTemaFundo?.btnOutlineClass || '';

  return (
    <div className="flex w-full flex-col gap-2.5 rounded-2xl p-2.5" style={fundoEstilo}>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 min-w-0">
            <h2
              className="text-lg font-extrabold text-foreground shrink-0"
              style={headerTemaFundo?.tituloStyle}
              title="Listas e fichas do workspace. Fichas com data aparecem na agenda e avisam o responsável."
            >
              Fichas
            </h2>
            <div className="sm:hidden min-w-0 flex-1 max-w-[170px]">
              <Select value={workspaceId} onValueChange={setWorkspaceId}>
                <SelectTrigger className="h-8 w-full text-xs"><SelectValue placeholder="Workspace" /></SelectTrigger>
                <SelectContent>
                  {todasOpcoes.map(w => {
                    const ehVirtual = w.cr4a1_calendarios_workspacesid === VIRTUAL_WORKSPACE_CONVIDADOS_ID || w._virtual;
                    const ehExtra = !ehVirtual && workspacesExtras.some(e => e.cr4a1_calendarios_workspacesid === w.cr4a1_calendarios_workspacesid);
                    return (
                      <SelectItem key={w.cr4a1_calendarios_workspacesid} value={w.cr4a1_calendarios_workspacesid}>
                        {w.cr4a1_nome}{ehVirtual ? ' (Virtual)' : (ehExtra ? ' (Compartilhado)' : '')}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          {!minhasFichasAberto && !estouBloqueado && (
            <div className="hidden sm:flex items-center gap-0.5 rounded-xl border border-border bg-card/90 p-0.5 shadow-xs">
              {[
                { id: 'kanban', label: 'Quadro', icon: Columns3 },
                { id: 'tabela', label: 'Tabela', icon: Table2 },
                { id: 'cronograma', label: 'Cronograma', icon: GanttChart },
                { id: 'painel', label: 'Painel', icon: BarChart3 }
              ].map(visao => {
                const Icone = visao.icon;
                const ativo = modoVisao === visao.id;
                return (
                  <button
                    key={visao.id}
                    type="button"
                    onClick={() => setModoVisao(visao.id)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
                      ativo
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <Icone className="size-3.5" />
                    <span className="hidden md:inline">{visao.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto">
          {!minhasFichasAberto && !estouBloqueado && (
            <div className="flex sm:hidden items-center gap-0.5 rounded-xl border border-border bg-card/90 p-0.5 shadow-xs">
              {[
                { id: 'kanban', label: 'Quadro', icon: Columns3 },
                { id: 'tabela', label: 'Tabela', icon: Table2 },
                { id: 'cronograma', label: 'Cronograma', icon: GanttChart },
                { id: 'painel', label: 'Painel', icon: BarChart3 }
              ].map(visao => {
                const Icone = visao.icon;
                const ativo = modoVisao === visao.id;
                return (
                  <button
                    key={visao.id}
                    type="button"
                    onClick={() => setModoVisao(visao.id)}
                    title={visao.label}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
                      ativo
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <Icone className="size-3.5" />
                    <span className={`text-[11px] ${ativo ? 'inline' : 'hidden'}`}>{visao.label}</span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {membrosVisiveis.length > 0 && (
              <button
                type="button"
                onClick={() => setCompartilharAberto(true)}
                title="Quem tem acesso a este quadro"
                className="flex items-center -space-x-2"
              >
                {membrosVisiveis.slice(0, 4).map(m => (
                  <UserAvatar key={m.cr4a1_username} login={m.cr4a1_username} allUsers={allUsers} size={24} className="ring-2 ring-[var(--card)]" />
                ))}
                {membrosVisiveis.length > 4 && (
                  <div className="flex size-[24px] items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground ring-2 ring-[var(--card)]">
                    +{membrosVisiveis.length - 4}
                  </div>
                )}
              </button>
            )}
          <Popover open={filtrosAberto} onOpenChange={setFiltrosAberto}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={`relative h-8 px-2.5 text-xs ${headerOutlineBtnClass}`} aria-label="Filtros">
                <Filter className="size-3.5" /> <span className="hidden sm:inline">Filtros</span>
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

                <div>
                  <Label className="mb-1.5">Prioridade</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {[['todas', 'Todas'], ['critica', 'Crítica'], ['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa'], ['sem', 'Sem prioridade']].map(([valor, rotulo]) => (
                      <button key={valor} type="button" onClick={() => setFiltro('prioridade', valor)} className={chipClass(filtros.prioridade === valor)}>{rotulo}</button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setFiltro('seguindo', !filtros.seguindo)}
                    className={chipClass(filtros.seguindo)}
                  >
                    🔔 Seguindo
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltro('apenasModelos', !filtros.apenasModelos)}
                    className={chipClass(filtros.apenasModelos)}
                  >
                    📋 Apenas Modelos
                  </button>
                </div>

                {filtrosAtivos > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setFiltros(filtrosVazios())}>
                    <X className="size-4" /> Limpar filtros
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant={minhasFichasAberto ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMinhasFichasAberto(v => !v)}
            aria-label="Minhas fichas"
            className={`h-8 px-2.5 text-xs ${!minhasFichasAberto ? headerOutlineBtnClass : ''}`}
          >
            <UserCircle2 className="size-3.5" /> <span className="hidden sm:inline">Minhas fichas</span>
          </Button>
          {/* Ações secundárias (menos usadas no dia a dia) ficam sempre atrás de um menu —
              inline elas nunca cabem numa linha só (nem em desktop), então em vez de tentar
              adivinhar um breakpoint "seguro" pra mostrar tudo solto, o menu garante que o
              cabeçalho nunca estoura a largura da tela, em qualquer tamanho. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className={`h-8 px-2.5 text-xs ${headerOutlineBtnClass}`} aria-label="Mais ações">
                <MoreHorizontal className="size-3.5" /> <span className="hidden sm:inline">Mais</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFundoAberto(true)}><Palette className="size-4" /> Aparência (Fundo e Fonte)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEtiquetasAberto(true)}><Tag className="size-4" /> Etiquetas</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCompartilharAberto(true)}><Users className="size-4" /> Compartilhar</DropdownMenuItem>
              {podeMudarWorkspace && (
                <DropdownMenuItem onClick={() => setMudarWorkspaceAberto(true)}><FolderSync className="size-4" /> Mudar Workspace</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setModelosAberto(true)}><LayoutTemplate className="size-4" /> Modelos</DropdownMenuItem>
              <DropdownMenuItem onClick={exportarQuadro}><FileSpreadsheet className="size-4" /> Exportar</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setArquivadasAberto(true)}>
                <Archive className="size-4" /> Arquivadas ({fichasArquivadas.length})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="hidden sm:block">
            <Select value={workspaceId} onValueChange={setWorkspaceId}>
              <SelectTrigger className="h-8 w-36 text-xs lg:w-48"><SelectValue placeholder="Workspace" /></SelectTrigger>
              <SelectContent>
                {todasOpcoes.map(w => {
                  const ehVirtual = w.cr4a1_calendarios_workspacesid === VIRTUAL_WORKSPACE_CONVIDADOS_ID || w._virtual;
                  const ehExtra = !ehVirtual && workspacesExtras.some(e => e.cr4a1_calendarios_workspacesid === w.cr4a1_calendarios_workspacesid);
                  return (
                    <SelectItem key={w.cr4a1_calendarios_workspacesid} value={w.cr4a1_calendarios_workspacesid}>
                      {w.cr4a1_nome}{ehVirtual ? ' (Virtual)' : (ehExtra ? ' (Compartilhado)' : '')}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </header>

      {workspaceId === VIRTUAL_WORKSPACE_CONVIDADOS_ID ? (
        <div className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2 text-xs text-indigo-700 dark:text-indigo-300">
          <Users className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <span>
            <strong>Espaço do Convidado</strong> — Você está visualizando todas as listas e fichas para as quais foi convidado a partir de diferentes workspaces.
          </span>
        </div>
      ) : souApenasConvidado && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3.5 py-2 text-xs text-blue-700 dark:text-blue-300">
          <UserPlus className="size-4 shrink-0" />
          <span>
            <strong>Modo Convidado</strong> — Você está visualizando apenas as listas/fichas compartilhadas com você neste workspace.
          </span>
        </div>
      )}

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
      ) : modoVisao === 'tabela' ? (
        <TrelloTabelaView
          fichas={listasVisiveis.flatMap(l => fichasDaLista(l))}
          listas={listasVisiveis}
          etiquetas={etiquetas}
          allUsers={allUsers}
          membros={membrosVisiveis}
          user={user}
          nomeDe={nomeDe}
          UserAvatar={UserAvatar}
          EtiquetaChip={EtiquetaChip}
          onAbrirFicha={abrirFicha}
          onToggleConcluida={toggleConcluida}
          onMoverLista={moverFichaRapido}
          onMudarLista={moverFichaRapido}
          onMudarResponsavel={mudarResponsavelRapido}
          onMudarPrioridade={(ficha, prio) => atualizarMetaRapidoFicha(ficha, { prioridade: prio })}
          onDuplicarFicha={duplicarFicha}
          onDuplicar={duplicarFicha}
          onArquivarFicha={arquivarFicha}
          onArquivar={arquivarFicha}
          onToggleCronometro={alternarCronometroFicha}
        />
      ) : modoVisao === 'cronograma' ? (
        <TrelloCronogramaView
          fichas={listasVisiveis.flatMap(l => fichasDaLista(l))}
          listas={listasVisiveis}
          allUsers={allUsers}
          nomeDe={nomeDe}
          UserAvatar={UserAvatar}
          onAbrirFicha={abrirFicha}
          onToggleConcluida={toggleConcluida}
        />
      ) : modoVisao === 'painel' ? (
        <TrelloPainelView
          fichas={listasVisiveis.flatMap(l => fichasDaLista(l))}
          listas={listasVisiveis}
          etiquetas={etiquetas}
          allUsers={allUsers}
          nomeDe={nomeDe}
          UserAvatar={UserAvatar}
          onAbrirFicha={abrirFicha}
        />
      ) : (
      <Droppable droppableId="trello-board-columns" direction="horizontal" type="LIST">
        {(providedBoard) => (
          <div
            ref={providedBoard.innerRef}
            {...providedBoard.droppableProps}
            className="flex items-start gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:snap-none scroll-smooth"
          >
            {listasVisiveis.map((lista, index) => {
              const souCriadorLista = !lista.cr4a1_criador_login || lista.cr4a1_criador_login === user;
              const gerentesDaLista = parseListaGerentes(lista.cr4a1_automacao);
              const souGerente = gerentesDaLista.includes(user);
              const souDono = souCriadorLista || isAdmin;
              const podeGerenciar = souDono || souGerente || workspace?.cr4a1_criador_login === user;
              const podeGerenciarAutomacoes = podeGerenciar;
              const pessoal = lista.cr4a1_pessoal === 'Sim';
              const colapsada = colapsadas.includes(lista.cr4a1_listaid);
              const corDaLista = parseListaCor(lista.cr4a1_automacao);

              if (colapsada) {
                return (
                  <Draggable key={lista.cr4a1_listaid} draggableId={lista.cr4a1_listaid} index={index}>
                    {(providedList, snapshotList) => (
                      <Droppable droppableId={lista.cr4a1_listaid}>
                        {(provided) => (
                          <section
                            ref={providedList.innerRef}
                            {...providedList.draggableProps}
                            style={{
                              ...providedList.draggableProps.style,
                              ...(corDaLista ? { borderTopColor: corDaLista, borderTopWidth: '4px' } : {})
                            }}
                            className={`flex w-11 shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border p-2 ${pessoal ? 'border-primary/40 bg-primary/5' : 'border-border bg-secondary'} ${snapshotList.isDragging ? 'shadow-2xl ring-2 ring-primary/40 rotate-1 z-50' : ''}`}
                          >
                            <div
                              {...providedList.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/60 hover:text-foreground transition-colors"
                              title="Segure e arraste para reordenar esta lista"
                            >
                              <GripVertical className="size-4" />
                            </div>
                            <button type="button" onClick={() => alternarColapso(lista.cr4a1_listaid)} aria-label={`Expandir lista ${lista.cr4a1_nome}`} title="Expandir lista" className="text-muted-foreground hover:text-primary">
                              <ChevronRight className="size-4" />
                            </button>
                            <Badge variant="secondary">{fichasDaLista(lista).length}</Badge>
                            <span className="mt-1 flex-1 rotate-180 whitespace-nowrap text-xs font-bold text-foreground [writing-mode:vertical-rl]">
                              {lista.cr4a1_nome}
                            </span>
                            <div ref={provided.innerRef} {...provided.droppableProps} className="hidden">{provided.placeholder}</div>
                          </section>
                        )}
                      </Droppable>
                    )}
                  </Draggable>
                );
              }

              return (
                <Draggable key={lista.cr4a1_listaid} draggableId={lista.cr4a1_listaid} index={index}>
                  {(providedList, snapshotList) => (
                    <section
                      ref={providedList.innerRef}
                      {...providedList.draggableProps}
                      style={{
                        ...providedList.draggableProps.style,
                        ...(corDaLista ? { borderTopColor: corDaLista, borderTopWidth: '4px' } : {})
                      }}
                      className={`flex w-[84vw] sm:w-72 shrink-0 max-w-[320px] snap-start flex-col gap-2 rounded-2xl border p-3 max-h-[calc(100dvh-130px)] sm:max-h-[calc(100vh-120px)] ${pessoal ? 'border-primary/40 bg-primary/5' : 'border-border bg-secondary'} ${snapshotList.isDragging ? 'shadow-2xl ring-2 ring-primary/40 rotate-1 z-50' : ''}`}
                    >
                      {lista._origemWorkspaceNome && (
                        <div className="flex items-center px-0.5 -mb-0.5 shrink-0">
                          <span
                            className="inline-flex max-w-full truncate text-[10px] bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-semibold"
                            title={`Workspace de origem: ${lista._origemWorkspaceNome}`}
                          >
                            {lista._origemWorkspaceNome}
                          </span>
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-1 shrink-0">
                        <div
                          {...providedList.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground/60 hover:text-foreground transition-colors shrink-0 mt-0.5"
                          title="Segure e arraste para reordenar esta lista"
                        >
                          <GripVertical className="size-4" />
                        </div>
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

                  {!souApenasConvidado && (
                    <ListaSincronizacaoAgendaMenu
                      lista={lista}
                      syncConfig={parseListaSyncAgenda(lista.cr4a1_automacao)}
                      onSincronizar={(opcoes) => sincronizarListaComAgenda(lista, opcoes)}
                    />
                  )}

                  <ListaOrdenacaoMenu
                    criterioAtual={ordenacaoPorLista[lista.cr4a1_listaid] || 'padrao'}
                    onChange={(crit) => mudarOrdenacaoLista(lista.cr4a1_listaid, crit)}
                  />

                  <ListaOpcoesMenu
                    lista={lista}
                    corDaLista={corDaLista}
                    podeGerenciar={podeGerenciar && !souApenasConvidado}
                    podeGerenciarAutomacoes={podeGerenciarAutomacoes && !souApenasConvidado}
                    souDono={souDono && !souApenasConvidado}
                    pessoal={pessoal}
                    gerentesDaLista={gerentesDaLista}
                    convidadosDaLista={parseListaConvidados(lista.cr4a1_automacao).filter(c => !membrosBaseLoginsSet.has(String(c).toLowerCase()))}
                    listasVisiveis={listasVisiveis}
                    definirCorLista={definirCorLista}
                    setListaAutomacao={setListaAutomacao}
                    setListaGerentes={setListaGerentes}
                    setListaConvidados={setListaConvidados}
                    clonarListaInteira={clonarListaInteira}
                    setListaMoverFichas={setListaMoverFichas}
                    alternarListaPessoal={alternarListaPessoal}
                    setListaMoverWorkspace={setListaMoverWorkspace}
                    setListaExportar={setListaExportar}
                    arquivarConcluidasDaLista={arquivarConcluidasDaLista}
                    arquivarTodasDaLista={arquivarTodasDaLista}
                    apagarLista={apagarLista}
                  />
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
                      const infoProgresso = calcularProgressoFicha(ficha, fichas);
                      const concluida = infoProgresso.concluida;
                      const temDependencias = infoProgresso.temDependencias;
                      const microtarefas = extrairTarefas(ficha.cr4a1_descricao);
                      const microtarefasFeitas = microtarefas.filter(t => t.concluida).length;
                      const anexosDaFicha = parseAnexos(ficha.cr4a1_arquivos);
                      const qtdAnexos = anexosDaFicha.length;
                      const qtdComentarios = parseComentarios(ficha.cr4a1_comentarios).length;
                      const meta = parseFichaMeta(ficha.cr4a1_atividades);
                      const qtdNotas = (meta.notasIds || []).length;
                      const imagensAnexadas = anexosDaFicha.filter(a => a.type?.startsWith('image/'));
                      const capaImagem = imagensAnexadas[meta.capaImagemIndex || 0] || primeiraImagem(anexosDaFicha);
                      const stickersDaFicha = parseAssignees(ficha.cr4a1_stickers);
                      const modoCapa = meta.capaModo || 'inteiro';
                      const corCard = (ficha.cr4a1_cor && modoCapa === 'inteiro') ? corTextoLegivel(ficha.cr4a1_cor) : null;
                      const fixada = ficha.cr4a1_fixada === 'Sim';
                      const prioInfo = meta.prioridade ? PRIORIDADES_FICHA[meta.prioridade] : null;
                      const aprovInfo = meta.statusAprovacao ? STATUS_APROVACAO_FICHA[meta.statusAprovacao] : null;
                      const tempoTotal = calcularTempoTotalMin(meta);
                      const emAndamento = Boolean(meta.cronometroInicio);
                      const seguindo = (meta.observadores || []).includes(user);
                      const coResps = meta.coResponsaveis || [];

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
                              {ficha.cr4a1_cor && modoCapa === 'faixa' && (
                                <div
                                  className="-mx-3 -mt-3 mb-1 h-2.5 rounded-t-xl"
                                  style={{ backgroundColor: ficha.cr4a1_cor }}
                                />
                              )}
                              {capaImagem && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setAnexoCardPreview(capaImagem); }}
                                  className={`-mx-3 ${ficha.cr4a1_cor && modoCapa === 'faixa' ? '-mt-1' : '-mt-3 rounded-t-xl'} mb-0.5 block overflow-hidden`}
                                  aria-label={`Visualizar ${capaImagem.name}`}
                                >
                                  <img src={capaImagem.thumbnail || capaImagem.base64} alt={capaImagem.name} className="h-28 w-full object-cover" />
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
                                  {(meta.ehModelo || prioInfo || aprovInfo || etiquetasDaFicha.length > 0 || stickersDaFicha.length > 0) && (
                                    <div className="flex flex-wrap items-center gap-1">
                                      {meta.ehModelo && (
                                        <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                                          📋 Modelo
                                        </span>
                                      )}
                                      {prioInfo && (
                                        <span
                                          className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                                          style={{ backgroundColor: prioInfo.cor }}
                                        >
                                          <Flag className="size-2.5" /> {prioInfo.label}
                                        </span>
                                      )}
                                      {aprovInfo && (
                                        <span
                                          className="inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-bold"
                                          style={{ borderColor: aprovInfo.cor, color: aprovInfo.cor, backgroundColor: `${aprovInfo.cor}15` }}
                                        >
                                          {aprovInfo.label}
                                        </span>
                                      )}
                                      {etiquetasDaFicha.map(et => <EtiquetaChip key={et.cr4a1_etiquetaid} etiqueta={et} compacta />)}
                                      {stickersDaFicha.map((emoji, i) => <Sticker key={i} emoji={emoji} size={16} />)}
                                    </div>
                                  )}
                                  <span className={`text-sm font-semibold text-foreground ${concluida ? 'line-through opacity-60' : ''}`}>{ficha.cr4a1_titulo}</span>

                                  {(meta.campoTexto || meta.custo || meta.linkUrl) && (
                                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                      {meta.campoTexto && (
                                        <span className="rounded bg-secondary px-1.5 py-0.5 font-medium text-foreground">
                                          {meta.campoTexto}
                                        </span>
                                      )}
                                      {meta.custo && (
                                        <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.5 font-bold text-emerald-500">
                                          R$ {meta.custo}
                                        </span>
                                      )}
                                      {meta.linkUrl && (
                                        <a
                                          href={meta.linkUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={e => e.stopPropagation()}
                                          className="inline-flex items-center gap-0.5 rounded bg-primary/15 px-1.5 py-0.5 font-semibold text-primary hover:underline"
                                        >
                                          <Link2 className="size-2.5" /> Link
                                        </a>
                                      )}
                                    </div>
                                  )}

                                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                    {(meta.dataInicioTrabalho || comData(ficha)) && (
                                      <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold ${comData(ficha) ? corUrgenciaData(ficha.cr4a1_data_inicio, concluida) : 'bg-secondary text-muted-foreground'}`}>
                                        <CalendarDays className="size-3" />
                                        {meta.dataInicioTrabalho ? `${format(new Date(`${meta.dataInicioTrabalho}T12:00:00`), 'dd/MM')}${comData(ficha) ? ' → ' : ''}` : ''}
                                        {comData(ficha) ? format(new Date(ficha.cr4a1_data_inicio), 'dd/MM HH:mm') : ''}
                                      </span>
                                    )}
                                    {(tempoTotal > 0 || meta.tempoEstimadoMin > 0 || emAndamento) && (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); alternarCronometroFicha(ficha); }}
                                        title={emAndamento ? 'Pausar cronômetro' : 'Iniciar cronômetro'}
                                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                                          emAndamento ? 'bg-primary text-primary-foreground animate-pulse' : 'bg-secondary text-muted-foreground hover:text-foreground'
                                        }`}
                                      >
                                        {emAndamento ? <Pause className="size-2.5" /> : <Timer className="size-2.5" />}
                                        {formatarDuracaoMin(tempoTotal)}{meta.tempoEstimadoMin > 0 ? `/${formatarDuracaoMin(meta.tempoEstimadoMin)}` : ''}
                                      </button>
                                    )}
                                    {seguindo && (
                                      <span className="inline-flex items-center text-primary" title="Você está seguindo esta ficha">
                                        <Bell className="size-3" fill="currentColor" />
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
                                    {qtdNotas > 0 && (
                                      <span className="inline-flex items-center gap-0.5 text-primary font-bold" title={`${qtdNotas} nota(s) vinculada(s)`}>
                                        <FileText className="size-3" /> {qtdNotas}
                                      </span>
                                    )}
                                    {qtdComentarios > 0 && (
                                      <span className="inline-flex items-center gap-0.5" title={`${qtdComentarios} comentário(s)`}>
                                        <MessageCircle className="size-3" /> {qtdComentarios}
                                      </span>
                                    )}
                                    <div className="flex items-center -space-x-1">
                                      <UserAvatar login={ficha.cr4a1_responsavel_login} allUsers={allUsers} size={16} />
                                      {coResps.slice(0, 3).map(co => (
                                        <UserAvatar key={co} login={co} allUsers={allUsers} size={15} className="ring-1 ring-card" />
                                      ))}
                                    </div>
                                    <span className="truncate max-w-[100px]">{nomeDe(ficha.cr4a1_responsavel_login, allUsers)}{coResps.length > 0 ? ` +${coResps.length}` : ''}</span>
                                  </div>
                                </div>
                                <div className="mt-0.5 flex shrink-0 items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); alternarFixada(ficha); }}
                                    aria-label={fixada ? `Desafixar "${ficha.cr4a1_titulo}"` : `Fixar "${ficha.cr4a1_titulo}" no topo da lista`}
                                    title={fixada ? 'Desafixar' : 'Fixar no topo da lista'}
                                    className={`shrink-0 p-0.5 ${fixada ? 'text-primary' : 'text-muted-foreground/40 hover:text-primary'}`}
                                  >
                                    <Pin className="size-[14px]" fill={fixada ? 'currentColor' : 'none'} />
                                  </button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={e => e.stopPropagation()}
                                        aria-label="Ações rápidas da ficha"
                                        title="Ações rápidas"
                                        className="shrink-0 rounded p-0.5 text-muted-foreground/50 hover:bg-secondary hover:text-primary"
                                      >
                                        <MoreHorizontal className="size-[15px]" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52" onClick={e => e.stopPropagation()}>
                                      <DropdownMenuItem onClick={() => alternarSeguirFicha(ficha)} className="cursor-pointer">
                                        {seguindo ? <BellOff className="size-4 mr-2" /> : <Bell className="size-4 mr-2" />}
                                        {seguindo ? 'Parar de seguir' : 'Seguir ficha 🔔'}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => alternarCronometroFicha(ficha)} className="cursor-pointer">
                                        {emAndamento ? <Pause className="size-4 mr-2 text-primary" /> : <Play className="size-4 mr-2" />}
                                        {emAndamento ? 'Pausar cronômetro' : 'Iniciar cronômetro'}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => duplicarFicha(ficha)} className="cursor-pointer">
                                        <Copy className="size-4 mr-2" />
                                        Duplicar ficha
                                      </DropdownMenuItem>
                                      <div className="px-2 py-1.5 border-y border-border my-1">
                                        <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Prioridade</span>
                                        <div className="flex flex-wrap gap-1">
                                          {[['', 'Sem'], ['baixa', 'Baixa'], ['media', 'Média'], ['alta', 'Alta'], ['critica', 'Crítica']].map(([val, lbl]) => (
                                            <button
                                              key={val || 'sem'}
                                              type="button"
                                              onClick={() => atualizarMetaRapidoFicha(ficha, { prioridade: val })}
                                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${
                                                (meta.prioridade || '') === val ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                                              }`}
                                            >
                                              {lbl}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      {listasVisiveis.length > 1 && (
                                        <div className="px-2 py-1 border-b border-border mb-1">
                                          <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Mover para lista</span>
                                          <div className="flex flex-col gap-0.5 max-h-28 overflow-y-auto">
                                            {listasVisiveis.filter(l => l.cr4a1_listaid !== ficha.cr4a1_lista_id).map(l => (
                                              <button
                                                key={l.cr4a1_listaid}
                                                type="button"
                                                onClick={() => moverFichaRapido(ficha, l.cr4a1_listaid)}
                                                className="text-left text-xs px-1.5 py-1 rounded hover:bg-secondary truncate text-foreground"
                                              >
                                                → {l.cr4a1_nome}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      <DropdownMenuItem onClick={() => arquivarFicha(ficha)} className="cursor-pointer">
                                        <Archive className="size-4 mr-2" />
                                        Arquivar ficha
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              {(microtarefas.length > 0 || temDependencias) && (
                                <div className="flex flex-col gap-1.5 pl-[26px]">
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                                      <div
                                        className={`h-full rounded-full transition-all ${infoProgresso.porcentagem === 100 ? 'bg-success' : 'bg-primary'}`}
                                        style={{ width: `${infoProgresso.porcentagem}%` }}
                                      />
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-semibold text-muted-foreground">
                                      {temDependencias && (
                                        <span className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 border ${
                                          infoProgresso.depsConcluidas === infoProgresso.depsTotal
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                            : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                        }`} title={`Dependências: ${infoProgresso.depsConcluidas} de ${infoProgresso.depsTotal} concluídas`}>
                                          <Link2 className="size-2.5" />
                                          {infoProgresso.depsConcluidas}/{infoProgresso.depsTotal}
                                        </span>
                                      )}
                                      <span>{infoProgresso.porcentagem}%</span>
                                    </div>
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
                    {/* Ficha Rascunho em tempo real (como no Trello) */}
                    {composerAbertoListaId === lista.cr4a1_listaid && (
                      <div className="flex flex-col shrink-0 min-h-fit gap-2 rounded-xl border-2 border-primary/50 bg-card p-3 shadow-md transition-all animate-in fade-in-50 duration-150">
                        <textarea
                          ref={el => {
                            if (el) {
                              el.style.height = 'auto';
                              el.style.height = `${Math.max(48, el.scrollHeight)}px`;
                            }
                          }}
                          value={novaFichaPorLista[lista.cr4a1_listaid] || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setNovaFichaPorLista(prev => ({ ...prev, [lista.cr4a1_listaid]: val }));
                            e.target.style.height = 'auto';
                            e.target.style.height = `${Math.max(48, e.target.scrollHeight)}px`;
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              criarFicha(lista);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setComposerAbertoListaId(null);
                              setNovaFichaPorLista(prev => ({ ...prev, [lista.cr4a1_listaid]: '' }));
                            }
                          }}
                          placeholder="Insira um título para esta ficha..."
                          rows={2}
                          autoFocus
                          className="w-full resize-none bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground outline-none"
                        />
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => criarFicha(lista)}
                            disabled={!(novaFichaPorLista[lista.cr4a1_listaid] || '').trim()}
                            className="h-8 px-3 text-xs font-semibold shadow-xs"
                          >
                            Adicionar ficha
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setComposerAbertoListaId(null);
                              setNovaFichaPorLista(prev => ({ ...prev, [lista.cr4a1_listaid]: '' }));
                            }}
                            className="size-8 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg"
                            title="Cancelar (Esc)"
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>

              <div className="mt-auto flex flex-col gap-1 pt-1 shrink-0">
                {composerAbertoListaId !== lista.cr4a1_listaid && (
                  <button
                    type="button"
                    onClick={() => setComposerAbertoListaId(lista.cr4a1_listaid)}
                    className="flex items-center gap-2 w-full rounded-xl px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground transition-all group text-left"
                  >
                    <Plus className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    <span>Adicionar uma ficha</span>
                  </button>
                )}
                {fichasModelos.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="h-7 justify-start text-xs text-muted-foreground hover:text-foreground">
                        <Sparkles className="size-3.5 mr-1.5 text-primary" /> Criar a partir de modelo ({fichasModelos.length})
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-60">
                      {fichasModelos.map(mod => (
                        <DropdownMenuItem
                          key={mod.cr4a1_fichaid}
                          onClick={() => criarFichaAPartirDeModelo(mod, lista.cr4a1_listaid)}
                          className="cursor-pointer"
                        >
                          <LayoutTemplate className="size-3.5 mr-2 text-primary" />
                          <span className="truncate">{mod.cr4a1_titulo}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </section>
                  )}
                </Draggable>
              );
            })}

            {providedBoard.placeholder}

            {!souApenasConvidado && (
              <form
                onSubmit={e => { e.preventDefault(); criarLista(); }}
                className="flex w-[84vw] sm:w-72 shrink-0 max-w-[320px] snap-start flex-col gap-2 rounded-2xl border border-dashed border-border bg-secondary p-3"
              >
                <Input value={novaLista} onChange={e => setNovaLista(e.target.value)} placeholder="Nova lista..." className="bg-card" />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch checked={novaListaPessoal} onCheckedChange={setNovaListaPessoal} />
                  Lista pessoal (só eu vejo)
                </label>
                <Button type="submit" size="sm" variant="outline">Adicionar lista</Button>
              </form>
            )}
          </div>
        )}
      </Droppable>
      )}

      {editando && (
        <Dialog open onOpenChange={(open) => !open && setEditando(null)}>
          <DialogContent className="max-w-2xl sm:max-w-4xl lg:max-w-5xl h-[92dvh] sm:h-[90vh] p-0 overflow-hidden flex flex-col">
            <FichaForm
              inicial={editando.form}
              coresRecentes={coresRecentesFicha}
              coresRecentesMarcaTexto={coresRecentesMarcaTexto}
              onRegistrarCorRecente={handleRegistrarCorRecente}
              fichaOriginal={editando.original}
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
              onDuplicar={() => { duplicarFicha(editando.original); setEditando(null); }}
              onReagirComentario={(comentarioId, emoji) => alternarReacaoNoComentario(editando.original, comentarioId, emoji)}
              onAddComentario={(texto) => adicionarComentario(editando.original, texto)}
              onRemoverComentario={(id) => removerComentario(editando.original, id)}
              onCancel={() => setEditando(null)}
              onSave={(form) => salvarFicha(form, editando.original)}
              onSaveRapido={(form, toastMensagem) => salvarFicha(form, editando.original, { manterAberto: true, toastMensagem })}
              onAutosave={(form) => salvarFicha(form, editando.original, { autosave: true })}
              onDelete={() => excluirFicha(editando.original)}
              membrosBaseLoginsSet={membrosBaseLoginsSet}
              souApenasConvidado={souApenasConvidado}
              onConvidarExterno={(dados) => convidarExterno({ ...dados, ficha: editando.original })}
              onRemoverConvidado={(dados) => removerConvidado({ ...dados, ficha: editando.original })}
              notas={notas}
              fichas={fichas}
              onCriarNota={async (tituloFicha) => {
                if (!addNota) return null;
                const novaNotaData = {
                  titulo: `[Ficha] ${tituloFicha || editando.original?.cr4a1_titulo || 'Nova Nota'}`,
                  cor: editando.original?.cr4a1_cor || '',
                  workspaceId: editando.original?.cr4a1_workspace_id || workspaceId,
                  fichaId: editando.original?.cr4a1_fichaid,
                  fichaTitulo: editando.original?.cr4a1_titulo || tituloFicha,
                  conteudo: [
                    { id: crypto.randomUUID(), type: 'heading', value: 'Anotações da Ficha' },
                    { id: crypto.randomUUID(), type: 'text', value: '' }
                  ]
                };
                const idCriada = await addNota(novaNotaData);
                return idCriada;
              }}
              onNavegarParaNota={onNavegarParaNota}
            />
          </DialogContent>
        </Dialog>
      )}

      {listaMoverFichas && (
        <Dialog open onOpenChange={(open) => !open && setListaMoverFichas(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="size-4 text-primary" /> Mover Todas as Fichas
              </DialogTitle>
              <DialogDescription>
                Escolha a lista de destino para mover todas as fichas de &quot;{listaMoverFichas.cr4a1_nome}&quot;.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5 py-2">
              {listasVisiveis
                .filter(l => l.cr4a1_listaid !== listaMoverFichas.cr4a1_listaid)
                .map(l => (
                  <Button
                    key={l.cr4a1_listaid}
                    variant="outline"
                    className="justify-between"
                    onClick={() => moverTodasFichasDeLista(listaMoverFichas, l.cr4a1_listaid)}
                  >
                    <span className="truncate">{l.cr4a1_nome}</span>
                    <Badge variant="secondary">{fichasDaLista(l).length}</Badge>
                  </Button>
                ))}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setListaMoverFichas(null)}>Cancelar</Button>
            </DialogFooter>
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
          historicoCompartilhamento={historicoCompartilhamento}
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

      {listaConvidados && (
        <ConvidadosListaDialog
          lista={listas.find(l => l.cr4a1_listaid === listaConvidados.cr4a1_listaid) || listaConvidados}
          allUsers={allUsers}
          membrosBaseLoginsSet={membrosBaseLoginsSet}
          onClose={() => setListaConvidados(null)}
          onSave={(novosConvidados) => salvarConvidadosDaLista(listaConvidados, novosConvidados)}
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

const FichaForm = ({
  inicial,
  fichaOriginal,
  listas,
  membros,
  allUsers,
  etiquetas,
  workspaceNome,
  comentarios = [],
  atividades = [],
  usuarioAtual,
  isAdmin,
  arquivada = false,
  onToggleArquivo,
  onDuplicar,
  onReagirComentario,
  onAddComentario,
  onRemoverComentario,
  onCancel,
  onSave,
  onSaveRapido,
  onAutosave,
  onDelete,
  membrosBaseLoginsSet = new Set(),
  souApenasConvidado = false,
  onConvidarExterno,
  onRemoverConvidado,
  notas = [],
  fichas = [],
  onCriarNota,
  onNavegarParaNota,
  coresRecentes = [],
  coresRecentesMarcaTexto = [],
  onRegistrarCorRecente
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [prazoPopoverAberto, setPrazoPopoverAberto] = useState(false);
  const [prioridadePopoverAberto, setPrioridadePopoverAberto] = useState(false);
  const [convidarPopoverAberto, setConvidarPopoverAberto] = useState(false);
  const [buscaConvidado, setBuscaConvidado] = useState('');
  const [escopoConvite, setEscopoConvite] = useState('ficha'); // 'ficha' | 'lista'
  const [atividadesAbertas, setAtividadesAbertas] = useState(false);
  const [form, setForm] = useState(inicial);
  const [novoComentario, setNovoComentario] = useState('');
  const [editorDescricao, setEditorDescricao] = useState(null);

  // Status do Salvamento Automático na Nuvem
  const [autosaveStatus, setAutosaveStatus] = useState(null); // 'saving' | 'saved' | null
  const isPrimeiraRenderRef = useRef(true);
  const autosaveTimerRef = useRef(null);
  const cancelarAutosavePendente = () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  };

  // Autosave com debounce de 1500ms quando qualquer campo for alterado
  useEffect(() => {
    if (isPrimeiraRenderRef.current) {
      isPrimeiraRenderRef.current = false;
      return;
    }
    if (!form.titulo?.trim() || !form.listaId) return;

    setAutosaveStatus('saving');
    autosaveTimerRef.current = setTimeout(async () => {
      autosaveTimerRef.current = null;
      try {
        if (onAutosave) {
          await onAutosave(form);
          setAutosaveStatus('saved');
          setTimeout(() => setAutosaveStatus(null), 3000);
        }
      } catch {
        setAutosaveStatus(null);
      }
    }, 1500);

    return () => cancelarAutosavePendente();
  }, [
    form.titulo,
    form.descricao,
    form.cor,
    form.responsavel,
    form.dia,
    form.hora,
    form.listaId,
    form.concluida,
    form.prioridade,
    form.ehModelo,
    form.statusAprovacao,
    form.custo,
    form.linkUrl,
    form.campoTexto,
    form.dataInicioTrabalho,
    form.tempoEstimadoMin,
    form.tempoGastoMin,
    form.sincronizarAgenda,
    form.sincronizarSubtasksAgenda,
    form.notificarSistema,
    form.notificarEmail,
    JSON.stringify(form.etiquetas),
    JSON.stringify(form.stickers),
    JSON.stringify(form.coResponsaveis),
    JSON.stringify(form.observadores),
    JSON.stringify(form.convidados),
    JSON.stringify(form.notasIds),
    JSON.stringify(form.dependenciasFichasIds),
    JSON.stringify(form.anexos)
  ]);

  // Integração com Dependências de outras Fichas
  const [vincularDepPopoverAberto, setVincularDepPopoverAberto] = useState(false);
  const [buscaDep, setBuscaDep] = useState('');

  const dependenciasFichasIds = useMemo(() => Array.isArray(form.dependenciasFichasIds) ? form.dependenciasFichasIds : [], [form.dependenciasFichasIds]);

  const progressoFichaAtual = useMemo(() => {
    const metaAtual = {
      ...obterMetaPadrao(),
      ...form,
      dependenciasFichasIds
    };
    const fichaSimulada = {
      ...(fichaOriginal || {}),
      cr4a1_descricao: form.descricao || '',
      cr4a1_atividades: JSON.stringify({ atividades: [], meta: metaAtual }),
      cr4a1_concluida: form.concluida ? 'Sim' : 'Não'
    };
    return calcularProgressoFicha(fichaSimulada, fichas);
  }, [form, dependenciasFichasIds, fichaOriginal, fichas]);

  const alternarDependencia = (depId) => {
    const atuais = dependenciasFichasIds;
    if (atuais.includes(depId)) {
      set('dependenciasFichasIds', atuais.filter(id => id !== depId));
    } else {
      set('dependenciasFichasIds', [...atuais, depId]);
    }
  };

  const fichasDependentesObjetos = useMemo(() => {
    return dependenciasFichasIds.map(id => {
      const encontrada = fichas.find(f => f.cr4a1_fichaid === id);
      if (!encontrada) return { cr4a1_fichaid: id, cr4a1_titulo: 'Ficha não encontrada ou externa' };
      const prog = calcularProgressoFicha(encontrada, fichas);
      return {
        ...encontrada,
        progresso: prog
      };
    });
  }, [dependenciasFichasIds, fichas]);

  const fichasCandidatasParaDependencia = useMemo(() => {
    const idAtual = fichaOriginal?.cr4a1_fichaid;
    return fichas.filter(f => {
      if (!f || !f.cr4a1_fichaid) return false;
      if (idAtual && f.cr4a1_fichaid === idAtual) return false;
      if (idAtual && detectarCicloDependencia(idAtual, f.cr4a1_fichaid, fichas)) return false;
      if (buscaDep.trim()) {
        const termo = buscaDep.toLowerCase();
        const tituloMatch = (f.cr4a1_titulo || '').toLowerCase().includes(termo);
        const respMatch = (f.cr4a1_responsavel_login || '').toLowerCase().includes(termo);
        const listaNome = listas.find(l => l.cr4a1_listaid === f.cr4a1_lista_id)?.cr4a1_nome || '';
        const listaMatch = listaNome.toLowerCase().includes(termo);
        return tituloMatch || respMatch || listaMatch;
      }
      return true;
    });
  }, [fichas, fichaOriginal, buscaDep, listas]);

  const handleSelectCor = (novaCor) => {
    set('cor', novaCor);
    if (novaCor) {
      onRegistrarCorRecente?.('ficha', novaCor);
    }
  };

  // Integração com o módulo de Notas
  const [vincularNotaPopoverAberto, setVincularNotaPopoverAberto] = useState(false);
  const [buscaNota, setBuscaNota] = useState('');
  const [notaEmVisualizacao, setNotaEmVisualizacao] = useState(null);
  const [criandoNotaLocal, setCriandoNotaLocal] = useState(false);

  const notasIds = useMemo(() => Array.isArray(form.notasIds) ? form.notasIds : [], [form.notasIds]);

  const alternarVinculoNota = (notaId) => {
    const atuais = notasIds;
    if (atuais.includes(notaId)) {
      set('notasIds', atuais.filter(id => id !== notaId));
    } else {
      set('notasIds', [...atuais, notaId]);
    }
  };

  const handleCriarNovaNota = async () => {
    if (!onCriarNota) return;
    setCriandoNotaLocal(true);
    try {
      const idCriada = await onCriarNota(form.titulo);
      if (idCriada) {
        set('notasIds', [...notasIds, idCriada]);
        toast.success('Nota criada e vinculada a esta ficha!');
      }
    } catch {
      toast.error('Erro ao criar nota para a ficha.');
    } finally {
      setCriandoNotaLocal(false);
    }
  };

  const notasVinculadasObjetos = useMemo(() => {
    return notasIds.map(id => {
      const encontrada = notas.find(n => n.cr4a1_notas_kairosid === id || n.cr4a1_id_da_nota === id);
      return encontrada || { cr4a1_notas_kairosid: id, cr4a1_titulo: 'Nota vinculada' };
    });
  }, [notasIds, notas]);

  const notasCandidatasParaVincular = useMemo(() => {
    return notas.filter(n => {
      const matchBusca = !buscaNota.trim() || (n.cr4a1_titulo || '').toLowerCase().includes(buscaNota.toLowerCase());
      return matchBusca;
    });
  }, [notas, buscaNota]);
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
  const alternarCoResponsavel = (login) => {
    const atuais = form.coResponsaveis || [];
    set('coResponsaveis', atuais.includes(login) ? atuais.filter(u => u !== login) : [...atuais, login]);
  };
  const alternarObservador = (login) => {
    const atuais = form.observadores || [];
    set('observadores', atuais.includes(login) ? atuais.filter(u => u !== login) : [...atuais, login]);
  };
  const seguindo = (form.observadores || []).includes(usuarioAtual);
  const imagensAnexadas = useMemo(
    () => (form.anexos || []).filter(a => a.type?.startsWith('image/')),
    [form.anexos]
  );

  // Com microtarefas na descrição, "concluída" deixa de ser uma escolha manual — ela
  // reflete se todas as microtarefas estão marcadas (mesma regra do card na lista).
  const tarefasDaDescricao = useMemo(() => extrairTarefas(form.descricao), [form.descricao]);
  const temTarefas = tarefasDaDescricao.length > 0;
  const concluidaDerivada = temTarefas && tarefasDaDescricao.every(t => t.concluida);

  // A cor é escolhida aqui dentro (no form), então o cabeçalho também mora aqui — assim ele
  // já reflete a cor escolhida na hora, igual ao Trello faz ao editar o cover do card.
  const corCabecalho = form.cor ? corTextoLegivel(form.cor) : null;

  // Resolução do autor da ficha, lista e data de criação para exibição no topo
  const criadorLogin = fichaOriginal?.cr4a1_criador_login || atividades?.find(a => a.tipo === 'criada')?.autor || usuarioAtual;
  const criadorNome = nomeDe(criadorLogin, allUsers);
  const criadaAtividade = atividades?.find(a => a.tipo === 'criada');
  const dataCriacaoFormatada = criadaAtividade?.quando
    ? format(new Date(criadaAtividade.quando), 'dd/MM/yyyy')
    : (fichaOriginal?.createdon ? format(new Date(fichaOriginal.createdon), 'dd/MM/yyyy') : null);
  const listaAtual = listas.find(l => l.cr4a1_listaid === form.listaId);

  // Convidados externos da ficha e da lista atual (exclui automaticamente quem já é membro do workspace)
  const convidadosDaListaAtual = useMemo(
    () => parseListaConvidados(listaAtual?.cr4a1_automacao).filter(c => !membrosBaseLoginsSet.has(String(c).toLowerCase())),
    [listaAtual, membrosBaseLoginsSet]
  );
  const convidadosDaFichaAtual = useMemo(
    () => (Array.isArray(form.convidados) ? form.convidados : []).filter(c => !membrosBaseLoginsSet.has(String(c).toLowerCase())),
    [form.convidados, membrosBaseLoginsSet]
  );
  const usuariosExternosCandidatos = useMemo(() => {
    const termo = buscaConvidado.trim().toLowerCase();
    return (allUsers || []).filter(u => {
      const loginLower = String(u.cr4a1_username || '').toLowerCase();
      if (!loginLower || membrosBaseLoginsSet.has(loginLower)) return false;
      if (!termo) return true;
      const nome = String(u.cr4a1_nome_exibicao || '').toLowerCase();
      return nome.includes(termo) || loginLower.includes(termo);
    });
  }, [allUsers, membrosBaseLoginsSet, buscaConvidado]);

  // Pessoas atribuíveis (membros do workspace + convidados desta ficha/lista)
  const pessoasAtribuiveis = useMemo(() => {
    const base = membros.length ? [...membros] : [...allUsers];
    const extrasLogins = new Set([...convidadosDaFichaAtual, ...convidadosDaListaAtual].map(c => String(c).toLowerCase()));
    for (const u of (allUsers || [])) {
      const loginLower = String(u.cr4a1_username || '').toLowerCase();
      if (extrasLogins.has(loginLower) && !base.some(m => String(m.cr4a1_username || '').toLowerCase() === loginLower)) {
        base.push(u);
      }
    }
    return base;
  }, [membros, allUsers, convidadosDaFichaAtual, convidadosDaListaAtual]);

  // Estilos de botões do cabeçalho que garantem contraste absoluto (sem texto branco sobre fundo branco)
  const getHeaderBtnClass = (ativo = false) => {
    if (!corCabecalho) return '';
    const isLightText = corCabecalho.principal === '#ffffff';
    if (isLightText) {
      if (ativo) {
        return '!bg-white !text-slate-900 !border-white font-bold shadow-md hover:!bg-white/90 active:scale-95 transition-all';
      }
      return '!bg-black/25 !text-white !border-white/30 backdrop-blur-sm hover:!bg-white hover:!text-slate-900 hover:!border-white hover:shadow-md active:scale-95 transition-all';
    } else {
      if (ativo) {
        return '!bg-slate-900 !text-white !border-slate-900 font-bold shadow-md hover:!bg-slate-800 active:scale-95 transition-all';
      }
      return '!bg-white/50 !text-slate-900 !border-black/20 backdrop-blur-sm hover:!bg-slate-900 hover:!text-white hover:!border-slate-900 hover:shadow-md active:scale-95 transition-all';
    }
  };

  const alternarCronometroLocal = () => {
    if (form.cronometroInicio) {
      const inicioMs = new Date(form.cronometroInicio).getTime();
      const deltaMin = Number.isNaN(inicioMs) ? 0 : Math.max(1, Math.round((Date.now() - inicioMs) / 60000));
      setForm(prev => ({
        ...prev,
        tempoGastoMin: (Number(prev.tempoGastoMin) || 0) + deltaMin,
        cronometroInicio: null
      }));
    } else {
      set('cronometroInicio', new Date().toISOString());
    }
  };

  if (!isEditing) {
    return (
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden bg-background">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col">
          {/* Topo / Capa da Ficha no Modo de Visualização */}
          <DialogHeader
            className="p-4 sm:p-6 pb-4 border-b border-border/50 bg-card rounded-t-[28px] sm:rounded-t-none flex flex-col gap-3 mb-0 shrink-0 transition-colors pr-3 sm:pr-8"
            style={corCabecalho ? { backgroundColor: form.cor } : undefined}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 pr-8 sm:pr-0">
                <UserAvatar login={criadorLogin} allUsers={allUsers} size={28} className="ring-2 ring-background/30 shadow-sm shrink-0" />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="text-xs sm:text-sm font-semibold truncate"
                      style={{ color: corCabecalho ? corCabecalho.principal : undefined }}
                    >
                      {criadorNome}
                    </span>
                    {form.ehModelo && (
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 shrink-0">📋 Modelo</Badge>
                    )}
                    {progressoFichaAtual.concluida && (
                      <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] py-0 px-1.5 h-4 shrink-0 font-bold">
                        ✓ Concluída
                      </Badge>
                    )}
                  </div>
                  <span
                    className="text-[11px] truncate"
                    style={{ color: corCabecalho ? corCabecalho.suave : undefined }}
                  >
                    {listaAtual ? `na lista ${listaAtual.cr4a1_nome}` : ''} {workspaceNome ? `• ${workspaceNome}` : ''} {dataCriacaoFormatada ? `• ${dataCriacaoFormatada}` : ''}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 shrink-0 sm:pr-8">
                {/* Botão de Editar em destaque no cabeçalho */}
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="gap-1.5 font-semibold shadow-sm h-8 px-3 text-xs"
                  onClick={() => setIsEditing(true)}
                  title="Editar informações desta ficha"
                >
                  <Pencil className="size-3.5" />
                  <span>Editar Ficha</span>
                </Button>

                {/* Botão de Convidar pessoa externa ao workspace (ficha ou lista inteira) */}
                {!souApenasConvidado && onConvidarExterno && (
                  <Popover open={convidarPopoverAberto} onOpenChange={setConvidarPopoverAberto}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={`${getHeaderBtnClass(convidadosDaFichaAtual.length > 0 || convidadosDaListaAtual.length > 0)} gap-1.5 h-8 px-2.5 text-xs`}
                        title="Convidar alguém de fora do workspace para ver esta ficha ou a lista inteira"
                      >
                        <UserPlus className="size-3.5" />
                        <span className="hidden sm:inline">Convidar</span>
                        {(convidadosDaFichaAtual.length + convidadosDaListaAtual.length) > 0 && (
                          <Badge variant="secondary" className="px-1 py-0 text-[10px] h-4">
                            {convidadosDaFichaAtual.length + convidadosDaListaAtual.length}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 max-w-[calc(100vw-24px)] p-3 flex flex-col gap-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <UserPlus className="size-3.5 text-primary" /> Convidar pessoa externa
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Convide alguém de fora deste workspace e escolha o nível de acesso. Ela será notificada.
                        </span>
                      </div>

                      {/* Seletor de Escopo: Somente esta ficha vs Lista inteira */}
                      <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-secondary/70 p-1 border border-border">
                        <button
                          type="button"
                          onClick={() => setEscopoConvite('ficha')}
                          className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all ${
                            escopoConvite === 'ficha'
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Somente esta ficha
                        </button>
                        <button
                          type="button"
                          onClick={() => setEscopoConvite('lista')}
                          className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all ${
                            escopoConvite === 'lista'
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Lista inteira
                        </button>
                      </div>

                      <Input
                        value={buscaConvidado}
                        onChange={e => setBuscaConvidado(e.target.value)}
                        placeholder="Buscar usuário externo..."
                        className="h-8 text-xs"
                      />

                      <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                        {usuariosExternosCandidatos.length === 0 ? (
                          <p className="py-3 text-center text-[11px] text-muted-foreground">
                            Nenhum usuário externo encontrado.
                          </p>
                        ) : (
                          usuariosExternosCandidatos.map(u => {
                            const loginLower = String(u.cr4a1_username || '').toLowerCase();
                            const naLista = convidadosDaListaAtual.some(c => String(c).toLowerCase() === loginLower);
                            const naFicha = convidadosDaFichaAtual.some(c => String(c).toLowerCase() === loginLower);
                            const jaConvidadoNoEscopo = escopoConvite === 'lista' ? naLista : (naFicha || naLista);
                            return (
                              <div
                                key={u.cr4a1_username}
                                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-secondary/30 px-2 py-1.5 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <UserAvatar login={u.cr4a1_username} allUsers={allUsers} size={20} />
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-semibold truncate text-foreground">{u.cr4a1_nome_exibicao || u.cr4a1_username}</span>
                                    {(naLista || naFicha) && (
                                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                        {naLista ? 'Convidado na lista inteira' : 'Convidado nesta ficha'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={jaConvidadoNoEscopo ? 'secondary' : 'default'}
                                  disabled={jaConvidadoNoEscopo}
                                  className="h-7 px-2 text-[11px] shrink-0"
                                  onClick={() => onConvidarExterno({
                                    login: u.cr4a1_username,
                                    escopo: escopoConvite,
                                    lista: listaAtual
                                  })}
                                >
                                  {jaConvidadoNoEscopo ? 'Convidado' : 'Convidar'}
                                </Button>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Convidados ativos */}
                      {(convidadosDaFichaAtual.length > 0 || convidadosDaListaAtual.length > 0) && (
                        <div className="border-t border-border pt-2 flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Convidados com acesso
                          </span>
                          <div className="flex flex-col gap-1 max-h-28 overflow-y-auto">
                            {convidadosDaFichaAtual.map(login => (
                              <div key={`f-${login}`} className="flex items-center justify-between gap-1.5 text-xs bg-secondary/50 rounded-lg px-2 py-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <UserAvatar login={login} allUsers={allUsers} size={16} />
                                  <span className="truncate font-medium">{nomeDe(login, allUsers)}</span>
                                  <Badge variant="outline" className="text-[9px] py-0 px-1 shrink-0">Ficha</Badge>
                                </div>
                                {onRemoverConvidado && (
                                  <button
                                    type="button"
                                    onClick={() => onRemoverConvidado({ login, escopo: 'ficha', lista: listaAtual })}
                                    className="text-muted-foreground hover:text-destructive p-0.5"
                                    title="Remover convidado da ficha"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {convidadosDaListaAtual.map(login => (
                              <div key={`l-${login}`} className="flex items-center justify-between gap-1.5 text-xs bg-blue-500/10 rounded-lg px-2 py-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <UserAvatar login={login} allUsers={allUsers} size={16} />
                                  <span className="truncate font-medium">{nomeDe(login, allUsers)}</span>
                                  <Badge variant="outline" className="text-[9px] py-0 px-1 border-blue-500/40 text-blue-600 dark:text-blue-400 shrink-0">Lista inteira</Badge>
                                </div>
                                {onRemoverConvidado && (
                                  <button
                                    type="button"
                                    onClick={() => onRemoverConvidado({ login, escopo: 'lista', lista: listaAtual })}
                                    className="text-muted-foreground hover:text-destructive p-0.5"
                                    title="Remover convidado da lista"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                )}

                <Button
                  type="button"
                  size="sm"
                  variant={seguindo ? 'default' : 'outline'}
                  className={`${getHeaderBtnClass(seguindo)} h-8 px-2.5 text-xs`}
                  onClick={() => alternarObservador(usuarioAtual)}
                  title="Receber alertas sobre movimentações e comentários desta ficha"
                >
                  {seguindo ? <Bell className="size-3.5 fill-current" /> : <Bell className="size-3.5" />}
                  <span className="hidden sm:inline">{seguindo ? 'Seguindo' : 'Seguir'}</span>
                </Button>

                {onDuplicar && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={`${getHeaderBtnClass(false)} h-8 px-2.5 text-xs`}
                    onClick={onDuplicar}
                    title="Criar uma cópia idêntica desta ficha"
                  >
                    <Copy className="size-3.5" />
                    <span className="hidden sm:inline">Duplicar</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Título Limpo e Elegante */}
            <div className="flex flex-col gap-1 mt-1">
              <DialogTitle asChild>
                <h2
                  className="text-lg sm:text-2xl font-bold tracking-tight leading-snug break-words"
                  style={{ color: corCabecalho ? corCabecalho.principal : undefined }}
                >
                  {form.titulo || 'Ficha sem título'}
                </h2>
              </DialogTitle>
              <DialogDescription className="sr-only">
                {workspaceNome || 'Ficha do quadro'}
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Corpo no Modo de Visualização */}
          <div className="p-4 sm:p-6 flex flex-col gap-4">
            {/* Metadados Chave em Grade de Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Responsável */}
              <div className="flex flex-col gap-1 rounded-xl border border-border bg-secondary/40 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <UserCircle2 className="size-3 text-primary" /> Responsável
                </span>
                <div className="flex items-center gap-2 mt-0.5 min-w-0">
                  <UserAvatar login={form.responsavel} allUsers={allUsers} size={20} className="shrink-0" />
                  <span className="text-xs font-semibold truncate">{nomeDe(form.responsavel, allUsers)}</span>
                </div>
              </div>

              {/* Prazo — editável diretamente no modo de visualização estilo Trello */}
              <Popover open={prazoPopoverAberto} onOpenChange={setPrazoPopoverAberto}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex flex-col gap-1 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/75 hover:border-primary/50 p-2.5 text-left transition-all cursor-pointer group"
                    title="Clique para alterar data e hora diretamente"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between w-full gap-1">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3 text-primary" /> Prazo
                      </span>
                      <Pencil className="size-2.5 opacity-60 group-hover:opacity-100 group-hover:text-primary transition-opacity" />
                    </span>
                    {form.dia ? (
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs font-semibold">
                          {format(new Date(`${form.dia}T${form.hora || '08:00'}:00`), 'dd/MM/yyyy')}
                          {form.hora ? ` às ${form.hora}` : ''}
                        </span>
                        {form.sincronizarAgenda && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1 border-primary/40 text-primary bg-primary/10 font-bold">
                            Agenda
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic mt-0.5">Definir data e hora...</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 sm:w-80 p-3 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <CalendarDays className="size-3.5 text-primary" /> Datas da Ficha
                    </span>
                    {form.dia && (
                      <button
                        type="button"
                        onClick={() => {
                          cancelarAutosavePendente();
                          const atualizado = { ...form, dia: '', sincronizarAgenda: false };
                          setForm(atualizado);
                          onSaveRapido?.(atualizado, 'Prazo removido.');
                          setPrazoPopoverAberto(false);
                        }}
                        className="text-[11px] text-destructive hover:underline font-medium"
                      >
                        Remover prazo
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    <DateField
                      label="Data de entrega"
                      selectedDate={form.dia}
                      onSelect={d => setForm(prev => {
                        const tinhaDia = Boolean(prev.dia);
                        const temDia = Boolean(d);
                        return {
                          ...prev,
                          dia: d,
                          sincronizarAgenda: !temDia ? false : (!tinhaDia ? true : prev.sincronizarAgenda)
                        };
                      })}
                      allowClear
                    />
                    <TimeField
                      label="Horário"
                      value={form.hora}
                      onSelect={h => set('hora', h)}
                      disabled={!form.dia}
                    />
                  </div>
                  {form.dia && (
                    <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-2.5 py-2">
                      <div className="pr-2">
                        <p className="text-xs font-semibold text-foreground">Sincronizar com a Agenda</p>
                        <p className="text-[10px] text-muted-foreground">Opcional: exibir prazo da ficha no Calendário</p>
                      </div>
                      <Switch
                        checked={Boolean(form.sincronizarAgenda)}
                        onCheckedChange={v => set('sincronizarAgenda', v)}
                      />
                    </div>
                  )}
                  {temTarefas && (
                    <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-2.5 py-2">
                      <div className="pr-2">
                        <p className="text-xs font-semibold text-foreground">Sincronizar subtasks na Agenda</p>
                        <p className="text-[10px] text-muted-foreground">Opcional: exibir subtasks com prazo no Calendário</p>
                      </div>
                      <Switch
                        checked={Boolean(form.sincronizarSubtasksAgenda)}
                        onCheckedChange={v => set('sincronizarSubtasksAgenda', v)}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setPrazoPopoverAberto(false)}
                    >
                      Fechar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs font-semibold"
                      onClick={() => {
                        cancelarAutosavePendente();
                        onSaveRapido?.(form, 'Prazo atualizado.');
                        setPrazoPopoverAberto(false);
                      }}
                    >
                      Salvar prazo
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Prioridade — editável diretamente no modo de visualização estilo Trello */}
              <Popover open={prioridadePopoverAberto} onOpenChange={setPrioridadePopoverAberto}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex flex-col gap-1 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/75 hover:border-primary/50 p-2.5 text-left transition-all cursor-pointer group"
                    title="Clique para alterar a prioridade diretamente"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between w-full gap-1">
                      <span className="flex items-center gap-1">
                        <Flag className="size-3 text-primary" /> Prioridade
                      </span>
                      <Pencil className="size-2.5 opacity-60 group-hover:opacity-100 group-hover:text-primary transition-opacity" />
                    </span>
                    {form.prioridade && PRIORIDADES_FICHA[form.prioridade] ? (
                      <span
                        className="text-xs font-bold mt-0.5 flex items-center gap-1.5"
                        style={{ color: PRIORIDADES_FICHA[form.prioridade].cor }}
                      >
                        <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: PRIORIDADES_FICHA[form.prioridade].cor }} />
                        {PRIORIDADES_FICHA[form.prioridade].label}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic mt-0.5">Definir prioridade...</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 p-2 flex flex-col gap-1">
                  <div className="px-2 py-1.5 text-xs font-bold text-foreground border-b border-border flex items-center gap-1.5">
                    <Flag className="size-3.5 text-primary" /> Alterar Prioridade
                  </div>
                  <div className="flex flex-col gap-0.5 pt-1">
                    {['critica', 'alta', 'media', 'baixa', ''].map(chave => {
                      const info = PRIORIDADES_FICHA[chave];
                      if (!info) return null;
                      const selecionada = (form.prioridade || '') === chave;
                      return (
                        <button
                          key={chave || '__sem__'}
                          type="button"
                          onClick={() => {
                            cancelarAutosavePendente();
                            const atualizado = { ...form, prioridade: chave };
                            setForm(atualizado);
                            onSaveRapido?.(atualizado, 'Prioridade atualizada.');
                            setPrioridadePopoverAberto(false);
                          }}
                          className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer ${
                            selecionada ? 'bg-primary/10 font-bold text-primary' : 'hover:bg-secondary text-foreground'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className="size-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: chave ? info.cor : '#94a3b8' }}
                            />
                            <span style={chave ? { color: info.cor } : undefined}>{info.label}</span>
                          </span>
                          {selecionada && <Check className="size-3.5 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Status de Conclusão / Progresso */}
              <div className="flex flex-col gap-1 rounded-xl border border-border bg-secondary/40 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="size-3 text-primary" /> Status
                </span>
                <span className={`text-xs font-bold mt-0.5 ${progressoFichaAtual.concluida ? 'text-emerald-500' : 'text-primary'}`}>
                  {progressoFichaAtual.concluida ? '✓ Concluída' : `${progressoFichaAtual.porcentagem}% Pendente`}
                </span>
              </div>
            </div>

            {/* Co-responsáveis (se houver) */}
            {Array.isArray(form.coResponsaveis) && form.coResponsaveis.length > 0 && (
              <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-secondary/30 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Users className="size-3 text-primary" /> Co-responsáveis ({form.coResponsaveis.length})
                </span>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {form.coResponsaveis.map(u => (
                    <div key={u} className="flex items-center gap-1.5 bg-card px-2 py-0.5 rounded-full border border-border text-xs">
                      <UserAvatar login={u} allUsers={allUsers} size={16} />
                      <span className="font-medium">{nomeDe(u, allUsers)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Convidados Externos (se houver) */}
            {(convidadosDaFichaAtual.length > 0 || convidadosDaListaAtual.length > 0) && (
              <div className="flex flex-col gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/5 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <UserPlus className="size-3" /> Convidados Externos ({convidadosDaFichaAtual.length + convidadosDaListaAtual.length})
                </span>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {convidadosDaFichaAtual.map(u => (
                    <div key={`vf-${u}`} className="flex items-center gap-1.5 bg-card px-2 py-0.5 rounded-full border border-border text-xs">
                      <UserAvatar login={u} allUsers={allUsers} size={16} />
                      <span className="font-medium">{nomeDe(u, allUsers)}</span>
                      <Badge variant="outline" className="text-[9px] py-0 px-1">Ficha</Badge>
                    </div>
                  ))}
                  {convidadosDaListaAtual.map(u => (
                    <div key={`vl-${u}`} className="flex items-center gap-1.5 bg-card px-2 py-0.5 rounded-full border border-blue-500/30 text-xs">
                      <UserAvatar login={u} allUsers={allUsers} size={16} />
                      <span className="font-medium">{nomeDe(u, allUsers)}</span>
                      <Badge variant="outline" className="text-[9px] py-0 px-1 border-blue-500/40 text-blue-600 dark:text-blue-400">Lista inteira</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Etiquetas (se houver) */}
            {Array.isArray(form.etiquetas) && form.etiquetas.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {etiquetas.filter(et => form.etiquetas.includes(et.cr4a1_etiquetaid)).map(et => (
                  <EtiquetaChip key={et.cr4a1_etiquetaid} etiqueta={et} selecionada />
                ))}
              </div>
            )}

            {/* Metadados Opcionais (Aprovação, Custo, Link, Referência) */}
            {(form.statusAprovacao || form.custo || form.linkUrl || form.campoTexto) && (
              <div className="flex flex-wrap gap-2 text-xs">
                {form.statusAprovacao && STATUS_APROVACAO_FICHA[form.statusAprovacao] && (
                  <Badge variant="outline" className="px-2.5 py-1 text-xs">
                    {STATUS_APROVACAO_FICHA[form.statusAprovacao].label}
                  </Badge>
                )}
                {form.custo && (
                  <div className="flex items-center gap-1 bg-secondary/60 px-2.5 py-1 rounded-lg border border-border font-medium">
                    <DollarSign className="size-3 text-emerald-500" /> R$ {form.custo}
                  </div>
                )}
                {form.linkUrl && (
                  <a
                    href={form.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-secondary/60 hover:bg-secondary px-2.5 py-1 rounded-lg border border-border text-primary underline"
                  >
                    <ExternalLink className="size-3" /> Abrir Link Externo
                  </a>
                )}
                {form.campoTexto && (
                  <div className="flex items-center gap-1 bg-secondary/60 px-2.5 py-1 rounded-lg border border-border text-muted-foreground">
                    <span className="font-semibold text-foreground">Ref:</span> {form.campoTexto}
                  </div>
                )}
              </div>
            )}

            {/* Barra de Progresso Geral da Ficha */}
            {(temTarefas || dependenciasFichasIds.length > 0) && (
              <div className="rounded-xl border border-border bg-secondary/50 p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
                    Progresso Geral
                    {dependenciasFichasIds.length > 0 && (
                      <span className="text-[10px] font-normal normal-case">
                        ({dependenciasFichasIds.length} dependência{dependenciasFichasIds.length > 1 ? 's' : ''})
                      </span>
                    )}
                  </span>
                  <span className={progressoFichaAtual.porcentagem === 100 ? 'text-emerald-500 font-bold' : 'text-primary font-bold'}>
                    {progressoFichaAtual.porcentagem}% {progressoFichaAtual.porcentagem === 100 ? '✓ Concluída' : ''}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary border border-border/40">
                  <div
                    className={`h-full transition-all duration-300 ${progressoFichaAtual.porcentagem === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                    style={{ width: `${progressoFichaAtual.porcentagem}%` }}
                  />
                </div>
                {!progressoFichaAtual.podeConcluir && dependenciasFichasIds.length > 0 && (
                  <p className="text-[11px] text-amber-500 flex items-center gap-1 font-medium">
                    <Lock className="size-3 shrink-0" />
                    Esta ficha só atingirá 100% e conclusão quando todas as dependências forem concluídas.
                  </p>
                )}
              </div>
            )}

            {/* Dependências de outras Fichas (Visualização) */}
            {dependenciasFichasIds.length > 0 && (
              <div className="rounded-xl border border-border bg-secondary/40 p-3 flex flex-col gap-2.5">
                <Label className="mb-0 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                  <Lock className="size-3.5 text-amber-500" /> Dependências ({fichasDependentesObjetos.length})
                </Label>
                <div className="flex flex-col gap-1.5">
                  {fichasDependentesObjetos.map(dep => {
                    const concluida = dep.cr4a1_concluida === 'Sim' || dep.progresso?.concluida;
                    return (
                      <div
                        key={dep.cr4a1_fichaid}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/60 bg-card text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {concluida ? (
                            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Clock className="size-4 text-amber-500 shrink-0" />
                          )}
                          <span className={`font-semibold truncate ${concluida ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {dep.cr4a1_titulo}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[11px] font-bold ${concluida ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {concluida ? '100% ✓' : `${dep.progresso?.porcentagem ?? 0}%`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Descrição Formatada */}
            {extrairDescricaoSemTarefas(form.descricao)?.trim() ? (
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Descrição
                </Label>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm text-foreground/90 leading-relaxed overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: extrairDescricaoSemTarefas(form.descricao) }}
                />
              </div>
            ) : !temTarefas ? (
              <div className="rounded-xl border border-dashed border-border/70 p-4 text-center">
                <p className="text-xs text-muted-foreground italic">Esta ficha não possui descrição detalhada.</p>
              </div>
            ) : null}

            {/* Microtarefas / Checklist Interativo */}
            {temTarefas && (
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-primary" /> Checklist ({tarefasDaDescricao.filter(t => t.concluida).length}/{tarefasDaDescricao.length})
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Clique para marcar/desmarcar</span>
                </div>
                <div className="flex flex-col gap-1.5 mt-1">
                  {tarefasDaDescricao.map((t, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        const novaDesc = alternarTarefaNaDescricao(form.descricao || '', t.index);
                        set('descricao', novaDesc);
                      }}
                      className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-secondary/70 cursor-pointer transition-colors border border-border/40 bg-secondary/20"
                    >
                      <button
                        type="button"
                        className="mt-0.5 shrink-0 text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          const novaDesc = alternarTarefaNaDescricao(form.descricao || '', t.index);
                          set('descricao', novaDesc);
                        }}
                      >
                        {t.concluida ? (
                          <CheckCircle2 className="size-4 text-emerald-500 fill-emerald-500/10" />
                        ) : (
                          <Circle className="size-4 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs sm:text-sm font-medium ${t.concluida ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {t.texto}
                        </p>
                        {(t.dataVencimento || t.responsavel || t.lembreteHoras) && (
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                            {t.dataVencimento && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="size-3" />
                                {format(new Date(t.dataVencimento.includes('T') ? t.dataVencimento : `${t.dataVencimento}T12:00:00`), 'dd/MM/yyyy')}
                              </span>
                            )}
                            {t.responsavel && (
                              <span className="flex items-center gap-1">
                                <UserCircle2 className="size-3" />
                                {nomeDe(t.responsavel, allUsers)}
                              </span>
                            )}
                            {t.lembreteHoras && (
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                <Bell className="size-3" />
                                {t.lembreteHoras}h antes
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Anexos (se houver) */}
            {Array.isArray(form.anexos) && form.anexos.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <AttachmentsField
                  anexos={form.anexos}
                  label={`Anexos (${form.anexos.length})`}
                  readOnly
                />
              </div>
            )}

            {/* Notas Vinculadas (se houver) */}
            {notasVinculadasObjetos.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="size-3.5 text-primary" /> Notas Vinculadas ({notasVinculadasObjetos.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {notasVinculadasObjetos.map(n => (
                    <button
                      key={n.cr4a1_notas_kairosid || n.cr4a1_id_da_nota}
                      type="button"
                      onClick={() => setNotaEmVisualizacao(n)}
                      className="flex items-center gap-2 bg-secondary/60 hover:bg-secondary p-2 rounded-lg border border-border text-xs transition-colors"
                    >
                      {n.cr4a1_cor && (
                        <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: n.cr4a1_cor }} />
                      )}
                      <span className="font-semibold text-foreground">{n.cr4a1_titulo || 'Nota vinculada'}</span>
                      <Eye className="size-3 text-muted-foreground ml-1" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Comentários da Ficha */}
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MessageCircle className="size-3.5 text-primary" /> Comentários ({comentarios.length})
              </Label>
              <div className="flex gap-2">
                <MentionInput
                  allUsers={allUsers}
                  value={novoComentario}
                  onChange={e => setNovoComentario(e.target.value)}
                  placeholder="Escreva um comentário ou use @ para mencionar..."
                  className="h-9 text-xs flex-1 bg-secondary/50"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      comentarEnviar();
                    }
                  }}
                />
                <Button type="button" size="sm" onClick={comentarEnviar} disabled={!novoComentario.trim()} className="h-9 px-3 gap-1">
                  <Send className="size-3.5" />
                  <span className="hidden sm:inline">Enviar</span>
                </Button>
              </div>

              {comentarios.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  {comentarios.map(c => (
                    <div key={c.id} className="rounded-lg border border-border bg-secondary/30 p-2.5 text-xs flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <UserAvatar login={c.autor} allUsers={allUsers} size={18} />
                          <span className="font-bold text-foreground">{nomeDe(c.autor, allUsers)}</span>
                          <span className="text-[10px] text-muted-foreground">— {format(new Date(c.data), 'dd/MM/yyyy HH:mm')}</span>
                        </div>
                        {onRemoverComentario && (c.autor === usuarioAtual || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => onRemoverComentario(c.id)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded"
                            title="Excluir comentário"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-foreground whitespace-pre-wrap pl-6">{c.texto}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Histórico de Atividades Colapsável */}
            {atividades.length > 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors"
                  onClick={() => setAtividadesAbertas(!atividadesAbertas)}
                >
                  <History className="size-3.5" />
                  {atividadesAbertas ? 'Ocultar histórico de atividades' : 'Ver histórico de atividades'}
                </button>
                {atividadesAbertas && (
                  <div className="mt-2 flex flex-col gap-1.5 border-l-2 border-border pl-3">
                    {[...atividades].reverse().map(a => (
                      <div key={a.id} className="text-[11px] text-muted-foreground">
                        <span>{descricaoAtividade(a, (login) => nomeDe(login, allUsers))}</span>
                        <span className="ml-1.5 text-[10px]">— {format(new Date(a.data), 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé no Modo de Visualização */}
        <DialogFooter className="shrink-0 p-3 sm:p-4 border-t border-border/60 bg-card/95 backdrop-blur-md flex-nowrap items-center justify-between gap-1.5 sm:gap-2 shadow-lg mt-0">
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
            <Button type="button" variant="ghost" size="sm" className="text-destructive h-9 px-2 sm:px-3 text-xs sm:text-sm" onClick={onDelete}>
              <Trash2 className="size-3.5 sm:size-4" /> <span className="hidden sm:inline">Excluir</span>
            </Button>
            {onToggleArquivo && (
              <Button type="button" variant="outline" size="sm" className="h-9 px-2.5 sm:px-3 text-xs sm:text-sm" onClick={onToggleArquivo}>
                {arquivada ? (
                  <>
                    <ArchiveRestore className="size-3.5 sm:size-4" /> <span className="truncate">Restaurar</span>
                  </>
                ) : (
                  <>
                    <Archive className="size-3.5 sm:size-4" /> <span className="truncate">Arquivar</span>
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button variant="outline" size="sm" className="h-9 px-3 sm:px-4 text-xs sm:text-sm" onClick={onCancel}>
              Fechar
            </Button>
            <Button size="sm" className="h-9 px-3 sm:px-4 text-xs sm:text-sm gap-1.5 font-semibold" onClick={() => setIsEditing(true)}>
              <Pencil className="size-3.5" />
              <span>Editar Ficha</span>
            </Button>
          </div>
        </DialogFooter>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col">
        {/* Topo / Capa da Ficha com Autor, Ações, Título e Descrição */}
        <DialogHeader
          className="p-3 sm:p-6 pb-3.5 sm:pb-4 border-b border-border/50 bg-card rounded-t-[28px] sm:rounded-t-none flex flex-col gap-3 mb-0 shrink-0 transition-colors pr-3 sm:pr-8"
          style={corCabecalho ? {
            backgroundColor: form.cor
          } : undefined}
        >
          {/* Linha 1: Autor, Workspace/Lista, Badges e Botões de Ação */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 pr-8 sm:pr-0">
              <UserAvatar login={criadorLogin} allUsers={allUsers} size={28} className="ring-2 ring-background/30 shadow-sm shrink-0" />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className="text-xs sm:text-sm font-semibold truncate"
                    style={{ color: corCabecalho ? corCabecalho.principal : undefined }}
                  >
                    {criadorNome}
                  </span>
                  {form.ehModelo && (
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 shrink-0">📋 Modelo</Badge>
                  )}
                </div>
                <span
                  className="text-[11px] truncate"
                  style={{ color: corCabecalho ? corCabecalho.suave : undefined }}
                >
                  {listaAtual ? `na lista ${listaAtual.cr4a1_nome}` : ''} {workspaceNome ? `• ${workspaceNome}` : ''} {dataCriacaoFormatada ? `• ${dataCriacaoFormatada}` : ''}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 shrink-0 sm:pr-8">
              {/* Indicador de Salvamento Automático */}
              {autosaveStatus === 'saving' && (
                <div className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
                  corCabecalho
                    ? 'bg-black/25 text-white border-white/20'
                    : 'bg-secondary text-muted-foreground border-border'
                }`}>
                  <Loader2 className="size-3 animate-spin" />
                  <span className="hidden sm:inline">Salvando...</span>
                </div>
              )}
              {autosaveStatus === 'saved' && (
                <div className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
                  corCabecalho
                    ? 'bg-black/25 text-white border-white/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}>
                  <Check className="size-3" />
                  <span className="hidden sm:inline">Salvo</span>
                </div>
              )}

              <Button
                type="button"
                size="sm"
                variant="outline"
                className={`${getHeaderBtnClass(false)} gap-1 max-sm:px-2 max-sm:text-xs max-sm:h-8`}
                onClick={() => setIsEditing(false)}
                title="Voltar para o modo de visualização"
              >
                <Eye className="size-3.5" />
                <span className="hidden sm:inline">Visualizar</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={seguindo ? 'default' : 'outline'}
                className={`${getHeaderBtnClass(seguindo)} max-sm:px-2.5 max-sm:text-xs max-sm:h-8`}
                onClick={() => alternarObservador(usuarioAtual)}
                title="Receber alertas sobre movimentações e comentários desta ficha"
              >
                {seguindo ? <Bell className="size-3.5 fill-current" /> : <Bell className="size-3.5" />}
                {seguindo ? 'Seguindo' : 'Seguir'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={form.ehModelo ? 'default' : 'outline'}
                className={`${getHeaderBtnClass(form.ehModelo)} max-sm:px-2.5 max-sm:text-xs max-sm:h-8`}
                onClick={() => set('ehModelo', !form.ehModelo)}
                title="Transformar esta ficha em um Modelo reutilizável"
              >
                <LayoutTemplate className="size-3.5" />
                {form.ehModelo ? 'É Modelo' : 'Tornar Modelo'}
              </Button>
              {onDuplicar && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={`${getHeaderBtnClass(false)} max-sm:px-2.5 max-sm:text-xs max-sm:h-8`}
                  onClick={onDuplicar}
                  title="Criar uma cópia idêntica desta ficha"
                >
                  <Copy className="size-3.5" /> Duplicar
                </Button>
              )}
            </div>
          </div>

          {/* Linha 2: Título da Ficha */}
          <div className="flex flex-col gap-1">
            <Label
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: corCabecalho ? corCabecalho.suave : undefined }}
            >
              Título da Ficha
            </Label>
            <DialogTitle asChild>
              <div className="w-full">
                <MentionTextarea
                  allUsers={allUsers}
                  value={form.titulo}
                  onChange={e => set('titulo', e.target.value)}
                  placeholder="Título da ficha..."
                  rows={1}
                  autoResize
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  className={`w-full text-lg sm:text-2xl font-bold tracking-tight rounded-xl px-3 py-2 transition-all outline-none focus:outline-none focus:ring-2 focus:ring-primary resize-none overflow-hidden leading-snug break-words ${
                    corCabecalho
                      ? 'bg-black/15 placeholder:text-white/60 text-white border border-white/20'
                      : 'bg-secondary/60 hover:bg-secondary border border-border placeholder:text-muted-foreground text-foreground'
                  }`}
                  style={{
                    color: corCabecalho ? corCabecalho.principal : undefined
                  }}
                />
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">
              {workspaceNome || 'Ficha do quadro'}
            </DialogDescription>
          </div>

          {/* Linha 3: Descrição da Ficha */}
          <div className={`flex flex-col gap-1.5 ${corCabecalho ? 'rounded-2xl bg-card p-3 sm:p-4 text-foreground shadow-sm border border-border/50' : ''}`}>
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Descrição
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Use o ícone de checklist para criar microtarefas — elas aparecem e podem ser marcadas direto no card.
            </p>
            <RichTextEditor
              value={form.descricao}
              onChange={v => set('descricao', v)}
              onEditorReady={setEditorDescricao}
              allUsers={allUsers}
              coresRecentes={coresRecentesMarcaTexto}
              onSelectCorRecente={(hex) => onRegistrarCorRecente?.('marcaTexto', hex)}
            />
          </div>

          {/* Microtarefas vinculadas à descrição */}
          {temTarefas && (
            <div className={`flex flex-col gap-1.5 ${corCabecalho ? 'rounded-2xl bg-card p-3 sm:p-4 text-foreground shadow-sm border border-border/50' : ''}`}>
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Microtarefas — prazo, responsável e lembrete
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Ao atribuir uma subtarefa e salvar a ficha, o responsável é notificado na Agenda, no sistema e por e-mail — e novamente no horário de lembrete escolhido.
              </p>
              <div className="flex flex-col gap-1.5">
                {tarefasDaDescricao.map(t => (
                  <div key={t.index} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-secondary px-2.5 sm:px-3 py-1.5 text-sm">
                    <span className={`min-w-[140px] flex-1 truncate ${t.concluida ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{t.texto}</span>
                    <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end">
                      <div className="w-28 sm:w-32">
                        <DateField
                          compact
                          selectedDate={t.dataVencimento || ''}
                          onSelect={d => aplicarAtributoTarefa(editorDescricao, t.index, { due: d || null })}
                          placeholder="Sem prazo"
                          allowClear
                          className="h-8 text-[11px]"
                        />
                      </div>
                      <Select
                        value={t.responsavel || '__nenhum__'}
                        onValueChange={v => aplicarAtributoTarefa(editorDescricao, t.index, { assignee: v === '__nenhum__' ? null : v })}
                      >
                        <SelectTrigger className="h-8 w-32 sm:w-36 shrink-0 text-xs"><SelectValue placeholder="Responsável" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__nenhum__">Sem responsável</SelectItem>
                          {opcoesComAtual(pessoasAtribuiveis, t.responsavel, allUsers).map(u => (
                            <SelectItem key={u.cr4a1_username} value={u.cr4a1_username}>{u.cr4a1_nome_exibicao || u.cr4a1_username}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={t.lembreteHoras || '__nenhum__'}
                        onValueChange={v => aplicarAtributoTarefa(editorDescricao, t.index, { reminder: v === '__nenhum__' ? null : v })}
                        disabled={!t.dataVencimento || !t.responsavel}
                      >
                        <SelectTrigger
                          className="h-8 w-32 shrink-0 text-xs"
                          title={!t.dataVencimento || !t.responsavel ? 'Defina prazo e responsável para ativar o lembrete' : 'Lembrete antes do prazo'}
                        >
                          <div className="flex items-center gap-1 truncate">
                            <Bell className="size-3 shrink-0 text-primary" />
                            <SelectValue placeholder="Lembrete" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__nenhum__">Sem lembrete</SelectItem>
                          <SelectItem value="48">48h antes</SelectItem>
                          <SelectItem value="24">24h antes</SelectItem>
                          <SelectItem value="12">12h antes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="p-4 sm:p-6 flex flex-col gap-4">

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
          <Label>Cor e Capa da Ficha</Label>
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-secondary p-2.5">
            {coresRecentes.length > 0 && (
              <div className="flex flex-col gap-1.5 border-b border-border/70 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Cores recentes
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {coresRecentes.map((hex, idx) => {
                    const corInfo = themeColors.find(c => c.hex.toLowerCase() === hex.toLowerCase());
                    const label = corInfo ? `${corInfo.label}${idx === 0 ? ' (Última usada)' : ''}` : hex;
                    const selecionada = (form.cor || '').toLowerCase() === hex.toLowerCase();
                    return (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => handleSelectCor(hex)}
                        title={label}
                        aria-label={label}
                        className="size-6 shrink-0 rounded-full transition-transform hover:scale-110 active:scale-90"
                        style={{
                          backgroundColor: hex,
                          boxShadow: selecionada || idx === 0
                            ? `0 0 0 2px var(--card), 0 0 0 4px ${hex}`
                            : 'none'
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectCor('')}
                title="Sem cor (Padrão)"
                aria-label="Sem cor (Padrão)"
                className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-card transition-transform active:scale-90"
              >
                {!form.cor ? <Check className="size-3.5 text-muted-foreground" /> : <Ban className="size-3 text-muted-foreground/60" />}
              </button>
              {themeColors.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCor(c.hex)}
                  title={c.label}
                  aria-label={c.label}
                  className="size-6 shrink-0 rounded-full transition-transform active:scale-90"
                  style={{ backgroundColor: c.hex, boxShadow: form.cor === c.hex ? `0 0 0 2px var(--card), 0 0 0 4px ${c.hex}` : 'none' }}
                />
              ))}
            </div>
            {form.cor && (
              <div className="flex items-center gap-1.5 pt-1 border-t border-border/60">
                <span className="text-[11px] text-muted-foreground mr-1">Estilo da capa:</span>
                {[
                  ['inteiro', 'Cartão inteiro'],
                  ['faixa', 'Faixa no topo']
                ].map(([modo, rotulo]) => (
                  <button
                    key={modo}
                    type="button"
                    onClick={() => set('capaModo', modo)}
                    className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold border transition-colors ${
                      (form.capaModo || 'inteiro') === modo
                        ? 'border-primary bg-primary/15 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            )}
            {imagensAnexadas.length > 1 && (
              <div className="flex flex-col gap-1 pt-1 border-t border-border/60">
                <span className="text-[11px] text-muted-foreground">Imagem de capa:</span>
                <div className="flex flex-wrap gap-1.5">
                  {imagensAnexadas.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => set('capaImagemIndex', idx)}
                      className={`overflow-hidden rounded-lg border-2 transition-all ${
                        (form.capaImagemIndex || 0) === idx ? 'border-primary ring-2 ring-primary/30' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img.base64} alt={img.name} className="h-9 w-12 object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <Label className="flex items-center justify-between">
            <span>Stickers</span>
            <span className="text-[10px] font-normal normal-case text-muted-foreground">{(form.stickers || []).length}/{MAX_STICKERS_POR_FICHA}</span>
          </Label>
          <div className="grid max-h-32 grid-cols-8 gap-1 overflow-y-auto rounded-xl border border-border bg-secondary p-2">
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
          <Label>Responsável Principal</Label>
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

      {/* Múltiplos Responsáveis (Co-responsáveis) & Observadores */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-secondary/60 p-2.5">
          <Label className="mb-1.5 flex items-center gap-1.5 text-xs">
            <Users className="size-3.5 text-primary" /> Co-responsáveis ({(form.coResponsaveis || []).length})
          </Label>
          <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
            {(membros.length ? membros : allUsers)
              .filter(u => u.cr4a1_username !== form.responsavel)
              .map(u => {
                const ativo = (form.coResponsaveis || []).includes(u.cr4a1_username);
                return (
                  <button
                    key={u.cr4a1_username}
                    type="button"
                    onClick={() => alternarCoResponsavel(u.cr4a1_username)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                      ativo
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {u.cr4a1_nome_exibicao || u.cr4a1_username}
                  </button>
                );
              })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/60 p-2.5">
          <Label className="mb-1.5 flex items-center gap-1.5 text-xs">
            <Bell className="size-3.5 text-primary" /> Observadores ({(form.observadores || []).length})
          </Label>
          <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
            {(membros.length ? membros : allUsers).map(u => {
              const ativo = (form.observadores || []).includes(u.cr4a1_username);
              return (
                <button
                  key={u.cr4a1_username}
                  type="button"
                  onClick={() => alternarObservador(u.cr4a1_username)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                    ativo
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {u.cr4a1_nome_exibicao || u.cr4a1_username}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Campos Personalizados (Custom Fields) */}
      <div className="rounded-xl border border-border bg-secondary/50 p-3 flex flex-col gap-3">
        <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          <Flag className="size-3.5 text-primary" /> Campos Personalizados
        </Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Prioridade</Label>
            <Select value={form.prioridade || '__sem__'} onValueChange={v => set('prioridade', v === '__sem__' ? '' : v)}>
              <SelectTrigger className="h-9 bg-card"><SelectValue placeholder="Sem prioridade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__sem__">Sem prioridade</SelectItem>
                {Object.entries(PRIORIDADES_FICHA).filter(([k]) => Boolean(k)).map(([k, info]) => (
                  <SelectItem key={k} value={k}>{info.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status de Aprovação</Label>
            <Select value={form.statusAprovacao || '__sem__'} onValueChange={v => set('statusAprovacao', v === '__sem__' ? '' : v)}>
              <SelectTrigger className="h-9 bg-card"><SelectValue placeholder="Não aplicável" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__sem__">Não aplicável</SelectItem>
                {Object.entries(STATUS_APROVACAO_FICHA).filter(([k]) => Boolean(k)).map(([k, info]) => (
                  <SelectItem key={k} value={k}>{info.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1"><DollarSign className="size-3" /> Custo / Orçamento (R$)</Label>
            <Input
              value={form.custo || ''}
              onChange={e => set('custo', e.target.value)}
              placeholder="Ex.: 1.500,00"
              className="h-9 bg-card"
            />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1"><Link2 className="size-3" /> Link externo / Documento</Label>
            <Input
              value={form.linkUrl || ''}
              onChange={e => set('linkUrl', e.target.value)}
              placeholder="https://..."
              className="h-9 bg-card"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Referência / Campo livre (Cliente, OS, Tag curta)</Label>
            <Input
              value={form.campoTexto || ''}
              onChange={e => set('campoTexto', e.target.value)}
              placeholder="Ex.: OS #4821 — Cliente Kairós"
              className="h-9 bg-card"
            />
          </div>
        </div>
      </div>

      {/* Datas: Início do Trabalho + Data de Entrega (Prazo) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DateField
          label="Data de Início"
          selectedDate={form.dataInicioTrabalho}
          onSelect={d => set('dataInicioTrabalho', d)}
          allowClear
        />
        <DateField
          label="Prazo / Entrega"
          selectedDate={form.dia}
          onSelect={d => setForm(prev => {
            const tinhaDia = Boolean(prev.dia);
            const temDia = Boolean(d);
            return {
              ...prev,
              dia: d,
              sincronizarAgenda: !temDia ? false : (!tinhaDia ? true : prev.sincronizarAgenda)
            };
          })}
          allowClear
        />
        <TimeField label="Hora da Entrega" value={form.hora} onSelect={h => set('hora', h)} disabled={!form.dia} />
      </div>
      {form.dia && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 p-3">
          <div className="space-y-0.5 pr-2">
            <Label className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
              <CalendarDays className="size-3.5 text-primary" /> Sincronizar com a Agenda
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Opcional: cria e atualiza este prazo como evento/tarefa no Calendário da Agenda.
            </p>
          </div>
          <Switch
            checked={Boolean(form.sincronizarAgenda)}
            onCheckedChange={v => set('sincronizarAgenda', v)}
          />
        </div>
      )}
      {temTarefas && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 p-3">
          <div className="space-y-0.5 pr-2">
            <Label className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
              <CheckCircle2 className="size-3.5 text-primary" /> Sincronizar subtasks (checklist) com a Agenda
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Opcional: envia para o Calendário cada subtarefa da checklist que possuir prazo definido.
            </p>
          </div>
          <Switch
            checked={Boolean(form.sincronizarSubtasksAgenda)}
            onCheckedChange={v => set('sincronizarSubtasksAgenda', v)}
          />
        </div>
      )}
      {/* Notificações Opcionais da Ficha */}
      <div className="rounded-xl border border-border bg-secondary/50 p-3 flex flex-col gap-2.5">
        <Label className="mb-0 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          <Bell className="size-3.5 text-primary" /> Notificações da Ficha
        </Label>
        <div className="flex items-center justify-between py-1 border-b border-border/40">
          <div>
            <p className="text-xs font-medium">Avisos no Sistema</p>
            <p className="text-[11px] text-muted-foreground">Notificações no sininho e alertas de área de trabalho/push.</p>
          </div>
          <Switch
            checked={form.notificarSistema !== false}
            onCheckedChange={v => set('notificarSistema', v)}
          />
        </div>
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-xs font-medium">Avisos por E-mail</p>
            <p className="text-[11px] text-muted-foreground">Dispara avisos por e-mail para responsável e co-responsáveis.</p>
          </div>
          <Switch
            checked={Boolean(form.notificarEmail)}
            onCheckedChange={v => set('notificarEmail', v)}
          />
        </div>
      </div>

      {/* Estimativa de Tempo & Cronômetro */}
      <div className="rounded-xl border border-border bg-secondary/50 p-3 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="mb-0 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <Timer className="size-3.5 text-primary" /> Controle de Tempo (Time Tracking)
          </Label>
          <Button
            type="button"
            size="sm"
            variant={form.cronometroInicio ? 'default' : 'outline'}
            onClick={alternarCronometroLocal}
            className="h-7 text-xs"
          >
            {form.cronometroInicio ? (
              <>
                <Pause className="size-3.5" /> Pausar Cronômetro
              </>
            ) : (
              <>
                <Play className="size-3.5" /> Iniciar Cronômetro
              </>
            )}
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          <div>
            <Label className="text-xs">Tempo Estimado (min)</Label>
            <Input
              type="number"
              min="0"
              value={form.tempoEstimadoMin || 0}
              onChange={e => set('tempoEstimadoMin', Math.max(0, Number(e.target.value) || 0))}
              className="h-9 bg-card"
            />
          </div>
          <div>
            <Label className="text-xs">Tempo Gasto (min)</Label>
            <Input
              type="number"
              min="0"
              value={form.tempoGastoMin || 0}
              onChange={e => set('tempoGastoMin', Math.max(0, Number(e.target.value) || 0))}
              className="h-9 bg-card"
            />
          </div>
        </div>
      </div>

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

      {/* BARRA DE PROGRESSO GERAL DA FICHA */}
      {(temTarefas || dependenciasFichasIds.length > 0) && (
        <div className="rounded-xl border border-border bg-secondary/50 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
              Progresso Geral
              {dependenciasFichasIds.length > 0 && (
                <span className="text-[10px] font-normal normal-case">
                  ({dependenciasFichasIds.length} dependência{dependenciasFichasIds.length > 1 ? 's' : ''})
                </span>
              )}
            </span>
            <span className={progressoFichaAtual.porcentagem === 100 ? 'text-emerald-500 font-bold' : 'text-primary font-bold'}>
              {progressoFichaAtual.porcentagem}% {progressoFichaAtual.porcentagem === 100 ? '✓ Concluída' : ''}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary border border-border/40">
            <div
              className={`h-full transition-all duration-300 ${progressoFichaAtual.porcentagem === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${progressoFichaAtual.porcentagem}%` }}
            />
          </div>
          {!progressoFichaAtual.podeConcluir && dependenciasFichasIds.length > 0 && (
            <p className="text-[11px] text-amber-500 flex items-center gap-1 font-medium">
              <Lock className="size-3 shrink-0" />
              Esta ficha só atingirá 100% e conclusão quando todas as dependências forem concluídas.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-border bg-secondary px-4 py-3">
        <div>
          <Label className="mb-0">Concluída</Label>
          {temTarefas && <p className="text-[11px] text-muted-foreground">Definida automaticamente pelas microtarefas da descrição.</p>}
          {dependenciasFichasIds.length > 0 && !temTarefas && (
            <p className="text-[11px] text-muted-foreground">Definida automaticamente pelo cumprimento das dependências.</p>
          )}
          {dependenciasFichasIds.length > 0 && temTarefas && (
            <p className="text-[11px] text-muted-foreground">Requer que todas as microtarefas e dependências estejam 100%.</p>
          )}
        </div>
        <Switch
          checked={progressoFichaAtual.concluida}
          onCheckedChange={v => {
            if (v && !progressoFichaAtual.podeConcluir) {
              if (progressoFichaAtual.temDependencias) {
                toast.error(`Esta ficha depende de ${progressoFichaAtual.depsTotal - progressoFichaAtual.depsConcluidas} outra(s) ficha(s) pendente(s).`);
              } else {
                toast.error('Esta ficha possui microtarefas pendentes.');
              }
              return;
            }
            set('concluida', v);
          }}
          disabled={temTarefas || (dependenciasFichasIds.length > 0 && !progressoFichaAtual.podeConcluir)}
        />
      </div>

      <AttachmentsField fichaId={fichaOriginal?.cr4a1_fichaid} anexos={form.anexos || []} onChange={(novos) => set('anexos', novos)} />

      {/* SEÇÃO: NOTAS VINCULADAS */}
      <div className="rounded-xl border border-border bg-secondary/40 p-3 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="mb-0 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <FileText className="size-3.5 text-primary" /> Notas Vinculadas ({notasVinculadasObjetos.length})
          </Label>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCriarNovaNota}
              disabled={criandoNotaLocal}
              className="h-7 text-xs gap-1"
              title="Criar uma nova nota diretamente associada a esta ficha"
            >
              {criandoNotaLocal ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
              <span>Criar Nota</span>
            </Button>

            <Popover open={vincularNotaPopoverAberto} onOpenChange={setVincularNotaPopoverAberto}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  title="Vincular notas já existentes a esta ficha"
                >
                  <Link2 className="size-3" />
                  <span>Vincular</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 max-w-[calc(100vw-24px)] p-2.5">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Vincular Notas</span>
                    <span className="text-[10px] text-muted-foreground">{notasCandidatasParaVincular.length} disponível(is)</span>
                  </div>
                  <Input
                    placeholder="Pesquisar notas..."
                    value={buscaNota}
                    onChange={e => setBuscaNota(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <div className="flex max-h-52 flex-col gap-1 overflow-y-auto">
                    {notasCandidatasParaVincular.length === 0 ? (
                      <p className="p-3 text-center text-xs text-muted-foreground">Nenhuma nota encontrada.</p>
                    ) : (
                      notasCandidatasParaVincular.map(n => {
                        const id = n.cr4a1_notas_kairosid || n.cr4a1_id_da_nota;
                        const vinculada = notasIds.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => alternarVinculoNota(id)}
                            className={`flex items-center justify-between rounded-lg p-2 text-left text-xs transition-colors ${
                              vinculada ? 'bg-primary/15 border border-primary/40' : 'hover:bg-secondary'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {n.cr4a1_cor && (
                                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: n.cr4a1_cor }} />
                              )}
                              <span className={`font-semibold truncate ${vinculada ? 'text-primary' : 'text-foreground'}`}>
                                {n.cr4a1_titulo || 'Nota sem título'}
                              </span>
                            </div>
                            {vinculada ? (
                              <Check className="size-3.5 text-primary shrink-0 ml-1.5" />
                            ) : (
                              <Plus className="size-3 text-muted-foreground shrink-0 ml-1.5" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {notasVinculadasObjetos.length === 0 ? (
          <p className="text-[11px] italic text-muted-foreground">
            Nenhuma nota vinculada. Vincule atas de reunião ou especificações técnicas a esta ficha.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {notasVinculadasObjetos.map(n => {
              const id = n.cr4a1_notas_kairosid || n.cr4a1_id_da_nota;
              const autor = allUsers.find(u => u.cr4a1_username === n.cr4a1_user_login)?.cr4a1_nome_exibicao || n.cr4a1_user_login || '';
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2 text-xs transition-colors hover:border-primary/50"
                  style={n.cr4a1_cor ? { borderLeftWidth: '3px', borderLeftColor: n.cr4a1_cor } : undefined}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText className="size-3.5 text-primary shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-foreground truncate">{n.cr4a1_titulo || 'Sem título'}</span>
                      {autor && <span className="text-[10px] text-muted-foreground">Por {autor}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setNotaEmVisualizacao(n)}
                      className="h-6 px-1.5 text-[11px] font-semibold"
                      title="Visualizar o conteúdo desta nota"
                    >
                      <Eye className="size-3 mr-1" /> Ver
                    </Button>

                    {onNavegarParaNota && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onSave?.(form);
                          onNavegarParaNota(id);
                        }}
                        className="h-6 px-1.5 text-[11px] font-semibold text-primary"
                        title="Abrir no módulo de Notas completo"
                      >
                        <ExternalLink className="size-3 mr-1" /> Abrir no Notas
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => alternarVinculoNota(id)}
                      className="size-6 text-muted-foreground hover:text-destructive"
                      title="Desvincular nota"
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SEÇÃO: DEPENDÊNCIAS DE OUTRAS FICHAS */}
      <div className="rounded-xl border border-border bg-secondary/40 p-3 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Label className="mb-0 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground font-bold">
              <Link2 className="size-3.5 text-primary" /> Fichas das quais esta depende ({fichasDependentesObjetos.length})
            </Label>
            {fichasDependentesObjetos.length > 0 && (
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                progressoFichaAtual.depsConcluidas === progressoFichaAtual.depsTotal
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              }`}>
                {progressoFichaAtual.depsConcluidas}/{progressoFichaAtual.depsTotal} concluídas
              </span>
            )}
          </div>

          <Popover open={vincularDepPopoverAberto} onOpenChange={setVincularDepPopoverAberto}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                title="Vincular fichas necessárias para a conclusão desta"
              >
                <Plus className="size-3" />
                <span>Adicionar Dependência</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 sm:w-96 p-3" align="end">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Selecionar ficha como dependência</span>
                  <span className="text-[10px] text-muted-foreground">Bloqueia conclusão até 100%</span>
                </div>
                <Input
                  value={buscaDep}
                  onChange={e => setBuscaDep(e.target.value)}
                  placeholder="Pesquisar ficha, responsável ou lista..."
                  className="h-8 text-xs"
                />
                <div className="flex max-h-52 flex-col gap-1 overflow-y-auto pr-1">
                  {fichasCandidatasParaDependencia.length === 0 ? (
                    <p className="py-3 text-center text-xs text-muted-foreground">Nenhuma ficha disponível.</p>
                  ) : (
                    fichasCandidatasParaDependencia.map(f => {
                      const id = f.cr4a1_fichaid;
                      const vinculada = dependenciasFichasIds.includes(id);
                      const nomeLista = listas.find(l => l.cr4a1_listaid === f.cr4a1_lista_id)?.cr4a1_nome || 'Lista';
                      const respNome = nomeDe(f.cr4a1_responsavel_login, allUsers);
                      const prog = calcularProgressoFicha(f, fichas);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => alternarDependencia(id)}
                          className={`flex items-center justify-between gap-2 rounded-lg p-2 text-left text-xs transition-colors ${
                            vinculada ? 'bg-primary/15 border border-primary/40' : 'hover:bg-secondary border border-transparent'
                          }`}
                        >
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-semibold text-foreground truncate">{f.cr4a1_titulo || 'Sem título'}</span>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                              <span className="truncate">{nomeLista}</span>
                              <span>•</span>
                              <span className="truncate">{respNome}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                              prog.porcentagem === 100
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                : 'bg-secondary text-muted-foreground'
                            }`}>
                              {prog.porcentagem}%
                            </span>
                            {vinculada ? (
                              <Check className="size-3.5 text-primary" />
                            ) : (
                              <Plus className="size-3.5 text-muted-foreground opacity-60" />
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {fichasDependentesObjetos.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">
            Nenhuma dependência configurada. Se esta ficha depender de atividades ou fichas de outros membros para ser finalizada, adicione-as acima.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] text-muted-foreground">
              {temTarefas
                ? 'Esta ficha possui microtarefas próprias e depende das fichas abaixo. Sua porcentagem só atingirá 100% quando tudo estiver concluído.'
                : 'Esta ficha depende exclusivamente das fichas abaixo. O progresso reflete a média das dependências e será 100% quando todas finalizarem.'}
            </p>
            {fichasDependentesObjetos.map(dep => {
              const id = dep.cr4a1_fichaid;
              const nomeLista = listas.find(l => l.cr4a1_listaid === dep.cr4a1_lista_id)?.cr4a1_nome || '';
              const respNome = nomeDe(dep.cr4a1_responsavel_login, allUsers);
              const prog = dep.progresso || calcularProgressoFicha(dep, fichas);
              const estaConcluida = prog.porcentagem === 100 || prog.concluida;

              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2 text-xs transition-colors hover:border-primary/50"
                  style={dep.cr4a1_cor ? { borderLeftWidth: '3px', borderLeftColor: dep.cr4a1_cor } : undefined}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="shrink-0">
                      {estaConcluida ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      ) : (
                        <Circle className="size-4 text-amber-500" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-foreground truncate">{dep.cr4a1_titulo || 'Ficha vinculada'}</span>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        {nomeLista && <span>{nomeLista}</span>}
                        {nomeLista && respNome && <span>•</span>}
                        {respNome && (
                          <span className="flex items-center gap-1">
                            <UserAvatar login={dep.cr4a1_responsavel_login} allUsers={allUsers} size={12} />
                            {respNome}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      estaConcluida
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    }`}>
                      {prog.porcentagem}% {estaConcluida ? '✓' : ''}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => alternarDependencia(id)}
                      className="size-6 text-muted-foreground hover:text-destructive"
                      title="Remover dependência"
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE PRÉ-VISUALIZAÇÃO DA NOTA DENTRO DA FICHA */}
      {notaEmVisualizacao && (
        <Dialog open onOpenChange={(open) => !open && setNotaEmVisualizacao(null)}>
          <DialogContent className="max-w-xl sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                {notaEmVisualizacao.cr4a1_titulo || 'Nota sem título'}
              </DialogTitle>
              <DialogDescription>
                Nota vinculada à ficha &quot;{form.titulo}&quot;
              </DialogDescription>
            </DialogHeader>
            <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto py-2">
              {(notaEmVisualizacao.cr4a1_conteudo || []).length === 0 ? (
                <p className="text-xs italic text-muted-foreground">Esta nota está vazia.</p>
              ) : (
                (notaEmVisualizacao.cr4a1_conteudo || [])
                  .filter(b => b && b.type !== '__meta__' && b.id !== '__nota_meta__')
                  .map((bloco, bIdx) => (
                    <div key={bloco.id || bIdx} className="text-sm">
                      {bloco.type === 'heading' ? (
                        <h4 className="font-bold text-foreground text-base border-b border-border/40 pb-1">{bloco.value}</h4>
                      ) : bloco.type === 'todo' ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className={`size-4 ${bloco.checked ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                          <span className={bloco.checked ? 'line-through text-muted-foreground' : 'text-foreground'}>{bloco.value}</span>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap text-foreground" dangerouslySetInnerHTML={{ __html: bloco.value }} />
                      )}
                    </div>
                  ))
              )}
            </div>
            <DialogFooter className="gap-2">
              {onNavegarParaNota && (
                <Button
                  type="button"
                  onClick={() => {
                    const targetId = notaEmVisualizacao.cr4a1_notas_kairosid || notaEmVisualizacao.cr4a1_id_da_nota;
                    setNotaEmVisualizacao(null);
                    onSave?.(form);
                    onNavegarParaNota(targetId);
                  }}
                  className="gap-1"
                >
                  <ExternalLink className="size-3.5" /> Abrir no Módulo de Notas
                </Button>
              )}
              <Button variant="outline" onClick={() => setNotaEmVisualizacao(null)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
                {onReagirComentario && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    {EMOJIS_REACAO_COMENTARIO.map(emoji => {
                      const usuariosReagiram = Array.isArray(c.reacoes?.[emoji]) ? c.reacoes[emoji] : [];
                      const euReagi = usuariosReagiram.includes(usuarioAtual);
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => onReagirComentario(c.id, emoji)}
                          title={usuariosReagiram.length > 0 ? usuariosReagiram.map(u => nomeDe(u, allUsers)).join(', ') : `Reagir com ${emoji}`}
                          className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors ${
                            euReagi
                              ? 'border-primary bg-primary/15 font-bold text-primary'
                              : usuariosReagiram.length > 0
                                ? 'border-border bg-card text-foreground'
                                : 'border-transparent bg-card/50 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <span>{emoji}</span>
                          {usuariosReagiram.length > 0 && <span className="text-[10px]">{usuariosReagiram.length}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
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
        </div>
      </div>

      <DialogFooter className="shrink-0 p-2.5 sm:p-4 border-t border-border/60 bg-card/95 backdrop-blur-md flex-nowrap items-center justify-between gap-1.5 sm:gap-2 shadow-lg mt-0">
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
          <Button type="button" variant="ghost" size="sm" className="text-destructive h-9 px-2 sm:px-3 text-xs sm:text-sm" onClick={onDelete}>
            <Trash2 className="size-3.5 sm:size-4" /> Excluir
          </Button>
          {onToggleArquivo && (
            <Button type="button" variant="outline" size="sm" className="h-9 px-2.5 sm:px-3 text-xs sm:text-sm" onClick={onToggleArquivo}>
              {arquivada ? (
                <>
                  <ArchiveRestore className="size-3.5 sm:size-4" /> <span className="truncate">Restaurar</span>
                </>
              ) : (
                <>
                  <Archive className="size-3.5 sm:size-4" /> Arquivar
                </>
              )}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {autosaveStatus === 'saving' && (
            <span className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-1">
              <Loader2 className="size-3 animate-spin text-primary" /> Salvando...
            </span>
          )}
          {autosaveStatus === 'saved' && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hidden sm:flex items-center gap-1">
              <Check className="size-3" /> Salvo
            </span>
          )}
          <Button variant="outline" size="sm" className="h-9 px-2.5 sm:h-10 sm:px-4 text-xs sm:text-sm" onClick={() => setIsEditing(false)}>Cancelar</Button>
          <Button size="sm" className="h-9 px-3 sm:h-10 sm:px-4 text-xs sm:text-sm" onClick={() => { cancelarAutosavePendente(); onSave(form); setIsEditing(false); }} disabled={!form.titulo.trim() || !form.listaId}>Salvar</Button>
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
      <DialogContent className="max-w-2xl sm:max-w-4xl lg:max-w-5xl max-h-[90dvh] sm:max-h-[85vh] flex flex-col">
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
  historicoCompartilhamento = [],
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

  const ultimoRegistroAdicao = (tipo, alvo) => {
    const alvoLower = String(alvo || '').toLowerCase();
    return (historicoCompartilhamento || []).find(h =>
      h.tipo === tipo && String(h.alvo || '').toLowerCase() === alvoLower
    );
  };

  const workspacesDisponiveisParaVincular = useMemo(() => {
    return (todosWorkspaces || []).filter(w =>
      w.cr4a1_calendarios_workspacesid !== workspace?.cr4a1_calendarios_workspacesid &&
      !workspacesVinculadosIds.includes(w.cr4a1_calendarios_workspacesid)
    );
  }, [todosWorkspaces, workspace, workspacesVinculadosIds]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-xl lg:max-w-2xl">
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
                const regWs = ultimoRegistroAdicao('add_ws', wsId);
                return (
                  <div key={wsId} className="flex items-center justify-between rounded-xl border border-border bg-secondary px-3 py-2 text-sm">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">{nomeWs}</span>
                        <Badge variant="outline" className="text-[10px]">Vinculado</Badge>
                      </div>
                      {regWs && (
                        <span className="text-[11px] text-muted-foreground">
                          Vinculado por <strong>{nomeDe(regWs.ator, allUsers)}</strong>
                          {regWs.timestamp ? ` em ${format(new Date(regWs.timestamp), 'dd/MM HH:mm')}` : ''}
                        </span>
                      )}
                    </div>
                    {podeEditar && onRemoveWorkspaceVinculado && (
                      <button
                        type="button"
                        onClick={() => onRemoveWorkspaceVinculado(wsId)}
                        aria-label={`Desvincular workspace ${nomeWs}`}
                        className="text-muted-foreground hover:text-destructive shrink-0"
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
              {colaboradoresLogins.map(login => {
                const reg = ultimoRegistroAdicao('add_user', login);
                return (
                  <div key={login} className="flex items-center justify-between rounded-xl border border-border bg-secondary px-3 py-2 text-sm">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-medium text-foreground truncate">{nomeDe(login, allUsers)}</span>
                      {reg && (
                        <span className="text-[11px] text-muted-foreground">
                          Adicionado por <strong>{nomeDe(reg.ator, allUsers)}</strong>
                          {reg.timestamp ? ` em ${format(new Date(reg.timestamp), 'dd/MM HH:mm')}` : ''}
                        </span>
                      )}
                    </div>
                    {podeEditar && (
                      <button onClick={() => onRemove(login)} aria-label={`Remover ${login}`} className="text-muted-foreground hover:text-destructive shrink-0">
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                );
              })}
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
            <p className="text-[12px] text-muted-foreground">Você não tem permissão para alterar colaboradores neste quadro.</p>
          )}

          {historicoCompartilhamento.length > 0 && (
            <div className="border-t border-border pt-3">
              <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                <History className="size-3.5 text-primary" /> Registro de compartilhamentos ({historicoCompartilhamento.length})
              </Label>
              <div className="flex max-h-36 flex-col gap-1 overflow-y-auto pr-1">
                {historicoCompartilhamento.map(h => {
                  const acao =
                    h.tipo === 'add_user' ? 'adicionou' :
                    h.tipo === 'remove_user' ? 'removeu' :
                    h.tipo === 'add_ws' ? 'vinculou o workspace' :
                    'desvinculou o workspace';
                  return (
                    <div key={h.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                      <span className="truncate">
                        <strong className="text-foreground">{nomeDe(h.ator, allUsers)}</strong> {acao}{' '}
                        <strong className="text-foreground">{h.alvoNome || nomeDe(h.alvo, allUsers)}</strong>
                      </span>
                      {h.timestamp && (
                        <span className="shrink-0 text-[10px] opacity-75">
                          {format(new Date(h.timestamp), 'dd/MM HH:mm')}
                        </span>
                      )}
                    </div>
                  );
                })}
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
      <DialogContent className="max-w-3xl sm:max-w-4xl lg:max-w-5xl h-[92dvh] sm:h-[92vh] flex flex-col p-3 sm:p-6 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-5 text-primary" />
            Exportar ou Enviar Lista
          </DialogTitle>
          <DialogDescription>
            {lista.cr4a1_nome} • {workspaceNome}
          </DialogDescription>
        </DialogHeader>

        {/* Barra de opções de conteúdo */}
        <div className="shrink-0 flex flex-wrap items-center gap-4 py-2 border-y border-border text-xs">
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
        <div className="flex-1 min-h-0 overflow-auto bg-muted/40 p-2 sm:p-4 rounded-xl border border-border">
          <div
            ref={relatorioRef}
            style={{
              width: '100%',
              maxWidth: '680px',
              margin: '0 auto',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              padding: '24px 20px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              boxSizing: 'border-box'
            }}
          >
            {/* Cabeçalho do relatório */}
            <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
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

        <DialogFooter className="shrink-0 flex-col sm:flex-row gap-2 mt-2">
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
      <DialogContent className="max-w-lg sm:max-w-2xl">
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
      <DialogContent className="max-w-lg sm:max-w-2xl">
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
      <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto">
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

// O fundo e a fonte são por pessoa (guardados no usuário), não no quadro — cada um vê o que escolheu.
const FundoDialog = ({ currentUser, onSave, onClose }) => {
  const [aba, setAba] = useState('fundo');
  const [cor, setCor] = useState(currentUser?.cr4a1_trello_fundo_cor || '');
  const [imagem, setImagem] = useState(currentUser?.cr4a1_trello_fundo_imagem || '');
  const [fonte, setFonte] = useState(currentUser?.cr4a1_fonte_fichas || '');
  const [fonteCustomInput, setFonteCustomInput] = useState(() => {
    const atual = currentUser?.cr4a1_fonte_fichas || '';
    const estaNoCatalogo = !atual || GOOGLE_FONTS_FICHAS.some(f => f.value.toLowerCase() === atual.toLowerCase());
    return estaNoCatalogo ? '' : atual;
  });
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    carregarCatalogoGoogleFonts();
    if (currentUser?.cr4a1_fonte_fichas) {
      carregarGoogleFont(currentUser.cr4a1_fonte_fichas);
    }
  }, [currentUser?.cr4a1_fonte_fichas]);

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

  const aplicarFonteCatalogo = (valor) => {
    const limpa = valor === 'Poppins' ? '' : valor;
    if (limpa) carregarGoogleFont(limpa);
    setFonte(limpa);
  };

  const aplicarFonteCustom = () => {
    const nome = fonteCustomInput.trim();
    if (!nome) return;
    carregarGoogleFont(nome);
    setFonte(nome);
    toast.success(`Fonte "${nome}" carregada do Google Fonts para pré-visualização.`);
  };

  const fonteAtualEfetiva = fonte || 'Poppins';
  const fontCssPreview = getFichasFontCss(fonte);

  const salvar = async () => {
    await onSave({ cor, imagem, fonte });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-xl lg:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="size-5 text-primary" /> Aparência do seu Fichas
          </DialogTitle>
          <DialogDescription>
            Personalização individual — mesmo dividindo o quadro com outras pessoas, apenas você vê o fundo e a fonte que escolher.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-secondary/70 p-1 border border-border">
          <button
            type="button"
            onClick={() => setAba('fundo')}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              aba === 'fundo' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Palette className="size-3.5" /> Fundo do Quadro
          </button>
          <button
            type="button"
            onClick={() => setAba('fonte')}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              aba === 'fonte' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Type className="size-3.5" /> Fonte (Google Fonts)
          </button>
        </div>

        {aba === 'fundo' ? (
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
        ) : (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="mb-0">Escolha uma fonte do Google Fonts</Label>
              {fonte && (
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => { setFonte(''); setFonteCustomInput(''); }}>
                  Restaurar padrão (Poppins)
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-52 overflow-y-auto pr-1">
              {GOOGLE_FONTS_FICHAS.map((f) => {
                const selecionada = fonteAtualEfetiva.toLowerCase() === f.value.toLowerCase();
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => aplicarFonteCatalogo(f.value)}
                    style={{ fontFamily: getFichasFontCss(f.value) }}
                    className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                      selecionada
                        ? 'border-primary bg-primary/10 ring-1 ring-primary'
                        : 'border-border bg-secondary/40 hover:bg-secondary'
                    }`}
                  >
                    <span className="text-sm font-semibold text-foreground truncate w-full">{f.label}</span>
                    <span className="text-[10px] text-muted-foreground">{f.categoria}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Ou digite qualquer outra fonte do Google Fonts (ex.: Ubuntu, Work Sans, Rubik)</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Nome exato da fonte no Google Fonts..."
                  value={fonteCustomInput}
                  onChange={(e) => setFonteCustomInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarFonteCustom(); } }}
                  className="h-8 text-xs"
                />
                <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 text-xs" onClick={aplicarFonteCustom} disabled={!fonteCustomInput.trim()}>
                  Carregar
                </Button>
              </div>
            </div>

            <div
              className="rounded-xl border border-border bg-secondary/50 p-3 flex flex-col gap-1"
              style={{ fontFamily: fontCssPreview }}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Pré-visualização ({fonteAtualEfetiva})
              </span>
              <span className="text-sm font-bold text-foreground">
                Lista: Em Andamento • Ficha: Revisar proposta comercial
              </span>
              <span className="text-xs text-muted-foreground">
                Os textos formatados manualmente dentro das fichas continuam preservando suas fontes próprias.
              </span>
            </div>
          </div>
        )}

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

const ListaSincronizacaoAgendaMenu = ({ lista, syncConfig = { fichas: false, subtasks: false }, onSincronizar }) => {
  const [aberto, setAberto] = useState(false);
  const [syncFichas, setSyncFichas] = useState(Boolean(syncConfig.fichas));
  const [syncSubtasks, setSyncSubtasks] = useState(Boolean(syncConfig.subtasks));
  const [sincronizando, setSincronizando] = useState(false);

  const ativo = Boolean(syncConfig.fichas || syncConfig.subtasks);

  const handleOpenChange = (open) => {
    setAberto(open);
    if (open) {
      setSyncFichas(Boolean(syncConfig.fichas));
      setSyncSubtasks(Boolean(syncConfig.subtasks));
    }
  };

  const handleAplicar = async () => {
    setSincronizando(true);
    try {
      await onSincronizar({ fichas: syncFichas, subtasks: syncSubtasks });
      setAberto(false);
    } finally {
      setSincronizando(false);
    }
  };

  return (
    <Popover open={aberto} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Sincronizar lista ${lista?.cr4a1_nome} com a Agenda`}
          title={ativo ? 'Sincronização com a Agenda ativa (clique para configurar)' : 'Sincronizar fichas e subtasks desta lista com a Agenda'}
          className={`shrink-0 rounded p-1 transition-colors relative flex items-center justify-center ${
            ativo ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-secondary'
          }`}
        >
          <RefreshCw className={`size-3.5 ${sincronizando ? 'animate-spin' : ''}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-0.5 border-b border-border pb-2">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <CalendarDays className="size-3.5 text-primary" /> Sincronizar com a Agenda
          </span>
          <span className="text-[11px] text-muted-foreground">
            Escolha o que deseja enviar da lista <strong>{lista?.cr4a1_nome}</strong> para o Calendário (100% opcional):
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-secondary/40 p-2.5">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">Prazos das fichas</p>
              <p className="text-[10px] text-muted-foreground">Adiciona no calendário cartões que tenham prazo.</p>
            </div>
            <Switch checked={syncFichas} onCheckedChange={setSyncFichas} />
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-secondary/40 p-2.5">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">Prazos das subtasks (checklists)</p>
              <p className="text-[10px] text-muted-foreground">Adiciona no calendário cada subtask com prazo.</p>
            </div>
            <Switch checked={syncSubtasks} onCheckedChange={setSyncSubtasks} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={sincronizando}
            onClick={() => setAberto(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs gap-1.5 font-semibold"
            disabled={sincronizando}
            onClick={handleAplicar}
          >
            {sincronizando ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            <span>{sincronizando ? 'Sincronizando...' : 'Aplicar e Sincronizar'}</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const CRITERIOS_ORDENACAO = [
  { id: 'prioridade_alta', rotulo: 'Prioridade: Mais alta primeiro' },
  { id: 'prioridade_baixa', rotulo: 'Prioridade: Mais baixa primeiro' },
  { id: 'data_recente', rotulo: 'Prazo: Mais próximo primeiro (Urgência)' },
  { id: 'data_antiga', rotulo: 'Prazo: Mais distante no futuro' },
  { id: 'criacao_recente', rotulo: 'Criação: Mais recente primeiro' },
  { id: 'titulo_az', rotulo: 'Título: A → Z' },
  { id: 'titulo_za', rotulo: 'Título: Z → A' }
];

const ListaOrdenacaoMenu = ({ criterioAtual = 'padrao', onChange }) => {
  const criteriosAtivos = Array.isArray(criterioAtual)
    ? criterioAtual.filter(c => c && c !== 'padrao')
    : (criterioAtual && criterioAtual !== 'padrao' ? [criterioAtual] : []);

  const isCustom = criteriosAtivos.length > 0;

  const handleToggle = (critId) => {
    let novos;
    if (criteriosAtivos.includes(critId)) {
      novos = criteriosAtivos.filter(c => c !== critId);
    } else {
      novos = [...criteriosAtivos, critId];
    }
    onChange(novos.length === 0 ? 'padrao' : novos);
  };

  const handleLimpar = () => {
    onChange('padrao');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Organizar lista"
          title={isCustom ? `Organização ativa: ${criteriosAtivos.length} critério(s)` : 'Organizar lista'}
          className={`shrink-0 rounded p-1 transition-colors relative flex items-center justify-center ${
            isCustom ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-secondary'
          }`}
        >
          <ArrowUpDown className="size-3.5" />
          {criteriosAtivos.length > 1 && (
            <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center leading-none">
              {criteriosAtivos.length}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2.5 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border flex items-center justify-between">
          <span>Organizar lista por:</span>
          {isCustom && (
            <button
              type="button"
              onClick={handleLimpar}
              className="text-[11px] text-primary hover:underline font-normal"
            >
              Redefinir
            </button>
          )}
        </div>
        <div className="p-1 flex flex-col gap-0.5">
          {CRITERIOS_ORDENACAO.map(crit => {
            const indexAtivo = criteriosAtivos.indexOf(crit.id);
            const selecionado = indexAtivo !== -1;
            return (
              <DropdownMenuItem
                key={crit.id}
                onSelect={(e) => {
                  e.preventDefault();
                  handleToggle(crit.id);
                }}
                className="flex items-center justify-between text-xs cursor-pointer py-1.5 px-2 rounded-md hover:bg-secondary"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`size-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    selecionado ? 'bg-primary text-primary-foreground' : 'border border-muted-foreground/30 text-muted-foreground'
                  }`}>
                    {selecionado ? `${indexAtivo + 1}º` : ''}
                  </div>
                  <span className={`truncate ${selecionado ? 'font-bold text-primary' : 'text-foreground'}`}>
                    {crit.rotulo}
                  </span>
                </div>
                {selecionado && <Check className="size-3.5 text-primary shrink-0 ml-1.5" />}
              </DropdownMenuItem>
            );
          })}
        </div>
        {isCustom && (
          <div className="px-2 py-1.5 border-t border-border/50 text-[10px] text-muted-foreground">
            Critérios aplicados em ordem de precedência. Concluídos sempre no final.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ListaOpcoesMenu = ({
  lista,
  corDaLista,
  podeGerenciar,
  podeGerenciarAutomacoes,
  souDono,
  pessoal,
  gerentesDaLista = [],
  convidadosDaLista = [],
  listasVisiveis = [],
  definirCorLista,
  setListaAutomacao,
  setListaGerentes,
  setListaConvidados,
  clonarListaInteira,
  setListaMoverFichas,
  alternarListaPessoal,
  setListaMoverWorkspace,
  setListaExportar,
  arquivarConcluidasDaLista,
  arquivarTodasDaLista,
  apagarLista
}) => {
  const [corAberta, setCorAberta] = useState(false);

  return (
    <DropdownMenu onOpenChange={(open) => { if (!open) setCorAberta(false); }}>
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
      <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-2rem)] p-2">
        {podeGerenciar && (
          <>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setCorAberta(v => !v); }}
              className="flex w-full items-center justify-between rounded-[14px] px-3.5 py-2.5 min-h-[44px] text-sm text-foreground hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Palette className="size-4" />
                <span>Cor da Lista</span>
              </div>
              <div className="flex items-center gap-1.5">
                {corDaLista && (
                  <span
                    className="size-4 rounded-full border border-border shadow-xs"
                    style={{ backgroundColor: corDaLista }}
                  />
                )}
                <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-200 ${corAberta ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {corAberta && (
              <div className="my-1.5 p-2 rounded-xl bg-secondary/60 border border-border/60 animate-in fade-in-0 duration-150">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2 px-1">
                  Escolher cor
                </span>
                <div className="grid grid-cols-6 gap-2">
                  <button
                    type="button"
                    onClick={() => { definirCorLista(lista, ''); setCorAberta(false); }}
                    title="Sem cor"
                    className="flex size-7 items-center justify-center rounded-full border border-dashed border-border bg-card text-[10px] hover:scale-105 active:scale-95 transition-transform"
                  >
                    {!corDaLista && <Check className="size-3.5 text-muted-foreground" />}
                  </button>
                  {themeColors.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { definirCorLista(lista, c.hex); setCorAberta(false); }}
                      title={c.label}
                      className="size-7 rounded-full transition-transform hover:scale-105 active:scale-90"
                      style={{
                        backgroundColor: c.hex,
                        boxShadow: corDaLista === c.hex ? `0 0 0 2px var(--card), 0 0 0 4px ${c.hex}` : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <DropdownMenuSeparator />
          </>
        )}

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

        {podeGerenciar && setListaConvidados && (
          <DropdownMenuItem onClick={() => setListaConvidados(lista)} className="cursor-pointer">
            <UserPlus className={`size-4 mr-2 ${convidadosDaLista.length > 0 ? 'text-blue-500' : ''}`} />
            Convidados da Lista
            {convidadosDaLista.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-[10px] px-1 py-0">
                {convidadosDaLista.length}
              </Badge>
            )}
          </DropdownMenuItem>
        )}

        {podeGerenciar && (
          <DropdownMenuItem onClick={() => clonarListaInteira(lista)} className="cursor-pointer">
            <Copy className="size-4 mr-2" />
            Copiar / Clonar Lista Inteira
          </DropdownMenuItem>
        )}

        {podeGerenciar && listasVisiveis.length > 1 && (
          <DropdownMenuItem onClick={() => setListaMoverFichas(lista)} className="cursor-pointer">
            <ArrowRightLeft className="size-4 mr-2" />
            Mover Todas as Fichas para...
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

        <DropdownMenuSeparator />

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

const ConvidadosListaDialog = ({ lista, allUsers = [], membrosBaseLoginsSet = new Set(), onClose, onSave }) => {
  const convidadosAtuais = useMemo(
    () => parseListaConvidados(lista?.cr4a1_automacao).filter(c => !membrosBaseLoginsSet.has(String(c).toLowerCase())),
    [lista, membrosBaseLoginsSet]
  );
  const [selecionados, setSelecionados] = useState(convidadosAtuais);
  const [busca, setBusca] = useState('');

  const toggleUsuario = (login) => {
    setSelecionados(prev => prev.includes(login) ? prev.filter(l => l !== login) : [...prev, login]);
  };

  const usuariosExternos = useMemo(() => {
    return allUsers.filter(u => {
      const loginLower = String(u.cr4a1_username || '').toLowerCase();
      if (!loginLower || membrosBaseLoginsSet.has(loginLower)) return false;
      if (!busca.trim()) return true;
      const termo = busca.toLowerCase();
      return (u.cr4a1_nome_exibicao || '').toLowerCase().includes(termo) ||
             loginLower.includes(termo);
    });
  }, [allUsers, membrosBaseLoginsSet, busca]);

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            Convidados Externos da Lista
          </DialogTitle>
          <DialogDescription>
            Convide pessoas de fora deste workspace para visualizar todas as fichas da lista <strong>{lista?.cr4a1_nome}</strong>. Novos convidados serão notificados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <Input
            placeholder="Buscar usuário externo por nome ou login..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="h-9"
          />

          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 border border-border rounded-lg p-2">
            {usuariosExternos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum usuário externo encontrado.</p>
            ) : (
              usuariosExternos.map(u => {
                const isSelected = selecionados.includes(u.cr4a1_username);
                return (
                  <label
                    key={u.cr4a1_username}
                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-xs ${isSelected ? 'bg-blue-500/10 border border-blue-500/30' : 'hover:bg-secondary border border-transparent'}`}
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
            Se algum convidado for adicionado posteriormente como membro do workspace, ele passará a membro automaticamente sem perder nada nas fichas.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={() => onSave(selecionados)}>Salvar Convidados</Button>
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
