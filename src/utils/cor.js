// Decide se o texto em cima de uma cor de fundo deve ser claro ou escuro, pelo brilho
// percebido da cor (fórmula padrão de luminância relativa). Usado pra colorir a ficha
// inteira (card na lista, cabeçalho ao abrir) sem o texto sumir dependendo da cor escolhida.
export const corTextoLegivel = (hexCor) => {
  if (!hexCor) return null;
  const limpo = hexCor.replace('#', '');
  if (limpo.length !== 6) return null;
  const r = parseInt(limpo.substring(0, 2), 16);
  const g = parseInt(limpo.substring(2, 4), 16);
  const b = parseInt(limpo.substring(4, 6), 16);
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const clara = luminancia > 0.6;
  return {
    principal: clara ? '#1a1a1a' : '#ffffff',
    suave: clara ? 'rgba(26,26,26,0.65)' : 'rgba(255,255,255,0.75)'
  };
};
