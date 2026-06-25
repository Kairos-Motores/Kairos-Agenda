// src/config/biConfig.js

export const BI_CONFIG = [
  // ===== WORKSPACE RH =====
  {
    id: 'rh-estrategico',
    workspaceName: 'RH',                   // ← NOME DO WORKSPACE
    title: 'Painel Estratégico RH',
    description: 'Análise de TurnOver, Custos e Retenção',
    icon: 'query_stats',
    urlKey: 'POWERBI_RH_ESTRATEGICO_URL',   // chave usada na API
    allowedRoles: ['ADMIN']
  },
  {
    id: 'rh-geral',
    workspaceName: 'RH',
    title: 'Quadro Geral de Funcionários',
    description: 'Aniversariantes, Férias e Escalas',
    icon: 'groups',
    urlKey: 'POWERBI_RH_GERAL_URL',
    allowedRoles: ['ALL']                   // qualquer um do workspace vê
  },

  // ===== WORKSPACE COMERCIAL =====
  {
    id: 'comercial-metas',
    workspaceName: 'Comercial',
    title: 'Acompanhamento de Metas',
    description: 'Volume de vendas e prospecções ativas',
    icon: 'trending_up',
    urlKey: 'POWERBI_COMERCIAL_URL',
    allowedRoles: ['ADMIN', 'COORD COMERCIAL', 'SECRETARIA']
  },

  // ===== WORKSPACE TI (exemplo) =====
  {
    id: 'ti-sprint',
    workspaceName: 'Desenvolvimento e Inovação',
    title: 'Sprint Dashboard',
    description: 'Andamento das tarefas do time',
    icon: 'sprint',
    urlKey: 'VITE_BI_TESTE',
    allowedRoles: ['ADMIN']
  },
];