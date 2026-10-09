import { parseAssignees, joinAssignees } from './assignees';

// Automações por lista: "quando uma ficha entra nesta lista, faça X" — guardadas como um
// array JSON na própria lista (cr4a1_automacao), sem precisar de tabela à parte. Cada regra é
// {tipo, valor}; valor é opcional (ex.: concluir/reabrir não precisam de valor).
export const parseAutomacoes = (raw) => {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
};

export const TIPOS_AUTOMACAO = {
  responsavel: 'Atribuir responsável',
  etiqueta: 'Adicionar etiqueta',
  cor: 'Definir cor',
  concluir: 'Marcar como concluída',
  reabrir: 'Marcar como pendente'
};

// Aplica as regras da lista de destino sobre a ficha que acabou de chegar, devolvendo só os
// campos (já no formato do Dataverse) que precisam mudar — pra entrar direto num patch/spread
// junto com a mudança de lista. etiquetasAtuaisCsv é a string crua de cr4a1_etiquetas.
export const aplicarAutomacoes = (automacoes, etiquetasAtuaisCsv) => {
  if (!automacoes.length) return null;
  const mudancas = {};
  let etiquetas = parseAssignees(etiquetasAtuaisCsv);
  const etiquetasOriginais = etiquetas;
  automacoes.forEach(regra => {
    switch (regra.tipo) {
      case 'responsavel':
        mudancas.cr4a1_responsavel_login = regra.valor;
        break;
      case 'etiqueta':
        if (!etiquetas.includes(regra.valor)) etiquetas = [...etiquetas, regra.valor];
        break;
      case 'cor':
        mudancas.cr4a1_cor = regra.valor;
        break;
      case 'concluir':
        mudancas.cr4a1_concluida = 'Sim';
        break;
      case 'reabrir':
        mudancas.cr4a1_concluida = 'Não';
        break;
      default:
        break;
    }
  });
  if (etiquetas !== etiquetasOriginais) mudancas.cr4a1_etiquetas = joinAssignees(etiquetas);
  return Object.keys(mudancas).length ? mudancas : null;
};

export const descricaoAutomacao = (regra, { etiquetas = [], allUsers = [] } = {}) => {
  const nomeDe = (login) => allUsers.find(u => u.cr4a1_username === login)?.cr4a1_nome_exibicao || login;
  switch (regra.tipo) {
    case 'responsavel': return `Atribuir a ${nomeDe(regra.valor)}`;
    case 'etiqueta': return `Adicionar etiqueta "${etiquetas.find(e => e.cr4a1_etiquetaid === regra.valor)?.cr4a1_nome || '—'}"`;
    case 'cor': return 'Definir cor da ficha';
    case 'concluir': return 'Marcar como concluída';
    case 'reabrir': return 'Marcar como pendente';
    default: return 'Regra desconhecida';
  }
};
