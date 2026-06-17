const API_URL = '/api/dataverse-proxy';

export const dataverseApi = {
  async login(username, password) {
    try {
      // Filtro exato: usuário AND senha
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
      
      // SEGURANÇA: Só retorna true se encontrar EXATAMENTE 1 usuário.
      // Se a senha estiver errada, o Dataverse retorna um array vazio [], e length será 0.
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
    const response = await fetch(`${API_URL}?table=cr4a1_notas_kairos`, {
      headers: { 'x-dataverse-filter': filter }
    });
    const data = await response.json();
    return data.value || [];
  },

  async createNote(noteData) {
    return await fetch(`${API_URL}?table=cr4a1_notas_kairos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData)
    });
  },

  async updateNote(id, noteData) {
    return await fetch(`${API_URL}?table=cr4a1_notas_kairos&id=${id}`, {
      method: 'PATCH', // PATCH para atualização parcial
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData)
    });
  },

  async deleteNote(id) {
    return await fetch(`${API_URL}?table=cr4a1_notas_kairos&id=${id}`, {
      method: 'DELETE'
    });
  }
};