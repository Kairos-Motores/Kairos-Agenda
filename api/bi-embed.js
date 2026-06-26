// api/bi-embed.js
export default async function handler(req, res) {
  // Permite requisições de qualquer origem (útil durante o desenvolvimento)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { id } = req.query;

  const biUrls = {
    // Corporativo
    'conciliacao-bancaria': process.env.POWERBI_BI_CONCILIACAO_BANCARIA,
    'diretoria': process.env.POWERBI_BI_DIRETORIA,
    'fluxo-caixa': process.env.POWERBI_BI_FLUXO_CAIXA,
    'recursos-humanos': process.env.POWERBI_BI_RECURSOS_HUMANOS,
    'relatorio-coord-adm': process.env.POWERBI_BI_RELATORIO_COORD_ADM,
    'relatorio-coordenadores': process.env.POWERBI_BI_RELATORIO_COORDENADORES,
    'relatorio-gerencial': process.env.POWERBI_BI_RELATORIO_GERENCIAL,
    'relatorio-gerente-geral': process.env.POWERBI_BI_RELATORIO_GERENTE_GERAL,
    'saldos-orcamentarios': process.env.POWERBI_BI_SALDOS_ORCAMENTARIOS,
    'dre-2': process.env.POWERBI_BI_DRE_2,
    'indicadores-comercial-coord-gerencial': process.env.POWERBI_BI_IND_COMERCIAL_COORD_GER,
    'programacao-ferias': process.env.POWERBI_BI_PROGRAMACAO_FERIAS,
    'relatorio-margens': process.env.POWERBI_BI_RELATORIO_MARGENS,
    'relatorio-medro': process.env.POWERBI_BI_RELATORIO_MEDRO,

    // Barcarena
    'kanban-brc': process.env.POWERBI_BI_KANBAN_BRC,
    'relatorio-coord-brc': process.env.POWERBI_BI_RELATORIO_COORD_BRC,
    'saldos-orc-brc': process.env.POWERBI_BI_SALDOS_ORC_BRC,
    'dre-brc': process.env.POWERBI_BI_DRE_BRC,
    'faturamento-brc': process.env.POWERBI_BI_FATURAMENTO_BRC,
    'ind-comercial-brc': process.env.POWERBI_BI_IND_COMERCIAL_BRC,
    'ind-operacao-brc': process.env.POWERBI_BI_IND_OPERACAO_BRC,
    'medro-brc': process.env.POWERBI_BI_MEDRO_BRC,

    // São Luís
    'kanban-slz': process.env.POWERBI_BI_KANBAN_SLZ,
    'relatorio-coord-slz': process.env.POWERBI_BI_RELATORIO_COORD_SLZ,
    'saldos-orc-slz': process.env.POWERBI_BI_SALDOS_ORC_SLZ,
    'dre-slz': process.env.POWERBI_BI_DRE_SLZ,
    'faturamento-slz': process.env.POWERBI_BI_FATURAMENTO_SLZ,
    'ind-comercial-slz': process.env.POWERBI_BI_IND_COMERCIAL_SLZ,
    'ind-operacao-slz': process.env.POWERBI_BI_IND_OPERACAO_SLZ,
    'medro-slz': process.env.POWERBI_BI_MEDRO_SLZ,

    // Parauapebas
    'kanban-prp': process.env.POWERBI_BI_KANBAN_PRP,
    'relatorio-coord-prp': process.env.POWERBI_BI_RELATORIO_COORD_PRP,
    'saldos-orc-prp': process.env.POWERBI_BI_SALDOS_ORC_PRP,
    'dre-prp': process.env.POWERBI_BI_DRE_PRP,
    'faturamento-prp': process.env.POWERBI_BI_FATURAMENTO_PRP,
    'ind-comercial-prp': process.env.POWERBI_BI_IND_COMERCIAL_PRP,
    'ind-operacao-prp': process.env.POWERBI_BI_IND_OPERACAO_PRP,
    'medro-prp': process.env.POWERBI_BI_MEDRO_PRP,

    // São José dos Campos
    'kanban-sjc': process.env.POWERBI_BI_KANBAN_SJC,
    'relatorio-coord-sjc': process.env.POWERBI_BI_RELATORIO_COORD_SJC,
    'saldos-orc-sjc': process.env.POWERBI_BI_SALDOS_ORC_SJC,
    'dre-sjc': process.env.POWERBI_BI_DRE_SJC,
    'faturamento-sjc': process.env.POWERBI_BI_FATURAMENTO_SJC,
    'ind-comercial-sjc': process.env.POWERBI_BI_IND_COMERCIAL_SJC,
    'ind-operacao-sjc': process.env.POWERBI_BI_IND_OPERACAO_SJC,
    'medro-sjc': process.env.POWERBI_BI_MEDRO_SJC,

    // Aveiro
    'kanban-avr': process.env.POWERBI_BI_KANBAN_AVR,
    'relatorio-coord-avr': process.env.POWERBI_BI_RELATORIO_COORD_AVR,
    'dre-avr': process.env.POWERBI_BI_DRE_AVR,
    'ind-comercial-avr': process.env.POWERBI_BI_IND_COMERCIAL_AVR,
    'medro-avr': process.env.POWERBI_BI_MEDRO_AVR,

    // Departamentos Internos
    'analise-garantias': process.env.POWERBI_BI_ANALISE_GARANTIAS,
    'perda': process.env.POWERBI_BI_PERDA,
    'garantia': process.env.POWERBI_BI_GARANTIA,
    'gestao-patrimonios': process.env.POWERBI_BI_GESTAO_PATRIMONIOS,
    'inventario': process.env.POWERBI_BI_INVENTARIO,
    'logistica': process.env.POWERBI_BI_LOGISTICA,
    'planejador': process.env.POWERBI_BI_PLANEJADOR,
    'qualidade': process.env.POWERBI_BI_QUALIDADE,
    'treinamentos': process.env.POWERBI_BI_TREINAMENTOS,
    'rh': process.env.POWERBI_BI_RH,
    'suprimentos': process.env.POWERBI_BI_SUPRIMENTOS,
    'departamento-tecnico': process.env.POWERBI_BI_DEPARTAMENTO_TECNICO,

    // Departamentos Externos
    'grupo-hydro': process.env.POWERBI_BI_GRUPO_HYDRO,
    'tarket': process.env.POWERBI_BI_TARKET,
    'vale': process.env.POWERBI_BI_VALE,
    'vale-ferrovia': process.env.POWERBI_BI_VALE_FERROVIA,
  };

  const url = biUrls[id];
  if (!url) {
    return res.status(404).json({ error: 'BI não encontrado' });
  }

  return res.status(200).json({ url });
}