import { parseAssignees, joinAssignees } from './assignees';
import { addDays } from 'date-fns';

// Automações por lista: "quando X acontecer com uma ficha desta lista, faça Y" — guardadas
// como um array JSON na própria lista (cr4a1_automacao), sem precisar de tabela à parte. Cada
// regra é {id, gatilho, etiquetaGatilho?, tipo, valor?, mensagemEmail?}.
export const parseAutomacoes = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.automacoes)) return parsed.automacoes;
    if (parsed && Array.isArray(parsed.regras)) return parsed.regras;
    return [];
  } catch { return []; }
};

// Gerentes adicionais com permissões idênticas ao criador da lista
export const parseListaGerentes = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.gerentes)) return parsed.gerentes.filter(Boolean);
    return [];
  } catch { return []; }
};

// Cor de destaque personalizada da lista (guardada em cr4a1_automacao)
export const parseListaCor = (raw) => {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed.cor === 'string') ? parsed.cor : '';
  } catch { return ''; }
};

// Serializa { automacoes, gerentes, cor } preservando os campos existentes
export const serializarConfigLista = (rawAtual, mudancas = {}) => {
  const automacoes = mudancas.automacoes !== undefined ? mudancas.automacoes : parseAutomacoes(rawAtual);
  const gerentes = mudancas.gerentes !== undefined ? mudancas.gerentes : parseListaGerentes(rawAtual);
  const cor = mudancas.cor !== undefined ? mudancas.cor : parseListaCor(rawAtual);
  return JSON.stringify({ automacoes, gerentes, cor });
};

// Verifica se uma ficha está no espaço de arquivadas
export const ehFichaArquivada = (ficha) =>
  ficha?.cr4a1_fixada === 'Arq' || ficha?.cr4a1_fixada === 'Arquivada';

export const GATILHOS_AUTOMACAO = {
  entrou: 'Ficha entrar na lista',
  criada: 'Ficha for criada na lista',
  concluida: 'Ficha for concluída',
  reaberta: 'Ficha concluída for reaberta',
  arquivada: 'Ficha for arquivada',
  etiqueta: 'Etiqueta for adicionada',
  responsavel_atribuido: 'Responsável for atribuído ou alterado',
  prazo_definido: 'Prazo (data) for definido ou alterado',
  comentario_adicionado: 'Comentário for adicionado na ficha',
  checklist_concluida: 'Todas as subtarefas (checklist) forem concluídas',
  vencendo: 'Faltar menos de 24h pro prazo',
  urgente: 'Faltar menos de 2h pro prazo (Urgente)',
  atrasada: 'Ficha ficar atrasada'
};

export const TIPOS_AUTOMACAO = {
  email_responsavel: 'Envio por e-mail (para o responsável)',
  email_usuario: 'Envio por e-mail (para usuário específico)',
  email_gerentes: 'Envio por e-mail (para criador/co-gerentes da lista)',
  notificar: 'Notificar o responsável (Push / Dispositivo)',
  responsavel: 'Atribuir responsável',
  etiqueta: 'Adicionar etiqueta',
  remover_etiqueta: 'Remover etiqueta',
  limpar_etiquetas: 'Limpar todas as etiquetas',
  cor: 'Definir cor',
  concluir: 'Marcar como concluída',
  reabrir: 'Marcar como pendente',
  fixar: 'Fixar ficha no topo da lista',
  desafixar: 'Desafixar ficha do topo',
  arquivar: 'Arquivar ficha',
  desarquivar: 'Restaurar ficha (desarquivar)',
  prazo_dias: 'Definir prazo automático (+X dias)',
  mover: 'Mover para outra lista',
  duplicar_para: 'Duplicar ficha em outra lista',
  comentar: 'Deixar um comentário'
};

