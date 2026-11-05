/* global process, Buffer */
import crypto from 'crypto';

// Passo 1 do OAuth: redireciona o navegador do usuario para a tela de
// consentimento do Google. O "state" carrega o id do usuario da Kairos
// assinado (HMAC) para o callback saber a quem vincular o token sem
// depender de sessao de servidor (esta app nao tem uma).

const APP_URL = 'https://kairosagenda.vercel.app';
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

function signState(userId) {
  const { TOKEN_ENCRYPTION_KEY } = process.env;
  const payload = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64url');
  const signature = crypto.createHmac('sha256', TOKEN_ENCRYPTION_KEY).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export default function handler(req, res) {
  const { GOOGLE_CLIENT_ID } = process.env;
  const userId = String(req.query.userId || '').trim();

  if (!userId) {
    return res.status(400).json({ error: 'userId obrigatório.' });
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${APP_URL}/api/google-oauth-callback`,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: signState(userId)
  });

  res.writeHead(302, { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
  res.end();
}
