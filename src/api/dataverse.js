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
      
      // SEGURANÇA: Só entra se encontrar EXATAMENTE 1 usuário.
      if (data && data.value && data.value.length === 1) {
        const user = data.value[0];
        
        // Nome lógico da coluna de texto da role no seu Dataverse
        const roleField = 'cr4a1_role'; 

        // Se a role estiver vazia, nula ou string 'null'
        if (!user[roleField] || String(user[roleField]).trim() === '' || String(user[roleField]).trim() === 'null') {
          
          // O Dataverse injeta a chave primária automaticamente no JSON retornado com o padrão: nome_da_tabela + 'id'
          const userId = user.cr4a1_usuarios_agendasid;

          if (userId) {
            const updatePayload = { [roleField]: 'COMUM' };
            
            // Executa o PATCH silenciosamente para atualizar o banco de dados
            await fetch(`${API_URL}?table=cr4a1_usuarios_agendas&id=${userId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatePayload)
            }).catch(err => console.error("Falha ao registrar a role COMUM no banco:", err));
          }
        }

        return true;
      }
      
      return false;
      
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