// As regras baseadas em data (vencendo/urgente/atrasada) rodam sozinhas a cada poll do quadro — sem
// esse "estado atual", disparariam de novo a cada 5s enquanto a condição continuar valendo.
export const estadoDataAtual = (ficha) => {
  if (!ficha.cr4a1_data_inicio || ficha.cr4a1_concluida === 'Sim' || ehFichaArquivada(ficha)) return '';
  const horas = (new Date(ficha.cr4a1_data_inicio) - new Date()) / 3600000;
  if (horas < 0) return 'atrasada';
  if (horas <= 2) return 'urgente';
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
// patch, comentários a deixar, envios de e-mail, notificações push e duplicações — ou null se não há nada a fazer.
export const aplicarAutomacoes = (regras, etiquetasAtuaisCsv) => {
  if (!regras.length) return null;
  const patch = {};
  const etiquetasOriginais = parseAssignees(etiquetasAtuaisCsv);
  let etiquetas = [...etiquetasOriginais];
  let etiquetasModificadas = false;
  const comentarios = [];
  const emails = [];
  const duplicarPara = [];
  let notificar = false;

  regras.forEach(regra => {
    switch (regra.tipo) {
      case 'responsavel':
        patch.cr4a1_responsavel_login = regra.valor;
        break;
      case 'etiqueta':
        if (regra.valor && !etiquetas.includes(regra.valor)) {
          etiquetas = [...etiquetas, regra.valor];
          etiquetasModificadas = true;
        }
        break;
      case 'remover_etiqueta':
        if (regra.valor && etiquetas.includes(regra.valor)) {
          etiquetas = etiquetas.filter(id => id !== regra.valor);
          etiquetasModificadas = true;
        }
        break;
      case 'limpar_etiquetas':
        if (etiquetas.length > 0) {
          etiquetas = [];
          etiquetasModificadas = true;
        }
        break;
      case 'cor':
        patch.cr4a1_cor = regra.valor;
        break;
      case 'concluir':
        patch.cr4a1_concluida = 'Sim';
        break;
      case 'reabrir':
        patch.cr4a1_concluida = 'Não';
        break;
      case 'fixar':
        patch.cr4a1_fixada = 'Sim';
        break;
      case 'desafixar':
        patch.cr4a1_fixada = 'Não';
        break;
      case 'arquivar':
        patch.cr4a1_fixada = 'Arq';
        break;
      case 'desarquivar':
        patch.cr4a1_fixada = 'Não';
        break;
      case 'prazo_dias': {
        const dias = parseInt(regra.valor, 10);
        if (!Number.isNaN(dias)) {
          const alvo = addDays(new Date(), dias);
          alvo.setHours(9, 0, 0, 0);
          patch.cr4a1_data_inicio = alvo.toISOString();
        }
        break;
      }
      case 'mover':
        patch.cr4a1_lista_id = regra.valor;
        break;
      case 'duplicar_para':
        if (regra.valor) duplicarPara.push(regra.valor);
        break;
      case 'comentar':
        if (regra.valor) comentarios.push(regra.valor);
        break;
      case 'notificar':
        notificar = true;
        break;
      case 'email_responsavel':
        emails.push({
          alvo: 'responsavel',
          mensagemPersonalizada: regra.mensagemEmail || ''
        });
        break;
      case 'email_usuario':
        if (regra.valor) {
          emails.push({
            alvo: 'usuario',
            usuario: regra.valor,
            mensagemPersonalizada: regra.mensagemEmail || ''
          });
        }
        break;
      case 'email_gerentes':
        emails.push({
          alvo: 'gerentes',
          mensagemPersonalizada: regra.mensagemEmail || ''
        });
        break;
      default:
        break;
    }
  });

  if (etiquetasModificadas) patch.cr4a1_etiquetas = joinAssignees(etiquetas);
  if (
    !Object.keys(patch).length &&
    comentarios.length === 0 &&
    !notificar &&
    emails.length === 0 &&
    duplicarPara.length === 0
  ) {
    return null;
  }
  return { patch, comentarios, notificar, emails, duplicarPara };
};

export const descricaoAutomacao = (regra, { etiquetas = [], allUsers = [], listas = [] } = {}) => {
  const nomeDe = (login) => allUsers.find(u => u.cr4a1_username === login)?.cr4a1_nome_exibicao || login;
  const nomeEtiqueta = (id) => etiquetas.find(e => e.cr4a1_etiquetaid === id)?.cr4a1_nome || '—';
  const nomeLista = (id) => listas.find(l => l.cr4a1_listaid === id)?.cr4a1_nome || '—';
  const gatilho = GATILHOS_AUTOMACAO[regra.gatilho] || 'Gatilho desconhecido';
  const condicao = regra.gatilho === 'etiqueta' ? ` "${nomeEtiqueta(regra.etiquetaGatilho)}"` : '';

  let acao;
  switch (regra.tipo) {
    case 'email_responsavel':
      acao = `enviar e-mail ao responsável${regra.mensagemEmail ? ` ("${regra.mensagemEmail}")` : ''}`;
      break;
    case 'email_usuario':
      acao = `enviar e-mail para ${nomeDe(regra.valor)}${regra.mensagemEmail ? ` ("${regra.mensagemEmail}")` : ''}`;
      break;
    case 'email_gerentes':
      acao = `enviar e-mail aos gerentes da lista${regra.mensagemEmail ? ` ("${regra.mensagemEmail}")` : ''}`;
      break;
    case 'notificar':
      acao = 'notificar o responsável (Push / Dispositivo)';
      break;
    case 'responsavel':
      acao = `atribuir a ${nomeDe(regra.valor)}`;
      break;
    case 'etiqueta':
      acao = `adicionar etiqueta "${nomeEtiqueta(regra.valor)}"`;
      break;
    case 'remover_etiqueta':
      acao = `remover etiqueta "${nomeEtiqueta(regra.valor)}"`;
      break;
    case 'limpar_etiquetas':
      acao = 'limpar todas as etiquetas';
      break;
    case 'cor':
      acao = 'definir a cor da ficha';
      break;
    case 'concluir':
      acao = 'marcar como concluída';
      break;
    case 'reabrir':
      acao = 'marcar como pendente';
      break;
    case 'fixar':
      acao = 'fixar no topo da lista';
      break;
    case 'desafixar':
      acao = 'desafixar do topo da lista';
      break;
    case 'arquivar':
      acao = 'arquivar a ficha';
      break;
    case 'desarquivar':
      acao = 'restaurar (desarquivar) a ficha';
      break;
    case 'prazo_dias':
      acao = `definir prazo para +${regra.valor || 1} dia(s)`;
      break;
    case 'mover':
      acao = `mover para "${nomeLista(regra.valor)}"`;
      break;
    case 'duplicar_para':
      acao = `duplicar na lista "${nomeLista(regra.valor)}"`;
      break;
    case 'comentar':
      acao = `comentar "${regra.valor}"`;
      break;
    default:
      acao = 'ação desconhecida';
  }
  return `${gatilho}${condicao} → ${acao}`;
};
