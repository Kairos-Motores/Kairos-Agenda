import { twemojiUrl } from '../../utils/emoji';

// Desenha o emoji como um adesivo ilustrado (Twemoji) em vez do caractere de emoji cru —
// fica igual em qualquer sistema operacional, em vez de depender da fonte nativa do Windows.
export const Sticker = ({ emoji, size = 20, className = '' }) => (
  <img
    src={twemojiUrl(emoji)}
    alt={emoji}
    title={emoji}
    draggable={false}
    loading="lazy"
    className={`inline-block shrink-0 select-none align-middle ${className}`}
    style={{ width: size, height: size }}
  />
);
