import { argbFromHex, themeFromSourceColor, applyTheme } from "@material/material-color-utilities";

export const applyDynamicTheme = (hexColor, isDark) => {
  const theme = themeFromSourceColor(argbFromHex(hexColor));
  const system = isDark ? theme.schemes.dark : theme.schemes.light;

  const root = document.documentElement;

  // Mapeia as cores do Material You para variáveis CSS
  root.style.setProperty('--bg-page', hexFromArgb(system.surface));
  root.style.setProperty('--bg-primary', hexFromArgb(system.surfaceContainer));
  root.style.setProperty('--bg-secondary', hexFromArgb(system.surfaceContainerHigh));
  root.style.setProperty('--text-primary', hexFromArgb(system.onSurface));
  root.style.setProperty('--text-accent', hexFromArgb(system.primary));
  root.style.setProperty('--border-color', hexFromArgb(system.outlineVariant));
  
  // Cores de destaque para eventos
  root.style.setProperty('--md-primary-container', hexFromArgb(system.primaryContainer));
  root.style.setProperty('--md-on-primary-container', hexFromArgb(system.onPrimaryContainer));
};

// Helper para converter ARGB de volta para HEX
const hexFromArgb = (argb) => {
  const r = (argb >> 16) & 255;
  const g = (argb >> 8) & 255;
  const b = argb & 255;
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
};