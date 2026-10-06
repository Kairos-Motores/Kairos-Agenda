export const materialColors = [
  { id: 'blue', hex: '#1a73e8', label: 'Azul Google' },
  { id: 'cyan', hex: '#00acc1', label: 'Ciano' },
  { id: 'teal', hex: '#00897b', label: 'Verde Mar' },
  { id: 'green', hex: '#388e3c', label: 'Verde Sálvia' },
  { id: 'amber', hex: '#ffb300', label: 'Amarelo Ouro' },
  { id: 'orange', hex: '#f57c00', label: 'Laranja Outono' },
  { id: 'coral', hex: '#f4511e', label: 'Coral' },
  { id: 'rose', hex: '#d81b60', label: 'Rosa Escuro' },
  { id: 'purple', hex: '#673ab7', label: 'Lavanda' },
  { id: 'indigo', hex: '#3949ab', label: 'Índigo' },
  { id: 'graphite', hex: '#5f6368', label: 'Grafite' },
  { id: 'red', hex: '#d32f2f', label: 'Vermelho' },
  { id: 'pink', hex: '#c2185b', label: 'Rosa' },
  { id: 'lime', hex: '#afb42b', label: 'Lima' },
  { id: 'light-blue', hex: '#0288d1', label: 'Azul Claro' },
  { id: 'deep-orange', hex: '#e64a19', label: 'Laranja Profundo' },
  { id: 'brown', hex: '#5d4037', label: 'Marrom' },
  { id: 'blue-grey', hex: '#455a64', label: 'Cinza Azulado' },
  { id: 'violet', hex: '#7b1fa2', label: 'Violeta' },
  { id: 'emerald', hex: '#2e7d32', label: 'Esmeralda' },
  { id: 'sky', hex: '#03a9f4', label: 'Céu' },
  { id: 'gold', hex: '#fbc02d', label: 'Ouro' }
];

// Paleta do seletor de cor do tema. Separada de materialColors de propósito: aquela alimenta
// a cor dos tipos de evento por hash (eventTypeLayer.js), e mudá-la recolore eventos já salvos.
const shadeFamilies = [
  { label: 'Rosa', shades: ['#fce4ec', '#f8bbd0', '#f48fb1', '#f06292', '#ec407a', '#e91e63', '#c2185b', '#880e4f'] },
  { label: 'Vermelho', shades: ['#ffebee', '#ffcdd2', '#e57373', '#ef5350', '#f44336', '#e53935', '#b71c1c'] },
  { label: 'Coral', shades: ['#fbe9e7', '#ffccbc', '#ff8a65', '#ff7043', '#ff5722', '#f4511e', '#bf360c'] },
  { label: 'Laranja', shades: ['#fff3e0', '#ffe0b2', '#ffb74d', '#ffa726', '#ff9800', '#fb8c00', '#e65100'] },
  { label: 'Âmbar', shades: ['#fff8e1', '#ffecb3', '#ffd54f', '#ffca28', '#ffc107', '#ffa000', '#ff6f00'] },
  { label: 'Amarelo', shades: ['#fffde7', '#fff9c4', '#fff176', '#ffee58', '#ffeb3b', '#fdd835', '#f9a825'] },
  { label: 'Lima', shades: ['#f9fbe7', '#f0f4c3', '#dce775', '#d4e157', '#cddc39', '#c0ca33', '#827717'] },
  { label: 'Verde-limão', shades: ['#f1f8e9', '#dcedc8', '#aed581', '#9ccc65', '#8bc34a', '#7cb342', '#33691e'] },
  { label: 'Verde', shades: ['#e8f5e9', '#c8e6c9', '#81c784', '#66bb6a', '#4caf50', '#43a047', '#1b5e20'] },
  { label: 'Verde-mar', shades: ['#e0f2f1', '#b2dfdb', '#4db6ac', '#26a69a', '#009688', '#00897b', '#004d40'] },
  { label: 'Ciano', shades: ['#e0f7fa', '#b2ebf2', '#4dd0e1', '#26c6da', '#00bcd4', '#00acc1', '#006064'] },
  { label: 'Azul-claro', shades: ['#e1f5fe', '#b3e5fc', '#4fc3f7', '#29b6f6', '#03a9f4', '#039be5', '#01579b'] },
  { label: 'Azul', shades: ['#e3f2fd', '#bbdefb', '#64b5f6', '#42a5f5', '#2196f3', '#1e88e5', '#0d47a1'] },
  { label: 'Índigo', shades: ['#e8eaf6', '#c5cae9', '#7986cb', '#5c6bc0', '#3f51b5', '#3949ab', '#1a237e'] },
  { label: 'Roxo', shades: ['#f3e5f5', '#e1bee7', '#ba68c8', '#ab47bc', '#9c27b0', '#8e24aa', '#4a148c'] },
  { label: 'Lavanda', shades: ['#ede7f6', '#d1c4e9', '#9575cd', '#7e57c2', '#673ab7', '#5e35b1', '#311b92'] },
  { label: 'Marrom', shades: ['#efebe9', '#d7ccc8', '#a1887f', '#8d6e63', '#795548', '#6d4c41', '#3e2723'] },
  { label: 'Cinza', shades: ['#fafafa', '#f5f5f5', '#e0e0e0', '#bdbdbd', '#9e9e9e', '#757575', '#424242', '#212121'] },
  { label: 'Cinza-azulado', shades: ['#eceff1', '#cfd8dc', '#90a4ae', '#78909c', '#607d8b', '#546e7a', '#263238'] },
  { label: 'Teal-escuro', shades: ['#e0f2f1', '#80cbc4', '#26a69a', '#00796b', '#00695c'] }
];

const shadeLabel = (family, index, total) => {
  const names = total <= 5
    ? ['claro', 'suave', 'médio', 'forte', 'escuro']
    : ['bebê', 'muito claro', 'claro', 'suave', 'vivo', 'médio', 'forte', 'escuro'];
  return `${family} ${names[index] ?? index + 1}`;
};

const seenHexes = new Set(materialColors.map(c => c.hex.toLowerCase()));
const generatedThemeColors = shadeFamilies.flatMap(({ label, shades }) =>
  shades.flatMap((hex, i) => {
    const key = hex.toLowerCase();
    if (seenHexes.has(key)) return [];
    seenHexes.add(key);
    return [{ id: `${label}-${i}`.toLowerCase().replace(/\s+/g, '-'), hex, label: shadeLabel(label, i, shades.length) }];
  })
);

export const themeColors = [...materialColors, ...generatedThemeColors];
