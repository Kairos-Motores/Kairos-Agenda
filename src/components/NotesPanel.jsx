import React, { useState } from 'react';

export const NotesPanel = ({ notas = [], addNota, updateNota, deleteNota, currentUser, workspaces = [], activeWorkspaces = [] }) => {
  const [notaAberta, setNotaAberta] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // NOVO: Controle do modo de leitura vs edição

  // Lógica de Privacidade e Workspace
  const activeNotas = notas.filter(n => {
    // 1. Verifica se pertence aos workspaces selecionados (Restrição de Workspace)
    const isInWorkspace = activeWorkspaces.includes(n.cr4a1_workspace_id);
    if (!isInWorkspace) return false;

    // 2. Regra de Público vs Pessoal
    const isPrivate = n.cr4a1_private === true || n.cr4a1_private === 'true';
    const currentUserName = currentUser?.login || currentUser?.nome || currentUser?.name || '';
    const isAuthor = n.cr4a1_user_login === currentUserName;

    // Se for privada e o usuário logado NÃO for o autor, oculta a nota
    if (isPrivate && !isAuthor) return false;

    return true;
  });

  const openNota = (nota) => {
    setNotaAberta({ ...nota });
    setIsEditing(false); // Abre sempre no modo de leitura primeiro
  };

  const createNewNota = () => {
    setNotaAberta({
      cr4a1_notas_kairosid: crypto.randomUUID(), 
      isNew: true, 
      cr4a1_titulo: '',
      cr4a1_private: false, 
      cr4a1_workspace_id: activeWorkspaces[0] || '',
      cr4a1_user_login: currentUser?.login || currentUser?.nome || currentUser?.name || 'Usuário Atual',
      cr4a1_conteudo: [{ id: crypto.randomUUID(), type: 'text', value: '' }]
    });
    setIsEditing(true); // Abre direto na edição para criar
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
      titulo: notaAberta.cr4a1_titulo,
      privado: notaAberta.cr4a1_private,
      private: notaAberta.cr4a1_private,
      workspaceId: notaAberta.cr4a1_workspace_id,
      conteudo: notaAberta.cr4a1_conteudo, 
      eventoId: notaAberta.cr4a1_evento_id,
      user: notaAberta.cr4a1_user_login, 
      user_login: notaAberta.cr4a1_user_login,

      cr4a1_titulo: notaAberta.cr4a1_titulo,
      cr4a1_private: notaAberta.cr4a1_private, 
      cr4a1_workspace_id: notaAberta.cr4a1_workspace_id,
      cr4a1_conteudo: notaAberta.cr4a1_conteudo,
      cr4a1_evento_id: notaAberta.cr4a1_evento_id,
      cr4a1_user_login: notaAberta.cr4a1_user_login
    };

    if (notaAberta.cr4a1_notas_kairosid && !notaAberta.isNew) { 
      updateNota(notaAberta.cr4a1_notas_kairosid, data); 
    } else {
      data.cr4a1_notas_kairosid = notaAberta.cr4a1_notas_kairosid;
      addNota(data);
    }
    
    // Após salvar, não fecha a nota, apenas volta para o modo leitura
    setNotaAberta(prev => ({ ...prev, isNew: false }));
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (notaAberta.cr4a1_notas_kairosid && !notaAberta.isNew) { 
      deleteNota(notaAberta.cr4a1_notas_kairosid);
    }
    setNotaAberta(null);
  };

  // TELA DE DETALHE DA NOTA (LEITURA OU EDIÇÃO)
  if (notaAberta) {
    const currentWorkspace = workspaces.find(ws => ws.cr4a1_calendarios_workspacesid === notaAberta.cr4a1_workspace_id);

    return (
      <div style={{ padding: '24px', background: 'var(--bg-primary)', borderRadius: '24px', height: '100%', overflowY: 'auto' }}>
        
        {/* CABEÇALHO COM BOTÕES DE AÇÃO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button onClick={() => setNotaAberta(null)} className="btn-secondary boing-effect" style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>arrow_back</span>
            Voltar
          </button>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {isEditing ? (
              <>
                {notaAberta.cr4a1_notas_kairosid && !notaAberta.isNew && ( 
                  <button onClick={handleDelete} className="boing-effect" style={{ padding: '8px 16px', borderRadius: '12px', background: '#ffebee', color: '#c62828', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                    Excluir
                  </button>
                )}
                <button onClick={() => { if (!notaAberta.isNew) setIsEditing(false); }} className="boing-effect" style={{ padding: '8px 16px', borderRadius: '12px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: 'bold' }}>
                  Cancelar
                </button>
                <button onClick={handleSave} className="boing-effect" style={{ padding: '8px 16px', borderRadius: '12px', background: '#f57c00', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                  Salvar Nota
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="boing-effect" style={{ padding: '8px 16px', borderRadius: '12px', background: '#f57c00', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>edit</span>
                Editar Nota
              </button>
            )}
          </div>
        </div>

        {/* ÁREA DO TÍTULO E METADADOS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          
          {isEditing ? (
            <input 
              type="text" 
              placeholder="Título da Nota..." 
              value={notaAberta.cr4a1_titulo} 
              onChange={e => setNotaAberta({ ...notaAberta, cr4a1_titulo: e.target.value })}
              style={{ fontSize: '28px', fontWeight: '800', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-title)', width: '60%' }}
            />
          ) : (
            <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: 'var(--text-title)', width: '60%' }}>
              {notaAberta.cr4a1_titulo || 'Nota sem título'}
            </h1>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
            {isEditing ? (
              <>
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
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {notaAberta.cr4a1_private ? <><span className="material-symbols-rounded" style={{ fontSize: '14px', color: '#f57c00' }}>lock</span> Nota Pessoal</> : <><span className="material-symbols-rounded" style={{ fontSize: '14px' }}>public</span> Nota Pública</>}
                </span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-accent)', padding: '4px 8px', background: 'var(--bg-secondary)', borderRadius: '6px', textTransform: 'uppercase' }}>
                  {currentWorkspace?.cr4a1_nome || 'Sem Setor'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Escrito por {notaAberta.cr4a1_user_login}</span>
              </div>
            )}
          </div>
        </div>

        {/* CORPO DA NOTA (MODO LEITURA VS EDIÇÃO) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '300px' }}>
          
          {/* MODO EDIÇÃO: EDITOR ESTILO NOTION */}
          {isEditing ? (
            <>
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
            </>

          ) : (
            
            /* MODO LEITURA: RENDERIZAÇÃO ESTÁTICA */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 8px' }}>
              {(notaAberta.cr4a1_conteudo || []).length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic' }}>Esta nota está vazia.</p>
              )}
              {(notaAberta.cr4a1_conteudo || []).map((bloco) => {
                if (!bloco.value.trim()) return null; // Ignora blocos vazios na leitura
                
                if (bloco.type === 'heading') {
                  return <h2 key={bloco.id} style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-title)', margin: '8px 0 0 0' }}>{bloco.value}</h2>;
                }
                if (bloco.type === 'todo') {
                  return (
                    <div key={bloco.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#f57c00', fontSize: '18px' }}>•</span>
                      <span style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{bloco.value}</span>
                    </div>
                  );
                }
                return (
                  <p key={bloco.id} style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {bloco.value}
                  </p>
                );
              })}
            </div>
          )}
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
          <p>Nenhuma nota encontrada neste workspace. Crie a sua primeira anotação!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', overflowY: 'auto', paddingBottom: '24px' }}>
          {activeNotas.map(nota => (
            <div 
              key={nota.cr4a1_notas_kairosid} 
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