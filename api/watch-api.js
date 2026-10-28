import axios from 'axios';
import crypto from 'crypto';

// Remove tags HTML e simplifica quebras de linha para exibição limpa no relógio
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Extrai microtarefas de descrições TipTap (HTML)
function extrairTarefasTipTap(html) {
  if (!html || !html.includes('data-type="taskItem"')) return [];
  const regex = /<li[^>]*data-type="taskItem"[^>]*data-checked="(true|false)"[^>]*>([\s\S]*?)<\/li>/gi;
  const tarefas = [];
  let match;
  let idx = 0;
  while ((match = regex.exec(html)) !== null) {
    const concluida = match[1] === 'true';
    const textoLimpo = stripHtml(match[2]).trim();
    tarefas.push({ index: idx++, texto: textoLimpo, concluida });
  }
  return tarefas;
}

// Altera o estado de uma tarefa dentro do HTML TipTap
function alternarTarefaNoHtml(html, targetIndex) {
  if (!html) return html;
  let currentIndex = 0;
  return html.replace(/(<li[^>]*data-type="taskItem"[^>]*data-checked=")(true|false)("[^>]*>)/gi, (fullMatch, prefix, checkedState, suffix) => {
    if (currentIndex === targetIndex) {
      const novoEstado = checkedState === 'true' ? 'false' : 'true';
      currentIndex++;
      return `${prefix}${novoEstado}${suffix}`;
    }
    currentIndex++;
    return fullMatch;
  });
}

