/* global process */
import nodemailer from 'nodemailer';

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
      primary: '#7c3aed',
      lightBg: '#f5f3ff',
      border: '#ddd6fe',
      badge: 'Menção',
      icone: '💬'
    },
    evento_proximo: {
      primary: '#d97706',
      lightBg: '#fffbeb',
      border: '#fde68a',
      badge: 'Evento Próximo',
      icone: '⏰'
    },
    compartilhamento: {
      primary: '#059669',
      lightBg: '#ecfdf5',
      border: '#a7f3d0',
      badge: 'Compartilhamento',
      icone: '🤝'
    },
    cogerente: {
      primary: '#2563eb',
      lightBg: '#eff6ff',
      border: '#bfdbfe',
      badge: 'Co-Gerência',
      icone: '⭐'
    },
    padrao: {
      primary: '#1a73e8',
      lightBg: '#eef4ff',
      border: '#d3e3fd',
      badge: 'Notificação',
      icone: '🔔'
    }
  };

  const config = coresTipo[tipo] || coresTipo.padrao;

  // Extract key-value details for the table
  const linhasDetalhes = [];
  if (detalhes.origem) linhasDetalhes.push(`<tr><td style="padding:7px 0;color:#64748b;font-size:13px;font-weight:500;width:130px;vertical-align:top;">Origem:</td><td style="padding:7px 0;color:#0f172a;font-size:13px;font-weight:600;vertical-align:top;">${detalhes.origem}</td></tr>`);
  if (detalhes.itemTitulo) linhasDetalhes.push(`<tr><td style="padding:7px 0;color:#64748b;font-size:13px;font-weight:500;vertical-align:top;">Item:</td><td style="padding:7px 0;color:#0f172a;font-size:13px;font-weight:600;vertical-align:top;">${detalhes.itemTitulo}</td></tr>`);
  if (detalhes.workspace) linhasDetalhes.push(`<tr><td style="padding:7px 0;color:#64748b;font-size:13px;font-weight:500;vertical-align:top;">Workspace:</td><td style="padding:7px 0;color:#0f172a;font-size:13px;font-weight:600;vertical-align:top;">${detalhes.workspace}</td></tr>`);
  if (detalhes.lista) linhasDetalhes.push(`<tr><td style="padding:7px 0;color:#64748b;font-size:13px;font-weight:500;vertical-align:top;">Lista:</td><td style="padding:7px 0;color:#0f172a;font-size:13px;font-weight:600;vertical-align:top;">${detalhes.lista}</td></tr>`);
  if (detalhes.dataHora) linhasDetalhes.push(`<tr><td style="padding:7px 0;color:#64748b;font-size:13px;font-weight:500;vertical-align:top;">Horário:</td><td style="padding:7px 0;color:#0f172a;font-size:13px;font-weight:600;vertical-align:top;">${detalhes.dataHora}</td></tr>`);
  if (detalhes.responsavel) linhasDetalhes.push(`<tr><td style="padding:7px 0;color:#64748b;font-size:13px;font-weight:500;vertical-align:top;">Responsável:</td><td style="padding:7px 0;color:#0f172a;font-size:13px;font-weight:600;vertical-align:top;">${detalhes.responsavel}</td></tr>`);
  if (autor) linhasDetalhes.push(`<tr><td style="padding:7px 0;color:#64748b;font-size:13px;font-weight:500;vertical-align:top;">Por:</td><td style="padding:7px 0;color:#0f172a;font-size:13px;font-weight:600;vertical-align:top;">${autor}</td></tr>`);

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
<body style="margin:0; padding:0; background-color:#f0f4f9; font-family:'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#1e293b; -webkit-font-smoothing:antialiased;">
  <!-- Container Table -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f0f4f9; padding:40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px; width:100%; background-color:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 12px 32px rgba(15,23,42,0.08); border:1px solid #e2e8f0;">
          
          <!-- Brand Accent Strip -->
          <tr>
            <td style="background:linear-gradient(90deg, #1a73e8 0%, #4285f4 50%, ${config.primary} 100%); height:6px; font-size:0; line-height:0;">
              &nbsp;
            </td>
          </tr>

          <!-- Header with Kairós Logo and Notification Badge -->
          <tr>
            <td style="background-color:#ffffff; padding:28px 36px 20px 36px; border-bottom:1px solid #f1f5f9;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <table cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="vertical-align:middle; padding-right:12px;">
                          <!-- Calendar Icon in Brand Blue -->
                          <div style="width:42px; height:42px; border-radius:12px; background:linear-gradient(135deg, #1a73e8 0%, #1557b0 100%); text-align:center; line-height:42px; box-shadow:0 4px 10px rgba(26,115,232,0.25);">
                            <span style="color:#ffffff; font-size:22px; line-height:42px; display:inline-block;">📅</span>
                          </div>
                        </td>
                        <td style="vertical-align:middle;">
                          <div style="font-family:'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:18px; font-weight:800; letter-spacing:0.3px; color:#0f172a; line-height:1.2;">
                            KAIRÓS <span style="color:#1a73e8; font-weight:700;">AGENDA</span>
                          </div>
                          <div style="font-family:'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:11px; font-weight:600; color:#64748b; letter-spacing:0.6px; text-transform:uppercase;">
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
              <h1 style="margin:0 0 16px 0; font-family:'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:21px; font-weight:700; color:#0f172a; line-height:1.35; letter-spacing:-0.2px;">
                ${titulo}
              </h1>

              <div style="font-family:'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:15px; line-height:1.65; color:#334155; margin-bottom:24px;">
                ${mensagem}
              </div>

              ${detalhes.trecho ? `
              <!-- Excerpt / Quote Box -->
              <div style="background-color:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid ${config.primary}; border-radius:12px; padding:16px 20px; margin-bottom:24px;">
                <div style="font-family:'Poppins', -apple-system, sans-serif; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#64748b; margin-bottom:6px;">Conteúdo mencionado:</div>
                <div style="font-family:'Poppins', -apple-system, sans-serif; font-style:italic; color:#1e293b; font-size:14px; line-height:1.6;">
                  "${detalhes.trecho}"
                </div>
              </div>
              ` : ''}

              ${linhasDetalhes.length > 0 ? `
              <!-- Details Summary Table -->
              <div style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:18px 22px; margin-bottom:28px;">
                <table width="100%" cellspacing="0" cellpadding="0" border="0" style="font-family:'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${linhasDetalhes.join('')}
                </table>
              </div>
              ` : ''}

              <!-- Primary Call to Action Button -->
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding:10px 0 6px 0;">
                    <a href="${APP_URL}" target="_blank" rel="noopener noreferrer" style="background:linear-gradient(135deg, #1a73e8 0%, #1557b0 100%); color:#ffffff !important; text-decoration:none !important; font-family:'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:15px; font-weight:600; padding:14px 34px; border-radius:50px; display:inline-block; box-shadow:0 4px 14px rgba(26,115,232,0.35); letter-spacing:0.2px;">
                      Abrir no Kairós Agenda →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc; padding:24px 36px; border-top:1px solid #e2e8f0; text-align:center;">
              <p style="margin:0 0 6px 0; font-family:'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:12px; color:#64748b; line-height:1.5;">
                Esta é uma notificação automática gerada pela <strong>Kairós Agenda</strong>.
              </p>
              <p style="margin:0; font-family:'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:12px; color:#94a3b8; line-height:1.5;">
                ${dataHoje} • <strong>Kairós Motores</strong> • <a href="${APP_URL}" target="_blank" rel="noopener noreferrer" style="color:#1a73e8; text-decoration:none; font-weight:600;">kairosagenda.vercel.app</a>
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const {
    destinatarios = [],
    tipo = 'padrao',
    titulo = 'Notificação da Kairós Agenda',
    mensagem = '',
    autor = '',
    detalhes = {}
  } = req.body || {};

  if (!destinatarios || (Array.isArray(destinatarios) && destinatarios.length === 0)) {
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

  const defaultDomain = user.includes('@') ? user.split('@')[1] : 'kairosmotores.com';

  // Format array of recipients, adding default domain if missing
  const listaDestinatarios = (Array.isArray(destinatarios) ? destinatarios : [destinatarios])
    .filter(Boolean)
    .map(dest => {
      const limpo = String(dest).trim().replace(/^@/, '');
      if (limpo.includes('@')) return limpo;
      return `${limpo}@${defaultDomain}`;
    });

  const emailsUnicos = [...new Set(listaDestinatarios)];

  if (emailsUnicos.length === 0) {
    return res.status(400).json({ error: 'Nenhum endereço de e-mail válido gerado.' });
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
