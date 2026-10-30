import { toast } from 'react-hot-toast';
import { htmlParaTexto } from './descricaoTarefas';

const API_MAIL = '/api/mail-send';
const NOTIFICACOES_STORAGE_KEY = 'kairos_notificacoes_recentes';

/**
 * Normaliza e extrai mencões do tipo @usuario a partir de uma string ou HTML.
 * Valida os handles encontrados contra a lista oficial de usuários do sistema.
 */
export const extrairMencoes = (texto = '', allUsers = []) => {
  if (!texto) return [];
  const limpo = htmlParaTexto(texto);
  const regex = /@([a-zA-Z0-9._-]+)/g;
  const encontrados = new Set();
  let match;

  const validUsersSet = new Set(allUsers.map(u => (u.cr4a1_username || '').toLowerCase()).filter(Boolean));

  while ((match = regex.exec(limpo)) !== null) {
    const handle = match[1].toLowerCase();
    // Se a lista de usuários estiver carregada, valida. Se ainda vazia, aceita o handle.
    if (validUsersSet.size === 0 || validUsersSet.has(handle)) {
      encontrados.add(handle);
    }
  }

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
 * Dispara envio de e-mail via API backend
 */
export const enviarAlertaEmail = async (payload) => {
  try {
    const res = await fetch(API_MAIL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
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

  // Notifica apenas menções que foram ADICIONADAS agora (evita spam a cada save)
  const destinatarios = mencoesNovas.filter(m =>
    !mencoesAntigas.includes(m) &&
    m !== (currentUser || '').toLowerCase()
  );

  if (destinatarios.length === 0) return;

  const autorNome = allUsers.find(u => (u.cr4a1_username || '').toLowerCase() === (currentUser || '').toLowerCase())?.cr4a1_nome_exibicao || autor || currentUser;

  for (const dest of destinatarios) {
    const trecho = extrairTrechoMencao(textoNovo, dest);
    const titulo = `${autorNome} mencionou você em ${origem}: "${itemTitulo}"`;
    const mensagem = `Você foi mencionado por <strong>${autorNome}</strong> em <strong>${itemTitulo}</strong> (${origem}).`;

    // 1. Envia por E-mail
    enviarAlertaEmail({
      destinatarios: [dest],
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

    // 2. Salva para o sininho/app
    salvarNotificacaoNoApp({
      destinatario: dest,
      tipo: 'mencao',
      titulo: `Menção em ${origem}`,
      mensagem: `${autorNome} mencionou você em "${itemTitulo}": "${trecho}"`,
      itemTitulo,
      origem
    });
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
  const dest = event.cr4a1_user_login.toLowerCase();
  const titulo = `Evento em ${diffMin === 0 ? 'instantes' : `${diffMin} minutos`}: "${event.cr4a1_titulo}"`;
  const mensagem = diffMin === 0
    ? `O seu evento <strong>"${event.cr4a1_titulo}"</strong> está começando agora!`
    : `O seu evento <strong>"${event.cr4a1_titulo}"</strong> começará em aproximadamente ${diffMin} minutos.`;

  // 1. Envia por E-mail
  enviarAlertaEmail({
    destinatarios: [dest],
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
    destinatario: dest,
    tipo: 'evento_proximo',
    titulo: 'Lembrete de Evento',
    mensagem: `O evento "${event.cr4a1_titulo}" está agendado para ${diffMin === 0 ? 'agora' : `daqui a ${diffMin} min`}.`,
    itemTitulo: event.cr4a1_titulo,
    origem: 'Agenda'
  });
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
  const autorNome = allUsers.find(u => (u.cr4a1_username || '').toLowerCase() === (currentUser || '').toLowerCase())?.cr4a1_nome_exibicao || autor || currentUser;
  const listaAlvos = destinatarios
    .map(d => String(d).toLowerCase())
    .filter(d => d && d !== (currentUser || '').toLowerCase());

  if (listaAlvos.length === 0) return;

  const titulo = `${autorNome} compartilhou ${tipoItem === 'Nota' ? 'uma nota' : tipoItem === 'Ficha do Trello' ? 'uma ficha' : tipoItem === 'Lista do Trello' ? 'uma lista' : 'um evento'} com você`;
  const mensagem = `<strong>${autorNome}</strong> compartilhou <strong>"${itemTitulo}"</strong> (${tipoItem}) com você no Kairós Agenda.`;

  for (const dest of listaAlvos) {
    // 1. Envia por E-mail
    enviarAlertaEmail({
      destinatarios: [dest],
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
      destinatario: dest,
      tipo: 'compartilhamento',
      titulo: `${tipoItem} Compartilhada`,
      mensagem: `${autorNome} compartilhou "${itemTitulo}" com você.`,
      itemTitulo,
      origem: tipoItem
    });
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
  const autorNome = allUsers.find(u => (u.cr4a1_username || '').toLowerCase() === (currentUser || '').toLowerCase())?.cr4a1_nome_exibicao || autor || currentUser;
  const listaAlvos = novosGerentes
    .map(d => String(d).toLowerCase())
    .filter(d => d && d !== (currentUser || '').toLowerCase());

  if (listaAlvos.length === 0) return;

  const titulo = `Você foi adicionado como co-gerente da lista "${listaNome}"`;
  const mensagem = `<strong>${autorNome}</strong> adicionou você como co-gerente da lista <strong>"${listaNome}"</strong> no workspace <strong>"${workspaceNome}"</strong>. Você agora possui permissões totais de gerenciamento sobre esta lista.`;

  for (const dest of listaAlvos) {
    // 1. Envia por E-mail
    enviarAlertaEmail({
      destinatarios: [dest],
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
      destinatario: dest,
      tipo: 'cogerente',
      titulo: 'Novo Co-Gerente',
      mensagem: `Você agora é co-gerente da lista "${listaNome}".`,
      itemTitulo: listaNome,
      origem: 'Trello'
    });
  }
};
