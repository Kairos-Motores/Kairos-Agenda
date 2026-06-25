// api/bi-embed.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { id } = req.query;

  // Mapeamento completo de IDs para variáveis de ambiente
  const biUrls = {
    // Corporativo
    'conciliacao-bancaria': process.env.POWERBI_CONCILIACAO_BANCARIA_URL,
    'diretoria': process.env.POWERBI_DIRETORIA_URL,
    'fluxo-caixa': process.env.POWERBI_FLUXO_CAIXA_URL,
    'recursos-humanos': process.env.POWERBI_RECURSOS_HUMANOS_URL,
    'relatorio-coord-adm': process.env.POWERBI_RELATORIO_COORD_ADM_URL,
    'relatorio-coordenadores': process.env.POWERBI_RELATORIO_COORDENADORES_URL,
    'relatorio-gerencial': process.env.POWERBI_RELATORIO_GERENCIAL_URL,
    'relatorio-gerente-geral': process.env.POWERBI_RELATORIO_GERENTE_GERAL_URL,
    'saldos-orcamentarios': process.env.POWERBI_SALDOS_ORCAMENTARIOS_URL,
    'dre-2': process.env.POWERBI_DRE_2_URL,
    'indicadores-comercial-coord-gerencial': process.env.POWERBI_IND_COMERCIAL_COORD_GER_URL,
    'programacao-ferias': process.env.POWERBI_PROGRAMACAO_FERIAS_URL,
    'relatorio-margens': process.env.POWERBI_RELATORIO_MARGENS_URL,
    'relatorio-medro': process.env.POWERBI_RELATORIO_MEDRO_URL,

    // Barcarena
    'kanban-brc': process.env.POWERBI_KANBAN_BRC_URL,
    'relatorio-coord-brc': process.env.POWERBI_RELATORIO_COORD_BRC_URL,
    'saldos-orc-brc': process.env.POWERBI_SALDOS_ORC_BRC_URL,
    'dre-brc': process.env.POWERBI_DRE_BRC_URL,
    'faturamento-brc': process.env.POWERBI_FATURAMENTO_BRC_URL,
    'ind-comercial-brc': process.env.POWERBI_IND_COMERCIAL_BRC_URL,
    'ind-operacao-brc': process.env.POWERBI_IND_OPERACAO_BRC_URL,
    'medro-brc': process.env.POWERBI_MEDRO_BRC_URL,

    // São Luís
    'kanban-slz': process.env.POWERBI_KANBAN_SLZ_URL,
    'relatorio-coord-slz': process.env.POWERBI_RELATORIO_COORD_SLZ_URL,
    'saldos-orc-slz': process.env.POWERBI_SALDOS_ORC_SLZ_URL,
    'dre-slz': process.env.POWERBI_DRE_SLZ_URL,
    'faturamento-slz': process.env.POWERBI_FATURAMENTO_SLZ_URL,
    'ind-comercial-slz': process.env.POWERBI_IND_COMERCIAL_SLZ_URL,
    'ind-operacao-slz': process.env.POWERBI_IND_OPERACAO_SLZ_URL,
    'medro-slz': process.env.POWERBI_MEDRO_SLZ_URL,

    // Parauapebas
    'kanban-prp': process.env.POWERBI_KANBAN_PRP_URL,
    'relatorio-coord-prp': process.env.POWERBI_RELATORIO_COORD_PRP_URL,
    'saldos-orc-prp': process.env.POWERBI_SALDOS_ORC_PRP_URL,
    'dre-prp': process.env.POWERBI_DRE_PRP_URL,
    'faturamento-prp': process.env.POWERBI_FATURAMENTO_PRP_URL,
    'ind-comercial-prp': process.env.POWERBI_IND_COMERCIAL_PRP_URL,
    'ind-operacao-prp': process.env.POWERBI_IND_OPERACAO_PRP_URL,
    'medro-prp': process.env.POWERBI_MEDRO_PRP_URL,

    // São José dos Campos
    'kanban-sjc': process.env.POWERBI_KANBAN_SJC_URL,
    'relatorio-coord-sjc': process.env.POWERBI_RELATORIO_COORD_SJC_URL,
    'saldos-orc-sjc': process.env.POWERBI_SALDOS_ORC_SJC_URL,
    'dre-sjc': process.env.POWERBI_DRE_SJC_URL,
    'faturamento-sjc': process.env.POWERBI_FATURAMENTO_SJC_URL,
    'ind-comercial-sjc': process.env.POWERBI_IND_COMERCIAL_SJC_URL,
    'ind-operacao-sjc': process.env.POWERBI_IND_OPERACAO_SJC_URL,
    'medro-sjc': process.env.POWERBI_MEDRO_SJC_URL,

    // Aveiro
    'kanban-avr': process.env.POWERBI_KANBAN_AVR_URL,
    'relatorio-coord-avr': process.env.POWERBI_RELATORIO_COORD_AVR_URL,
    'dre-avr': process.env.POWERBI_DRE_AVR_URL,
    'ind-comercial-avr': process.env.POWERBI_IND_COMERCIAL_AVR_URL,
    'medro-avr': process.env.POWERBI_MEDRO_AVR_URL,

    // Departamentos Internos
    'analise-garantias': process.env.POWERBI_ANALISE_GARANTIAS_URL,
    'perda': process.env.POWERBI_PERDA_URL,
    'garantia': process.env.POWERBI_GARANTIA_URL,
    'gestao-patrimonios': process.env.POWERBI_GESTAO_PATRIMONIOS_URL,
    'inventario': process.env.POWERBI_INVENTARIO_URL,
    'logistica': process.env.POWERBI_LOGISTICA_URL,
    'planejador': process.env.POWERBI_PLANEJADOR_URL,
    'qualidade': process.env.POWERBI_QUALIDADE_URL,
    'treinamentos': process.env.POWERBI_TREINAMENTOS_URL,
    'rh': process.env.POWERBI_RH_URL,
    'suprimentos': process.env.POWERBI_SUPRIMENTOS_URL,
    'departamento-tecnico': process.env.POWERBI_DEPARTAMENTO_TECNICO_URL,

    // Departamentos Externos
    'grupo-hydro': process.env.POWERBI_GRUPO_HYDRO_URL,
    'tarket': process.env.POWERBI_TARKET_URL,
    'vale': process.env.POWERBI_VALE_URL,
    'vale-ferrovia': process.env.POWERBI_VALE_FERROVIA_URL,
  };

  const url = biUrls[id];
  if (!url) {
    return res.status(404).json({ error: 'BI não encontrado' });
  }

  // Aqui você pode adicionar validação de permissão (token JWT, roles)
  // Por enquanto, apenas retorna a URL se existir

  return res.status(200).json({ url });
}