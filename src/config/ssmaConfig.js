// Espelha a estrutura do "Informe Mensal SSMA" (planilha) dentro do app: 10 indicadores
// padrão (TST-01 a TST-10), um por tipo de atividade, cada um com sua meta de atingimento.
export const SSMA_INDICATORS = [
    { id: 'TST-01', tipo: 'DDSS', nome: 'Cumprimento dos DDSS programados com evidência válida', meta: 0.95 },
    { id: 'TST-02', tipo: 'Inspeções de Segurança', nome: 'Inspeções de segurança programadas, registradas e tratadas', meta: 1.00 },
    { id: 'TST-03', tipo: 'Treinamentos', nome: 'Execução dos treinamentos e integrações previstos', meta: 0.95 },
    { id: 'TST-04', tipo: 'Reuniões CIPAA', nome: 'Realização das reuniões da CIPAA previstas', meta: 1.00 },
    { id: 'TST-05', tipo: 'Saúde', nome: 'Conformidade da saúde ocupacional e exames previstos', meta: 1.00 },
    { id: 'TST-06', tipo: 'Documentação Legal', nome: 'Documentação legal regularizada dentro do prazo', meta: 0.90 },
    { id: 'TST-07', tipo: 'Acidentes/Incidentes', nome: 'Análises de acidentes/incidentes formalizadas no prazo', meta: 1.00 },
    { id: 'TST-08', tipo: 'Coleta Resíduos', nome: 'Rastreabilidade das coletas e destinação de resíduos', meta: 1.00 },
    { id: 'TST-09', tipo: 'ePGR', nome: 'Atualização dos registros de risco e ePGR', meta: 0.95 },
    { id: 'TST-10', tipo: 'Registros SSMA Servidor', nome: 'Organização dos registros de SSMA no servidor', meta: 0.95 }
];

export const SSMA_TIPOS = SSMA_INDICATORS.map(i => i.tipo);

export const SSMA_STATUS_LIST = ['Não iniciado', 'Em andamento', 'Pendente', 'Concluído', 'Cancelado', 'Vencido'];

export const SSMA_CRITICIDADE_LIST = ['Baixa', 'Média', 'Alta', 'Crítica'];

export const SSMA_CATEGORIAS_GASTO = ['Treinamentos', 'Saúde Ocupacional', 'Documentação Legal', 'Resíduos', 'EPI', 'Emergência', 'Consultoria', 'Taxas/Licenças', 'Outros'];

export const tipoParaIndicador = (tipo) => SSMA_INDICATORS.find(i => i.tipo === tipo)?.id || '';
