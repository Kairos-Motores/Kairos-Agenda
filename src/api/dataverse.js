const API_URL = '/api/dataverse-proxy';

export const dataverseApi = {
  async login(username, password) {
    try {
      const filter = `cr4a1_username eq '${username}' and cr4a1_password eq '${password}'`;
      const response = await fetch(`${API_URL}?table=cr4a1_usuarios_agendas`, {
        method: 'GET',
        headers: { 
          'x-dataverse-filter': filter,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) return false;
      const data = await response.json();
      return !!(data && data.value && data.value.length === 1);
    } catch (error) {
      console.error("Erro na autenticação:", error);
      return false;
    }
  },

  async getEvents(username) {
    const filter = `cr4a1_user_login eq '${username}'`;
    const response = await fetch(`${API_URL}?table=cr4a1_agenda_kairoses`, {
      headers: { 'x-dataverse-filter': filter }
    });
    const data = await response.json();
    return data.value || [];
  },

  async createEvent(eventData) {
    return await fetch(`${API_URL}?table=cr4a1_agenda_kairoses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });
  },

  async deleteEvent(id) {
    return await fetch(`${API_URL}?table=cr4a1_agenda_kairoses&id=${id}`, {
      method: 'DELETE'
    });
  },

  async getNotes(filter = '') {
    const response = await fetch(`${API_URL}?table=cr4a1_notas_kairoses`, {
      headers: { 'x-dataverse-filter': filter }
    });
    const data = await response.json();
    
    // Converte a string de volta para booleano na UI
    if (data.value) {
      return data.value.map(note => ({
        ...note,
        cr4a1_privado: note.cr4a1_privado === 'true'
      }));
    }
    return [];
  },

  async createNote(noteData) {
    const payload = { ...noteData };

    // 1. FORÇA a conversão do booleano para String antes de viajar para a Microsoft
    if (payload.cr4a1_privado !== undefined) {
      payload.cr4a1_privado = String(payload.cr4a1_privado);
    }

    // 2. Transforma o Lookup de Workspace para o formato @odata.bind
    if (payload.cr4a1_workspace_id) {
      const workspaceId = payload.cr4a1_workspace_id;
      delete payload.cr4a1_workspace_id; 
      payload["cr4a1_workspace_id@odata.bind"] = `/cr4a1_calendarios_workspaceses(${workspaceId})`;
    } else {
      delete payload.cr4a1_workspace_id;
    }

    // 3. Transforma o Lookup de Evento para o formato @odata.bind
    if (payload.cr4a1_evento_id) {
      const eventoId = payload.cr4a1_evento_id;
      delete payload.cr4a1_evento_id;
      payload["cr4a1_evento_id@odata.bind"] = `/cr4a1_agenda_kairoses(${eventoId})`;
    } else {
      delete payload.cr4a1_evento_id;
    }

    return await fetch(`${API_URL}?table=cr4a1_notas_kairoses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  async updateNote(id, noteData) {
    const payload = { ...noteData };
    
    // As mesmas conversões são aplicadas na hora de Editar (PATCH)
    if (payload.cr4a1_privado !== undefined) {
      payload.cr4a1_privado = String(payload.cr4a1_privado);
    }

    if (payload.cr4a1_workspace_id) {
      const workspaceId = payload.cr4a1_workspace_id;
      delete payload.cr4a1_workspace_id;
      payload["cr4a1_workspace_id@odata.bind"] = `/cr4a1_calendarios_workspaceses(${workspaceId})`;
    } else {
      delete payload.cr4a1_workspace_id;
    }

    if (payload.cr4a1_evento_id) {
      const eventoId = payload.cr4a1_evento_id;
      delete payload.cr4a1_evento_id;
      payload["cr4a1_evento_id@odata.bind"] = `/cr4a1_agenda_kairoses(${eventoId})`;
    } else {
      delete payload.cr4a1_evento_id;
    }

    // Limpa a chave primária do corpo para evitar conflitos na atualização
    delete payload.cr4a1_id_da_nota;

    return await fetch(`${API_URL}?table=cr4a1_notas_kairoses&id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  async deleteNote(id) {
    return await fetch(`${API_URL}?table=cr4a1_notas_kairoses&id=${id}`, {
      method: 'DELETE'
    });
  }
};