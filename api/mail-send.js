/* global process */
import nodemailer from 'nodemailer';
import axios from 'axios';

// URL oficial da Kairós Agenda (sem hífen)
const APP_URL = 'https://kairosagenda.vercel.app';

// Helper to sanitize environment variables
const getEnv = (key, fallback = '') => {
  let val = process.env[key] || fallback;
  val = String(val).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  return val;
};

/**
 * Busca registros da tabela cr4a1_credenciaises no Dataverse para resolver o cr4a1_email oficial do usuário.
 */
async function carregarCredenciaisDataverse() {
  const tenantId = getEnv('DATAVERSE_TENANT_ID');
  const clientId = getEnv('DATAVERSE_CLIENT_ID');
  const clientSecret = getEnv('DATAVERSE_CLIENT_SECRET');
  const envUrl = getEnv('DATAVERSE_ENV_URL');

  if (tenantId && clientId && clientSecret && envUrl) {
    try {
      const tokenRes = await axios.post(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: clientId,
          scope: `${envUrl}/.default`,
          client_secret: clientSecret,
          grant_type: 'client_credentials',
        })
      );
      const accessToken = tokenRes.data.access_token;
      const res = await axios.get(
        `${envUrl}/api/data/v9.2/cr4a1_credenciaises?$select=cr4a1_usu_x00e1_rio,cr4a1_email,cr4a1_title`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0'
          }
        }
      );
      if (Array.isArray(res.data?.value)) {
        return res.data.value;
      }
    } catch (err) {
      console.warn('[mail-send] Falha ao consultar Dataverse direto, tentando via proxy:', err.message);
    }
  }

  try {
    const proxyRes = await axios.get(`${APP_URL}/api/dataverse-proxy?table=cr4a1_credenciaises&$select=cr4a1_usu_x00e1_rio,cr4a1_email,cr4a1_title`);
    if (Array.isArray(proxyRes.data?.value)) {
      return proxyRes.data.value;
    }
  } catch (err) {
    console.warn('[mail-send] Falha ao consultar proxy de credenciais:', err.message);
  }

  return [];
}

