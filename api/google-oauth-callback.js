/* global process, Buffer */
import axios from 'axios';
import crypto from 'crypto';

// Passo 2 do OAuth: o Google manda o usuario de volta pra ca com um "code".
// Trocamos o code por tokens, criptografamos o refresh_token (o proxy geral
// do Dataverse nao tem autenticacao propria — ver api/dataverse-proxy.js —
// entao nunca gravamos um token do Google em texto puro numa tabela que
// qualquer um com a URL do proxy consegue ler) e gravamos no usuario.

const APP_URL = 'https://kairosagenda.vercel.app';
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

function getEncryptionKey() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY || '';
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex');
  // fallback: aceita qualquer string e deriva uma chave de 32 bytes dela
  return crypto.createHash('sha256').update(raw).digest();
}

function verifyState(state) {
  const { TOKEN_ENCRYPTION_KEY } = process.env;
  const [payload, signature] = String(state || '').split('.');
  if (!payload || !signature) return null;

  const expected = crypto.createHmac('sha256', TOKEN_ENCRYPTION_KEY).update(payload).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (!decoded.userId || Date.now() - decoded.ts > STATE_MAX_AGE_MS) return null;
  return decoded.userId;
}

function encrypt(text) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export default async function handler(req, res) {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, DATAVERSE_TENANT_ID, DATAVERSE_CLIENT_ID, DATAVERSE_CLIENT_SECRET, DATAVERSE_ENV_URL } = process.env;
  const { code, state, error: oauthError } = req.query;

  const redirectWithStatus = (status, detalhe = '') => {
    const extra = detalhe ? `&msg=${encodeURIComponent(detalhe)}` : '';
    res.writeHead(302, { Location: `${APP_URL}/?google_calendar=${status}${extra}` });
    res.end();
  };

  if (oauthError) return redirectWithStatus('negado');

  const userId = verifyState(state);
  if (!userId || !code) return redirectWithStatus('invalido');

  try {
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: `${APP_URL}/api/google-oauth-callback`,
      grant_type: 'authorization_code'
    }));

    const { refresh_token } = tokenRes.data;
    if (!refresh_token) return redirectWithStatus('sem_refresh_token');

    const dataverseTokenRes = await axios.post(
      `https://login.microsoftonline.com/${DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: DATAVERSE_CLIENT_ID,
        scope: `${DATAVERSE_ENV_URL}/.default`,
        client_secret: DATAVERSE_CLIENT_SECRET,
        grant_type: 'client_credentials',
      })
    );
    const dataverseAccessToken = dataverseTokenRes.data.access_token;

    await axios.patch(
      `${DATAVERSE_ENV_URL}/api/data/v9.2/cr4a1_usuarios_agendas(${userId})`,
      {
        cr4a1_google_refresh_token: encrypt(refresh_token),
        cr4a1_google_conectado_em: new Date().toISOString()
      },
      {
        headers: {
          Authorization: `Bearer ${dataverseAccessToken}`,
          'Content-Type': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0'
        }
      }
    );

    return redirectWithStatus('conectado');
  } catch (error) {
    const errorDetails = error.response?.data?.error?.message || error.response?.data?.error_description || error.response?.data?.error || error.message;
    console.error('Erro no callback OAuth do Google:', error.response?.data || error.message);
    return redirectWithStatus('erro', String(errorDetails).substring(0, 120));
  }
}
