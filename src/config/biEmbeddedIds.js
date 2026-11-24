// IDs dos relatórios migrados para o Power BI Embedded oficial (suportam
// exportação para Excel). Mantido em sincronia manual com as chaves de
// EMBEDDED_REPORTS em api/bi-embed.js — não dá pra importar aquele arquivo
// aqui porque é uma função serverless, não um módulo de frontend.
export const BI_EMBEDDED_IDS = new Set([
  'conciliacao-bancaria', 'diretoria', 'fluxo-caixa', 'recursos-humanos',
  'relatorio-coord-adm', 'relatorio-coordenadores', 'relatorio-gerencial', 'relatorio-gerente-geral',
  'saldos-orcamentarios', 'dre-2', 'indicadores-comercial-coord-gerencial', 'programacao-ferias',
  'relatorio-margens', 'kanban-brc', 'relatorio-coord-brc', 'saldos-orc-brc',
  'dre-brc', 'faturamento-brc', 'ind-comercial-brc', 'ind-operacao-brc',
  'kanban-slz', 'relatorio-coord-slz', 'saldos-orc-slz', 'dre-slz',
  'faturamento-slz', 'ind-comercial-slz', 'ind-operacao-slz', 'kanban-prp',
  'relatorio-coord-prp', 'saldos-orc-prp', 'dre-prp', 'faturamento-prp',
  'ind-comercial-prp', 'ind-operacao-prp', 'kanban-sjc', 'relatorio-coord-sjc',
  'saldos-orc-sjc', 'dre-sjc', 'faturamento-sjc', 'ind-comercial-sjc',
  'ind-operacao-sjc', 'kanban-avr', 'relatorio-coord-avr', 'dre-avr',
  'ind-comercial-avr', 'analise-garantias', 'perda', 'garantia',
  'gestao-patrimonios', 'inventario', 'logistica', 'planejador',
  'qualidade', 'treinamentos', 'rh', 'suprimentos',
  'departamento-tecnico', 'grupo-hydro', 'tarket', 'vale', 'vale-ferrovia'
]);
