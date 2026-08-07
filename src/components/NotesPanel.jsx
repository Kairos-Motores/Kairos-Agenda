import React, { useState } from 'react';

export const NotesPanel = ({ notas = [], addNota, updateNota, deleteNota, currentUser, workspaces = [], activeWorkspaces = [] }) => {
  const [notaAberta, setNotaAberta] = useState(null);

  // 1. LÓGICA DE PRIVACIDADE E WORKSPACE APLICADA AQUI
  const activeNotas = notas.filter(n => {
    // Verifica se pertence aos workspaces selecionados
    const isInWorkspace = activeWorkspaces.includes(n.cr4a1_workspace_id);
    if (!isInWorkspace) return false;

    // Regra de Público vs Pessoal
    const isPrivate = n.cr4a1_private === true || n.cr4a1_private === 'true';
    
    // Assumindo que seu currentUser tenha a propriedade .nome ou .login
    const currentUserName = currentUser?.login || currentUser?.nome || currentUser?.name || '';
    const isAuthor = n.cr4a1_user_login === currentUserName;

    // Se for privada e o usuário logado NÃO for o autor, oculta a nota
    if (isPrivate && !isAuthor) return false;

    return true;
  });

  const openNota = (nota) => {
    setNotaAberta({ ...nota });
  };

  const createNewNota = () => {
    setNotaAberta({
      cr4a1_notas_kairosid: crypto.randomUUID(), // Pré-geramos o GUID na coluna nativa do Dataverse
      isNew: true, // Flag temporária para sabermos no front-end que é uma criação
      cr4a1_titulo: '',
      cr4a1_private: false, 
      cr4a1_workspace_id: activeWorkspaces[0] || '',
      // 2. CARIMBA O AUTOR NA CRIAÇÃO PARA A PRIVACIDADE FUNCIONAR
      cr4a1_user_login: currentUser?.login || currentUser?.nome || currentUser?.name || 'Usuário Atual',
      cr4a1_conteudo: [{ id: crypto.randomUUID(), type: 'text', value: '' }]
    });
  };

  const handleBlockChange = (id, value) => {
    setNotaAberta(prev => ({
      ...prev,
      cr4a1_conteudo: prev.cr4a1_conteudo.map(b => b.id === id ? { ...b, value } : b)
    }));
  };

  const handleTypeChange = (id, type) => {
    setNotaAberta(prev => ({
      ...prev,
      cr4a1_conteudo: prev.cr4a1_conteudo.map(b => b.id === id ? { ...b, type } : b)
    }));
  };

  const addBlock = (type = 'text') => {
    setNotaAberta(prev => ({
      ...prev,
      cr4a1_conteudo: [...(prev.cr4a1_conteudo || []), { id: crypto.randomUUID(), type, value: '' }]
    }));
  };

  const removeBlock = (id) => {
    setNotaAberta(prev => ({
      ...prev,
      cr4a1_conteudo: prev.cr4a1_conteudo.filter(b => b.id !== id)
    }));
  };

  const handleSave = () => {
    const data = {
      // ⚠️ CHAVES ANTIGAS: O seu useCalendar.js procura por elas para transformar em JSON e montar o payload!
      titulo: notaAberta.cr4a1_titulo,
      privado: notaAberta.cr4a1_private,
      private: notaAberta.cr4a1_private,
      workspaceId: notaAberta.cr4a1_workspace_id,
      conteudo: notaAberta.cr4a1_conteudo, // <--- O SEGREDO AQUI (Impede o envio vazio)
      eventoId: notaAberta.cr4a1_evento_id,
      user: notaAberta.cr4a1_user_login, // Ajustado para o nome user_login
      user_login: notaAberta.cr4a1_user_login,

      // ⚠️ CHAVES NOVAS DATAVERSE: Mantidas para caso a API ou o fluxo já use os nomes diretos
      cr4a1_titulo: notaAberta.cr4a1_titulo,
      cr4a1_private: notaAberta.cr4a1_private, 
      cr4a1_workspace_id: notaAberta.cr4a1_workspace_id,
      cr4a1_conteudo: notaAberta.cr4a1_conteudo,
      cr4a1_evento_id: notaAberta.cr4a1_evento_id,
      cr4a1_user_login: notaAberta.cr4a1_user_login
    };

    if (notaAberta.cr4a1_notas_kairosid && !notaAberta.isNew) { 
      // Se já possui a chave nativa e não é nova, executa atualização
      updateNota(notaAberta.cr4a1_notas_kairosid, data); 
    } else {
      // Se for nova, injeta o ID pré-gerado no payload para o Dataverse adotá-lo como chave primária nativa
      data.cr4a1_notas_kairosid = notaAberta.cr4a1_notas_kairosid;
      addNota(data);
    }
    setNotaAberta(null);
  };

  const handleDelete = () => {
    if (notaAberta.cr4a1_notas_kairosid && !notaAberta.isNew) { 
      deleteNota(notaAberta.cr4a1_notas_kairosid);
    }
    setNotaAberta(null);
  };

  // TELA DE EDIÇÃO
  if (notaAberta) {
    return (
      <div style={{ padding: '24px', background: 'var(--bg-primary)', borderRadius: '24px', height: '100%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button onClick={() => setNotaAberta(null)} className="btn-secondary boing-effect" style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>
            Voltar
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            {notaAberta.cr4a1_notas_kairosid && !notaAberta.isNew && ( 
              <button onClick={handleDelete} className="boing-effect" style={{ padding: '8px 16px', borderRadius: '12px', background: '#ffebee', color: '#c62828', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                Excluir
              </button>
            )}
            <button onClick={handleSave} className="boing-effect" style={{ padding: '8px 16px', borderRadius: '12px', background: '#f57c00', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              Salvar Nota
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <input 
            type="text" 
            placeholder="Título da Nota..." 
            value={notaAberta.cr4a1_titulo} 
            onChange={e => setNotaAberta({ ...notaAberta, cr4a1_titulo: e.target.value })}
            style={{ fontSize: '28px', fontWeight: '800', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-title)', width: '60%' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
            <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!notaAberta.cr4a1_private} onChange={e => setNotaAberta({ ...notaAberta, cr4a1_private: e.target.checked })} />
              🔒 Privada
            </label>
            {workspaces.length > 0 && (
              <select 
                value={notaAberta.cr4a1_workspace_id} 
                onChange={e => setNotaAberta({ ...notaAberta, cr4a1_workspace_id: e.target.value })}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px', borderRadius: '8px', fontSize: '12px', outline: 'none' }}
              >
                {workspaces.map(ws => (
                  <option key={ws.cr4a1_calendarios_workspacesid} value={ws.cr4a1_calendarios_workspacesid}>{ws.cr4a1_nome}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* EDITOR NOTION FLEXÍVEL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '300px' }}>
          {(notaAberta.cr4a1_conteudo || []).map((bloco) => (
            <div key={bloco.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              
              <select 
                value={bloco.type} 
                onChange={e => handleTypeChange(bloco.id, e.target.value)}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '12px', padding: '6px', borderRadius: '8px', outline: 'none', cursor: 'pointer', marginTop: '4px' }}
              >
                <option value="text">Texto</option>
                <option value="todo">Tópico</option>
                <option value="heading">H1</option>
              </select>

              {bloco.type === 'heading' ? (
                <input 
                  type="text" 
                  value={bloco.value} 
                  onChange={e => handleBlockChange(bloco.id, e.target.value)}
                  placeholder="Cabeçalho principal..." 
                  style={{ flex: 1, fontSize: '22px', fontWeight: '800', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-title)', padding: '4px 0' }}
                />
              ) : bloco.type === 'todo' ? (
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '8px' }}>
                  <span style={{ color: '#f57c00', fontSize: '18px' }}>•</span>
                  <input 
                    type="text" 
                    value={bloco.value} 
                    onChange={e => handleBlockChange(bloco.id, e.target.value)}
                    placeholder="Listar item..." 
                    style={{ flex: 1, fontSize: '15px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', padding: '4px 0' }}
                  />
                </div>
              ) : (
                <textarea 
                  value={bloco.value} 
                  onChange={e => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                    handleBlockChange(bloco.id, e.target.value);
                  }}
                  placeholder="Escreva um texto..." 
                  style={{ flex: 1, fontSize: '15px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', padding: '6px 0', resize: 'none', overflow: 'hidden', minHeight: '28px', lineHeight: '1.5' }}
                  rows={1}
                />
              )}

              <button onClick={() => removeBlock(bloco.id)} style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', marginTop: '4px' }} title="Remover bloco">
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button type="button" onClick={() => addBlock('text')} style={{ padding: '8px 16px', borderRadius: '12px', border: '1px dashed var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>+ Texto</button>
            <button type="button" onClick={() => addBlock('todo')} style={{ padding: '8px 16px', borderRadius: '12px', border: '1px dashed var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>+ Tópico</button>
            <button type="button" onClick={() => addBlock('heading')} style={{ padding: '8px 16px', borderRadius: '12px', border: '1px dashed var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>+ H1</button>
          </div>
        </div>
      </div>
    );
  }

  // TELA INICIAL: LISTAGEM DE NOTAS
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', padding: '24px', background: 'var(--bg-primary)', borderRadius: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-rounded" style={{ color: '#f57c00' }}>description</span>
          Notas / Hub
        </h2>
        <button onClick={createNewNota} className="boing-effect" style={{ padding: '10px 20px', borderRadius: '12px', background: '#f57c00', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>add</span>
          Nova Nota
        </button>
      </div>

      {activeNotas.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '48px', opacity: 0.5, marginBottom: '16px' }}>speaker_notes_off</span>
          <p>Nenhuma nota encontrada. Crie a sua primeira anotação!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', overflowY: 'auto', paddingBottom: '24px' }}>
          {activeNotas.map(nota => (
            <div 
              key={nota.cr4a1_notas_kairosid} // Alinhado com a chave nativa do Dataverse
              onClick={() => openNota(nota)}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', display: 'flex', flexDirection: 'column', gap: '12px' }}
              className="boing-effect note-card"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h4 style={{ margin: 0, color: 'var(--text-title)', fontSize: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nota.cr4a1_titulo || 'Sem Título'}
                </h4>
                {nota.cr4a1_private && (
                  <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#f57c00' }} title="Nota Privada">lock</span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {nota.cr4a1_conteudo && nota.cr4a1_conteudo.length > 0 ? nota.cr4a1_conteudo.find(b => b.type === 'text' || b.type === 'todo')?.value || '...' : 'Vazio...'}
              </p>
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>person</span>
                {nota.cr4a1_user_login}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};