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
 * 3. Chave lógica para tarefas/subtasks: (título normalizado, dia de início, responsável normalizado)
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
    const tituloLimpo = (ev.cr4a1_titulo || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const diaInicio = ev.cr4a1_data_inicio ? String(ev.cr4a1_data_inicio).split('T')[0] : '';
    const responsavelLimpo = (ev.cr4a1_user_login || '').trim().toLowerCase();
    const ehSubtask = Boolean(ev.cr4a1_detalhes && String(ev.cr4a1_detalhes).startsWith('Subtask da checklist'));
    const ehTarefa = tipo === 'Tarefa' || ehSubtask;

    if (ehTarefa && tituloLimpo && diaInicio) {
      // Subtasks de fichas e tarefas da agenda:
      // Se compartilharem o mesmo título normalizado, mesmo dia de início e mesmo responsável,
      // são cópias duplicadas do mesmo item (mesmo que detalhes ou hora tenham variações de sincronização).
      const chaveLogica = `tarefa__${tituloLimpo}__${diaInicio}__${responsavelLimpo}`;
      if (chavesLogicas.has(chaveLogica)) {
        continue; // Descarta a cópia duplicada
      }
      chavesLogicas.add(chaveLogica);
    }

    if (dbId) mapUnicos.set(dbId, ev);
    else mapUnicos.set(eventId || Math.random().toString(), ev);

    if (eventId) chavesEventId.add(eventId);
  }

  return Array.from(mapUnicos.values());
};

