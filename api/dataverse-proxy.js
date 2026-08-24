import axios from 'axios';

export default async function handler(req, res) {
  const {
    DATAVERSE_TENANT_ID, DATAVERSE_CLIENT_ID,
    DATAVERSE_CLIENT_SECRET, DATAVERSE_ENV_URL
  } = process.env;

  const { table, id } = req.query;
  
  // CORREÇÃO: Tenta pegar o filtro do Header OU do parâmetro '$filter' na URL
  const filter = req.headers['x-dataverse-filter'] || req.query['$filter'];

  try {
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
    let finalUrl = `${DATAVERSE_ENV_URL}/api/data/v9.2/${table}`;

    if (id) {
      finalUrl += `(${id})`;
    }

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
      data: req.method === 'DELETE' ? null : req.body
    };

    // Aplica o filtro se ele existir e não for uma busca por ID específico
    if (filter && !id) {
      axiosConfig.params = { '$filter': filter };
    }

    const dataverseRes = await axios(axiosConfig);
    let responseData = dataverseRes.data;

    // O Dataverse pagina coleções grandes via "@odata.nextLink" em vez de devolver tudo
    // de uma vez; sem seguir esse link, tabelas que passam do limite de página (tipicamente
    // 5000 linhas) tinham registos truncados silenciosamente, sem nenhum erro visível.
    if (req.method === 'GET' && Array.isArray(responseData.value)) {
      let nextLink = responseData['@odata.nextLink'];
      const allValues = responseData.value;
      let safetyCounter = 0;

      while (nextLink && safetyCounter < 50) {
        const nextRes = await axios({
          method: 'GET',
          url: nextLink,
          headers: axiosConfig.headers
        });
        allValues.push(...(nextRes.data.value || []));
        nextLink = nextRes.data['@odata.nextLink'];
        safetyCounter++;
      }

      responseData = { ...responseData, value: allValues };
      delete responseData['@odata.nextLink'];
    }

    res.status(200).json(responseData);

  } catch (error) {
    console.error("Erro Proxy:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
}