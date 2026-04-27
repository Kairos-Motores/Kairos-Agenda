const API_URL = '/api/dataverse-proxy';

export const dataverseApi = {
  async login(username, password) {
    const filter = `cr4a1_username eq '${username}' and cr4a1_password eq '${password}'`;
    
    // A URL leva apenas a tabela. O filtro vai no Header.
    const response = await fetch(`${API_URL}?table=cr4a1_usuarios_agendas`, {
      headers: { 'x-dataverse-filter': filter }
    });
    
    const data = await response.json();
    return data.value && data.value.length > 0;
  },

  async getEvents(username) {
    const filter = `cr4a1_user_login eq '${username}'`;
    
    // A URL leva apenas a tabela. O filtro vai no Header.
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
  }
};