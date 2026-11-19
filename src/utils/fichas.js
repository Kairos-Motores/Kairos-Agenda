import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const API_PROXY = '/api/dataverse-proxy';

// Avisa, dentro do app, as fichas com data que foram atribuídas ao usuário e ainda não
// foram avisadas. Se o push já chegou no dispositivo, o servidor marca a ficha como 'Sim' e
// este aviso não se repete.
export const avisarFichasDoResponsavel = async (user) => {
  if (!user) return;
  try {
    const filtro = encodeURIComponent(`cr4a1_responsavel_login eq '${user}'`);
    const data = await (await fetch(`${API_PROXY}?table=cr4a1_fichas&$filter=${filtro}`)).json();
    const pendentes = (data.value || []).filter(f => f.cr4a1_data_inicio && f.cr4a1_notificado !== 'Sim');
    for (const ficha of pendentes) {
      toast.success(`Nova ficha com data: ${ficha.cr4a1_titulo} (${format(new Date(ficha.cr4a1_data_inicio), 'dd/MM HH:mm')})`, { icon: '📌', duration: 7000 });
      await fetch(`${API_PROXY}?table=cr4a1_fichas&id=${ficha.cr4a1_fichaid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cr4a1_notificado: 'Sim' })
      });
    }
  } catch (error) {
    console.error('Erro ao verificar fichas:', error);
  }
};

/**
 * Deduplica eventos e subtasks com garantia estrita para a Agenda/Calendário.
 * Prioriza:
 * 1. dbId (cr4a1_agenda_kairosid ou id)
 * 2. eventId determinístico (cr4a1_event_id, ex: subtask-xxx, ficha-xxx)
 * 3. Chave lógica para tarefas/subtasks: (tipo, título normalizado, dia de início, responsável normalizado)
 */
export const deduplicarEventosAgenda = (events) => {
  if (!Array.isArray(events)) return [];

  const mapUnicos = new Map();
  const chavesEventId = new Set();
  const chavesLogicas = new Set();

  for (const ev of events) {
    if (!ev) continue;
    const dbId = ev.cr4a1_agenda_kairosid || ev.id;
    const eventId = ev.cr4a1_event_id;

    // Se já incluímos este registro exato pelo ID primário
    if (dbId && mapUnicos.has(dbId)) continue;

    // Se o evento tem um event_id determinístico (ex.: subtask-xxx ou ficha-xxx) e já foi processado
    if (eventId && chavesEventId.has(eventId)) continue;

    // Deduplicação lógica para tarefas/subtasks
    const tipo = ev.cr4a1_tipo || '';
    const tituloLimpo = (ev.cr4a1_titulo || '').trim().toLowerCase();
    const diaInicio = ev.cr4a1_data_inicio ? String(ev.cr4a1_data_inicio).split('T')[0] : '';
    const responsavelLimpo = (ev.cr4a1_user_login || '').trim().toLowerCase();
    const horaInicio = (ev.cr4a1_hora_inicio || '').trim();
    const detalhesLimpo = (ev.cr4a1_detalhes || '').trim().toLowerCase().slice(0, 100);

    const ehSubtask = Boolean(ev.cr4a1_detalhes && String(ev.cr4a1_detalhes).startsWith('Subtask da checklist'));
    const ehTarefa = tipo === 'Tarefa';

    let chaveLogica = null;
    if (ehSubtask && tituloLimpo && diaInicio) {
      // Subtasks de checklists de fichas: deduplica por título, dia, hora, responsável e ficha de origem
      chaveLogica = `subtask__${tituloLimpo}__${diaInicio}__${horaInicio}__${responsavelLimpo}__${detalhesLimpo}`;
      if (chavesLogicas.has(chaveLogica)) {
        continue; // Descarta duplicata
      }
    } else if (ehTarefa && tituloLimpo && diaInicio) {
      // Tarefas normais: só deduplica se o título, data, hora, responsável E detalhes forem idênticos (cópia exata gerada por sincronização repetida)
      chaveLogica = `tarefa__${tituloLimpo}__${diaInicio}__${horaInicio}__${responsavelLimpo}__${detalhesLimpo}`;
      if (chavesLogicas.has(chaveLogica)) {
        continue; // Descarta cópia repetida
      }
    }

    if (dbId) mapUnicos.set(dbId, ev);
    else mapUnicos.set(eventId || Math.random().toString(), ev);

    if (eventId) chavesEventId.add(eventId);
    if (chaveLogica) chavesLogicas.add(chaveLogica);
  }

  return Array.from(mapUnicos.values());
};