// Obtém o token de autenticação de cliente para o Dataverse
async function getDataverseToken() {
  const {
    DATAVERSE_TENANT_ID, DATAVERSE_CLIENT_ID,
    DATAVERSE_CLIENT_SECRET, DATAVERSE_ENV_URL
  } = process.env;

  const tokenRes = await axios.post(
    `https://login.microsoftonline.com/${DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id: DATAVERSE_CLIENT_ID,
      scope: `${DATAVERSE_ENV_URL}/.default`,
      client_secret: DATAVERSE_CLIENT_SECRET,
      grant_type: 'client_credentials',
    })
  );
  return { accessToken: tokenRes.data.access_token, envUrl: DATAVERSE_ENV_URL };
}

export default async function handler(req, res) {
  // CORS para permitir requisições do relógio e da web
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = req.query.action || req.body?.action;

  try {
    const { accessToken, envUrl } = await getDataverseToken();
    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0'
    };

    // ==========================================
    // 1. GERAR PIN DE PAREAMENTO (CHAMADO PELA WEB)
    // ==========================================
    if (action === 'create-pin') {
      const { user, displayName, role } = req.body || {};
      if (!user) return res.status(400).json({ error: 'Usuário obrigatório.' });

      // Gera PIN numérico de 6 dígitos aleatórios
      const pin = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = Date.now() + 10 * 60 * 1000; // Válido por 10 minutos

      // Salva registro temporário no Dataverse (cr4a1_quadros sem workspace_id)
      await axios.post(`${envUrl}/api/data/v9.2/cr4a1_quadros`, {
        cr4a1_nome: `WATCH_PIN_${pin}`,
        cr4a1_criador_login: user,
        cr4a1_templatelistas: JSON.stringify({
          user,
          displayName: displayName || user,
          role: role || 'COMUM',
          expiresAt
        })
      }, { headers: authHeaders });

      return res.status(200).json({
        success: true,
        pin,
        expiresAt
      });
    }

    // ==========================================
    // 2. VERIFICAR PIN (CHAMADO PELO RELÓGIO)
    // ==========================================
    if (action === 'verify-pin') {
      const pin = (req.body?.pin || req.query.pin || '').trim();
      if (!pin) return res.status(400).json({ success: false, message: 'PIN não informado.' });

      const filtro = encodeURIComponent(`cr4a1_nome eq 'WATCH_PIN_${pin}'`);
      const buscaRes = await axios.get(`${envUrl}/api/data/v9.2/cr4a1_quadros?$filter=${filtro}`, { headers: authHeaders });
      const registros = buscaRes.data.value || [];

      if (registros.length === 0) {
        return res.status(401).json({ success: false, message: 'PIN inválido ou expirado. Gere um novo código na agenda.' });
      }

      const item = registros[0];
      let meta = {};
      try { meta = JSON.parse(item.cr4a1_templatelistas || '{}'); } catch {}

      // Limpa o registro no Dataverse para que o PIN não seja reutilizado
      axios.delete(`${envUrl}/api/data/v9.2/cr4a1_quadros(${item.cr4a1_quadroid})`, { headers: authHeaders }).catch(() => {});

      if (meta.expiresAt && Date.now() > meta.expiresAt) {
        return res.status(401).json({ success: false, message: 'PIN expirado. Gere um novo código na agenda.' });
      }

      const token = 'kw_' + crypto.randomUUID();
      return res.status(200).json({
        success: true,
        username: meta.user || item.cr4a1_criador_login,
        displayName: meta.displayName || meta.user || item.cr4a1_criador_login,
        role: meta.role || 'COMUM',
        token
      });
    }

    // ==========================================
    // 3. LOGIN DIRETO USUÁRIO/SENHA (FALLBACK NO RELÓGIO)
    // ==========================================
    if (action === 'login-direct') {
      const { username, password } = req.body || {};
      if (!username || !password) return res.status(400).json({ success: false, message: 'Usuário e senha obrigatórios.' });

      const filtro = encodeURIComponent(`cr4a1_username eq '${username}' and cr4a1_password eq '${password}'`);
      const buscaRes = await axios.get(`${envUrl}/api/data/v9.2/cr4a1_usuarios_agendas?$filter=${filtro}`, { headers: authHeaders });
      const usuarios = buscaRes.data.value || [];

      if (usuarios.length !== 1) {
        return res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
      }

      const u = usuarios[0];
      const token = 'kw_' + crypto.randomUUID();
      return res.status(200).json({
        success: true,
        username: u.cr4a1_username,
        displayName: u.cr4a1_nome_exibicao || u.cr4a1_username,
        role: u.cr4a1_role || 'COMUM',
        token
      });
    }

    // ==========================================
    // 4. FICHAS DO TRELLO (MINHAS FICHAS PARA O RELÓGIO)
    // ==========================================
    if (action === 'fichas') {
      const user = (req.query.user || req.body?.user || '').trim();
      if (!user) return res.status(400).json({ error: 'Usuário obrigatório.' });
      const userLower = user.toLowerCase();

      // Busca fichas e filtra estritamente pelo responsável (case-insensitive)
      const fichasRes = await axios.get(`${envUrl}/api/data/v9.2/cr4a1_fichas`, { headers: authHeaders });
      const todasFichas = fichasRes.data.value || [];
      const listaFichas = todasFichas.filter(f => {
        if (!f.cr4a1_responsavel_login) return false;
        return f.cr4a1_responsavel_login.trim().toLowerCase() === userLower;
      });

      const agora = new Date().toISOString();
      const hojeStr = agora.slice(0, 10);

      const formatadas = listaFichas.map(f => {
        const concluida = f.cr4a1_concluida === 'Sim';
        const dataInicio = f.cr4a1_data_inicio || null;
        let urgencia = 'pendente';
        if (concluida) {
          urgencia = 'concluida';
        } else if (dataInicio) {
          if (dataInicio < agora) urgencia = 'atrasada';
          else if (dataInicio.slice(0, 10) === hojeStr) urgencia = 'hoje';
          else urgencia = 'futura';
        }

        const tarefas = extrairTarefasTipTap(f.cr4a1_descricao);
        const descricaoTexto = stripHtml(f.cr4a1_descricao);

        return {
          id: f.cr4a1_fichaid,
          titulo: f.cr4a1_titulo || 'Sem título',
          concluida,
          data: dataInicio,
          urgencia,
          cor: f.cr4a1_cor || null,
          descricao: descricaoTexto,
          tarefas
        };
      });

      // Ordena: pendentes atrasadas/hoje primeiro, depois futuras, concluídas por último
      formatadas.sort((a, b) => {
        if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
        const prioridade = { atrasada: 0, hoje: 1, futura: 2, pendente: 3, concluida: 4 };
        const pA = prioridade[a.urgencia] ?? 3;
        const pB = prioridade[b.urgencia] ?? 3;
        if (pA !== pB) return pA - pB;
        if (a.data && b.data) return a.data.localeCompare(b.data);
        return 0;
      });

      return res.status(200).json({ success: true, fichas: formatadas });
    }

    // ==========================================
    // 5. ALTERNAR STATUS DA FICHA (CONCLUIR/REABRIR NO RELÓGIO)
    // ==========================================
    if (action === 'toggle-ficha') {
      const { id, concluida } = req.body || {};
      if (!id) return res.status(400).json({ error: 'ID da ficha obrigatório.' });

      const novoStatus = concluida ? 'Sim' : 'Não';
      await axios.patch(`${envUrl}/api/data/v9.2/cr4a1_fichas(${id})`, {
        cr4a1_concluida: novoStatus
      }, { headers: authHeaders });

      return res.status(200).json({ success: true, concluida: novoStatus === 'Sim' });
    }

    // ==========================================
    // 6. ALTERNAR TAREFA DA FICHA NO RELÓGIO
    // ==========================================
    if (action === 'toggle-tarefa') {
      const { id, index } = req.body || {};
      if (!id || index === undefined) return res.status(400).json({ error: 'ID e index obrigatórios.' });

      const fichaRes = await axios.get(`${envUrl}/api/data/v9.2/cr4a1_fichas(${id})?$select=cr4a1_descricao,cr4a1_concluida`, { headers: authHeaders });
      const ficha = fichaRes.data;
      const novoHtml = alternarTarefaNoHtml(ficha.cr4a1_descricao, Number(index));
      const tarefas = extrairTarefasTipTap(novoHtml);
      const todasConcluidas = tarefas.length > 0 && tarefas.every(t => t.concluida);

      await axios.patch(`${envUrl}/api/data/v9.2/cr4a1_fichas(${id})`, {
        cr4a1_descricao: novoHtml,
        cr4a1_concluida: todasConcluidas ? 'Sim' : 'Não'
      }, { headers: authHeaders });

      return res.status(200).json({ success: true, todasConcluidas });
    }

    // ==========================================
    // 7. NOTAS (MINHAS NOTAS PARA O RELÓGIO)
    // ==========================================
    if (action === 'notas') {
      const user = req.query.user || req.body?.user;
      if (!user) return res.status(400).json({ error: 'Usuário obrigatório.' });

      // Busca notas do Dataverse
      const notasRes = await axios.get(`${envUrl}/api/data/v9.2/cr4a1_notas_kairoses`, { headers: authHeaders });
      const todasNotas = notasRes.data.value || [];

      // Filtra estritamente notas do próprio usuário ou compartilhadas diretamente com ele
      const userLower = (user || '').trim().toLowerCase();
      const acessiveis = todasNotas.filter(n => {
        const autor = (n.cr4a1_user_login || '').trim().toLowerCase();
        if (autor === userLower) return true;
        try {
          const comp = JSON.parse(n.cr4a1_compartilhamento || '{}');
          if (comp[user] || comp[userLower]) return true;
        } catch {}
        return false;
      });

      const formatadas = acessiveis.map(n => {
        let blocos = [];
        try {
          blocos = typeof n.cr4a1_conteudo === 'string' ? JSON.parse(n.cr4a1_conteudo) : (n.cr4a1_conteudo || []);
        } catch {}

        const tarefas = [];
        const textos = [];

        if (Array.isArray(blocos)) {
          blocos.forEach(b => {
            if (b.type === 'todo') {
              tarefas.push({
                id: b.id,
                texto: stripHtml(b.value),
                concluida: !!b.checked
              });
            } else if (b.value) {
              const limpo = stripHtml(b.value);
              if (limpo) textos.push(limpo);
            }
          });
        } else if (typeof n.cr4a1_conteudo === 'string') {
          textos.push(stripHtml(n.cr4a1_conteudo));
        }

        return {
          id: n.cr4a1_notas_kairosid,
          titulo: n.cr4a1_titulo || 'Nota sem título',
          cor: n.cr4a1_cor || '#ffffff',
          fixada: n.cr4a1_fixada === 'Sim',
          autor: n.cr4a1_user_login,
          texto: textos.join('\n\n'),
          tarefas
        };
      });

      // Ordena fixadas primeiro, depois por título
      formatadas.sort((a, b) => {
        if (a.fixada !== b.fixada) return a.fixada ? -1 : 1;
        return a.titulo.localeCompare(b.titulo);
      });

      return res.status(200).json({ success: true, notas: formatadas });
    }

    // ==========================================
    // 8. ALTERNAR TAREFA DENTRO DE UMA NOTA
    // ==========================================
    if (action === 'toggle-nota-tarefa') {
      const { id, blockId } = req.body || {};
      if (!id || !blockId) return res.status(400).json({ error: 'ID e blockId obrigatórios.' });

      const notaRes = await axios.get(`${envUrl}/api/data/v9.2/cr4a1_notas_kairoses(${id})?$select=cr4a1_conteudo`, { headers: authHeaders });
      let blocos = [];
      try {
        blocos = JSON.parse(notaRes.data.cr4a1_conteudo || '[]');
      } catch {}

      if (Array.isArray(blocos)) {
        blocos = blocos.map(b => b.id === blockId ? { ...b, checked: !b.checked } : b);
        await axios.patch(`${envUrl}/api/data/v9.2/cr4a1_notas_kairoses(${id})`, {
          cr4a1_conteudo: JSON.stringify(blocos)
        }, { headers: authHeaders });
      }

      return res.status(200).json({ success: true });
    }

        // ==========================================
    // 10. EVENTOS DA AGENDA / CALENDÁRIO PARA O RELÓGIO
    // ==========================================
    if (action === 'eventos') {
      const user = (req.query.user || req.body?.user || '').trim().toLowerCase();
      if (!user) return res.status(400).json({ error: 'Usuário obrigatório.' });

      const eventosRes = await axios.get(
        `${envUrl}/api/data/v9.2/cr4a1_agenda_kairoses`,
        { headers: authHeaders }
      );
      const todos = eventosRes.data.value || [];

      // Filtra apenas eventos onde o usuário é responsável / participante
      const meusEventos = todos.filter(e => {
        if (!e.cr4a1_user_login) return false;
        const logins = e.cr4a1_user_login.split(',').map(s => s.trim().toLowerCase());
        return logins.includes(user);
      });

      const limitePassado = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const formatados = meusEventos.map(e => {
        let dataInicio = e.cr4a1_data_inicio ? (e.cr4a1_data_inicio.includes('T') ? e.cr4a1_data_inicio.split('T')[0] : e.cr4a1_data_inicio.slice(0, 10)) : null;
        let dataFim = e.cr4a1_data_fim ? (e.cr4a1_data_fim.includes('T') ? e.cr4a1_data_fim.split('T')[0] : e.cr4a1_data_fim.slice(0, 10)) : dataInicio;

        let horaInicio = e.cr4a1_hora_inicio || '';
        let horaFim = e.cr4a1_hora_fim || '';

        // Se dataInicio tiver formato ISO com hora e horaInicio estiver vazia
        if (!horaInicio && e.cr4a1_data_inicio && e.cr4a1_data_inicio.includes('T')) {
          const partes = e.cr4a1_data_inicio.split('T')[1];
          if (partes && partes.length >= 5) {
            horaInicio = partes.slice(0, 5);
          }
        }

        const diaInteiro = Boolean(e.cr4a1_detalhes?.includes('[DIA_INTEIRO]')) || !horaInicio;
        const detalhesLimpo = stripHtml((e.cr4a1_detalhes || '').replace('[DIA_INTEIRO]', '').trim());

        return {
          id: e.cr4a1_agenda_kairosid,
          titulo: e.cr4a1_titulo || 'Sem título',
          tipo: e.cr4a1_tipo || 'Geral',
          dataInicio,
          dataFim,
          horaInicio,
          horaFim,
          diaInteiro,
          cor: e.cr4a1_cor || '#1a73e8',
          detalhes: detalhesLimpo,
          usuario: e.cr4a1_user_login || ''
        };
      }).filter(e => !e.dataInicio || e.dataInicio >= limitePassado);

      // Ordena por data de início ascendente, depois por hora de início
      formatados.sort((a, b) => {
        const dA = a.dataInicio || '';
        const dB = b.dataInicio || '';
        if (dA !== dB) return dA.localeCompare(dB);
        return (a.horaInicio || '').localeCompare(b.horaInicio || '');
      });

      return res.status(200).json({ success: true, eventos: formatados });
    }

    // ==========================================
    // 9. CRIAR NOTA RÁPIDA (ex: DITADO POR VOZ NO RELÓGIO)
    // ==========================================
    if (action === 'criar-nota') {
      const { user, titulo, texto } = req.body || {};
      if (!user || !titulo) return res.status(400).json({ error: 'Usuário e título obrigatórios.' });

      const blocos = texto ? [{ id: crypto.randomUUID(), type: 'text', value: texto }] : [];
      await axios.post(`${envUrl}/api/data/v9.2/cr4a1_notas_kairoses`, {
        cr4a1_titulo: titulo,
        cr4a1_conteudo: JSON.stringify(blocos),
        cr4a1_user_login: user,
        cr4a1_privada: 'Não',
        cr4a1_fixada: 'Não',
        cr4a1_cor: '#ffffff'
      }, { headers: authHeaders });

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: `Ação '${action}' não reconhecida.` });

  } catch (error) {
    console.error('Erro watch-api:', error.response?.data || error.message);
    return res.status(500).json({ error: error.response?.data || error.message });
  }
}
