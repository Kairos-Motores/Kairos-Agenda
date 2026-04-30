import { argbFromHex, themeFromSourceColor, applyTheme, hexFromArgb } from "@material/material-color-utilities";

export const applyDynamicTheme = (hexColor, isDark) => {
  const theme = themeFromSourceColor(argbFromHex(hexColor));
  const system = isDark ? theme.schemes.dark : theme.schemes.light;

  const root = document.documentElement;

  // Injeção de Variáveis Dinâmicas no CSS
  root.style.setProperty('--text-accent', hexFromArgb(system.primary));
  root.style.setProperty('--md-primary-container', hexFromArgb(system.primaryContainer));
  root.style.setProperty('--md-on-primary-container', hexFromArgb(system.onPrimaryContainer));
  root.style.setProperty('--bg-page', hexFromArgb(system.surface));
  root.style.setProperty('--bg-primary', hexFromArgb(system.surfaceContainer));
  root.style.setProperty('--bg-secondary', hexFromArgb(system.surfaceContainerHigh));
  root.style.setProperty('--border-color', hexFromArgb(system.outlineVariant));
  
  // Variável auxiliar para o efeito de arraste
  const r = (system.primary >> 16) & 255;
  const g = (system.primary >> 8) & 255;
  const b = system.primary & 255;
  root.style.setProperty('--text-accent-rgb', `${r}, ${g}, ${b}`);
};