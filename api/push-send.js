/* global process */
import webpush from 'web-push';

const { DATAVERSE_TENANT_ID, DATAVERSE_CLIENT_ID, DATAVERSE_CLIENT_SECRET, DATAVERSE_ENV_URL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;

const getToken = async () => {
  const res = await fetch(`https://login.microsoftonline.com/${DATAVERSE_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: DATAVERSE_CLIENT_ID, scope: `${DATAVERSE_ENV_URL}/.default`, client_secret: DATAVERSE_CLIENT_SECRET, grant_type: 'client_credentials' })
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Falha ao obter token do Dataverse');
  return data.access_token;
};

// O cliente só informa o ID da ficha. Título, texto e destinatário vêm do registro salvo,
// para que ninguém consiga disparar uma notificação com conteúdo arbitrário.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  const { fichaId } = req.body || {};
  if (!fichaId || !/^[0-9a-f-]{36}$/i.test(fichaId)) return res.status(400).json({ error: 'fichaId inválido' });

  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    const token = await getToken();
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json', 'OData-MaxVersion': '4.0', 'OData-Version': '4.0' };
    const base = `${DATAVERSE_ENV_URL}/api/data/v9.2`;

    const fichaRes = await fetch(`${base}/cr4a1_fichas(${fichaId})`, { headers });
    if (!fichaRes.ok) return res.status(404).json({ error: 'Ficha não encontrada' });
    const ficha = await fichaRes.json();
    if (!ficha.cr4a1_responsavel_login || !ficha.cr4a1_data_inicio) return res.status(200).json({ enviados: 0 });

    const subsRes = await fetch(`${base}/cr4a1_push_subscriptions?$filter=${encodeURIComponent(`cr4a1_username eq '${ficha.cr4a1_responsavel_login}'`)}`, { headers });
    const subs = (await subsRes.json()).value || [];

    const quando = new Date(ficha.cr4a1_data_inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Belem' });
    const payload = JSON.stringify({
      title: 'Nova ficha com data',
      body: `${ficha.cr4a1_titulo} — ${quando}`,
      url: '/'
    });

    let enviados = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification({ endpoint: s.cr4a1_endpoint, keys: { p256dh: s.cr4a1_p256dh, auth: s.cr4a1_auth } }, payload);
        enviados++;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await fetch(`${base}/cr4a1_push_subscriptions(${s.cr4a1_push_subscriptionid})`, { method: 'DELETE', headers });
        }
      }
    }

    if (enviados > 0) {
      await fetch(`${base}/cr4a1_fichas(${fichaId})`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cr4a1_notificado: 'Sim' })
      });
    }

    return res.status(200).json({ enviados });
  } catch (error) {
    console.error('push-send:', error.message);
    return res.status(500).json({ error: 'Falha ao enviar notificação' });
  }
}
