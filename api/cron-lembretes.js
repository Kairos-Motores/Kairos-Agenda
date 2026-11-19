/* global process */
import webpush from 'web-push';
import nodemailer from 'nodemailer';

const APP_URL = 'https://kairosagenda.vercel.app';

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

const fetchAllDataverse = async (url, headers) => {
  const items = [];
  let nextUrl = url;
  while (nextUrl) {
    const res = await fetch(nextUrl, { headers });
    if (!res.ok) break;
    const data = await res.json();
    if (Array.isArray(data.value)) items.push(...data.value);
    nextUrl = data['@odata.nextLink'] || null;
  }
  return items;
};

const extrairAtributo = (tagStr, attrName) => {
  const re = new RegExp(`${attrName}=["']([^"']*)["']`, 'i');
  const m = tagStr.match(re);
  return m ? m[1] : '';
};

const limparHtml = (html = '') =>
  String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();

const extrairTarefasNode = (html = '') => {
  if (!html || !html.includes('taskItem')) return [];
  const tarefas = [];
  const regex = /<li\b([^>]*data-type=["']taskItem["'][^>]*)>([\s\S]*?)<\/li>/gi;
  let match;
  let index = 0;
  while ((match = regex.exec(html)) !== null) {
    const attrs = match[1] || '';
    let inner = match[2] || '';
    inner = inner.replace(/<label\b[\s\S]*?<\/label>/gi, '').replace(/<input\b[^>]*>/gi, '');
    tarefas.push({
      index,
      texto: limparHtml(inner),
      concluida: extrairAtributo(attrs, 'data-checked') === 'true',
      dataVencimento: extrairAtributo(attrs, 'data-due'),
      responsavel: extrairAtributo(attrs, 'data-assignee'),
      lembreteHoras: extrairAtributo(attrs, 'data-reminder')
    });
    index += 1;
  }
  return tarefas;
};

const parseAtividadesRaw = (raw) => {
  if (!raw) return { atividades: [], meta: {} };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
      return {
        atividades: Array.isArray(parsed.atividades) ? parsed.atividades : [],
        meta: parsed.meta && typeof parsed.meta === 'object' ? parsed.meta : {}
      };
    }
    if (Array.isArray(parsed)) {
      const metaEntry = parsed.find(x => x && x.tipo === '__meta__');
      return {
        atividades: parsed.filter(x => x && x.tipo !== '__meta__'),
        meta: metaEntry?.meta || {}
      };
    }
  } catch { /* json inválido */ }
  return { atividades: [], meta: {} };
};

