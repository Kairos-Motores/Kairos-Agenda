import { toast } from 'react-hot-toast';
import { htmlParaTexto } from './descricaoTarefas';

const API_MAIL = '/api/mail-send';
const NOTIFICACOES_STORAGE_KEY = 'kairos_notificacoes_recentes';

/**
 * Resolve o usuário e seu e-mail configurado no perfil ou em cr4a1_credenciaises/localStorage.
 */
export const resolverInfoDestinatario = (destinatario, allUsers = []) => {
  if (!destinatario) return { username: '', nomeExibicao: '', email: '' };
  const limpo = String(destinatario).trim().replace(/^@/, '');
  const limpoLower = limpo.toLowerCase();

  // 1. Busca exata por username
  let userObj = allUsers.find(u => (u.cr4a1_username || '').toLowerCase() === limpoLower);

  // 2. Busca por e-mail já associado
  if (!userObj) {
    userObj = allUsers.find(u => (u.cr4a1_email || u.email || '').toLowerCase() === limpoLower);
  }

  // 3. Busca por nome de exibição (ex: Douglas Nou ou Douglas)
  if (!userObj) {
    userObj = allUsers.find(u => {
      const nome = (u.cr4a1_nome_exibicao || '').toLowerCase();
      return nome === limpoLower || nome.startsWith(limpoLower) || nome.split(' ')[0] === limpoLower;
    });
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

  let email = userObj?.cr4a1_email || userObj?.email;
  if (!email) {
    try {
      const cached = JSON.parse(localStorage.getItem('kairos_user_emails') || '{}');
      email = cached[username.toLowerCase()] || cached[limpoLower];
    } catch (e) { void e; }
  }

  if (!email) {
    const logged = (typeof window !== 'undefined' ? localStorage.getItem('kairos_logged_user') : '') || '';
    if (logged && logged.toLowerCase() === username.toLowerCase()) {
      try {
        const profileEmail = localStorage.getItem('kairos_user_profile_email');
        if (profileEmail) email = profileEmail;
      } catch (e) { void e; }
    }
  }

  // Fallback conhecido para a conta de teste do Douglas
  if (!email && (username.toLowerCase() === 'douglas' || limpoLower === 'douglas' || username.toLowerCase().includes('douglas'))) {
    email = 'dodonou3@gmail.com';
  }

  if (!email) {
    email = limpo.includes('@') ? limpo : `${username}@kairosmotores.com`;
  }

  return {
    username,
    nomeExibicao,
    email
  };
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
    const info = resolverInfoDestinatario(dest, allUsers);
    const trecho = extrairTrechoMencao(textoNovo, dest);
    const titulo = `${autorNome} mencionou você em ${origem}: "${itemTitulo}"`;
    const mensagem = `Você foi mencionado por <strong>${autorNome}</strong> em <strong>${itemTitulo}</strong> (${origem}).`;

    // 1. Salva para o sininho/app
    salvarNotificacaoNoApp({
      destinatario: info.username,
      tipo: 'mencao',
      titulo: `Menção em ${origem}`,
      mensagem: `${autorNome} mencionou você em "${itemTitulo}": "${trecho}"`,
      itemTitulo,
      origem
    });

    // 2. Dispara envio de e-mail com retorno visual imediato
    try {
      const resEmail = await enviarAlertaEmail({
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
        toast.success(`Menção enviada por e-mail para @${info.username} (${info.email})`, { duration: 4500 });
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

  const titulo = `Evento em ${diffMin === 0 ? 'instantes' : `${diffMin} minutos`}: "${event.cr4a1_titulo}"`;
  const mensagem = diffMin === 0
    ? `O seu evento <strong>"${event.cr4a1_titulo}"</strong> está começando agora!`
    : `O seu evento <strong>"${event.cr4a1_titulo}"</strong> começará em aproximadamente ${diffMin} minutos.`;

  for (const dest of destList) {
    const info = resolverInfoDestinatario(dest, allUsers);

    // 1. Envia por E-mail
    enviarAlertaEmail({
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

    // 2. Salva para o sininho/app
    salvarNotificacaoNoApp({
      destinatario: info.username,
      tipo: 'evento_proximo',
      titulo: 'Lembrete de Evento',
      mensagem: `O evento "${event.cr4a1_titulo}" está agendado para ${diffMin === 0 ? 'agora' : `daqui a ${diffMin} min`}.`,
      itemTitulo: event.cr4a1_titulo,
      origem: 'Agenda'
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

  for (const dest of listaAlvos) {
    const info = resolverInfoDestinatario(dest, allUsers);

    // 1. Envia por E-mail
    enviarAlertaEmail({
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

    // 2. Salva para o sininho/app
    salvarNotificacaoNoApp({
      destinatario: info.username,
      tipo: 'compartilhamento',
      titulo: `${tipoItem} Compartilhada`,
      mensagem: `${autorNome} compartilhou "${itemTitulo}" com você.`,
      itemTitulo,
      origem: tipoItem
    });

    toast.success(`Compartilhamento notificado por e-mail para ${info.nomeExibicao} (${info.email})`, { duration: 3500 });
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

  for (const dest of listaAlvos) {
    const info = resolverInfoDestinatario(dest, allUsers);

    // 1. Envia por E-mail
    enviarAlertaEmail({
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

    // 2. Salva para o sininho/app
    salvarNotificacaoNoApp({
      destinatario: info.username,
      tipo: 'cogerente',
      titulo: 'Novo Co-Gerente',
      mensagem: `Você agora é co-gerente da lista "${listaNome}".`,
      itemTitulo: listaNome,
      origem: 'Trello'
    });

    toast.success(`Co-gerência notificada por e-mail para ${info.nomeExibicao} (${info.email})`, { duration: 3500 });
  }
};
