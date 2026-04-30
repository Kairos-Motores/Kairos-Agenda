import { argbFromHex, themeFromSourceColor, hexFromArgb } from "@material/material-color-utilities";

export const applyDynamicTheme = (hexColor, isDark) => {
  const theme = themeFromSourceColor(argbFromHex(hexColor));
  const system = isDark ? theme.schemes.dark : theme.schemes.light;

  const root = document.documentElement;

  // Injetamos APENAS as cores de destaque e superfícies de eventos.
  // Deixamos os fundos (--bg-page, --bg-primary) sob controle do CSS nativo!
  root.style.setProperty('--text-accent', hexFromArgb(system.primary));
  root.style.setProperty('--md-primary-container', hexFromArgb(system.primaryContainer));
  root.style.setProperty('--md-on-primary-container', hexFromArgb(system.onPrimaryContainer));
  
  // Removemos as propriedades 'surface' problemáticas que estavam gerando o fundo preto.
  root.style.removeProperty('--bg-page');
  root.style.removeProperty('--bg-primary');
  root.style.removeProperty('--bg-secondary');
  root.style.removeProperty('--border-color');

  // Variável auxiliar para o efeito de arraste
  const r = (system.primary >> 16) & 255;
  const g = (system.primary >> 8) & 255;
  const b = system.primary & 255;
  root.style.setProperty('--text-accent-rgb', `${r}, ${g}, ${b}`);
};