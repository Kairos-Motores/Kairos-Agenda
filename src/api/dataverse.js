const API_URL = '/api/dataverse-proxy';

export const dataverseApi = {
  async login(username, password) {
    try {
      const filter = `cr4a1_username eq '${username}' and cr4a1_password eq '${password}'`;
      
      // A URL leva apenas a tabela. O filtro vai no Header.
      const response = await fetch(`${API_URL}?table=cr4a1_usuarios_agendas`, {
        headers: { 'x-dataverse-filter': filter }
      });
      
      // Verifica se a resposta do servidor foi positiva (status 200-299)
      if (!response.ok) {
        return { success: false, reason: 'connection_error' };
      }

      const data = await response.json();
      
      // Verifica se o array 'value' existe e contém o usuário solicitado
      // Isso impede que qualquer entrada faça login se a API retornar vazio
      const isValid = !!(data && data.value && data.value.length > 0);
      
      return isValid;
    } catch (error) {
      console.error("Erro crítico na autenticação:", error);
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
  }
};