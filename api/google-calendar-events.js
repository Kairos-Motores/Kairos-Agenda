/* global process, Buffer */
import axios from 'axios';
import crypto from 'crypto';

// Busca (GET) os eventos do Google Calendar do usuario conectado, so leitura,
// e permite desconectar (DELETE), apagando o token guardado no Dataverse.

const WINDOW_DAYS_BEFORE = 7;
const WINDOW_DAYS_AFTER = 180;

function getEncryptionKey() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY || '';
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex');
  return crypto.createHash('sha256').update(raw).digest();
}

function decrypt(blobBase64) {
  const key = getEncryptionKey();
  const blob = Buffer.from(blobBase64, 'base64');
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const encrypted = blob.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

async function getDataverseAccessToken() {
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

function dataverseHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0'
  };
}

export default async function handler(req, res) {
  const { DATAVERSE_ENV_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  const userId = String(req.query.userId || '').trim();
  if (!userId) return res.status(400).json({ error: 'userId obrigatório.' });

  try {
    const dataverseAccessToken = await getDataverseAccessToken();

    if (req.method === 'DELETE') {
      await axios.patch(
        `${DATAVERSE_ENV_URL}/api/data/v9.2/cr4a1_usuarios_agendas(${userId})`,
        { cr4a1_google_refresh_token: null, cr4a1_google_conectado_em: null },
        { headers: dataverseHeaders(dataverseAccessToken) }
      );
      return res.status(200).json({ success: true });
    }

    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não suportado.' });

    const userRes = await axios.get(`${DATAVERSE_ENV_URL}/api/data/v9.2/cr4a1_usuarios_agendas(${userId})`, {
      headers: dataverseHeaders(dataverseAccessToken),
      params: { '$select': 'cr4a1_google_refresh_token' }
    });
    const encryptedToken = userRes.data.cr4a1_google_refresh_token;
    if (!encryptedToken) return res.status(404).json({ error: 'Google Calendar não conectado.' });

    const refreshToken = decrypt(encryptedToken);

    const googleTokenRes = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token'
    }));
    const googleAccessToken = googleTokenRes.data.access_token;

    const timeMin = new Date(Date.now() - WINDOW_DAYS_BEFORE * 86400000).toISOString();
    const timeMax = new Date(Date.now() + WINDOW_DAYS_AFTER * 86400000).toISOString();

    const eventsRes = await axios.get('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
      params: { timeMin, timeMax, singleEvents: true, orderBy: 'startTime', maxResults: 2500 }
    });

    const eventos = (eventsRes.data.items || [])
      .filter(e => e.status !== 'cancelled')
      .map(e => {
        const diaInteiro = !!e.start?.date;
        const dataInicio = (e.start?.date || e.start?.dateTime || '').split('T')[0];
        const dataFim = (e.end?.date || e.end?.dateTime || dataInicio).split('T')[0];
        const horaInicio = diaInteiro ? null : (e.start?.dateTime || '').substring(11, 16);
        const horaFim = diaInteiro ? null : (e.end?.dateTime || '').substring(11, 16);

        return {
          cr4a1_agenda_kairosid: `google_${e.id}`,
          cr4a1_titulo: e.summary || '(Sem título)',
          cr4a1_data_inicio: dataInicio,
          cr4a1_data_fim: dataFim,
          cr4a1_hora_inicio: horaInicio,
          cr4a1_hora_fim: horaFim,
          cr4a1_dia_inteiro: diaInteiro,
          cr4a1_cor: '#4285F4',
          isExternal: true,
          externalSource: 'google'
        };
      });

    return res.status(200).json({ events: eventos });
  } catch (error) {
    console.error('Erro ao buscar eventos do Google Calendar:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Erro ao buscar eventos do Google Calendar.' });
  }
}
