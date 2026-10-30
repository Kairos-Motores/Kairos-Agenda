import { toast } from 'react-hot-toast';
import { htmlParaTexto } from './descricaoTarefas';

const API_MAIL = '/api/mail-send';
const API_PUSH = '/api/push-send';
const API_PROXY = '/api/dataverse-proxy';
const NOTIFICACOES_STORAGE_KEY = 'kairos_notificacoes_recentes';

/**
 * Resolve o usuário e seu e-mail cadastrado na tabela de credenciais (cr4a1_credenciaises).
 */
export const resolverInfoDestinatario = (destinatario, allUsers = []) => {
  if (!destinatario) return { username: '', nomeExibicao: '', email: '' };
  const limpo = String(destinatario).trim().replace(/^@/, '');
  const limpoLower = limpo.toLowerCase();

  // 1. Busca exata por username
  let userObj = allUsers.find(u => (u.cr4a1_username || '').trim().toLowerCase() === limpoLower);

  // 2. Busca por e-mail já associado na tabela de credenciais
  if (!userObj) {
    userObj = allUsers.find(u => (u.cr4a1_email || u.email || '').trim().toLowerCase() === limpoLower);
  }

  // 3. Busca por nome de exibição (priorizando quem possui e-mail cadastrado em cr4a1_credenciaises)
  if (!userObj) {
    const candidatos = allUsers.filter(u => {
      const nome = (u.cr4a1_nome_exibicao || '').trim().toLowerCase();
      return nome === limpoLower || nome.startsWith(limpoLower) || nome.split(' ')[0] === limpoLower;
    });
    userObj = candidatos.find(u => u.cr4a1_email || u.email) || candidatos[0];
  }

  // 4. Busca por prefixo de e-mail (ex: douglas.nou)
  if (!userObj) {
    userObj = allUsers.find(u => {
      const emailPrefix = ((u.cr4a1_email || u.email || '').split('@')[0] || '').toLowerCase();
      return emailPrefix === limpoLower || emailPrefix.replace('.', '') === limpoLower;
    });
  }

  const username = userObj?.cr4a1_username || limpo;
  const nomeExibicao = userObj?.cr4a1_nome_exibicao || username;

  let email = (userObj?.cr4a1_email || userObj?.email || '').trim();
  if (!email) {
    try {
      const cached = JSON.parse(localStorage.getItem('kairos_user_emails') || '{}');
      email = (cached[username.toLowerCase()] || cached[limpoLower] || '').trim();
    } catch (e) { void e; }
  }

  if (!email && limpo.includes('@')) {
    email = limpo;
  }

  return {
    username,
    nomeExibicao,
    email
  };
};

/**
 * Consulta diretamente a tabela cr4a1_credenciaises caso o e-mail ainda não esteja carregado em memória.
 */
export const resolverInfoDestinatarioCredenciais = async (destinatario, allUsers = []) => {
  const info = resolverInfoDestinatario(destinatario, allUsers);
  if (info.email) return info;

  const loginAlvo = (info.username || destinatario || '').trim().replace(/^@/, '').toLowerCase();
  if (!loginAlvo) return info;

  try {
    const query = `table=cr4a1_credenciaises&$select=cr4a1_usu_x00e1_rio,cr4a1_email,cr4a1_title`;
    let res = await fetch(`${API_PROXY}?${query}`).catch(() => null);
    if (!res || !res.ok) {
      res = await fetch(`https://kairosagenda.vercel.app/api/dataverse-proxy?${query}`).catch(() => null);
    }

    if (res && res.ok) {
      const data = await res.json();
      const lista = Array.isArray(data.value) ? data.value : [];

      const cached = {};
      try {
        Object.assign(cached, JSON.parse(localStorage.getItem('kairos_user_emails') || '{}'));
      } catch (e) { void e; }

      let encontrado = null;
      for (const item of lista) {
        const u = (item.cr4a1_usu_x00e1_rio || '').trim().toLowerCase();
        const em = (item.cr4a1_email || '').trim();
        const t = (item.cr4a1_title || '').trim();
        if (u && em) {
          cached[u] = em;
        }
        if (u === loginAlvo && (!encontrado || (!encontrado.email && em))) {
          encontrado = { username: item.cr4a1_usu_x00e1_rio.trim(), nomeExibicao: t || info.nomeExibicao, email: em };
        }
      }

      try {
        localStorage.setItem('kairos_user_emails', JSON.stringify(cached));
      } catch (e) { void e; }

      if (encontrado && encontrado.email) {
        return encontrado;
      }
    }
  } catch (err) {
    console.warn('[resolverInfoDestinatarioCredenciais] Erro ao consultar cr4a1_credenciaises:', err?.message);
  }

  return info;
};

