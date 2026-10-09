// Converte um emoji pro nome de arquivo que o Twemoji usa (codepoints em hexadecimal,
// separados por hífen, sem o seletor de variação FE0F) — é assim que a biblioteca de
// imagens da Twemoji indexa cada desenho.
const emojiParaCodepoint = (emoji) => [...emoji]
  .map(char => char.codePointAt(0).toString(16))
  .filter(hex => hex !== 'fe0f')
  .join('-');

// Twemoji desenha os emojis como adesivos coloridos (ilustração própria, igual em todo
// dispositivo) em vez de usar a fonte de emoji do sistema — que no Windows é bem mais sem
// graça que a do Twemoji/Apple/Android.
export const twemojiUrl = (emoji) => `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72/${emojiParaCodepoint(emoji)}.png`;
