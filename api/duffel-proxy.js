/* global process */
import axios from 'axios';

// Proxy fino pra API da Duffel: a chave (DUFFEL_TOKEN) nunca pode ir pro navegador, então toda
// busca de voos passa por aqui. O front monta o payload de busca (slices/passengers/filtros) e
// manda pronto — este endpoint só injeta a autenticação e repassa pra Duffel.
// GET ?query= também passa por aqui, pra resolver nome de cidade/aeroporto em código IATA
// (autocomplete de origem/destino) sem o usuário precisar saber o código de cor.
export default async function handler(req, res) {
  const { DUFFEL_TOKEN } = process.env;

  if (req.method === 'GET') {
    const query = (req.query.query || '').trim();
    if (query.length < 2) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ data: [] }));
      return;
    }
    try {
      const sugestoesRes = await axios.get('https://api.duffel.com/places/suggestions', {
        params: { query },
        headers: {
          Authorization: `Bearer ${DUFFEL_TOKEN}`,
          Accept: 'application/json',
          'Duffel-Version': 'v2'
        },
        timeout: 15000
      });
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(sugestoesRes.data));
    } catch (err) {
      res.statusCode = err.response?.status || 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Erro ao buscar sugestões de destino.', details: err.response?.data?.errors || err.message }));
    }
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Método não suportado.' }));
    return;
  }

  try {
    const duffelRes = await axios.post(
      'https://api.duffel.com/air/offer_requests?return_offers=true',
      { data: req.body },
      {
        headers: {
          Authorization: `Bearer ${DUFFEL_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Duffel-Version': 'v2'
        },
        timeout: 25000
      }
    );
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(duffelRes.data));
  } catch (err) {
    res.statusCode = err.response?.status || 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Erro ao consultar voos na Duffel.', details: err.response?.data?.errors || err.message }));
  }
}
