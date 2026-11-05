/* global process */
import axios from 'axios';

// Endpoint isolado e restrito para o link publico de agendamento de visitas.
// Ao contrario de api/dataverse-proxy.js (que repassa table/filter livres vindos
// do cliente), aqui a tabela e os campos graváveis sao fixos no codigo — o
// visitante externo so consegue criar uma visita "Pendente" para o comercial
// dono do token, nada mais.

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const BUSINESS_HOURS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const MAX_DAYS_AHEAD = 60;

// Throttle best-effort: vive na memoria da instancia serverless e reseta a
// cada cold start. Nao bloqueia abuso distribuido, so reduz spam casual.
const submissionsByIp = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const entries = (submissionsByIp.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (entries.length >= RATE_LIMIT_MAX) return false;
  entries.push(now);
  submissionsByIp.set(ip, entries);
  return true;
}

const odataEscape = (value) => String(value).replace(/'/g, "''");

async function getAccessToken() {
  const { DATAVERSE_TENANT_ID, DATAVERSE_CLIENT_ID, DATAVERSE_CLIENT_SECRET, DATAVERSE_ENV_URL } = process.env;
  const tokenRes = await axios.post(
    `https://login.microsoftonline.com/${DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id: DATAVERSE_CLIENT_ID,
      scope: `${DATAVERSE_ENV_URL}/.default`,
      client_secret: DATAVERSE_CLIENT_SECRET,
      grant_type: 'client_credentials',
    })
  );
  return tokenRes.data.access_token;
}

const dataverseHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
  'OData-MaxVersion': '4.0',
  'OData-Version': '4.0'
});

async function findComercialByToken(accessToken, envUrl, token) {
  const res = await axios.get(`${envUrl}/api/data/v9.2/cr4a1_usuarios_agendas`, {
    headers: dataverseHeaders(accessToken),
    params: {
      '$filter': `cr4a1_link_agendamento eq '${odataEscape(token)}'`,
      '$select': 'cr4a1_usuarios_agendaid,cr4a1_username,cr4a1_nome_exibicao,cr4a1_unidade'
    }
  });
  return res.data.value?.[0] || null;
}

async function resolveVisitanteTitle(accessToken, envUrl, username) {
  try {
    const res = await axios.get(`${envUrl}/api/data/v9.2/cr4a1_credenciaises`, {
      headers: dataverseHeaders(accessToken),
      params: {
        '$filter': `cr4a1_usu_x00e1_rio eq '${odataEscape(username)}'`,
        '$select': 'cr4a1_title'
      }
    });
    return res.data.value?.[0]?.cr4a1_title || username;
  } catch {
    return username;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { DATAVERSE_ENV_URL } = process.env;

  try {
    if (req.method === 'GET') {
      const token = String(req.query.token || '').trim();
      if (!token) return res.status(400).json({ error: 'Token obrigatório.' });

      const accessToken = await getAccessToken();
      const comercial = await findComercialByToken(accessToken, DATAVERSE_ENV_URL, token);
      if (!comercial) return res.status(404).json({ error: 'Link de agendamento inválido.' });

      const visitanteTitle = await resolveVisitanteTitle(accessToken, DATAVERSE_ENV_URL, comercial.cr4a1_username);

      const hoje = new Date();
      const limite = new Date();
      limite.setDate(limite.getDate() + MAX_DAYS_AHEAD);
      const fmt = (d) => d.toISOString().split('T')[0];

      const visitasRes = await axios.get(`${DATAVERSE_ENV_URL}/api/data/v9.2/cr4a1_echoe_visitases`, {
        headers: dataverseHeaders(accessToken),
        params: {
          '$filter': `cr4a1_visitante eq '${odataEscape(visitanteTitle)}' and cr4a1_data_visita ge ${fmt(hoje)} and cr4a1_data_visita le ${fmt(limite)}`,
          '$select': 'cr4a1_data_visita,cr4a1_dataconexao'
        }
      });

      const ocupados = (visitasRes.data.value || []).map(v => ({
        data: (v.cr4a1_data_visita || '').split('T')[0],
        hora: v.cr4a1_dataconexao ? new Date(v.cr4a1_dataconexao).toISOString().substring(11, 16) : null
      }));

      return res.status(200).json({
        comercial: {
          nome: comercial.cr4a1_nome_exibicao || comercial.cr4a1_username,
          filial: comercial.cr4a1_unidade || null
        },
        horariosDisponiveis: BUSINESS_HOURS,
        diasMaximos: MAX_DAYS_AHEAD,
        ocupados
      });
    }

    if (req.method === 'POST') {
      const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
      if (!checkRateLimit(ip)) {
        return res.status(429).json({ error: 'Muitas tentativas. Tente novamente mais tarde.' });
      }

      const { token, nome, contato, motivo, data, hora, website } = req.body || {};

      // honeypot: campo invisivel na UI que só um bot preencheria
      if (website) return res.status(200).json({ success: true });

      if (!token || !nome || !contato || !motivo || !data || !hora) {
        return res.status(400).json({ error: 'Preencha todos os campos.' });
      }
      if (String(nome).length > 120 || String(contato).length > 120 || String(motivo).length > 500) {
        return res.status(400).json({ error: 'Campo excede o tamanho máximo.' });
      }
      if (!BUSINESS_HOURS.includes(hora)) {
        return res.status(400).json({ error: 'Horário inválido.' });
      }

      const dataEscolhida = new Date(`${data}T00:00:00`);
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      const limite = new Date(); limite.setDate(limite.getDate() + MAX_DAYS_AHEAD); limite.setHours(23, 59, 59, 999);
      const diaSemana = dataEscolhida.getDay();
      if (isNaN(dataEscolhida.getTime()) || dataEscolhida < hoje || dataEscolhida > limite || diaSemana === 0 || diaSemana === 6) {
        return res.status(400).json({ error: 'Data inválida.' });
      }

      const accessToken = await getAccessToken();
      const comercial = await findComercialByToken(accessToken, DATAVERSE_ENV_URL, token);
      if (!comercial) return res.status(404).json({ error: 'Link de agendamento inválido.' });

      const visitanteTitle = await resolveVisitanteTitle(accessToken, DATAVERSE_ENV_URL, comercial.cr4a1_username);

      const conflitoRes = await axios.get(`${DATAVERSE_ENV_URL}/api/data/v9.2/cr4a1_echoe_visitases`, {
        headers: dataverseHeaders(accessToken),
        params: {
          '$filter': `cr4a1_visitante eq '${odataEscape(visitanteTitle)}' and cr4a1_data_visita eq ${data}`,
          '$select': 'cr4a1_dataconexao'
        }
      });
      const conflito = (conflitoRes.data.value || []).some(v =>
        v.cr4a1_dataconexao && new Date(v.cr4a1_dataconexao).toISOString().substring(11, 16) === hora
      );
      if (conflito) {
        return res.status(409).json({ error: 'Esse horário acabou de ser ocupado. Escolha outro.' });
      }

      const dataConexao = new Date(`${data}T${hora}:00`);

      await axios.post(`${DATAVERSE_ENV_URL}/api/data/v9.2/cr4a1_echoe_visitases`, {
        cr4a1_cliente: String(nome).trim(),
        cr4a1_motivo: String(motivo).trim(),
        cr4a1_visitante: visitanteTitle,
        cr4a1_filial: comercial.cr4a1_unidade || null,
        cr4a1_data_visita: dataEscolhida.toISOString(),
        cr4a1_periodo_visita: '0',
        cr4a1_dataconexao: dataConexao.toISOString(),
        cr4a1_dataconexaotoday: `${data.split('-').reverse().join('/')} ${hora}`,
        cr4a1_status_agendamento: 'Pendente',
        cr4a1_contato_publico: String(contato).trim()
      }, { headers: dataverseHeaders(accessToken) });

      return res.status(201).json({ success: true });
    }

    return res.status(405).json({ error: 'Método não suportado.' });
  } catch (error) {
    console.error('Erro no agendamento público:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Erro ao processar agendamento.' });
  }
}