/**
 * Normaliza e extrai menções do tipo @usuario a partir de uma string ou HTML.
 * Valida os handles encontrados contra a lista oficial de usuários do sistema.
 */
export const extrairMencoes = (texto = '', allUsers = []) => {
  if (!texto) return [];
  const limpo = htmlParaTexto(texto);
  const regex = /@([a-zA-Z0-9._-]+)/g;
  const encontrados = new Set();

  const processar = (t) => {
    if (!t) return;
    let match;
    const r = new RegExp(regex);
    while ((match = r.exec(t)) !== null) {
      let handle = match[1];
      handle = handle.replace(/[.,:;!?)]+$/, '').trim();
      if (!handle) continue;
      const info = resolverInfoDestinatario(handle, allUsers);
      if (info.username) {
        encontrados.add(info.username.toLowerCase());
      }
    }
  };

  processar(limpo);
  processar(texto);

  return Array.from(encontrados);
};

/**
 * Extrai um pequeno trecho de texto em volta da menção para contextualizar no e-mail.
 */
export const extrairTrechoMencao = (texto = '', handle = '') => {
  if (!texto || !handle) return '';
  const limpo = htmlParaTexto(texto).replace(/\s+/g, ' ');
  const idx = limpo.toLowerCase().indexOf(`@${handle.toLowerCase()}`);
  if (idx === -1) return limpo.slice(0, 140);
  const inicio = Math.max(0, idx - 40);
  const fim = Math.min(limpo.length, idx + handle.length + 80);
  const prefixo = inicio > 0 ? '...' : '';
  const sufixo = fim < limpo.length ? '...' : '';
  return `${prefixo}${limpo.slice(inicio, fim)}${sufixo}`;
};

/**
 * Armazena notificação localmente para o sininho/centro de notificações do aplicativo
 */
export const salvarNotificacaoNoApp = (notificacao) => {
  try {
    const lista = JSON.parse(localStorage.getItem(NOTIFICACOES_STORAGE_KEY) || '[]');
    const novoItem = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      lida: false,
      ...notificacao
    };
    const atualizada = [novoItem, ...lista].slice(0, 50); // guarda as 50 mais recentes
    localStorage.setItem(NOTIFICACOES_STORAGE_KEY, JSON.stringify(atualizada));
    window.dispatchEvent(new CustomEvent('kairos:nova_notificacao', { detail: novoItem }));
    return novoItem;
  } catch (err) {
    console.error('Erro ao salvar notificação local:', err);
    return null;
  }
};

/**
 * Dispara notificação nativa no dispositivo atual (smartphone, tablet ou notebook) via Service Worker ou Notification API.
 * O uso da mesma `tag` evita duplicidade caso o Web Push remoto também chegue neste mesmo aparelho.
 */
export const dispararNotificacaoDispositivo = async ({ title, body, tag, destinatario }) => {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const loggedUser = (localStorage.getItem('kairos_logged_user') || '').trim().toLowerCase();
    if (destinatario && loggedUser && destinatario.trim().toLowerCase() !== loggedUser) {
      // Se o destinatário é outra pessoa, apenas o Web Push remoto (enviarAlertaPush) notificará os aparelhos dela
      return;
    }

    const options = {
      body,
      icon: '/icon-512.jpg',
      badge: '/favicon.svg',
      vibrate: [200, 100, 200],
      tag: tag || `kairos-${Date.now()}`,
      renotify: true
    };

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, options);
        return;
      }
    }

    new Notification(title, options);
  } catch (err) {
    console.warn('[dispararNotificacaoDispositivo] Aviso:', err?.message);
  }
};

/**
 * Dispara Web Push remoto via API para todos os dispositivos inscritos do usuário (smartphones, tablets e notebooks).
 */
