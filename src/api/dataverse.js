const API_URL = '/api/dataverse-proxy';

export const dataverseApi = {
  async login(username, password) {
    try {
      // Filtro exato: utilizador AND senha
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
      
      // SEGURANÇA: Só entra se encontrar EXATAMENTE 1 utilizador.
      if (data && data.value && data.value.length === 1) {
        const user = data.value[0];
        
        // Nome lógico da coluna de texto da role no seu Dataverse
        const roleField = 'cr4a1_role'; 

        // Se a role estiver vazia, nula ou string 'null'
        if (!user[roleField] || String(user[roleField]).trim() === '' || String(user[roleField]).trim() === 'null') {
          
          // 1. DETEÇÃO DINÂMICA DO ID (Procura a propriedade que guarda a chave primária)
          let userId = null;
          // Expressão regular para validar um ID do tipo GUID (padrão do Dataverse)
          const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          
          for (const key in user) {
            // A chave primária nunca começa por "_" e geralmente termina com "id"
            if (!key.startsWith('_') && key.endsWith('id') && guidRegex.test(user[key])) {
              userId = user[key];
              break;
            }
          }

          if (userId) {
            const updatePayload = { [roleField]: 'COMUM' };
            
            try {
              // Executa o PATCH com o ID correto encontrado automaticamente
              const patchRes = await fetch(`${API_URL}?table=cr4a1_usuarios_agendas&id=${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
              });

              if (!patchRes.ok) {
                const errorDetails = await patchRes.text();
                console.error("❌ ERRO DO DATAVERSE AO ATUALIZAR ROLE:", errorDetails);
              } else {
                console.log("✅ Role 'COMUM' injetada com sucesso na base de dados!");
              }
            } catch (err) {
              console.error("❌ Falha de rede ao registar a role no proxy:", err);
            }
          } else {
             console.error("❌ Não foi possível encontrar a coluna de ID primário no objeto do utilizador.");
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
      delete payload.cr4a1_workspace_id; 
      payload["cr4a1_workspace_id@odata.bind"] = `/cr4a1_calendarios_workspaceses(${workspaceId})`;
    } else {
      delete payload.cr4a1_workspace_id;
    }

    // 2. Transformação do Lookup de Evento
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