// Listas fixas do "Informe Mensal SSMA" (planilha) que não fazem sentido o COORD SSMA
// editar em tela — status, criticidade e categorias de gasto. Os indicadores (TST-01 em
// diante, com meta e tipo) já não estão aqui: viraram registros editáveis na tabela
// cr4a1_ssma_indicadors do Dataverse, geridos pelo COORD SSMA/ADMIN em SsmaPanel.

export const SSMA_STATUS_LIST = ['Não iniciado', 'Em andamento', 'Pendente', 'Concluído', 'Cancelado', 'Vencido'];

export const SSMA_CRITICIDADE_LIST = ['Baixa', 'Média', 'Alta', 'Crítica'];

export const SSMA_CATEGORIAS_GASTO = ['Treinamentos', 'Saúde Ocupacional', 'Documentação Legal', 'Resíduos', 'EPI', 'Emergência', 'Consultoria', 'Taxas/Licenças', 'Outros'];

// Frequências de recorrência das atividades SSMA — cada uma mapeia pra um intervalo fixo
// em dias corridos (inclusive "Mensal", por simplicidade e consistência com as demais).
export const SSMA_FREQUENCIAS = ['Diária', 'Semanal', 'Quinzenal', 'Mensal'];
export const SSMA_FREQUENCIA_DIAS = { 'Diária': 1, 'Semanal': 7, 'Quinzenal': 15, 'Mensal': 30 };