export const enviarAlertaPush = async (payload) => {
  try {
    let res = null;
    let data = null;

    try {
      res = await fetch(API_PUSH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        data = await res.json();
      }
    } catch (localErr) {
      console.warn('[enviarAlertaPush] Falha na rota local, usando produção:', localErr?.message);
    }

    if (!data || !res || !res.ok) {
      const prodRes = await fetch('https://kairosagenda.vercel.app/api/push-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      data = await prodRes.json();
    }

    return data;
  } catch (err) {
    console.warn('Falha ao disparar Web Push para dispositivos:', err?.message);
    return { error: err.message };
  }
};

/**
 * Dispara envio de e-mail via API backend (com fallback automático se em dev/local)
 */
export const enviarAlertaEmail = async (payload) => {
  try {
    let res = null;
    let data = null;

    // 1. Tenta endpoint relativo local/servido pela Vercel
    try {
      res = await fetch(API_MAIL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        data = await res.json();
      }
    } catch (localErr) {
      console.warn('[enviarAlertaEmail] Falha ao enviar via rota local:', localErr?.message);
    }

    // 2. Fallback resiliente para produção (ex: dev local Vite onde localhost:3000 não está ativo)
    if (!data || !res || !res.ok) {
      console.info('[enviarAlertaEmail] Enviando via endpoint oficial de produção...');
      const prodRes = await fetch('https://kairosagenda.vercel.app/api/mail-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      data = await prodRes.json();
    }

    return data;
  } catch (err) {
    console.error('Falha ao disparar alerta de e-mail:', err);
    return { error: err.message };
  }
};

/**
 * LÓGICA 1: Notificar quando alguém for mencionado com "@usuario"
 * Detecta novos usuários mencionados em notas, descrições ou comentários.
 */
export const notificarMencoes = async ({
  textoNovo = '',
  textoAntigo = '',
  origem = 'Item',
  itemTitulo = '',
  autor = '',
  currentUser = '',
  allUsers = [],
  workspace = '',
  lista = ''
}) => {
  const mencoesNovas = extrairMencoes(textoNovo, allUsers);
  const mencoesAntigas = extrairMencoes(textoAntigo, allUsers);

  // Notifica menções que foram ADICIONADAS nesta edição
  let destinatarios = mencoesNovas.filter(m => !mencoesAntigas.includes(m));

  // Se não havia texto antigo ou é primeira inserção, garante menções
  if (destinatarios.length === 0 && mencoesNovas.length > 0 && !textoAntigo) {
    destinatarios = mencoesNovas;
  }

  if (destinatarios.length === 0) return;

  const autorInfo = resolverInfoDestinatario(currentUser, allUsers);
  const autorNome = autorInfo.nomeExibicao || autor || currentUser || 'Kairós Agenda';

  for (const dest of destinatarios) {
    const info = await resolverInfoDestinatarioCredenciais(dest, allUsers);
    const trecho = extrairTrechoMencao(textoNovo, dest);
    const mensagem = `Você foi mencionado por <strong>${autorNome}</strong> em <strong>${itemTitulo}</strong> (${origem}).`;
    const pushTag = `mencao-${info.username}-${itemTitulo}`;
    const pushTitle = `💬 Menção em ${origem}`;
    const pushBody = `${autorNome} mencionou você em "${itemTitulo}"${trecho ? `: "${trecho}"` : ''}`;

    // 1. Salva para o sininho/app
    salvarNotificacaoNoApp({
      destinatario: info.username,
      tipo: 'mencao',
      titulo: `Menção em ${origem}`,
      mensagem: pushBody,
      itemTitulo,
      origem
    });

    // 2. Dispara Push para dispositivos móveis/desktop (smartphones, tablets, notebooks)
    enviarAlertaPush({
      usuarios: [info.username],
      title: pushTitle,
      body: pushBody,
      url: '/',
      tag: pushTag
    });
    dispararNotificacaoDispositivo({
      title: pushTitle,
      body: pushBody,
      tag: pushTag,
      destinatario: info.username
    });

    if (!info.email) {
      toast.error(`O usuário @${info.username} foi notificado no app/dispositivo, mas não possui e-mail na tabela de credenciais.`, { duration: 5000 });
      continue;
    }

    // 3. Dispara envio de e-mail para o endereço cadastrado em cr4a1_credenciaises
    try {
      const resEmail = await enviarAlertaEmail({
        usuarios: [info.username],
        destinatarios: [info.email],
        tipo: 'mencao',
        titulo: `Você foi mencionado em ${origem}: "${itemTitulo}"`,
        mensagem,
        autor: autorNome,
        detalhes: {
          origem,
          itemTitulo,
          workspace,
          lista,
          trecho
        }
      });

      if (resEmail && resEmail.error) {
        console.error('[notificarMencoes] Falha ao enviar e-mail:', resEmail.error);
        toast.error(`Aviso: falha ao enviar e-mail para ${info.email} (${resEmail.error})`, { duration: 5000 });
      } else {
        const emailEnviado = resEmail?.destinatarios?.[0] || info.email;
        toast.success(`Menção enviada para @${info.username} (${emailEnviado})`, { duration: 4500 });
      }
    } catch (err) {
      console.error('[notificarMencoes] Erro inesperado:', err);
      toast.error(`Erro ao disparar e-mail de menção: ${err.message}`, { duration: 4500 });
    }
  }
};

/**
 * LÓGICA 2: Notificar quando um evento estiver próximo de acontecer
 */
export const notificarEventoProximo = async ({
  event,
  diffMin,
  allUsers = []
}) => {
  if (!event || !event.cr4a1_user_login) return;
  const destList = event.cr4a1_user_login.split(',').map(s => s.trim()).filter(Boolean);

  const mensagem = diffMin === 0
    ? `O seu evento <strong>"${event.cr4a1_titulo}"</strong> está começando agora!`
    : `O seu evento <strong>"${event.cr4a1_titulo}"</strong> começará em aproximadamente ${diffMin} minutos.`;

  const pushTitle = `⏰ Lembrete: ${event.cr4a1_titulo}`;
  const pushBody = diffMin === 0
    ? `O evento "${event.cr4a1_titulo}" está começando agora!`
    : `O evento "${event.cr4a1_titulo}" começará em ${diffMin} min.`;

  for (const dest of destList) {
    const info = await resolverInfoDestinatarioCredenciais(dest, allUsers);
    const pushTag = `evento-${event.cr4a1_agenda_kairosid}-${diffMin}`;

    // 1. Salva para o sininho/app
    salvarNotificacaoNoApp({
      destinatario: info.username,
      tipo: 'evento_proximo',
      titulo: 'Lembrete de Evento',
      mensagem: pushBody,
      itemTitulo: event.cr4a1_titulo,
      origem: 'Agenda'
    });

    // 2. Dispara Web Push para smartphones, tablets e notebooks do usuário
    enviarAlertaPush({
      usuarios: [info.username],
      title: pushTitle,
      body: pushBody,
      url: '/',
      tag: pushTag
    });

    if (!info.email) continue;

    // 3. Envia por E-mail cadastrado na tabela de credenciais
    await enviarAlertaEmail({
      usuarios: [info.username],
      destinatarios: [info.email],
      tipo: 'evento_proximo',
      titulo: `Lembrete: "${event.cr4a1_titulo}" em ${diffMin} minutos`,
      mensagem,
      autor: 'Kairós Agenda',
      detalhes: {
        origem: 'Calendário de Eventos',
        itemTitulo: event.cr4a1_titulo,
        dataHora: `${event.cr4a1_hora_inicio || 'Horário marcado'} (${diffMin} min restantes)`
      }
    });
  }
};

/**
 * LÓGICA 3: Notificar quando uma nota, ficha, lista ou evento for compartilhado
 */
export const notificarCompartilhamento = async ({
  tipoItem = 'Item',
  itemTitulo = '',
  autor = '',
  destinatarios = [],
  currentUser = '',
  detalhes = {},
  allUsers = []
}) => {
  const autorInfo = resolverInfoDestinatario(currentUser, allUsers);
  const autorNome = autorInfo.nomeExibicao || autor || currentUser;

  const listaAlvos = destinatarios
    .map(d => String(d).toLowerCase())
    .filter(d => d && d !== (currentUser || '').toLowerCase());

  if (listaAlvos.length === 0) return;

  const titulo = `${autorNome} compartilhou ${tipoItem === 'Nota' ? 'uma nota' : tipoItem === 'Ficha do Trello' ? 'uma ficha' : tipoItem === 'Lista do Trello' ? 'uma lista' : 'um evento'} com você`;
  const mensagem = `<strong>${autorNome}</strong> compartilhou <strong>"${itemTitulo}"</strong> (${tipoItem}) com você no Kairós Agenda.`;
  const pushTitle = `🤝 ${tipoItem} compartilhado(a)`;
  const pushBody = `${autorNome} compartilhou "${itemTitulo}" com você.`;

  for (const dest of listaAlvos) {
    const info = await resolverInfoDestinatarioCredenciais(dest, allUsers);
    const pushTag = `compartilhamento-${info.username}-${itemTitulo}`;

    // 1. Salva para o sininho/app
    salvarNotificacaoNoApp({
      destinatario: info.username,
      tipo: 'compartilhamento',
      titulo: `${tipoItem} Compartilhada`,
      mensagem: pushBody,
      itemTitulo,
      origem: tipoItem
    });

    // 2. Dispara Web Push para todos os dispositivos (smartphones, tablets, notebooks)
    enviarAlertaPush({
      usuarios: [info.username],
      title: pushTitle,
      body: pushBody,
      url: '/',
      tag: pushTag
    });
    dispararNotificacaoDispositivo({
      title: pushTitle,
      body: pushBody,
      tag: pushTag,
      destinatario: info.username
    });

    if (!info.email) continue;

    // 3. Envia por E-mail cadastrado na tabela de credenciais
    const resEmail = await enviarAlertaEmail({
      usuarios: [info.username],
      destinatarios: [info.email],
      tipo: 'compartilhamento',
      titulo,
      mensagem,
      autor: autorNome,
      detalhes: {
        origem: tipoItem,
        itemTitulo,
        ...detalhes
      }
    });

    const emailEnviado = resEmail?.destinatarios?.[0] || info.email;
    toast.success(`Compartilhamento notificado para ${info.nomeExibicao} (${emailEnviado})`, { duration: 3500 });
  }
};

/**
 * LÓGICA 4: Notificar quando alguém for adicionado como co-gerente
 */
export const notificarCoGerencia = async ({
  listaNome = '',
  workspaceNome = '',
  novosGerentes = [],
  autor = '',
  currentUser = '',
  allUsers = []
}) => {
  const autorInfo = resolverInfoDestinatario(currentUser, allUsers);
  const autorNome = autorInfo.nomeExibicao || autor || currentUser;

  const listaAlvos = novosGerentes
    .map(d => String(d).toLowerCase())
    .filter(d => d && d !== (currentUser || '').toLowerCase());

  if (listaAlvos.length === 0) return;

  const titulo = `Você foi adicionado como co-gerente da lista "${listaNome}"`;
  const mensagem = `<strong>${autorNome}</strong> adicionou você como co-gerente da lista <strong>"${listaNome}"</strong> no workspace <strong>"${workspaceNome}"</strong>. Você agora possui permissões totais de gerenciamento sobre esta lista.`;
  const pushTitle = `⭐ Nova Co-Gerência no Trello`;
  const pushBody = `${autorNome} adicionou você como co-gerente da lista "${listaNome}".`;

  for (const dest of listaAlvos) {
    const info = await resolverInfoDestinatarioCredenciais(dest, allUsers);
    const pushTag = `cogerente-${info.username}-${listaNome}`;

    // 1. Salva para o sininho/app
    salvarNotificacaoNoApp({
      destinatario: info.username,
      tipo: 'cogerente',
      titulo: 'Novo Co-Gerente',
      mensagem: pushBody,
      itemTitulo: listaNome,
      origem: 'Trello'
    });

    // 2. Dispara Web Push para todos os dispositivos (smartphones, tablets, notebooks)
    enviarAlertaPush({
      usuarios: [info.username],
      title: pushTitle,
      body: pushBody,
      url: '/',
      tag: pushTag
    });
    dispararNotificacaoDispositivo({
      title: pushTitle,
      body: pushBody,
      tag: pushTag,
      destinatario: info.username
    });

    if (!info.email) continue;

    // 3. Envia por E-mail cadastrado na tabela de credenciais
    const resEmail = await enviarAlertaEmail({
      usuarios: [info.username],
      destinatarios: [info.email],
      tipo: 'cogerente',
      titulo,
      mensagem,
      autor: autorNome,
      detalhes: {
        origem: 'Trello',
        lista: listaNome,
        workspace: workspaceNome
      }
    });

    const emailEnviado = resEmail?.destinatarios?.[0] || info.email;
    toast.success(`Co-gerência notificada para ${info.nomeExibicao} (${emailEnviado})`, { duration: 3500 });
  }
};
