// Histórico de atividades da ficha, igual aos comentários: um array JSON guardado numa
// coluna memo, sem precisar de tabela à parte. Cada evento relevante (criação, mudança de
// lista, responsável, conclusão, comentário) vira uma entrada — mantemos só as últimas 200
// pra coluna não crescer sem limite num cartão muito movimentado.
const LIMITE_ATIVIDADES = 200;

export const parseAtividades = (raw) => {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
};

export const registrarAtividade = (atividadesAtuais, tipo, autor, detalhe = '') => {
  const nova = { id: crypto.randomUUID(), tipo, autor, detalhe, data: new Date().toISOString() };
  return JSON.stringify([...parseAtividades(atividadesAtuais), nova].slice(-LIMITE_ATIVIDADES));
};

export const descricaoAtividade = (atividade, nomeDe) => {
  const nome = nomeDe(atividade.autor);
  switch (atividade.tipo) {
    case 'criada': return `${nome} criou a ficha`;
    case 'movida': return `${nome} moveu para "${atividade.detalhe}"`;
    case 'responsavel': return `${nome} atribuiu a ficha a ${atividade.detalhe}`;
    case 'concluida': return `${nome} marcou como concluída`;
    case 'reaberta': return `${nome} reabriu a ficha`;
    case 'comentario': return `${nome} comentou`;
    case 'fixada': return `${nome} fixou a ficha`;
    case 'desafixada': return `${nome} desafixou a ficha`;
    default: return `${nome} atualizou a ficha`;
  }
};
