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

      if (!response.ok) return null;

      const data = await response.json();
      if (!data.value || data.value.length !== 1) return null;

      const user = data.value[0];

      // Defina o nome exato da sua coluna de role no Dataverse
      const roleField = 'cr4a1_role'; 
      
      // Verifica se o usuário não possui uma role definida ou se está vazia
      if (!user[roleField] || String(user[roleField]).trim() === '') {
        const updatePayload = { [roleField]: 'COMUM' };
        
        // Identificador primário do usuário (usando a propriedade fornecida)
        const userId = user.cr4a1_id_da_agenda; 
        
        const updateResponse = await fetch(`${API_URL}?table=cr4a1_usuarios_agendas&id=${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        });

        if (updateResponse.ok) {
          // Atualiza o objeto local após confirmar o salvamento no banco
          user[roleField] = 'COMUM'; 
        } else {
          console.warn('Falha ao salvar a role padrão no banco:', await updateResponse.text());
          // Garante que o usuário consiga acessar o sistema nesta sessão mesmo se o PATCH falhar
          user[roleField] = 'COMUM';
        }
      }

      // Retorna o objeto completo do usuário (com a role garantida)
      return user; 
    } catch (error) {
      console.error('Erro na autenticação:', error);
      return null;
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

    // Como a coluna cr4a1_private (Sim/Não) já devolve true/false nativo, 
    // podemos retornar os dados diretos sem precisar mapear conversões de string.
    return data.value || [];
  },

  async createNote(noteData) {
    const payload = { ...noteData };

    // 1. Transformação do Lookup de Workspace
    if (payload.cr4a1_workspace_id) {
      const workspaceId = payload.cr4a1_workspace_id;
      // Deleta a chave antiga em texto simples
      delete payload.cr4a1_workspace_id;

      // Cria a chave nova exigida pelo Dataverse apontando para a tabela no plural
      payload["cr4a1_workspace_id@odata.bind"] = `/cr4a1_calendarios_workspaceses(${workspaceId})`;
    } else {
      // Se for vazio, apaga para não enviar nulo na chave de texto e gerar erro
      delete payload.cr4a1_workspace_id;
    }

    // 2. Transformação do Lookup de Evento (se a nota estiver atrelada a um agendamento)
    if (payload.cr4a1_evento_id) {
      const eventoId = payload.cr4a1_evento_id;
      delete payload.cr4a1_evento_id;

      // Apontando para a tabela de agendas
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

    // Mesma lógica de transformação para atualizações (PATCH)
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

    // Impede o envio do ID como propriedade no corpo da requisição PATCH,
    // o que causaria um bloqueio pelo Dataverse
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