const gerarHtmlLembrete = ({ titulo, mensagem, subtaskTexto, fichaTitulo, workspaceNome, listaNome, prazoFmt, lembreteHoras }) => `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:24px;background-color:#FAF7F2;font-family:Poppins,Arial,sans-serif;color:#2D1E18;">
  <table width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td align="center">
      <table width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #EAE3D9;">
        <tr><td style="background:linear-gradient(90deg,#7A4536,#C97D67);height:6px;">&nbsp;</td></tr>
        <tr><td style="padding:28px 32px;">
          <div style="font-size:12px;font-weight:700;color:#B45309;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;">⏰ Lembrete Automático (${lembreteHoras}h antes)</div>
          <h1 style="margin:0 0 14px 0;font-size:20px;color:#2D1E18;">${titulo}</h1>
          <p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;color:#4A3A32;">${mensagem}</p>
          <div style="background:#FAF7F2;border:1px solid #EAE3D9;border-left:4px solid #B45309;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
            <div style="font-size:11px;font-weight:700;color:#8C776E;text-transform:uppercase;margin-bottom:4px;">Tarefa da Checklist</div>
            <div style="font-size:14px;font-weight:600;color:#2D1E18;">${subtaskTexto}</div>
          </div>
          <div style="background:#FAF7F2;border:1px solid #EAE3D9;border-radius:12px;padding:14px 18px;margin-bottom:24px;font-size:13px;line-height:1.8;">
            <div><strong>Ficha:</strong> ${fichaTitulo}</div>
            ${workspaceNome ? `<div><strong>Workspace:</strong> ${workspaceNome}</div>` : ''}
            ${listaNome ? `<div><strong>Lista:</strong> ${listaNome}</div>` : ''}
            ${prazoFmt ? `<div><strong>Prazo:</strong> ${prazoFmt}</div>` : ''}
          </div>
          <div style="text-align:center;">
            <a href="${APP_URL}" style="background:#7A4536;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 30px;border-radius:999px;display:inline-block;">Abrir no Kairós Agenda →</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const DATAVERSE_TENANT_ID = getEnv('DATAVERSE_TENANT_ID');
  const DATAVERSE_CLIENT_ID = getEnv('DATAVERSE_CLIENT_ID');
  const DATAVERSE_CLIENT_SECRET = getEnv('DATAVERSE_CLIENT_SECRET');
  const DATAVERSE_ENV_URL = getEnv('DATAVERSE_ENV_URL');
  const VAPID_PUBLIC_KEY = getEnv('VAPID_PUBLIC_KEY');
  const VAPID_PRIVATE_KEY = getEnv('VAPID_PRIVATE_KEY');
  const VAPID_SUBJECT = getEnv('VAPID_SUBJECT', 'mailto:lumen@kairosmotores.com');

  if (!DATAVERSE_TENANT_ID || !DATAVERSE_CLIENT_ID || !DATAVERSE_CLIENT_SECRET || !DATAVERSE_ENV_URL) {
    return res.status(500).json({ error: 'Credenciais do Dataverse não configuradas.' });
  }

  try {
    const token = await getToken(DATAVERSE_TENANT_ID, DATAVERSE_CLIENT_ID, DATAVERSE_CLIENT_SECRET, DATAVERSE_ENV_URL);
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0'
    };
    const base = `${DATAVERSE_ENV_URL}/api/data/v9.2`;

    const pushHabilitado = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
    if (pushHabilitado) {
      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    }

    const host = getEnv('MAIL_HOST', 'email-ssl.com.br');
    const port = parseInt(getEnv('MAIL_PORT', '465'), 10);
    const secure = getEnv('MAIL_SECURE', 'true').toLowerCase() === 'true' || port === 465;
    const mailUser = getEnv('MAIL_USER', 'lumen@kairosmotores.com');
    const mailPass = getEnv('MAIL_PASSWORD', 'Lumen@#741');
    const transporter = (host && mailUser && mailPass)
      ? nodemailer.createTransport({ host, port, secure, auth: { user: mailUser, pass: mailPass }, tls: { rejectUnauthorized: false } })
      : null;

    const filtroFichas = encodeURIComponent("cr4a1_concluida ne 'Sim'");
    const [fichas, credenciais, pushSubs, listas, workspaces] = await Promise.all([
      fetchAllDataverse(`${base}/cr4a1_fichas?$filter=${filtroFichas}&$select=cr4a1_fichaid,cr4a1_titulo,cr4a1_descricao,cr4a1_atividades,cr4a1_lista_id,cr4a1_workspace_id,cr4a1_fixada,cr4a1_data_inicio`, headers),
      fetchAllDataverse(`${base}/cr4a1_credenciaises?$select=cr4a1_usu_x00e1_rio,cr4a1_email,cr4a1_title`, headers),
      fetchAllDataverse(`${base}/cr4a1_push_subscriptions`, headers),
      fetchAllDataverse(`${base}/cr4a1_listas?$select=cr4a1_listaid,cr4a1_nome`, headers),
      fetchAllDataverse(`${base}/cr4a1_calendarios_workspaceses?$select=cr4a1_calendarios_workspacesid,cr4a1_nome`, headers)
    ]);

    const emailPorLogin = new Map();
    for (const c of credenciais) {
      const u = (c.cr4a1_usu_x00e1_rio || '').trim().toLowerCase();
      const em = (c.cr4a1_email || '').trim();
      if (u && em) emailPorLogin.set(u, em);
    }

    const subsPorLogin = new Map();
    for (const s of pushSubs) {
      const u = (s.cr4a1_username || '').trim().toLowerCase();
      if (!u) continue;
      if (!subsPorLogin.has(u)) subsPorLogin.set(u, []);
      subsPorLogin.get(u).push(s);
    }

    const listaNomePorId = new Map(listas.map(l => [l.cr4a1_listaid, l.cr4a1_nome || '']));
    const wsNomePorId = new Map(workspaces.map(w => [w.cr4a1_calendarios_workspacesid, w.cr4a1_nome || '']));

    const agoraMs = Date.now();
    let lembretesDisparados = 0;
    let pushEnviados = 0;
    let emailsEnviados = 0;

    for (const ficha of fichas) {
      if (ficha.cr4a1_fixada === 'Arq' || ficha.cr4a1_fixada === 'Arquivada') continue;
      const tarefas = extrairTarefasNode(ficha.cr4a1_descricao || '');
      if (tarefas.length === 0) continue;

      const parsed = parseAtividadesRaw(ficha.cr4a1_atividades);
      const enviados = new Set(Array.isArray(parsed.meta.lembretesSubtasksEnviados) ? parsed.meta.lembretesSubtasksEnviados : []);
      const inbox = Array.isArray(parsed.meta.notificacoesInbox) ? [...parsed.meta.notificacoesInbox] : [];
      let fichaAlterada = false;

      for (const t of tarefas) {
        if (t.concluida || !t.responsavel || !t.dataVencimento || !t.lembreteHoras) continue;
        const horasAntes = Number(t.lembreteHoras);
        if (![48, 24, 12].includes(horasAntes)) continue;

        // Prazo da subtask em horário local America/Belem (-03:00)
        const prazoIso = t.dataVencimento.includes('T')
          ? t.dataVencimento
          : `${t.dataVencimento}T08:00:00-03:00`;
        const prazoMs = new Date(prazoIso).getTime();
        if (Number.isNaN(prazoMs)) continue;

        const horasRestantes = (prazoMs - agoraMs) / 3600000;
        if (horasRestantes > horasAntes || horasRestantes < -24) continue;

        const loginLower = String(t.responsavel).trim().toLowerCase();
        const chave = `${t.index}_${loginLower}_${t.dataVencimento}_${horasAntes}`;
        if (enviados.has(chave)) continue;

        const nomeItem = (t.texto || '').trim();
        // Não envia lembrete para item sem texto digitado
        if (!nomeItem) continue;

        const fichaTitulo = (ficha.cr4a1_titulo || '').trim() || 'Ficha';
        const listaNome = listaNomePorId.get(ficha.cr4a1_lista_id) || '';
        const workspaceNome = wsNomePorId.get(ficha.cr4a1_workspace_id) || '';
        const prazoFmt = new Date(prazoIso).toLocaleDateString('pt-BR', { timeZone: 'America/Belem' });
        const descricaoAlvo = `"${nomeItem}" na ficha "${fichaTitulo}"`;

        // 1. Web Push para todos os dispositivos inscritos (mesmo com app/site fechado)
        if (pushHabilitado) {
          const subs = subsPorLogin.get(loginLower) || [];
          const payload = JSON.stringify({
            title: `⏰ Prazo em ${horasAntes}h: ${fichaTitulo}`,
            body: `Lembrete: conclua ${descricaoAlvo} até ${prazoFmt}.`,
            url: '/',
            tag: `cron-subtask-${ficha.cr4a1_fichaid}-${t.index}-${horasAntes}h`
          });
          for (const s of subs) {
            try {
              await webpush.sendNotification(
                { endpoint: s.cr4a1_endpoint, keys: { p256dh: s.cr4a1_p256dh, auth: s.cr4a1_auth } },
                payload
              );
              pushEnviados += 1;
            } catch (err) {
              if (err.statusCode === 404 || err.statusCode === 410) {
                await fetch(`${base}/cr4a1_push_subscriptions(${s.cr4a1_push_subscriptionid})`, { method: 'DELETE', headers }).catch(() => {});
              }
            }
          }
        }

        // 2. E-mail automático via SMTP (mesmo com app/site fechado)
        const emailDest = emailPorLogin.get(loginLower);
        if (transporter && emailDest) {
          try {
            const tituloEmail = `Lembrete (${horasAntes}h): concluir "${nomeItem}" (${fichaTitulo})`;
            const mensagemEmail = `Falta menos de <strong>${horasAntes} horas</strong> para o vencimento da sua tarefa na ficha <strong>"${fichaTitulo}"</strong>.`;
            await transporter.sendMail({
              from: `"Kairós Agenda" <${mailUser}>`,
              to: emailDest,
              subject: `[Kairós Agenda] ${tituloEmail}`,
              text: `${tituloEmail}\n\nTarefa: ${nomeItem}\nFicha: ${fichaTitulo}\nPrazo: ${prazoFmt}\nAcesse: ${APP_URL}`,
              html: gerarHtmlLembrete({
                titulo: tituloEmail,
                mensagem: mensagemEmail,
                subtaskTexto: nomeItem,
                fichaTitulo,
                workspaceNome,
                listaNome,
                prazoFmt,
                lembreteHoras: horasAntes
              })
            });
            emailsEnviados += 1;
          } catch (mailErr) {
            console.warn('[cron-lembretes] Falha ao enviar e-mail:', mailErr.message);
          }
        }

        // 3. Registra no inbox da ficha (para aparecer no sininho da Agenda) e marca como enviado
        enviados.add(chave);
        inbox.push({
          id: `cron-${ficha.cr4a1_fichaid}-${t.index}-${horasAntes}h`,
          para: loginLower,
          destinatario: t.responsavel,
          tipo: 'evento_proximo',
          titulo: `Lembrete (${horasAntes}h): ${fichaTitulo}`,
          mensagem: `Lembrete: conclua ${descricaoAlvo} até ${prazoFmt}.`,
          itemTitulo: fichaTitulo,
          subtaskTitulo: nomeItem,
          origem: 'Prazo de Checklist',
          timestamp: new Date().toISOString()
        });
        fichaAlterada = true;
        lembretesDisparados += 1;
      }

      if (fichaAlterada) {
        const novoConteudo = JSON.stringify({
          atividades: parsed.atividades,
          meta: {
            ...parsed.meta,
            lembretesSubtasksEnviados: [...enviados],
            notificacoesInbox: inbox.slice(-30)
          }
        });
        await fetch(`${base}/cr4a1_fichas(${ficha.cr4a1_fichaid})`, {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ cr4a1_atividades: novoConteudo })
        }).catch(() => {});
      }
    }

    return res.status(200).json({
      ok: true,
      verificadas: fichas.length,
      lembretesDisparados,
      pushEnviados,
      emailsEnviados,
      executadoEm: new Date().toISOString()
    });
  } catch (error) {
    console.error('[cron-lembretes] Erro:', error.message);
    return res.status(500).json({ error: 'Erro ao processar lembretes', detalhes: error.message });
  }
}
