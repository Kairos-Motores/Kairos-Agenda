/* global process */
import webpush from 'web-push';

const getEnv = (key, fallback = '') => {
  let val = process.env[key] || fallback;
  val = String(val).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  return val;
};

const getToken = async (tenantId, clientId, clientSecret, envUrl) => {
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      scope: `${envUrl}/.default`,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Falha ao obter token do Dataverse');
  return data.access_token;
};

async function obterInscricoesPush(usuariosAlvo, base, headers) {
  const alvosLower = new Set(
    usuariosAlvo
      .filter(Boolean)
      .map(u => String(u).trim().replace(/^@/, '').toLowerCase())
  );
  if (alvosLower.size === 0) return [];

  if (base && headers) {
    try {
      const subsRes = await fetch(`${base}/cr4a1_push_subscriptions`, { headers });
      if (subsRes.ok) {
        const data = await subsRes.json();
        return (data.value || []).filter(s =>
          alvosLower.has((s.cr4a1_username || '').trim().toLowerCase())
        );
      }
    } catch (err) {
      console.warn('[push-send] Falha ao buscar cr4a1_push_subscriptions direto:', err.message);
    }
  }

  try {
    const proxyRes = await fetch('https://kairosagenda.vercel.app/api/dataverse-proxy?table=cr4a1_push_subscriptions');
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      return (data.value || []).filter(s =>
        alvosLower.has((s.cr4a1_username || '').trim().toLowerCase())
      );
    }
  } catch (err) {
    console.warn('[push-send] Falha ao buscar cr4a1_push_subscriptions via proxy:', err.message);
  }

  return [];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const DATAVERSE_TENANT_ID = getEnv('DATAVERSE_TENANT_ID');
  const DATAVERSE_CLIENT_ID = getEnv('DATAVERSE_CLIENT_ID');
  const DATAVERSE_CLIENT_SECRET = getEnv('DATAVERSE_CLIENT_SECRET');
  const DATAVERSE_ENV_URL = getEnv('DATAVERSE_ENV_URL');
  const VAPID_PUBLIC_KEY = getEnv('VAPID_PUBLIC_KEY');
  const VAPID_PRIVATE_KEY = getEnv('VAPID_PRIVATE_KEY');
  const VAPID_SUBJECT = getEnv('VAPID_SUBJECT', 'mailto:lumen@kairosmotores.com');

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: 'Chaves VAPID não configuradas no servidor.' });
  }

  const {
    fichaId,
    usuarios = [],
    username = '',
    title = 'Kairós Agenda',
    body = '',
    url = '/',
    tag = 'kairos-alerta'
  } = req.body || {};

  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    let headers = null;
    let base = null;
    if (DATAVERSE_TENANT_ID && DATAVERSE_CLIENT_ID && DATAVERSE_CLIENT_SECRET && DATAVERSE_ENV_URL) {
      try {
        const token = await getToken(DATAVERSE_TENANT_ID, DATAVERSE_CLIENT_ID, DATAVERSE_CLIENT_SECRET, DATAVERSE_ENV_URL);
        headers = {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0'
        };
        base = `${DATAVERSE_ENV_URL}/api/data/v9.2`;
      } catch (err) {
        console.warn('[push-send] Token Dataverse indisponível localmente, usando proxy:', err.message);
      }
    }

    // MODO 1: Notificação vinculada a uma ficha do Trello por ID
    if (fichaId) {
      if (!/^[0-9a-f-]{36}$/i.test(fichaId)) {
        return res.status(400).json({ error: 'fichaId inválido' });
      }
      if (!base || !headers) {
        return res.status(500).json({ error: 'Credenciais Dataverse necessárias para fichaId' });
      }

      const fichaRes = await fetch(`${base}/cr4a1_fichas(${fichaId})`, { headers });
      if (!fichaRes.ok) return res.status(404).json({ error: 'Ficha não encontrada' });
      const ficha = await fichaRes.json();
      if (!ficha.cr4a1_responsavel_login || !ficha.cr4a1_data_inicio) {
        return res.status(200).json({ enviados: 0 });
      }

      const subs = await obterInscricoesPush([ficha.cr4a1_responsavel_login], base, headers);
      const quando = new Date(ficha.cr4a1_data_inicio).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Belem'
      });
      const payload = JSON.stringify({
        title: 'Nova ficha com data',
        body: `${ficha.cr4a1_titulo} — ${quando}`,
        url: '/',
        tag: `ficha-${fichaId}`
      });

      let enviados = 0;
      for (const s of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: s.cr4a1_endpoint, keys: { p256dh: s.cr4a1_p256dh, auth: s.cr4a1_auth } },
            payload
          );
          enviados++;
        } catch (err) {
          if ((err.statusCode === 404 || err.statusCode === 410) && base && headers) {
            await fetch(`${base}/cr4a1_push_subscriptions(${s.cr4a1_push_subscriptionid})`, { method: 'DELETE', headers }).catch(() => {});
          }
        }
      }

      if (enviados > 0) {
        await fetch(`${base}/cr4a1_fichas(${fichaId})`, {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ cr4a1_notificado: 'Sim' })
        }).catch(() => {});
      }

      return res.status(200).json({ success: true, enviados });
    }

    // MODO 2: Notificação direta para dispositivos de usuários (menções, eventos próximos, compartilhamentos, co-gerência)
    const listaUsuarios = [
      ...(Array.isArray(usuarios) ? usuarios : [usuarios]),
      username
    ].filter(Boolean);

    if (listaUsuarios.length === 0) {
      return res.status(400).json({ error: 'Nenhum usuário ou fichaId informado para push.' });
    }

    const subs = await obterInscricoesPush(listaUsuarios, base, headers);
    const payload = JSON.stringify({
      title: title || 'Kairós Agenda',
      body: body || 'Você tem uma nova notificação no Kairós Agenda.',
      url: url || '/',
      tag: tag || `kairos-${Date.now()}`
    });

    let enviados = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.cr4a1_endpoint, keys: { p256dh: s.cr4a1_p256dh, auth: s.cr4a1_auth } },
          payload
        );
        enviados++;
      } catch (err) {
        if ((err.statusCode === 404 || err.statusCode === 410) && base && headers) {
          await fetch(`${base}/cr4a1_push_subscriptions(${s.cr4a1_push_subscriptionid})`, { method: 'DELETE', headers }).catch(() => {});
        }
      }
    }

    return res.status(200).json({
      success: true,
      enviados,
      totalDispositivos: subs.length
    });
  } catch (error) {
    console.error('push-send:', error.message);
    return res.status(500).json({ error: 'Falha ao enviar notificação push', detalhes: error.message });
  }
}
