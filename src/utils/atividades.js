// Histórico de atividades e metadados avançados da ficha: guardados como JSON na coluna memo
// cr4a1_atividades ({ atividades: [...], meta: {...} }), 100% compatível com fichas antigas
// que tinham apenas o array de atividades.
const LIMITE_ATIVIDADES = 200;

export const PRIORIDADES_FICHA = {
  '': { label: 'Sem prioridade', badgeClass: 'bg-secondary text-muted-foreground border-border', dotColor: '#94a3b8' },
  baixa: { label: 'Baixa', badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30', dotColor: '#10b981' },
  media: { label: 'Média', badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30', dotColor: '#f59e0b' },
  alta: { label: 'Alta', badgeClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30', dotColor: '#f97316' },
  critica: { label: 'Crítica', badgeClass: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30', dotColor: '#ef4444' }
};

export const STATUS_APROVACAO_FICHA = {
  '': { label: 'Sem status extra', badgeClass: 'bg-secondary text-muted-foreground' },
  em_analise: { label: 'Em Aprovação', badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
  aprovado: { label: 'Aprovado ✓', badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  revisar: { label: 'Ajustes Solicitados', badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' }
};

export const META_PADRAO = () => ({
  coResponsaveis: [],
  observadores: [],
  prioridade: '',
  custo: '',
  linkUrl: '',
  statusAprovacao: '',
  campoTexto: '',
  capaModo: 'inteiro', // 'inteiro' | 'faixa'
  capaImagemIndex: 0,  // -1 = ocultar capa de imagem
  dataInicioTrabalho: '',
  ehModelo: false,
  tempoEstimadoMin: 0,
  tempoGastoMin: 0,
  cronometroInicio: null
});

export const parseAtividades = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(x => x && x.tipo !== '__meta__');
    if (parsed && Array.isArray(parsed.atividades)) return parsed.atividades;
    return [];
  } catch { return []; }
};

export const parseFichaMeta = (raw) => {
  const base = META_PADRAO();
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && !Array.isArray(parsed) && parsed.meta && typeof parsed.meta === 'object') {
      return {
        ...base,
        ...parsed.meta,
        coResponsaveis: Array.isArray(parsed.meta.coResponsaveis) ? parsed.meta.coResponsaveis.filter(Boolean) : [],
        observadores: Array.isArray(parsed.meta.observadores) ? parsed.meta.observadores.filter(Boolean) : []
      };
    }
    if (Array.isArray(parsed)) {
      const metaEntry = parsed.find(x => x && x.tipo === '__meta__');
      if (metaEntry?.meta) {
        return {
          ...base,
          ...metaEntry.meta,
          coResponsaveis: Array.isArray(metaEntry.meta.coResponsaveis) ? metaEntry.meta.coResponsaveis.filter(Boolean) : [],
          observadores: Array.isArray(metaEntry.meta.observadores) ? metaEntry.meta.observadores.filter(Boolean) : []
        };
      }
    }
    return base;
  } catch { return base; }
};

export const serializarAtividadesEMeta = (atividadesLista, metaObj) => {
  const atividadesLimpas = (atividadesLista || []).filter(x => x && x.tipo !== '__meta__').slice(-LIMITE_ATIVIDADES);
  const metaLimpo = { ...META_PADRAO(), ...(metaObj || {}) };
  return JSON.stringify({ atividades: atividadesLimpas, meta: metaLimpo });
};

export const registrarAtividade = (atividadesAtuais, tipo, autor, detalhe = '', patchMeta = null) => {
  const nova = { id: crypto.randomUUID(), tipo, autor, detalhe, data: new Date().toISOString() };
  const atuais = parseAtividades(atividadesAtuais);
  const metaAtual = parseFichaMeta(atividadesAtuais);
  const novoMeta = patchMeta ? { ...metaAtual, ...patchMeta } : metaAtual;
  return serializarAtividadesEMeta([...atuais, nova], novoMeta);
};

export const atualizarFichaMeta = (atividadesAtuais, patchMeta) => {
  const atuais = parseAtividades(atividadesAtuais);
  const metaAtual = parseFichaMeta(atividadesAtuais);
  return serializarAtividadesEMeta(atuais, { ...metaAtual, ...patchMeta });
};

export const calcularTempoTotalMin = (meta, agoraMs = Date.now()) => {
  if (!meta) return 0;
  const base = Number(meta.tempoGastoMin) || 0;
  if (!meta.cronometroInicio) return base;
  const inicioMs = new Date(meta.cronometroInicio).getTime();
  if (Number.isNaN(inicioMs)) return base;
  const extraMin = Math.max(0, Math.floor((agoraMs - inicioMs) / 60000));
  return base + extraMin;
};

export const formatarDuracaoMin = (minutos) => {
  const total = Math.max(0, Math.round(Number(minutos) || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

export const descricaoAtividade = (atividade, nomeDe) => {
  const nome = nomeDe(atividade.autor);
  switch (atividade.tipo) {
    case 'criada': return atividade.detalhe ? `Ficha criada automaticamente (${atividade.detalhe})` : `${nome} criou a ficha`;
    case 'movida': return `${nome} moveu para "${atividade.detalhe}"`;
    case 'responsavel': return `${nome} atribuiu a ficha a ${atividade.detalhe}`;
    case 'concluida': return `${nome} marcou como concluída`;
    case 'reaberta': return `${nome} reabriu a ficha`;
    case 'comentario': return `${nome} comentou`;
    case 'fixada': return `${nome} fixou a ficha`;
    case 'desafixada': return `${nome} desafixou a ficha`;
    case 'arquivada': return atividade.detalhe ? `Ficha arquivada (${atividade.detalhe})` : `${nome} arquivou a ficha`;
    case 'desarquivada': return `${nome} restaurou a ficha para o quadro`;
    case 'duplicada': return `${nome} duplicou a ficha`;
    default: return `${nome} atualizou a ficha`;
  }
};
