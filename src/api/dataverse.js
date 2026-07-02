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

      // Verifica se a coluna de role existe e se está vazia
      // Nome da coluna: ajuste para 'cr4a1_role' ou o nome real da sua tabela
      const roleField = 'cr4a1_role'; // ⚠️ ALTERE SE O NOME FOR DIFERENTE
      if (!user[roleField]) {
        // Atualiza o usuário com a role 'COMUM'
        const updatePayload = { [roleField]: 'COMUM' };
        const updateResponse = await fetch(`${API_URL}?table=cr4a1_usuarios_agendas&id=${user.cr4a1_id_da_agenda}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        });

        if (updateResponse.ok) {
          user[roleField] = 'COMUM'; // Atualiza o objeto local
        } else {
          console.warn('Falha ao atribuir role padrão ao usuário:', await updateResponse.text());
        }
      }

      return user; // Retorna o objeto completo do usuário (já com a role garantida)
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

      // Apontando para a tabela de agendas que você já configurou no topo do arquivo
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