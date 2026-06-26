// src/config/biConfig.js

export const BI_CONFIG = [
  // ===== CORPORATIVO (Geral) =====
  {
    id: 'conciliacao-bancaria',
    workspaceName: 'Corporativo',
    title: 'Conciliação Bancária',
    description: 'Painel de conciliação bancária',
    icon: 'account_balance',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'diretoria',
    workspaceName: 'Corporativo',
    title: 'Diretoria',
    description: 'Visão geral para diretoria',
    icon: 'leaderboard',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'fluxo-caixa',
    workspaceName: 'Corporativo',
    title: 'Fluxo de Caixa 2.0',
    description: 'Análise de fluxo de caixa',
    icon: 'payments',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'recursos-humanos',
    workspaceName: 'Corporativo',
    title: 'Recursos Humanos',
    description: 'Dashboard de RH',
    icon: 'groups',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'relatorio-coord-adm',
    workspaceName: 'Corporativo',
    title: 'Relatório Coordenador Administrativo',
    description: 'Relatório administrativo',
    icon: 'description',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'relatorio-coordenadores',
    workspaceName: 'Corporativo',
    title: 'Relatório Coordenadores',
    description: 'Painel dos coordenadores',
    icon: 'group',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'relatorio-gerencial',
    workspaceName: 'Corporativo',
    title: 'Relatório Gerencial 2.0',
    description: 'Relatório gerencial',
    icon: 'monitoring',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'relatorio-gerente-geral',
    workspaceName: 'Corporativo',
    title: 'Relatório Gerente Geral',
    description: 'Painel do gerente geral',
    icon: 'person',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'saldos-orcamentarios',
    workspaceName: 'Corporativo',
    title: 'Saldos Orçamentários',
    description: 'Acompanhamento de saldos',
    icon: 'savings',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'dre-2',
    workspaceName: 'Corporativo',
    title: 'DRE 2.0',
    description: 'Demonstração de Resultados',
    icon: 'receipt_long',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'indicadores-comercial-coord-gerencial',
    workspaceName: 'Corporativo',
    title: 'Indicadores Comercial - Coord. Gerencial',
    description: 'Indicadores comerciais',
    icon: 'insert_chart',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'programacao-ferias',
    workspaceName: 'Corporativo',
    title: 'Programação de Férias',
    description: 'Painel de férias',
    icon: 'beach_access',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'relatorio-margens',
    workspaceName: 'Corporativo',
    title: 'Relatório de Margens',
    description: 'Análise de margens',
    icon: 'margin',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'relatorio-medro',
    workspaceName: 'Corporativo',
    title: 'Relatório Medro',
    description: 'Relatório Medro corporativo',
    icon: 'analytics',
    allowedRoles: ['ADMIN']
  },

  // ===== UNIDADE BARCARENA =====
  {
    id: 'kanban-brc',
    workspaceName: 'Barcarena',
    title: 'Kanban - BRC',
    description: 'Quadro Kanban Barcarena',
    icon: 'view_kanban',
    allowedRoles: ['COMUM', 'ADMIN']
  },
  {
    id: 'relatorio-coord-brc',
    workspaceName: 'Barcarena',
    title: 'Relatório Coordenadores - BRC',
    description: 'Painel coordenadores Barcarena',
    icon: 'group',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'saldos-orc-brc',
    workspaceName: 'Barcarena',
    title: 'Saldos Orçamentários - BRC',
    description: 'Saldos Barcarena',
    icon: 'savings',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'dre-brc',
    workspaceName: 'Barcarena',
    title: 'DRE BRC 2.0',
    description: 'DRE Barcarena',
    icon: 'receipt_long',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'faturamento-brc',
    workspaceName: 'Barcarena',
    title: 'Faturamento BRC',
    description: 'Faturamento Barcarena',
    icon: 'attach_money',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'ind-comercial-brc',
    workspaceName: 'Barcarena',
    title: 'Indicadores Comercial - BRC',
    description: 'Indicadores comerciais Barcarena',
    icon: 'insert_chart',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'ind-operacao-brc',
    workspaceName: 'Barcarena',
    title: 'Indicadores Operação - BRC',
    description: 'Indicadores de operação Barcarena',
    icon: 'engineering',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'medro-brc',
    workspaceName: 'Barcarena',
    title: 'Relatório Medro - BRC',
    description: 'Relatório Medro Barcarena',
    icon: 'analytics',
    allowedRoles: ['ADMIN']
  },

  // ===== UNIDADE SÃO LUÍS =====
  {
    id: 'kanban-slz',
    workspaceName: 'São Luís',
    title: 'Kanban - SLZ',
    description: 'Quadro Kanban São Luís',
    icon: 'view_kanban',
    allowedRoles: ['COMUM', 'ADMIN']
  },
  {
    id: 'relatorio-coord-slz',
    workspaceName: 'São Luís',
    title: 'Relatório Coordenadores - SLZ',
    description: 'Painel coordenadores SLZ',
    icon: 'group',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'saldos-orc-slz',
    workspaceName: 'São Luís',
    title: 'Saldos Orçamentários - SLZ',
    description: 'Saldos São Luís',
    icon: 'savings',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'dre-slz',
    workspaceName: 'São Luís',
    title: 'DRE SLZ 2.0',
    description: 'DRE São Luís',
    icon: 'receipt_long',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'faturamento-slz',
    workspaceName: 'São Luís',
    title: 'Faturamento SLZ',
    description: 'Faturamento SLZ',
    icon: 'attach_money',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'ind-comercial-slz',
    workspaceName: 'São Luís',
    title: 'Indicadores Comercial - SLZ',
    description: 'Indicadores comerciais SLZ',
    icon: 'insert_chart',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'ind-operacao-slz',
    workspaceName: 'São Luís',
    title: 'Indicadores Operação - SLZ',
    description: 'Indicadores operação SLZ',
    icon: 'engineering',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'medro-slz',
    workspaceName: 'São Luís',
    title: 'Relatório Medro - SLZ',
    description: 'Relatório Medro SLZ',
    icon: 'analytics',
    allowedRoles: ['ADMIN']
  },

  // ===== UNIDADE PARAUAPEBAS =====
  {
    id: 'kanban-prp',
    workspaceName: 'Parauapebas',
    title: 'Kanban - PRP',
    description: 'Quadro Kanban Parauapebas',
    icon: 'view_kanban',
    allowedRoles: ['COMUM']
  },
  {
    id: 'relatorio-coord-prp',
    workspaceName: 'Parauapebas',
    title: 'Relatório Coordenadores - PRP',
    description: 'Painel coordenadores PRP',
    icon: 'group',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'saldos-orc-prp',
    workspaceName: 'Parauapebas',
    title: 'Saldos Orçamentários - PRP',
    description: 'Saldos PRP',
    icon: 'savings',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'dre-prp',
    workspaceName: 'Parauapebas',
    title: 'DRE PRP 2.0',
    description: 'DRE Parauapebas',
    icon: 'receipt_long',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'faturamento-prp',
    workspaceName: 'Parauapebas',
    title: 'Faturamento PRP',
    description: 'Faturamento PRP',
    icon: 'attach_money',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'ind-comercial-prp',
    workspaceName: 'Parauapebas',
    title: 'Indicadores Comercial - PRP',
    description: 'Indicadores comerciais PRP',
    icon: 'insert_chart',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'ind-operacao-prp',
    workspaceName: 'Parauapebas',
    title: 'Indicadores Operação - PRP',
    description: 'Indicadores operação PRP',
    icon: 'engineering',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'medro-prp',
    workspaceName: 'Parauapebas',
    title: 'Relatório Medro - PRP',
    description: 'Relatório Medro PRP',
    icon: 'analytics',
    allowedRoles: ['ADMIN']
  },

  // ===== UNIDADE SÃO JOSÉ DOS CAMPOS =====
  {
    id: 'kanban-sjc',
    workspaceName: 'São José dos Campos',
    title: 'Kanban - SJC',
    description: 'Quadro Kanban SJC',
    icon: 'view_kanban',
    allowedRoles: ['COMUM', 'ADMIN']
  },
  {
    id: 'relatorio-coord-sjc',
    workspaceName: 'São José dos Campos',
    title: 'Relatório Coordenadores - SJC',
    description: 'Painel coordenadores SJC',
    icon: 'group',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'saldos-orc-sjc',
    workspaceName: 'São José dos Campos',
    title: 'Saldos Orçamentários - SJC',
    description: 'Saldos SJC',
    icon: 'savings',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'dre-sjc',
    workspaceName: 'São José dos Campos',
    title: 'DRE SJC 2.0',
    description: 'DRE SJC',
    icon: 'receipt_long',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'faturamento-sjc',
    workspaceName: 'São José dos Campos',
    title: 'Faturamento SJC',
    description: 'Faturamento SJC',
    icon: 'attach_money',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'ind-comercial-sjc',
    workspaceName: 'São José dos Campos',
    title: 'Indicadores Comercial - SJC',
    description: 'Indicadores comerciais SJC',
    icon: 'insert_chart',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'ind-operacao-sjc',
    workspaceName: 'São José dos Campos',
    title: 'Indicadores Operação - SJC',
    description: 'Indicadores operação SJC',
    icon: 'engineering',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'medro-sjc',
    workspaceName: 'São José dos Campos',
    title: 'Relatório Medro - SJC',
    description: 'Relatório Medro SJC',
    icon: 'analytics',
    allowedRoles: ['ADMIN']
  },

  // ===== UNIDADE AVEIRO =====
  {
    id: 'kanban-avr',
    workspaceName: 'Aveiro',
    title: 'Kanban - Aveiro',
    description: 'Quadro Kanban Aveiro',
    icon: 'view_kanban',
    allowedRoles: ['ADMIN', 'COMUM']
  },
  {
    id: 'relatorio-coord-avr',
    workspaceName: 'Aveiro',
    title: 'Relatório Coordenadores - AVR',
    description: 'Painel coordenadores AVR',
    icon: 'group',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'dre-avr',
    workspaceName: 'Aveiro',
    title: 'DRE AVR 2.0',
    description: 'DRE Aveiro',
    icon: 'receipt_long',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'ind-comercial-avr',
    workspaceName: 'Aveiro',
    title: 'Indicadores Comercial - AVR',
    description: 'Indicadores comerciais AVR',
    icon: 'insert_chart',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'medro-avr',
    workspaceName: 'Aveiro',
    title: 'Relatório Medro - AVR',
    description: 'Relatório Medro AVR',
    icon: 'analytics',
    allowedRoles: ['ADMIN']
  },

  // ===== DEPARTAMENTOS INTERNOS =====
  {
    id: 'analise-garantias',
    workspaceName: 'Departamentos Internos',
    title: 'Análise de Garantias',
    description: 'Painel de garantias',
    icon: 'verified',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'perda',
    workspaceName: 'Departamentos Internos',
    title: 'BI Perda',
    description: 'Indicadores de perda',
    icon: 'trending_down',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'garantia',
    workspaceName: 'Departamentos Internos',
    title: 'Dashboard Garantia',
    description: 'Garantia detalhada',
    icon: 'shield',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'gestao-patrimonios',
    workspaceName: 'Departamentos Internos',
    title: 'Gestão de Patrimônios',
    description: 'Controle patrimonial',
    icon: 'warehouse',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'inventario',
    workspaceName: 'Departamentos Internos',
    title: 'Inventário 2.0',
    description: 'Painel de inventário',
    icon: 'inventory_2',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'logistica',
    workspaceName: 'Departamentos Internos',
    title: 'Dashboard Logística',
    description: 'Indicadores logísticos',
    icon: 'local_shipping',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'planejador',
    workspaceName: 'Departamentos Internos',
    title: 'Dashboard Planejador',
    description: 'Planejamento',
    icon: 'calendar_month',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'qualidade',
    workspaceName: 'Departamentos Internos',
    title: 'Dashboard Qualidade',
    description: 'Indicadores de qualidade',
    icon: 'verified_user',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'treinamentos',
    workspaceName: 'Departamentos Internos',
    title: 'Relatório Gerencial - Treinamentos',
    description: 'Treinamentos',
    icon: 'school',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'rh',
    workspaceName: 'Departamentos Internos',
    title: 'Dashboard RH',
    description: 'Recursos Humanos',
    icon: 'groups',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'suprimentos',
    workspaceName: 'Departamentos Internos',
    title: 'Dashboard Suprimentos',
    description: 'Suprimentos',
    icon: 'inventory',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'departamento-tecnico',
    workspaceName: 'Departamentos Internos',
    title: 'Departamento Técnico Kairós 2.0',
    description: 'Painel técnico',
    icon: 'build',
    allowedRoles: ['ADMIN']
  },

  // ===== DEPARTAMENTOS EXTERNOS =====
  {
    id: 'grupo-hydro',
    workspaceName: 'Departamentos Externos',
    title: 'BI Grupo Hydro',
    description: 'Indicadores Hydro',
    icon: 'public',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'tarket',
    workspaceName: 'Departamentos Externos',
    title: 'BI Tarket',
    description: 'Indicadores Tarket',
    icon: 'public',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'vale',
    workspaceName: 'Departamentos Externos',
    title: 'BI Vale',
    description: 'Indicadores Vale',
    icon: 'public',
    allowedRoles: ['ADMIN']
  },
  {
    id: 'vale-ferrovia',
    workspaceName: 'Departamentos Externos',
    title: 'BI Vale - Ferrovia',
    description: 'Indicadores Vale Ferrovia',
    icon: 'train',
    allowedRoles: ['ADMIN']
  }
];