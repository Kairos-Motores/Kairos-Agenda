import axios from 'axios';

export default async function handler(req, res) {
  const {
    DATAVERSE_TENANT_ID, DATAVERSE_CLIENT_ID,
    DATAVERSE_CLIENT_SECRET, DATAVERSE_ENV_URL
  } = process.env;

  const { table, id } = req.query;
  const filter = req.headers['x-dataverse-filter'];

  try {
    // 1. Autenticação
    const tokenRes = await axios.post(
      `https://login.microsoftonline.com/${DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: DATAVERSE_CLIENT_ID,
        scope: `${DATAVERSE_ENV_URL}/.default`,
        client_secret: DATAVERSE_CLIENT_SECRET,
        grant_type: 'client_credentials',
      })
    );

    const accessToken = tokenRes.data.access_token;

    // 2. Montagem da URL no padrão OData (Entidade + ID)
    // Se for DELETE, a URL final deve ser: .../tabela(id) SEM interrogação depois
    let finalUrl = `${DATAVERSE_ENV_URL}/api/data/v9.2/${table}`;

    if (id) {
      finalUrl += `(${id})`;
    }

    // No seu arquivo api/dataverse-proxy.js
    const axiosConfig = {
      method: req.method,
      url: finalUrl,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0'
      },
      // Se for DELETE, mandamos null. Se for POST/PATCH, mandamos o body.
      data: req.method === 'DELETE' ? null : req.body
    };

    // Apenas adicionamos params se NÃO for um delete por ID
    if (filter && !id) {
      axiosConfig.params = { '$filter': filter };
    }

    console.log(`>>> [${req.method}] Executando em:`, finalUrl);

    const dataverseRes = await axios(axiosConfig);
    res.status(200).json(dataverseRes.data);

  } catch (error) {
    console.error("Erro Proxy:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
}