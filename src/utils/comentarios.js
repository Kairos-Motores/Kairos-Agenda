// Comentários da ficha ficam guardados como um array JSON numa coluna memo do Dataverse —
// mesmo padrão já usado pros anexos, sem precisar de uma tabela à parte.
export const parseComentarios = (raw) => {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
};

export const criarComentario = (autor, texto) => ({
  id: crypto.randomUUID(),
  autor,
  texto,
  data: new Date().toISOString()
});
