import { materialColors } from '../constants/materialColors';

// Não guardamos uma cor própria por tipo de evento (só nome/emoji/camada), então as
// camadas "borda" e "padrão" derivam uma cor estável a partir do nome do tipo — o
// mesmo tipo sempre cai na mesma cor da paleta, sem precisar de um campo extra.
const hashToColor = (key) => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return materialColors[hash % materialColors.length].hex;
};

// Resolve a camada visual (ícone / borda / padrão / nenhuma) configurada para o tipo
// de um evento, a partir do nome salvo em cr4a1_tipo e da lista de tipos cadastrados.
export const getEventTypeLayer = (typeName, eventTypes = []) => {
  const type = eventTypes.find(t => t.name === typeName);
  if (!type) return { layer: 'nenhuma', emoji: null, color: null };
  const layer = type.layer || 'nenhuma';
  const color = (layer === 'borda' || layer === 'padrao') ? hashToColor(type.name || type.id) : null;
  return { layer, emoji: type.emoji || null, color };
};

export const typeLayerBorderStyle = (color) => ({ borderLeft: `4px solid ${color}` });

export const typeLayerPatternStyle = (color) => ({
  backgroundImage: `repeating-linear-gradient(45deg, ${color}66 0px, ${color}66 4px, transparent 4px, transparent 8px)`
});
