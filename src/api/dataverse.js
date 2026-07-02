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
      
      if (data && data.value && data.value.length === 1) {
        const user = data.value[0];
        const roleField = 'cr4a1_role'; 

        // DETECTA PRIMEIRO LOGIN: Role está vazia
        if (!user[roleField] || String(user[roleField]).trim() === '' || String(user[roleField]).trim() === 'null') {
          console.log("🚀 Primeiro login detectado! Iniciando configuração da conta...");

          // 1. CAPTURA INFALÍVEL DO ID DO USUÁRIO
          let userId = null;
          
          // Tenta extrair o ID exato pelo link oficial do OData que o Dataverse retorna
          if (user["@odata.editLink"]) {
            const match = user["@odata.editLink"].match(/\(([^)]+)\)/);
            if (match && match[1]) userId = match[1];
          }

          // Fallback: Procura qualquer coluna que seja um GUID válido e termine com 'id'
          if (!userId) {
            const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            for (const key in user) {
              if (key.endsWith('id') && guidRegex.test(user[key])) {
                userId = user[key];
                break;
              }
            }
          }

          if (userId) {
            console.log(`✅ ID do Usuário encontrado: ${userId}`);
            
            // --- ATUALIZA A ROLE PARA COMUM ---
            const updatePayload = { [roleField]: 'COMUM' };
            
            await fetch(`${API_URL}?table=cr4a1_usuarios_agendas&id=${userId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatePayload)
            }).then(res => {
              if (res.ok) console.log("✅ Role 'COMUM' salva com sucesso!");
              else res.text().then(text => console.error("❌ Erro Dataverse (Role):", text));
            }).catch(err => console.error("❌ Erro de rede (Role):", err));

            // --- ADIÇÃO AO CALENDÁRIO COMUM ---
            // ⚠️ COLOQUE AQUI A LÓGICA DO WORKSPACE APÓS ME ENVIAR O CÓDIGO DA UNIDADE
            // Exemplo do que faremos:
            // await addUsuarioAoWorkspace(userId, ID_DO_CALENDARIO_COMUM);
            console.log("⏳ Aguardando lógica do workspace para adicionar ao Calendário Comum...");

          } else {
            console.error("❌ Não foi possível encontrar o ID do usuário. Colunas retornadas:", Object.keys(user));
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
    return data.value || [];
  },

  async createNote(noteData) {
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