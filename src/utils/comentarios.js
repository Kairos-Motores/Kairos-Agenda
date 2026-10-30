// Comentários da ficha ficam guardados como um array JSON numa coluna memo do Dataverse —
// mesmo padrão já usado pros anexos, sem precisar de uma tabela à parte.
export const EMOJIS_REACAO_COMENTARIO = ['👍', '❤️', '🎉', '👀', '🚀'];

export const parseComentarios = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

export const criarComentario = (autor, texto) => ({
  id: crypto.randomUUID(),
  autor,
  texto,
  data: new Date().toISOString(),
  reacoes: {}
});

export const alternarReacaoComentario = (rawComentarios, comentarioId, emoji, usuario) => {
  const lista = parseComentarios(rawComentarios).map(c => {
    if (c.id !== comentarioId) return c;
    const reacoesAtuais = { ...(c.reacoes || {}) };
    const usuariosDoEmoji = Array.isArray(reacoesAtuais[emoji]) ? [...reacoesAtuais[emoji]] : [];
    if (usuariosDoEmoji.includes(usuario)) {
      const filtrados = usuariosDoEmoji.filter(u => u !== usuario);
      if (filtrados.length > 0) reacoesAtuais[emoji] = filtrados;
      else delete reacoesAtuais[emoji];
    } else {
      reacoesAtuais[emoji] = [...usuariosDoEmoji, usuario];
    }
    return { ...c, reacoes: reacoesAtuais };
  });
  return JSON.stringify(lista);
};
