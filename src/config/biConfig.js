// src/config/biConfig.js

export const BI_CONFIG = [
  // ===== CORPORATIVO (Geral) =====
  {
    id: 'conciliacao-bancaria', //Dashboard Conciliação Bancária
    workspaceName: 'Diretoria',
    title: 'Conciliação Bancária',
    description: 'Painel de conciliação bancária',
    icon: 'account_balance',
    allowedRoles: ['ADMIN', 'DIRETORIA']
  },
  {
    id: 'diretoria', //Dashboard diretoria
    workspaceName: 'Comercial',
    title: 'Diretoria',
    description: 'Visão geral para diretoria',
    icon: 'leaderboard',
    allowedRoles: ['ADMIN', 'DIRETORIA', 'COMERCIAL']
  },
  {
    id: 'fluxo-caixa', //Fluxo de caixa 2.0
    workspaceName: 'Financeiro',
    title: 'Fluxo de Caixa 2.0',
    description: 'Análise de fluxo de caixa',
    icon: 'payments',
    allowedRoles: ['ADMIN', 'FINANCEIRO', 'DIRETORIA']
  },
  {
    id: 'recursos-humanos', //Dashboard recursos humanos (ana letícia)
    workspaceName: 'Recursos Humanos',
    title: 'Recursos Humanos',
    description: 'Dashboard de RH',
    icon: 'groups',
    allowedRoles: ['ADMIN', 'COORD RH', 'DIRETORIA']
  },
  {
    id: 'relatorio-coord-adm', //Dashboard Relatório Coordenador Administrativo
    workspaceName: 'Administrativo',
    title: 'Relatório Coordenador Administrativo',
    description: 'Relatório administrativo',
    icon: 'description',
    allowedRoles: ['ADMIN', 'COORD ADM', 'DIRETORIA']
  },
  {
    id: 'relatorio-coordenadores', //Dashboard Relatório Coordenadores
    workspaceName: 'Diretoria',
    title: 'Relatório Coordenadores',
    description: 'Painel dos coordenadores',
    icon: 'group',
    allowedRoles: ['ADMIN', 'DIRETORIA']
  },
  {
    id: 'relatorio-gerencial', //Dashboard Relatório Gerencial
    workspaceName: 'Diretoria',
    title: 'Relatório Gerencial 2.0',
    description: 'Relatório gerencial',
    icon: 'monitoring',
    allowedRoles: ['ADMIN', 'DIRETORIA']
  },
  {
    id: 'relatorio-gerente-geral', //Dashboard Relatório Gerente Geral
    workspaceName: 'Diretoria',
    title: 'Relatório Gerente Geral',
    description: 'Painel do gerente geral',
    icon: 'person',
    allowedRoles: ['ADMIN','DIRETORIA']
  },
  {
    id: 'saldos-orcamentarios', //Dashboard Saldos Orçamentários
    workspaceName: 'Suprimentos',
    title: 'Saldos Orçamentários',
    description: 'Acompanhamento de saldos',
    icon: 'savings',
    allowedRoles: ['ADMIN', 'DIRETORIA', 'FINANCEIRO LIDER', 'SUPRIMENTOS', 'COORD ADM']
  },
  {
    id: 'dre-2', //DRE 2.0
    workspaceName: 'Diretoria',
    title: 'DRE 2.0',
    description: 'Demonstração de Resultados',
    icon: 'receipt_long',
    allowedRoles: ['ADMIN', 'DIRETORIA']
  },
  {
    id: 'indicadores-comercial-coord-gerencial', //Indicadores Comercial - Coord. Gerencial
    workspaceName: 'Comercial',
    title: 'Indicadores Comercial - Coord. Gerencial',
    description: 'Indicadores comerciais',
    icon: 'insert_chart',
    allowedRoles: ['ADMIN', 'COORD COMERCIAL', 'DIRETORIA']
  },
  {
    id: 'programacao-ferias', //Programação de Férias
    workspaceName: 'Recursos Humanos',
    title: 'Programação de Férias',
    description: 'Painel de férias',
    icon: 'beach_access',
    allowedRoles: ['ADMIN', 'RH', 'DIRETORIA']
  },
  {
    id: 'relatorio-margens', //Relatório de Margens
    workspaceName: 'Qualidade',
    title: 'Relatório de Margens',
    description: 'Análise de margens',
    icon: 'margin',
    allowedRoles: ['ADMIN', 'DIRETORIA', 'QUALIDADE']
  },
  {
    id: 'relatorio-medro', //Relatório Medro
    workspaceName: 'Diretoria',
    title: 'Relatório Medro',
    description: 'Relatório Medro corporativo',
    icon: 'analytics',
    allowedRoles: ['ADMIN', 'DIRETORIA']
  },

  // ===== UNIDADE BARCARENA =====
  {
    id: 'kanban-brc',
    workspaceName: 'Barcarena',
    title: 'Kanban - BRC',
    description: 'Quadro Kanban Barcarena',
    icon: 'view_kanban',
    allowedRoles: ['COMUM', 'ADMIN', 'DIRETORIA']
  },
  {
    id: 'relatorio-coord-brc', //Relatório Coordenadores - BRC
    workspaceName: 'Barcarena',
    title: 'Relatório Coordenadores - BRC',
    description: 'Painel coordenadores Barcarena',
    icon: 'group',
    allowedRoles: ['ADMIN', 'DIRETORIA', 'COORD BRC']
  },
  {
    id: 'saldos-orc-brc', //Saldos Orçamentários - BRC
    workspaceName: 'Barcarena',
    title: 'Saldos Orçamentários - BRC',
    description: 'Saldos Barcarena',
    icon: 'savings',
    allowedRoles: ['ADMIN', 'DIRETORIA', 'COORD BRC']
  },
  {
    id: 'dre-brc', //DRE BRC 2.0
    workspaceName: 'Barcarena',
    title: 'DRE BRC 2.0',
    description: 'DRE Barcarena',
    icon: 'receipt_long',
    allowedRoles: ['ADMIN', 'DIRETORIA', 'COORD BRC']
  },
  {
    id: 'faturamento-brc', //Faturamento BRC
    workspaceName: 'Barcarena',
    title: 'Faturamento BRC',
    description: 'Faturamento Barcarena',
    icon: 'attach_money',
    allowedRoles: ['ADMIN', 'DIRETORIA', 'COORD BRC']
  },
  {
    id: 'ind-comercial-brc', //Indicadores Comercial - BRC
    workspaceName: 'Barcarena',
    title: 'Indicadores Comercial - BRC',
    description: 'Indicadores comerciais Barcarena',
    icon: 'insert_chart',
    allowedRoles: ['ADMIN', 'DIRETORIA', 'COORD BRC', 'COMERCIAL']
  },
  {
    id: 'ind-operacao-brc', //Indicadores Operação - BRC
    workspaceName: 'Barcarena',
    title: 'Indicadores Operação - BRC',
    description: 'Indicadores de operação Barcarena',
    icon: 'engineering',
    allowedRoles: ['ADMIN', 'DIRETORIA', 'COORD BRC', 'PCP']
  },
  {
    id: 'medro-brc',
    workspaceName: 'Barcarena',
    title: 'Relatório Medro - BRC',
    description: 'Relatório Medro Barcarena',
    icon: 'analytics',
    allowedRoles: ['ADMIN', 'DIRETORIA', 'COORD BRC']
  },

  // ===== UNIDADE SÃO LUÍS =====
  {
    id: 'kanban-slz', //Quadro Kanban - SLZ
    workspaceName: 'São Luís',
    title: 'Kanban - SLZ',
    description: 'Quadro Kanban São Luís',
    icon: 'view_kanban',
    allowedRoles: ['COMUM', 'ADMIN', 'DIRETORIA']
  },
  {
    id: 'relatorio-coord-slz', //Relatório Coordenadores - SLZ
    workspaceName: 'São Luís',
    title: 'Relatório Coordenadores - SLZ',
    description: 'Painel coordenadores SLZ',
    icon: 'group',
    allowedRoles: ['ADMIN', 'DIRETORIA', 'COORD ADM', 'COORD PCP']
  },
  {
    id: 'saldos-orc-slz', //Saldos Orçamentários - SLZ
    workspaceName: 'São Luís',
    title: 'Saldos Orçamentários - SLZ',
    description: 'Saldos São Luís',
    icon: 'savings',
    allowedRoles: ['ADMIN', 'DIRETORIA', 'COORD ADM', 'COORD PCP']
  },
  {
    id: 'dre-slz', //DRE SLZ 2.0
    workspaceName: 'São Luís',
    title: 'DRE SLZ 2.0',
    description: 'DRE São Luís',
    icon: 'receipt_long',
    allowedRoles: ['ADMIN', 'DIRETORIA', 'COORD ADM', 'COORD PCP']
  },
  {
    id: 'faturamento-slz',  //Faturamento SLZ
    workspaceName: 'São Luís',
    title: 'Faturamento SLZ',
    description: 'Faturamento SLZ',
    icon: 'attach_money',
    allowedRoles: ['ADMIN', 'DIRETORIA', 'COORD ADM', 'COORD PCP']
  },
  {
    id: 'ind-comercial-slz', //Indicadores Comercial - SLZ
    workspaceName: 'São Luís',
    title: 'Indicadores Comercial - SLZ',
    description: 'Indicadores comerciais SLZ',
    icon: 'insert_chart',
    allowedRoles: ['ADMIN', 'DIRETORIA', 'COORD COMERCIAL']
  },
  {
    id: 'ind-operacao-slz', //Indicadores Operação - SLZ
    workspaceName: 'São Luís',
    title: 'Indicadores Operação - SLZ',
    description: 'Indicadores operação SLZ',
    icon: 'engineering',
    allowedRoles: ['ADMIN', 'DIRETORIA', 'COORD PCP', 'PCP']
  },
  {
    id: 'medro-slz', //Relatório Medro - SLZ
    workspaceName: 'São Luís',
    title: 'Relatório Medro - SLZ',
    description: 'Relatório Medro SLZ',
    icon: 'analytics',
    allowedRoles: ['ADMIN', 'DIRETORIA', 'COORD PCP']
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