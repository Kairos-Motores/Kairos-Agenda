import { parseAssignees, joinAssignees } from './assignees';

// Automações por lista: "quando X acontecer com uma ficha desta lista, faça Y" — guardadas
// como um array JSON na própria lista (cr4a1_automacao), sem precisar de tabela à parte. Cada
// regra é {id, gatilho, etiquetaGatilho?, tipo, valor?}.
export const parseAutomacoes = (raw) => {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
};

export const GATILHOS_AUTOMACAO = {
  entrou: 'Ficha entrar na lista',
  criada: 'Ficha for criada na lista',
  concluida: 'Ficha for concluída',
  etiqueta: 'Etiqueta for adicionada',
  vencendo: 'Faltar menos de 24h pro prazo',
  atrasada: 'Ficha ficar atrasada'
};

export const TIPOS_AUTOMACAO = {
  responsavel: 'Atribuir responsável',
  etiqueta: 'Adicionar etiqueta',
  cor: 'Definir cor',
  concluir: 'Marcar como concluída',
  reabrir: 'Marcar como pendente',
  mover: 'Mover para outra lista',
  comentar: 'Deixar um comentário',
  notificar: 'Notificar o responsável'
};

// As regras baseadas em data (vencendo/atrasada) rodam sozinhas a cada poll do quadro — sem
// esse "estado atual", disparariam de novo a cada 5s enquanto a condição continuar valendo.
export const estadoDataAtual = (ficha) => {
  if (!ficha.cr4a1_data_inicio || ficha.cr4a1_concluida === 'Sim') return '';
  const horas = (new Date(ficha.cr4a1_data_inicio) - new Date()) / 3600000;
  if (horas < 0) return 'atrasada';
  if (horas <= 24) return 'vencendo';
  return '';
};

// Filtra as regras de uma lista que combinam com o gatilho (e, se for por etiqueta, com a
// etiqueta específica que acabou de ser adicionada).
export const regrasPara = (automacoes, gatilho, etiquetaId) => automacoes.filter(r => {
  if (r.gatilho !== gatilho) return false;
  if (gatilho === 'etiqueta') return r.etiquetaGatilho === etiquetaId;
  return true;
});

// Aplica as regras já filtradas, devolvendo os campos (formato Dataverse) a corrigir num
// patch, comentários a deixar e se deve notificar — ou null se não há nada a fazer.
export const aplicarAutomacoes = (regras, etiquetasAtuaisCsv) => {
  if (!regras.length) return null;
  const patch = {};
  const etiquetasOriginais = parseAssignees(etiquetasAtuaisCsv);
  let etiquetas = etiquetasOriginais;
  const comentarios = [];
  let notificar = false;

  regras.forEach(regra => {
    switch (regra.tipo) {
      case 'responsavel': patch.cr4a1_responsavel_login = regra.valor; break;
      case 'etiqueta': if (!etiquetas.includes(regra.valor)) etiquetas = [...etiquetas, regra.valor]; break;
      case 'cor': patch.cr4a1_cor = regra.valor; break;
      case 'concluir': patch.cr4a1_concluida = 'Sim'; break;
      case 'reabrir': patch.cr4a1_concluida = 'Não'; break;
      case 'mover': patch.cr4a1_lista_id = regra.valor; break;
      case 'comentar': comentarios.push(regra.valor); break;
      case 'notificar': notificar = true; break;
      default: break;
    }
  });

  if (etiquetas !== etiquetasOriginais) patch.cr4a1_etiquetas = joinAssignees(etiquetas);
  if (!Object.keys(patch).length && comentarios.length === 0 && !notificar) return null;
  return { patch, comentarios, notificar };
};

export const descricaoAutomacao = (regra, { etiquetas = [], allUsers = [], listas = [] } = {}) => {
  const nomeDe = (login) => allUsers.find(u => u.cr4a1_username === login)?.cr4a1_nome_exibicao || login;
  const nomeEtiqueta = (id) => etiquetas.find(e => e.cr4a1_etiquetaid === id)?.cr4a1_nome || '—';
  const gatilho = GATILHOS_AUTOMACAO[regra.gatilho] || 'Gatilho desconhecido';
  const condicao = regra.gatilho === 'etiqueta' ? ` "${nomeEtiqueta(regra.etiquetaGatilho)}"` : '';

  let acao;
  switch (regra.tipo) {
    case 'responsavel': acao = `atribuir a ${nomeDe(regra.valor)}`; break;
    case 'etiqueta': acao = `adicionar etiqueta "${nomeEtiqueta(regra.valor)}"`; break;
    case 'cor': acao = 'definir a cor da ficha'; break;
    case 'concluir': acao = 'marcar como concluída'; break;
    case 'reabrir': acao = 'marcar como pendente'; break;
    case 'mover': acao = `mover para "${listas.find(l => l.cr4a1_listaid === regra.valor)?.cr4a1_nome || '—'}"`; break;
    case 'comentar': acao = `comentar "${regra.valor}"`; break;
    case 'notificar': acao = 'notificar o responsável'; break;
    default: acao = 'ação desconhecida';
  }
  return `${gatilho}${condicao} → ${acao}`;
};
