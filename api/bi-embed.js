// api/bi-embed.js
/* global process */

let cachedAadToken = null;
let tokenExpiresAt = 0;

// Obtém e faz cache do token AAD (App Registration) para a API do Power BI
async function getPowerBIAccessToken() {
  const now = Date.now();
  if (cachedAadToken && now < tokenExpiresAt - 60000) {
    return cachedAadToken;
  }

  const tenantId = process.env.DATAVERSE_TENANT_ID;
  const clientId = process.env.DATAVERSE_CLIENT_ID;
  const clientSecret = process.env.DATAVERSE_CLIENT_SECRET;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://analysis.windows.net/powerbi/api/.default',
    grant_type: 'client_credentials',
  });

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || 'Falha ao autenticar no Azure AD para Power BI');
  }

  cachedAadToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in || 3600) * 1000;
  return cachedAadToken;
}

// Gera um Embed Token oficial para um relatório específico
async function generateReportEmbedToken(workspaceId, reportId) {
  const aadToken = await getPowerBIAccessToken();

  const res = await fetch(
    `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}/GenerateToken`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aadToken}`,
      },
      body: JSON.stringify({
        accessLevel: 'View',
        allowSaveAs: false,
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Falha ao gerar Embed Token no Power BI');
  }

  return {
    token: data.token,
    tokenId: data.tokenId,
    expiration: data.expiration,
  };
}

// Mapa de relatórios migrados para Power BI Embedded oficial (App Owns Data)
const EMBEDDED_REPORTS = {
  // ===== 01 - Diretoria Kairós Motores (Workspace: 2acd4def-cd4c-41e3-acc2-020dfb7db9a1) =====
  'conciliacao-bancaria': {
    workspaceId: '2acd4def-cd4c-41e3-acc2-020dfb7db9a1',
    reportId: '19301256-c0d4-4867-be68-997f08d95ae7',
  },
  'diretoria': {
    workspaceId: '2acd4def-cd4c-41e3-acc2-020dfb7db9a1',
    reportId: '322243c8-008e-4b0c-9243-385346f50662',
  },
  'fluxo-caixa': {
    workspaceId: '2acd4def-cd4c-41e3-acc2-020dfb7db9a1',
    reportId: '5214026b-86f2-4541-9163-f0b5127cfdfb',
  },
  'recursos-humanos': {
    workspaceId: '2acd4def-cd4c-41e3-acc2-020dfb7db9a1',
    reportId: '8cbd7bbc-c23e-4dbe-809f-dea96ae7c591',
  },
  'relatorio-coord-adm': {
    workspaceId: '2acd4def-cd4c-41e3-acc2-020dfb7db9a1',
    reportId: '6c23617b-11af-4cae-8200-bac94a9d1232',
  },
  'relatorio-coordenadores': {
    workspaceId: '2acd4def-cd4c-41e3-acc2-020dfb7db9a1',
    reportId: '65329d55-3af8-4e30-992c-270c5c8d7c42',
  },
  'relatorio-gerencial': {
    workspaceId: '2acd4def-cd4c-41e3-acc2-020dfb7db9a1',
    reportId: '323925dc-7161-41d7-81b9-1ed3d395e8a3',
  },
  'relatorio-gerente-geral': {
    workspaceId: '2acd4def-cd4c-41e3-acc2-020dfb7db9a1',
    reportId: '9d9b73bd-bf05-4352-af44-7451d41841de',
  },
  'saldos-orcamentarios': {
    workspaceId: '2acd4def-cd4c-41e3-acc2-020dfb7db9a1',
    reportId: 'ea1e7ef8-a540-47f9-9e72-26870f6be61e',
  },
  'dre-2': {
    workspaceId: '2acd4def-cd4c-41e3-acc2-020dfb7db9a1',
    reportId: 'f4332fb2-7222-4956-8fcf-5f29cdd76e00',
  },
  'indicadores-comercial-coord-gerencial': {
    workspaceId: '2acd4def-cd4c-41e3-acc2-020dfb7db9a1',
    reportId: '6dca283c-56a2-402c-ad41-d483ddd60ae7',
  },
  'programacao-ferias': {
    workspaceId: '2acd4def-cd4c-41e3-acc2-020dfb7db9a1',
    reportId: '3c547fe8-75f3-415e-8fde-07f0d5680c55',
  },
  'relatorio-margens': {
    workspaceId: '2acd4def-cd4c-41e3-acc2-020dfb7db9a1',
    reportId: 'bece2763-69ee-4184-8418-62a55c9b379f',
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { id } = req.query;

  // 1. Tentar gerar Embed Token se o relatório estiver configurado no novo modo
  const embeddedConfig = EMBEDDED_REPORTS[id];
  if (embeddedConfig) {
    try {
      const { workspaceId, reportId } = embeddedConfig;
      const embedTokenData = await generateReportEmbedToken(workspaceId, reportId);

      return res.status(200).json({
        mode: 'embedded',
        id: reportId,
        workspaceId,
        embedUrl: `https://app.powerbi.com/reportEmbed?reportId=${reportId}&groupId=${workspaceId}`,
        accessToken: embedTokenData.token,
        expiration: embedTokenData.expiration,
      });
    } catch (err) {
      console.warn(`[bi-embed] Falha ao gerar Embed Token para '${id}'. Usando fallback legado:`, err.message);
      // Se falhar a geração de token, continua para o fallback de URL pública abaixo
    }
  }

  // 2. Fallback para links legados públicos salvos em variáveis de ambiente
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
    'indicadores-comercial-coord-gerencial': process.env.POWERBI_BI_INDICADORES_COMERCIAL_COORD_GERENCIAL,
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

  return res.status(200).json({ mode: 'legacy', url });
}
