/* global process, Buffer */
import axios from 'axios';
import crypto from 'crypto';

// Busca (GET) os eventos do Google Calendar do usuario conectado, so leitura,
// e permite desconectar (DELETE), apagando o token guardado no Dataverse.

const WINDOW_DAYS_BEFORE = 60;
const WINDOW_DAYS_AFTER = 365;

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

function parseEventDate(startOrEnd, isEnd = false, diaInteiro = false) {
  if (startOrEnd?.date) {
    if (isEnd && diaInteiro) {
      try {
        const d = new Date(`${startOrEnd.date}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() - 1);
        return { date: d.toISOString().split('T')[0], time: null };
      } catch {
        return { date: startOrEnd.date, time: null };
      }
    }
    return { date: startOrEnd.date, time: null };
  }
  if (startOrEnd?.dateTime) {
    const d = new Date(startOrEnd.dateTime);
    const datePart = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
    const timePart = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d);
    return { date: datePart, time: timePart };
  }
  return { date: '', time: null };
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
        { cr4a1_googlerefreshtoken: null, cr4a1_googleconectadoem: null },
        { headers: dataverseHeaders(dataverseAccessToken) }
      );
      return res.status(200).json({ success: true });
    }

    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não suportado.' });

    const userRes = await axios.get(`${DATAVERSE_ENV_URL}/api/data/v9.2/cr4a1_usuarios_agendas(${userId})`, {
      headers: dataverseHeaders(dataverseAccessToken),
      params: { '$select': 'cr4a1_googlerefreshtoken' }
    });
    const encryptedToken = userRes.data.cr4a1_googlerefreshtoken || userRes.data.cr4a1_google_refresh_token;
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

    let targetCalendars = [{ id: 'primary', summary: 'Principal', backgroundColor: '#4285F4' }];
    try {
      const calListRes = await axios.get('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { Authorization: `Bearer ${googleAccessToken}` }
      });
      const items = (calListRes.data.items || []).filter(c => {
        if (c.selected === false) return false;
        if (c.id?.includes('#holiday@group.v.calendar.google.com')) return false;
        return true;
      });
      if (items.length > 0) {
        targetCalendars = items;
      }
    } catch (err) {
      console.warn('Não foi possível obter lista de calendários, usando primário:', err.message);
    }

    const allEvents = [];
    const seenIds = new Set();

    await Promise.all(targetCalendars.map(async (cal) => {
      try {
        const eventsRes = await axios.get(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events`, {
          headers: { Authorization: `Bearer ${googleAccessToken}` },
          params: { timeMin, timeMax, singleEvents: true, orderBy: 'startTime', maxResults: 2500 }
        });

        (eventsRes.data.items || []).forEach(e => {
          if (e.status === 'cancelled') return;
          if (seenIds.has(e.id)) return;
          seenIds.add(e.id);

          const diaInteiro = !!e.start?.date;
          const startParsed = parseEventDate(e.start, false, diaInteiro);
          const endParsed = parseEventDate(e.end || e.start, true, diaInteiro);

          allEvents.push({
            cr4a1_agenda_kairosid: `google_${e.id}`,
            cr4a1_titulo: e.summary || '(Sem título)',
            cr4a1_data_inicio: startParsed.date,
            cr4a1_data_fim: endParsed.date || startParsed.date,
            cr4a1_hora_inicio: startParsed.time,
            cr4a1_hora_fim: endParsed.time,
            cr4a1_dia_inteiro: diaInteiro,
            cr4a1_cor: cal.backgroundColor || '#4285F4',
            cr4a1_detalhes: e.description || '',
            cr4a1_local: e.location || '',
            isExternal: true,
            externalSource: 'google',
            calendarName: cal.summary || 'Google'
          });
        });
      } catch (calErr) {
        console.warn(`Erro ao buscar eventos do calendário ${cal.summary}:`, calErr.message);
      }
    }));

    return res.status(200).json({ events: allEvents });
  } catch (error) {
    console.error('Erro ao buscar eventos do Google Calendar:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Erro ao buscar eventos do Google Calendar.' });
  }
}
