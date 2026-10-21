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

// Mapa completo de todos os 61 relatórios dos 8 workspaces migrados para Power BI Embedded oficial (App Owns Data)
const EMBEDDED_REPORTS = {
  "conciliacao-bancaria": {
    "workspaceId": "2acd4def-cd4c-41e3-acc2-020dfb7db9a1",
    "reportId": "19301256-c0d4-4867-be68-997f08d95ae7"
  },
  "diretoria": {
    "workspaceId": "2acd4def-cd4c-41e3-acc2-020dfb7db9a1",
    "reportId": "322243c8-008e-4b0c-9243-385346f50662"
  },
  "fluxo-caixa": {
    "workspaceId": "2acd4def-cd4c-41e3-acc2-020dfb7db9a1",
    "reportId": "5214026b-86f2-4541-9163-f0b5127cfdfb"
  },
  "recursos-humanos": {
    "workspaceId": "2acd4def-cd4c-41e3-acc2-020dfb7db9a1",
    "reportId": "8cbd7bbc-c23e-4dbe-809f-dea96ae7c591"
  },
  "relatorio-coord-adm": {
    "workspaceId": "2acd4def-cd4c-41e3-acc2-020dfb7db9a1",
    "reportId": "6c23617b-11af-4cae-8200-bac94a9d1232"
  },
  "relatorio-coordenadores": {
    "workspaceId": "2acd4def-cd4c-41e3-acc2-020dfb7db9a1",
    "reportId": "65329d55-3af8-4e30-992c-270c5c8d7c42"
  },
  "relatorio-gerencial": {
    "workspaceId": "2acd4def-cd4c-41e3-acc2-020dfb7db9a1",
    "reportId": "323925dc-7161-41d7-81b9-1ed3d395e8a3"
  },
  "relatorio-gerente-geral": {
    "workspaceId": "2acd4def-cd4c-41e3-acc2-020dfb7db9a1",
    "reportId": "9d9b73bd-bf05-4352-af44-7451d41841de"
  },
  "saldos-orcamentarios": {
    "workspaceId": "2acd4def-cd4c-41e3-acc2-020dfb7db9a1",
    "reportId": "ea1e7ef8-a540-47f9-9e72-26870f6be61e"
  },
  "dre-2": {
    "workspaceId": "2acd4def-cd4c-41e3-acc2-020dfb7db9a1",
    "reportId": "f4332fb2-7222-4956-8fcf-5f29cdd76e00"
  },
  "indicadores-comercial-coord-gerencial": {
    "workspaceId": "2acd4def-cd4c-41e3-acc2-020dfb7db9a1",
    "reportId": "6dca283c-56a2-402c-ad41-d483ddd60ae7"
  },
  "programacao-ferias": {
    "workspaceId": "2acd4def-cd4c-41e3-acc2-020dfb7db9a1",
    "reportId": "3c547fe8-75f3-415e-8fde-07f0d5680c55"
  },
  "relatorio-margens": {
    "workspaceId": "2acd4def-cd4c-41e3-acc2-020dfb7db9a1",
    "reportId": "bece2763-69ee-4184-8418-62a55c9b379f"
  },
  "kanban-brc": {
    "workspaceId": "fac2b785-a228-4ac0-a537-30a963e9faff",
    "reportId": "d202d3a6-9094-4b46-a2ce-6890e8baf889"
  },
  "relatorio-coord-brc": {
    "workspaceId": "fac2b785-a228-4ac0-a537-30a963e9faff",
    "reportId": "d9b43c1d-8352-4068-a0b0-242ab9a8d2aa"
  },
  "saldos-orc-brc": {
    "workspaceId": "fac2b785-a228-4ac0-a537-30a963e9faff",
    "reportId": "b10ab19a-6778-431b-90d3-ea38a69f7e0d"
  },
  "dre-brc": {
    "workspaceId": "fac2b785-a228-4ac0-a537-30a963e9faff",
    "reportId": "cfb9c6b8-b581-41dd-8e02-11b409caf0d4"
  },
  "faturamento-brc": {
    "workspaceId": "fac2b785-a228-4ac0-a537-30a963e9faff",
    "reportId": "d9dd67bd-05a9-4fe0-a4da-43859a2a2bc9"
  },
  "ind-comercial-brc": {
    "workspaceId": "fac2b785-a228-4ac0-a537-30a963e9faff",
    "reportId": "ebcf14b9-a2c2-4cb6-a3ae-648a6381bf41"
  },
  "ind-operacao-brc": {
    "workspaceId": "fac2b785-a228-4ac0-a537-30a963e9faff",
    "reportId": "65f9f8c6-63d6-4ccf-a272-b83fb2faa61e"
  },
  "kanban-slz": {
    "workspaceId": "88d7fe8f-5d56-47b2-b2f5-da5aee121696",
    "reportId": "c433f44f-9b49-4231-8077-433ba29324c0"
  },
  "relatorio-coord-slz": {
    "workspaceId": "88d7fe8f-5d56-47b2-b2f5-da5aee121696",
    "reportId": "67625322-6ae7-4533-8c20-25a21a73f7f1"
  },
  "saldos-orc-slz": {
    "workspaceId": "88d7fe8f-5d56-47b2-b2f5-da5aee121696",
    "reportId": "cacb29c8-8ab9-4725-9d53-ca4bf08d9bf2"
  },
  "dre-slz": {
    "workspaceId": "88d7fe8f-5d56-47b2-b2f5-da5aee121696",
    "reportId": "242eb6ac-0b1c-41d3-ab78-26e8bbb3cb96"
  },
  "faturamento-slz": {
    "workspaceId": "88d7fe8f-5d56-47b2-b2f5-da5aee121696",
    "reportId": "7931dcdf-a9ea-4250-bfc6-3c550c723fcb"
  },
  "ind-comercial-slz": {
    "workspaceId": "88d7fe8f-5d56-47b2-b2f5-da5aee121696",
    "reportId": "f0e41099-1a87-42fb-b24f-4101a91d6132"
  },
  "ind-operacao-slz": {
    "workspaceId": "88d7fe8f-5d56-47b2-b2f5-da5aee121696",
    "reportId": "e42c8b6e-2759-4ebe-8c1b-ec03541221d6"
  },
  "kanban-prp": {
    "workspaceId": "539c4afa-6375-40d4-9dc9-cd56720eae7a",
    "reportId": "6962301a-00b5-4ad0-975c-5b49d74c75f4"
  },
  "relatorio-coord-prp": {
    "workspaceId": "539c4afa-6375-40d4-9dc9-cd56720eae7a",
    "reportId": "8931bafd-6c20-43e3-ad6a-b1cea1ad48a9"
  },
  "saldos-orc-prp": {
    "workspaceId": "539c4afa-6375-40d4-9dc9-cd56720eae7a",
    "reportId": "77e96e99-d16b-4cb5-b264-5d81de269ced"
  },
  "dre-prp": {
    "workspaceId": "539c4afa-6375-40d4-9dc9-cd56720eae7a",
    "reportId": "63a02cdf-825d-4d92-895c-5ba79347fd28"
  },
  "faturamento-prp": {
    "workspaceId": "539c4afa-6375-40d4-9dc9-cd56720eae7a",
    "reportId": "d095c54a-4c1e-441b-bc91-dff982af92d5"
  },
  "ind-comercial-prp": {
    "workspaceId": "539c4afa-6375-40d4-9dc9-cd56720eae7a",
    "reportId": "2dd608ec-c024-48e2-9807-caba80fabe3b"
  },
  "ind-operacao-prp": {
    "workspaceId": "539c4afa-6375-40d4-9dc9-cd56720eae7a",
    "reportId": "85af95d0-a051-4057-a1eb-18164c334a66"
  },
  "kanban-sjc": {
    "workspaceId": "d1c88eab-398b-4db5-a199-ea125262ef1a",
    "reportId": "7614595a-7d5e-4aa6-9e17-2239647d785f"
  },
  "relatorio-coord-sjc": {
    "workspaceId": "d1c88eab-398b-4db5-a199-ea125262ef1a",
    "reportId": "a59e2b9a-c951-495a-a7e7-eeda58a86cb4"
  },
  "saldos-orc-sjc": {
    "workspaceId": "d1c88eab-398b-4db5-a199-ea125262ef1a",
    "reportId": "5cff7233-0f5a-45d8-8b26-315f59f8cb70"
  },
  "dre-sjc": {
    "workspaceId": "d1c88eab-398b-4db5-a199-ea125262ef1a",
    "reportId": "ecdd93ee-d913-4b2b-8f8c-04fd9092fec8"
  },
  "faturamento-sjc": {
    "workspaceId": "d1c88eab-398b-4db5-a199-ea125262ef1a",
    "reportId": "82ece19b-ad1e-4055-9794-e4bd7c27b17d"
  },
  "ind-comercial-sjc": {
    "workspaceId": "d1c88eab-398b-4db5-a199-ea125262ef1a",
    "reportId": "19c49b74-3bf7-4a3e-9f81-d34d06c54ff2"
  },
  "ind-operacao-sjc": {
    "workspaceId": "d1c88eab-398b-4db5-a199-ea125262ef1a",
    "reportId": "69364cc3-8119-407a-a5d1-dd3a61097dc0"
  },
  "kanban-avr": {
    "workspaceId": "94ef49dc-1d18-4644-8664-2f831db9d127",
    "reportId": "eb02766e-3dd3-460d-833b-d011681f2faf"
  },
  "relatorio-coord-avr": {
    "workspaceId": "94ef49dc-1d18-4644-8664-2f831db9d127",
    "reportId": "2217c8ad-d65b-4b34-ab96-8e92f92bd342"
  },
  "dre-avr": {
    "workspaceId": "94ef49dc-1d18-4644-8664-2f831db9d127",
    "reportId": "a7dffe17-0156-44d9-9515-ec103443d6dc"
  },
  "ind-comercial-avr": {
    "workspaceId": "94ef49dc-1d18-4644-8664-2f831db9d127",
    "reportId": "dd51a9b4-25d0-4469-b46b-5368ac03dc53"
  },
  "analise-garantias": {
    "workspaceId": "03affef7-49f7-44a4-ac20-47068969bd6b",
    "reportId": "8ef9987e-c66b-4c0f-a29e-19d6a2bd1de9"
  },
  "perda": {
    "workspaceId": "03affef7-49f7-44a4-ac20-47068969bd6b",
    "reportId": "64178efd-c297-4190-bfb0-ca006063f9c4"
  },
  "garantia": {
    "workspaceId": "03affef7-49f7-44a4-ac20-47068969bd6b",
    "reportId": "f0a153eb-2ebc-4179-867c-e36d335d1caf"
  },
  "gestao-patrimonios": {
    "workspaceId": "03affef7-49f7-44a4-ac20-47068969bd6b",
    "reportId": "14bac36a-5423-427e-b41d-624f510d8f0d"
  },
  "inventario": {
    "workspaceId": "03affef7-49f7-44a4-ac20-47068969bd6b",
    "reportId": "77d7be1f-32ab-4201-b182-e7a23f4ed49a"
  },
  "logistica": {
    "workspaceId": "03affef7-49f7-44a4-ac20-47068969bd6b",
    "reportId": "8f07c57d-7cc3-4058-9bf5-444db03b75cf"
  },
  "planejador": {
    "workspaceId": "03affef7-49f7-44a4-ac20-47068969bd6b",
    "reportId": "9110ecfd-ff04-4b15-a2f6-370402f98e27"
  },
  "qualidade": {
    "workspaceId": "03affef7-49f7-44a4-ac20-47068969bd6b",
    "reportId": "92000e3d-63ad-4f20-84df-d61fc923f3ef"
  },
  "treinamentos": {
    "workspaceId": "03affef7-49f7-44a4-ac20-47068969bd6b",
    "reportId": "ecb6bd3b-28d8-4c3b-8a28-ea4e1d07c964"
  },
  "rh": {
    "workspaceId": "03affef7-49f7-44a4-ac20-47068969bd6b",
    "reportId": "7e730104-5ac5-446f-aa2c-6e06a7962573"
  },
  "suprimentos": {
    "workspaceId": "03affef7-49f7-44a4-ac20-47068969bd6b",
    "reportId": "b65e8f39-b3c4-4a69-a9c2-34473511fc38"
  },
  "departamento-tecnico": {
    "workspaceId": "03affef7-49f7-44a4-ac20-47068969bd6b",
    "reportId": "dd02d2c2-448b-4f1f-adc1-3193744f0a97"
  },
  "grupo-hydro": {
    "workspaceId": "521f1d30-85df-4ff6-b8b2-d067e2db635a",
    "reportId": "64ba7044-319d-482c-a8ad-4f27ee1cc24f"
  },
  "tarket": {
    "workspaceId": "521f1d30-85df-4ff6-b8b2-d067e2db635a",
    "reportId": "2ae5780f-aa15-4553-b79a-9509f13d3797"
  },
  "vale": {
    "workspaceId": "521f1d30-85df-4ff6-b8b2-d067e2db635a",
    "reportId": "d39c0db2-a52d-429f-8710-f230898c3627"
  },
  "vale-ferrovia": {
    "workspaceId": "521f1d30-85df-4ff6-b8b2-d067e2db635a",
    "reportId": "a1b066e8-e195-4a84-90c9-2b7562685cb1"
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { id } = req.query;

  // 1. Tentar gerar Embed Token oficial do Power BI Embedded
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
    }
  }

  // 2. Fallback de contingência para URLs públicas salvas em variáveis de ambiente
  const envKey = `POWERBI_BI_${(id || '').toUpperCase().replace(/-/g, '_')}`;
  const url = process.env[envKey];

  if (!url) {
    return res.status(404).json({ error: 'BI não encontrado' });
  }

  return res.status(200).json({ mode: 'legacy', url });
}
