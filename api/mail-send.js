/* global process */
import nodemailer from 'nodemailer';

// Helper to sanitize environment variables
const getEnv = (key, fallback = '') => {
  let val = process.env[key] || fallback;
  val = String(val).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && v.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  return val;
};

// Builds a clean, branded HTML email template for Kairós Agenda
function gerarHtmlEmail({ tipo, titulo, mensagem, autor, detalhes = {} }) {
  const dataHoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const coresTipo = {
    mencao: { bg: '#8b5cf6', badge: 'MENÇÃO', icone: '💬' },
    evento_proximo: { bg: '#f59e0b', badge: 'EVENTO PRÓXIMO', icone: '⏰' },
    compartilhamento: { bg: '#10b981', badge: 'COMPARTILHAMENTO', icone: '🤝' },
    cogerente: { bg: '#3b82f6', badge: 'CO-GERÊNCIA', icone: '⭐' },
    padrao: { bg: '#1a73e8', badge: 'NOTIFICAÇÃO', icone: '🔔' }
  };

  const config = coresTipo[tipo] || coresTipo.padrao;

  // Extract key-value details for the table
  const linhasDetalhes = [];
  if (detalhes.origem) linhasDetalhes.push(`<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:120px;">Origem:</td><td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${detalhes.origem}</td></tr>`);
  if (detalhes.itemTitulo) linhasDetalhes.push(`<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Item:</td><td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${detalhes.itemTitulo}</td></tr>`);
  if (detalhes.workspace) linhasDetalhes.push(`<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Workspace:</td><td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${detalhes.workspace}</td></tr>`);
  if (detalhes.lista) linhasDetalhes.push(`<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Lista:</td><td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${detalhes.lista}</td></tr>`);
  if (detalhes.dataHora) linhasDetalhes.push(`<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Horário:</td><td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${detalhes.dataHora}</td></tr>`);
  if (detalhes.responsavel) linhasDetalhes.push(`<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Responsável:</td><td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${detalhes.responsavel}</td></tr>`);
  if (autor) linhasDetalhes.push(`<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Por:</td><td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${autor}</td></tr>`);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:580px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);border:1px solid #e5e7eb;">
          <!-- Top Accent Bar -->
          <tr>
            <td style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%);padding:24px 32px;border-bottom:3px solid ${config.bg};">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size:18px;font-weight:800;letter-spacing:1px;color:#ffffff;display:inline-block;">KAIRÓS <span style="color:#60a5fa;">AGENDA</span></span>
                  </td>
                  <td align="right">
                    <span style="background:${config.bg};color:#ffffff;font-size:10px;font-weight:700;padding:4px 10px;border-radius:9999px;letter-spacing:0.5px;text-transform:uppercase;">
                      ${config.badge}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#111827;line-height:1.3;">
                ${config.icone} ${titulo}
              </h1>

              <div style="font-size:15px;line-height:1.6;color:#374151;margin-bottom:24px;">
                ${mensagem}
              </div>

              ${detalhes.trecho ? `
              <div style="background:#f8fafc;border-left:4px solid ${config.bg};border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;font-style:italic;color:#475569;font-size:14px;line-height:1.5;">
                "${detalhes.trecho}"
              </div>
              ` : ''}

              ${linhasDetalhes.length > 0 ? `
              <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
                <table width="100%" cellspacing="0" cellpadding="0">
                  ${linhasDetalhes.join('')}
                </table>
              </div>
              ` : ''}

              <!-- Action Button -->
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding:8px 0 16px 0;">
                    <a href="https://kairos-agenda.vercel.app" style="background:#1a73e8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;display:inline-block;box-shadow:0 2px 4px rgba(26,115,232,0.3);">
                      Abrir no Kairós Agenda →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                Esta é uma notificação automática gerada pela <strong>Kairós Agenda</strong>.<br>
                ${dataHoje} • Kairós Motores
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

  const host = getEnv('MAIL_HOST');
  const port = parseInt(getEnv('MAIL_PORT', '465'), 10);
  const secure = getEnv('MAIL_SECURE', 'true').toLowerCase() === 'true' || port === 465;
  const user = getEnv('MAIL_USER');
  const pass = getEnv('MAIL_PASSWORD');

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
      text: `${titulo}\n\n${mensagem}\n\n${detalhes.trecho ? `"${detalhes.trecho}"\n\n` : ''}Acesse: https://kairos-agenda.vercel.app`,
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
