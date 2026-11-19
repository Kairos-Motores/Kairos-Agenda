// Catálogo curado de fontes do Google Fonts para personalização individual do módulo Fichas.
// A primeira opção ("Poppins") mantém o padrão original do sistema.
export const GOOGLE_FONTS_FICHAS = [
  { label: 'Poppins (Padrão)', value: 'Poppins', categoria: 'Padrão' },
  { label: 'Inter', value: 'Inter', categoria: 'Moderna' },
  { label: 'Roboto', value: 'Roboto', categoria: 'Neutra' },
  { label: 'Open Sans', value: 'Open Sans', categoria: 'Legível' },
  { label: 'Montserrat', value: 'Montserrat', categoria: 'Geométrica' },
  { label: 'Lato', value: 'Lato', categoria: 'Clássica' },
  { label: 'Nunito', value: 'Nunito', categoria: 'Arredondada' },
  { label: 'DM Sans', value: 'DM Sans', categoria: 'Moderna' },
  { label: 'Plus Jakarta Sans', value: 'Plus Jakarta Sans', categoria: 'Moderna' },
  { label: 'Outfit', value: 'Outfit', categoria: 'Geométrica' },
  { label: 'Quicksand', value: 'Quicksand', categoria: 'Arredondada' },
  { label: 'Raleway', value: 'Raleway', categoria: 'Elegante' },
  { label: 'Source Sans 3', value: 'Source Sans 3', categoria: 'Editorial' },
  { label: 'Space Grotesk', value: 'Space Grotesk', categoria: 'Tecnológica' },
  { label: 'Merriweather', value: 'Merriweather', categoria: 'Serifa' },
  { label: 'Playfair Display', value: 'Playfair Display', categoria: 'Serifa' },
  { label: 'JetBrains Mono', value: 'JetBrains Mono', categoria: 'Monoespaçada' }
];

const fontesCarregadas = new Set(['Poppins', 'Montserrat', 'Roboto', 'Open Sans', 'Lato', 'Playfair Display', 'Merriweather']);

/**
 * Injeta dinamicamente o stylesheet do Google Fonts no <head> para a fonte escolhida,
 * evitando baixar dezenas de fontes desnecessárias na carga inicial do app.
 */
export const carregarGoogleFont = (fontName) => {
  if (typeof document === 'undefined') return;
  const limpa = (fontName || '').trim();
  if (!limpa || limpa === 'Poppins' || fontesCarregadas.has(limpa)) return;

  const id = `gf-fichas-${limpa.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  if (document.getElementById(id)) {
    fontesCarregadas.add(limpa);
    return;
  }

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  const queryName = encodeURIComponent(limpa).replace(/%20/g, '+');
  link.href = `https://fonts.googleapis.com/css2?family=${queryName}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
  fontesCarregadas.add(limpa);
};

/**
 * Pré-carrega em lote as fontes do catálogo curado quando o usuário abre o seletor,
 * para que cada opção apareça já renderizada na sua própria tipografia.
 */
export const carregarCatalogoGoogleFonts = () => {
  if (typeof document === 'undefined') return;
  const faltando = GOOGLE_FONTS_FICHAS.map(f => f.value).filter(v => !fontesCarregadas.has(v));
  if (faltando.length === 0) return;

  const id = 'gf-fichas-catalogo';
  if (document.getElementById(id)) return;

  const families = faltando
    .map(name => `family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@400;600;700`)
    .join('&');

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  document.head.appendChild(link);
  faltando.forEach(v => fontesCarregadas.add(v));
};

export const getFichasFontCss = (fontName) => {
  const limpa = (fontName || '').trim();
  if (!limpa || limpa === 'Poppins' || limpa === 'padrao') {
    return "'Poppins', sans-serif";
  }
  const escapada = limpa.replace(/["']/g, '');
  return `"${escapada}", 'Poppins', sans-serif`;
};
