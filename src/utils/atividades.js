// Histórico de atividades e metadados avançados da ficha: guardados como JSON na coluna memo
// cr4a1_atividades ({ atividades: [...], meta: {...} }), 100% compatível com fichas antigas
// que tinham apenas o array de atividades.
import { extrairTarefas } from './descricaoTarefas';

const LIMITE_ATIVIDADES = 200;

export const PRIORIDADES_FICHA = {
  '': { label: 'Sem prioridade', badgeClass: 'bg-secondary text-muted-foreground border-border', dotColor: '#94a3b8', cor: '#64748b' },
  baixa: { label: 'Baixa', badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30', dotColor: '#10b981', cor: '#10b981' },
  media: { label: 'Média', badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30', dotColor: '#f59e0b', cor: '#f59e0b' },
  alta: { label: 'Alta', badgeClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30', dotColor: '#f97316', cor: '#f97316' },
  critica: { label: 'Crítica', badgeClass: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30', dotColor: '#ef4444', cor: '#ef4444' }
};

export const STATUS_APROVACAO_FICHA = {
  '': { label: 'Sem status extra', badgeClass: 'bg-secondary text-muted-foreground', cor: '#64748b' },
  em_analise: { label: 'Em Aprovação', badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300', cor: '#3b82f6' },
  aprovado: { label: 'Aprovado ✓', badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', cor: '#10b981' },
  revisar: { label: 'Ajustes Solicitados', badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', cor: '#f59e0b' }
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
  cronometroInicio: null,
  notasIds: [],
  dependenciasFichasIds: []
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
        observadores: Array.isArray(parsed.meta.observadores) ? parsed.meta.observadores.filter(Boolean) : [],
        notasIds: Array.isArray(parsed.meta.notasIds) ? parsed.meta.notasIds.filter(Boolean) : [],
        dependenciasFichasIds: Array.isArray(parsed.meta.dependenciasFichasIds) ? parsed.meta.dependenciasFichasIds.filter(Boolean) : []
      };
    }
    if (Array.isArray(parsed)) {
      const metaEntry = parsed.find(x => x && x.tipo === '__meta__');
      if (metaEntry?.meta) {
        return {
          ...base,
          ...metaEntry.meta,
          coResponsaveis: Array.isArray(metaEntry.meta.coResponsaveis) ? metaEntry.meta.coResponsaveis.filter(Boolean) : [],
          observadores: Array.isArray(metaEntry.meta.observadores) ? metaEntry.meta.observadores.filter(Boolean) : [],
          notasIds: Array.isArray(metaEntry.meta.notasIds) ? metaEntry.meta.notasIds.filter(Boolean) : [],
          dependenciasFichasIds: Array.isArray(metaEntry.meta.dependenciasFichasIds) ? metaEntry.meta.dependenciasFichasIds.filter(Boolean) : []
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

/**
 * Calcula o progresso e porcentagem de uma ficha, considerando suas próprias microtarefas
 * e as fichas das quais ela depende (mesmo de outros usuários e listas).
 *
 * Regras:
 * - Se não tem dependências: porcentagem das microtarefas próprias (ou 100% se concluída, 0% se pendente).
 * - Se depende exclusivamente de outras fichas (sem microtarefas próprias):
 *   a porcentagem reflete a média das dependências e atinge 100% quando todas estiverem 100%.
 * - Se tem microtarefas próprias E dependências:
 *   a porcentagem só chega a 100% se TODAS as microtarefas estiverem feitas E TODAS as dependências estiverem 100%.
 */
export const calcularProgressoFicha = (ficha, todasFichas = [], visitados = new Set()) => {
  if (!ficha) {
    return {
      porcentagem: 0,
      concluida: false,
      podeConcluir: true,
      temDependencias: false,
      temTarefasProprias: false,
      tarefasTotal: 0,
      tarefasFeitas: 0,
      depsTotal: 0,
      depsConcluidas: 0,
      fichasDep: [],
      depsInfo: []
    };
  }

  const fichaId = ficha.cr4a1_fichaid;
  if (fichaId && visitados.has(fichaId)) {
    return {
      porcentagem: 0,
      concluida: false,
      podeConcluir: false,
      temDependencias: true,
      temTarefasProprias: false,
      tarefasTotal: 0,
      tarefasFeitas: 0,
      depsTotal: 0,
      depsConcluidas: 0,
      fichasDep: [],
      depsInfo: []
    };
  }

  const novosVisitados = new Set(visitados);
  if (fichaId) novosVisitados.add(fichaId);

  const meta = parseFichaMeta(ficha.cr4a1_atividades);
  const depIds = (meta.dependenciasFichasIds || []).filter(id => id && id !== fichaId);
  const fichasDep = depIds.map(id => todasFichas.find(f => f.cr4a1_fichaid === id)).filter(Boolean);
  const depsTotal = fichasDep.length;
  const temDependencias = depsTotal > 0;

  const tarefasProprias = extrairTarefas(ficha.cr4a1_descricao);
  const tarefasTotal = tarefasProprias.length;
  const tarefasFeitas = tarefasProprias.filter(t => t.concluida).length;
  const temTarefasProprias = tarefasTotal > 0;

  const depsInfo = fichasDep.map(dep => {
    const info = calcularProgressoFicha(dep, todasFichas, novosVisitados);
    const estaConcluida = dep.cr4a1_concluida === 'Sim' || info.porcentagem === 100 || info.concluida;
    return {
      ficha: dep,
      porcentagem: estaConcluida ? 100 : info.porcentagem,
      concluida: estaConcluida
    };
  });

  const depsConcluidas = depsInfo.filter(d => d.concluida).length;
  const todasDeps100 = temDependencias ? (depsConcluidas === depsTotal) : true;

  let porcentagem = 0;
  let podeConcluir = true;
  let concluida = false;

  if (!temDependencias) {
    if (temTarefasProprias) {
      porcentagem = Math.round((tarefasFeitas / tarefasTotal) * 100);
      concluida = tarefasFeitas === tarefasTotal || ficha.cr4a1_concluida === 'Sim';
    } else {
      concluida = ficha.cr4a1_concluida === 'Sim';
      porcentagem = concluida ? 100 : 0;
    }
    podeConcluir = true;
  } else if (!temTarefasProprias) {
    // Depende exclusivamente de outras fichas: a conclusão delas é a sua própria
    const somaPorcentagens = depsInfo.reduce((acc, d) => acc + d.porcentagem, 0);
    porcentagem = Math.round(somaPorcentagens / depsTotal);
    podeConcluir = todasDeps100;
    concluida = todasDeps100;
  } else {
    // Tem microtarefas próprias E dependências
    const totalItens = tarefasTotal + depsTotal;
    const somaProgressoDeps = depsInfo.reduce((acc, d) => acc + (d.porcentagem / 100), 0);
    const itensCompletados = tarefasFeitas + somaProgressoDeps;
    porcentagem = Math.min(100, Math.round((itensCompletados / totalItens) * 100));

    // Trava em no máximo 99% se faltar qualquer dependência ou microtarefa própria
    if (!todasDeps100 || tarefasFeitas < tarefasTotal) {
      if (porcentagem >= 100) porcentagem = 99;
    }

    podeConcluir = todasDeps100 && tarefasFeitas === tarefasTotal;
    concluida = podeConcluir && (ficha.cr4a1_concluida === 'Sim' || (todasDeps100 && tarefasFeitas === tarefasTotal));
  }

  return {
    porcentagem,
    concluida,
    podeConcluir,
    temDependencias,
    temTarefasProprias,
    tarefasTotal,
    tarefasFeitas,
    depsTotal,
    depsConcluidas,
    fichasDep,
    depsInfo
  };
};

/**
 * Detecta se adicionar fichaAlvoId como dependência de fichaOrigemId causaria um ciclo de dependências.
 */
export const detectarCicloDependencia = (fichaOrigemId, fichaAlvoId, todasFichas = []) => {
  if (!fichaOrigemId || !fichaAlvoId) return false;
  if (fichaOrigemId === fichaAlvoId) return true;

  const fila = [fichaAlvoId];
  const visitados = new Set();

  while (fila.length > 0) {
    const atualId = fila.shift();
    if (atualId === fichaOrigemId) return true;
    if (visitados.has(atualId)) continue;
    visitados.add(atualId);

    const fichaAtual = todasFichas.find(f => f.cr4a1_fichaid === atualId);
    if (!fichaAtual) continue;
    const metaAtual = parseFichaMeta(fichaAtual.cr4a1_atividades);
    const depIds = metaAtual.dependenciasFichasIds || [];
    for (const dId of depIds) {
      if (dId === fichaOrigemId) return true;
      if (!visitados.has(dId)) fila.push(dId);
    }
  }

  return false;
};