// Builds a clean, branded HTML email template matching Kairós Agenda visual identity
function gerarHtmlEmail({ tipo, titulo, mensagem, autor, detalhes = {} }) {
  const dataHoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const coresTipo = {
    mencao: {
      primary: '#7A4536',
      lightBg: '#FAF0EB',
      border: '#E8CFC6',
      badge: 'Menção',
      icone: '💬'
    },
    evento_proximo: {
      primary: '#B45309',
      lightBg: '#FDF6E8',
      border: '#F4DCB4',
      badge: 'Evento Próximo',
      icone: '⏰'
    },
    compartilhamento: {
      primary: '#2D6A4F',
      lightBg: '#EEF6F2',
      border: '#C8E8D7',
      badge: 'Compartilhamento',
      icone: '🤝'
    },
    cogerente: {
      primary: '#6B46C1',
      lightBg: '#F5F1FA',
      border: '#DFD1F3',
      badge: 'Co-Gerência',
      icone: '⭐'
    },
    automacao: {
      primary: '#7A4536',
      lightBg: '#FAF0EB',
      border: '#E8CFC6',
      badge: 'Automação Trello',
      icone: '⚡'
    },
    padrao: {
      primary: '#7A4536',
      lightBg: '#FAF0EB',
      border: '#E8CFC6',
      badge: 'Notificação',
      icone: '🔔'
    }
  };

  const config = coresTipo[tipo] || coresTipo.padrao;

  // Extract key-value details for the table
  const linhasDetalhes = [];
  if (detalhes.origem) linhasDetalhes.push(`<tr><td style="padding:8px 0;color:#8C776E;font-size:13px;font-weight:500;width:130px;vertical-align:top;">Origem:</td><td style="padding:8px 0;color:#2D1E18;font-size:13px;font-weight:600;vertical-align:top;">${detalhes.origem}</td></tr>`);
  if (detalhes.itemTitulo) linhasDetalhes.push(`<tr><td style="padding:8px 0;color:#8C776E;font-size:13px;font-weight:500;vertical-align:top;">Item:</td><td style="padding:8px 0;color:#2D1E18;font-size:13px;font-weight:600;vertical-align:top;">${detalhes.itemTitulo}</td></tr>`);
  if (detalhes.workspace) linhasDetalhes.push(`<tr><td style="padding:8px 0;color:#8C776E;font-size:13px;font-weight:500;vertical-align:top;">Workspace:</td><td style="padding:8px 0;color:#2D1E18;font-size:13px;font-weight:600;vertical-align:top;">${detalhes.workspace}</td></tr>`);
  if (detalhes.lista) linhasDetalhes.push(`<tr><td style="padding:8px 0;color:#8C776E;font-size:13px;font-weight:500;vertical-align:top;">Lista:</td><td style="padding:8px 0;color:#2D1E18;font-size:13px;font-weight:600;vertical-align:top;">${detalhes.lista}</td></tr>`);
  if (detalhes.dataHora) linhasDetalhes.push(`<tr><td style="padding:8px 0;color:#8C776E;font-size:13px;font-weight:500;vertical-align:top;">Horário:</td><td style="padding:8px 0;color:#2D1E18;font-size:13px;font-weight:600;vertical-align:top;">${detalhes.dataHora}</td></tr>`);
  if (detalhes.responsavel) linhasDetalhes.push(`<tr><td style="padding:8px 0;color:#8C776E;font-size:13px;font-weight:500;vertical-align:top;">Responsável:</td><td style="padding:8px 0;color:#2D1E18;font-size:13px;font-weight:600;vertical-align:top;">${detalhes.responsavel}</td></tr>`);
  if (autor) linhasDetalhes.push(`<tr><td style="padding:8px 0;color:#8C776E;font-size:13px;font-weight:500;vertical-align:top;">Por:</td><td style="padding:8px 0;color:#2D1E18;font-size:13px;font-weight:600;vertical-align:top;">${autor}</td></tr>`);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${titulo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#FAF7F2; font-family:'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#2D1E18; -webkit-font-smoothing:antialiased;">
  <!-- Container Table -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FAF7F2; padding:40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px; width:100%; background-color:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 12px 36px rgba(122,69,54,0.08); border:1px solid #EAE3D9;">
          
          <!-- Terracotta Brand Accent Strip -->
          <tr>
            <td style="background:linear-gradient(90deg, #7A4536 0%, #A45B45 50%, #C97D67 100%); height:6px; font-size:0; line-height:0;">
              &nbsp;
            </td>
          </tr>

          <!-- Header with Kairós Logo and Notification Badge -->
          <tr>
            <td style="background-color:#ffffff; padding:28px 36px 20px 36px; border-bottom:1px solid #F4EFEB;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <table cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="vertical-align:middle; padding-right:12px;">
                          <!-- Calendar Icon in Terracotta -->
                          <div style="width:42px; height:42px; border-radius:12px; background:linear-gradient(135deg, #7A4536 0%, #5E3226 100%); text-align:center; line-height:42px; box-shadow:0 4px 12px rgba(122,69,54,0.25);">
                            <span style="color:#ffffff; font-size:20px; line-height:42px; display:inline-block;">📅</span>
                          </div>
                        </td>
                        <td style="vertical-align:middle;">
                          <div style="font-family:'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:18px; font-weight:800; letter-spacing:0.4px; color:#3D251D; line-height:1.2;">
                            KAIRÓS <span style="color:#7A4536; font-weight:700;">AGENDA</span>
                          </div>
                          <div style="font-family:'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:11px; font-weight:600; color:#8C776E; letter-spacing:0.6px; text-transform:uppercase;">
                            Kairós Motores
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="background-color:${config.lightBg}; color:${config.primary}; border:1px solid ${config.border}; font-size:11px; font-weight:700; padding:6px 14px; border-radius:100px; letter-spacing:0.5px; text-transform:uppercase; display:inline-block; font-family:'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      ${config.icone} ${config.badge}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="background-color:#ffffff; padding:32px 36px;">
              <h1 style="margin:0 0 16px 0; font-family:'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:21px; font-weight:700; color:#2D1E18; line-height:1.35; letter-spacing:-0.2px;">
                ${titulo}
              </h1>

              <div style="font-family:'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:15px; line-height:1.65; color:#4A3A32; margin-bottom:24px;">
                ${mensagem}
              </div>

              ${detalhes.trecho ? `
              <!-- Excerpt / Quote Box -->
              <div style="background-color:#FAF7F2; border:1px solid #EAE3D9; border-left:4px solid ${config.primary}; border-radius:12px; padding:16px 20px; margin-bottom:24px;">
                <div style="font-family:'Poppins', -apple-system, sans-serif; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#8C776E; margin-bottom:6px;">Conteúdo mencionado:</div>
                <div style="font-family:'Poppins', -apple-system, sans-serif; font-style:italic; color:#2D1E18; font-size:14px; line-height:1.6;">
                  "${detalhes.trecho}"
                </div>
              </div>
              ` : ''}

              ${linhasDetalhes.length > 0 ? `
              <!-- Details Summary Table -->
              <div style="background-color:#FAF7F2; border:1px solid #EAE3D9; border-radius:14px; padding:18px 22px; margin-bottom:28px;">
                <table width="100%" cellspacing="0" cellpadding="0" border="0" style="font-family:'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${linhasDetalhes.join('')}
                </table>
              </div>
              ` : ''}

              <!-- Primary Call to Action Button in Official Terracotta -->
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding:10px 0 6px 0;">
                    <a href="${APP_URL}" target="_blank" rel="noopener noreferrer" style="background:linear-gradient(135deg, #7A4536 0%, #5E3226 100%); color:#ffffff !important; text-decoration:none !important; font-family:'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:15px; font-weight:600; padding:14px 36px; border-radius:50px; display:inline-block; box-shadow:0 4px 16px rgba(122,69,54,0.3); letter-spacing:0.2px;">
                      Abrir no Kairós Agenda →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#FAF7F2; padding:24px 36px; border-top:1px solid #EAE3D9; text-align:center;">
              <p style="margin:0 0 6px 0; font-family:'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:12px; color:#8C776E; line-height:1.5;">
                Esta é uma notificação automática gerada pela <strong>Kairós Agenda</strong>.
              </p>
              <p style="margin:0; font-family:'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:12px; color:#A8948B; line-height:1.5;">
                ${dataHoje} • <strong>Kairós Motores</strong> • <a href="${APP_URL}" target="_blank" rel="noopener noreferrer" style="color:#7A4536; text-decoration:none; font-weight:600;">kairosagenda.vercel.app</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
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

  const {
    destinatarios = [],
    usuarios = [],
    tipo = 'padrao',
    titulo = 'Notificação da Kairós Agenda',
    mensagem = '',
    autor = '',
    detalhes = {}
  } = req.body || {};

  const entradasBrutas = [
    ...(Array.isArray(usuarios) ? usuarios : [usuarios]),
    ...(Array.isArray(destinatarios) ? destinatarios : [destinatarios])
  ].filter(Boolean);

  if (entradasBrutas.length === 0) {
    return res.status(400).json({ error: 'Nenhum destinatário informado.' });
  }

  const host = getEnv('MAIL_HOST', 'email-ssl.com.br');
  const port = parseInt(getEnv('MAIL_PORT', '465'), 10);
  const secure = getEnv('MAIL_SECURE', 'true').toLowerCase() === 'true' || port === 465;
  const user = getEnv('MAIL_USER', 'lumen@kairosmotores.com');
  const pass = getEnv('MAIL_PASSWORD', 'Lumen@#741');

  if (!host || !user || !pass) {
    console.error('Configurações SMTP incompletas no .env');
    return res.status(500).json({ error: 'Configurações de e-mail não definidas no servidor.' });
  }

  // Consulta a tabela cr4a1_credenciaises para resolver o cr4a1_email oficial cadastrado
  const credenciais = await carregarCredenciaisDataverse();
  const mapaPorUsuario = new Map();
  const mapaPorNome = new Map();

  credenciais.forEach(c => {
    const emailCad = (c.cr4a1_email || '').trim();
    if (!emailCad) return;
    if (c.cr4a1_usu_x00e1_rio) {
      mapaPorUsuario.set(c.cr4a1_usu_x00e1_rio.trim().toLowerCase(), emailCad);
    }
    if (c.cr4a1_title) {
      mapaPorNome.set(c.cr4a1_title.trim().toLowerCase(), emailCad);
    }
  });

  const listaDestinatarios = [];
  for (const item of entradasBrutas) {
    const limpo = String(item).trim().replace(/^@/, '');
    const limpoLower = limpo.toLowerCase();
    if (!limpo) continue;

    // 1. Verifica na tabela cr4a1_credenciaises por login (cr4a1_usu_x00e1_rio) ou nome (cr4a1_title)
    if (mapaPorUsuario.has(limpoLower)) {
      listaDestinatarios.push(mapaPorUsuario.get(limpoLower));
      continue;
    }
    if (mapaPorNome.has(limpoLower)) {
      listaDestinatarios.push(mapaPorNome.get(limpoLower));
      continue;
    }

    // 2. Se já for um e-mail completo (ex: vindo de cr4a1_credenciaises no frontend)
    if (limpo.includes('@')) {
      listaDestinatarios.push(limpo);
    }
  }

  const emailsUnicos = [...new Set(listaDestinatarios)];

  if (emailsUnicos.length === 0) {
    return res.status(400).json({
      error: 'O usuário mencionado não possui e-mail cadastrado na tabela de credenciais (cr4a1_credenciaises).'
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });

    const html = gerarHtmlEmail({ tipo, titulo, mensagem, autor, detalhes });

    const info = await transporter.sendMail({
      from: `"Kairós Agenda" <${user}>`,
      to: emailsUnicos.join(', '),
      subject: `[Kairós Agenda] ${titulo}`,
      text: `${titulo}\n\n${mensagem}\n\n${detalhes.trecho ? `"${detalhes.trecho}"\n\n` : ''}Acesse: ${APP_URL}`,
      html
    });

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      destinatarios: emailsUnicos
    });
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return res.status(500).json({
      error: 'Falha ao enviar e-mail via SMTP.',
      detalhes: error.message
    });
  }
}
