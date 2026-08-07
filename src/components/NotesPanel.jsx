import React, { useState, useEffect, useRef } from 'react';

// ============================================================================
// COMPONENTE AUXILIAR: Dropdown Material Design 3 (MD3)
// ============================================================================
const MD3Dropdown = ({ value, onChange, options, placeholder, icon, minWidth = '150px' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: 'max-content', minWidth }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="boing-effect"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
          padding: '8px 14px', background: isOpen ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
          border: `1px solid ${isOpen ? 'var(--text-accent)' : 'var(--border-color)'}`,
          borderRadius: '12px', cursor: 'pointer', 
          transition: 'all 0.25s cubic-bezier(0.2, 0, 0, 1)',
          color: isOpen ? 'var(--text-accent)' : 'var(--text-primary)', 
          fontSize: '13px', fontWeight: '600',
          boxShadow: isOpen ? '0 0 0 1px var(--text-accent) inset' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon && <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>{icon}</span>}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <span 
          className="material-symbols-rounded" 
          style={{ 
            fontSize: '20px', 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
            transition: 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)' 
          }}
        >
          arrow_drop_down
        </span>
      </div>

      {isOpen && (
        <div 
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
            background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
            borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: '100%', maxHeight: '240px', overflowY: 'auto',
            display: 'flex', flexDirection: 'column', padding: '6px',
            animation: 'md3-slide-down 0.25s cubic-bezier(0.2, 0, 0, 1) forwards',
            transformOrigin: 'top center'
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic' }}>
              Nenhuma opção disponível
            </div>
          ) : (
            options.map(opt => (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                style={{
                  padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: value === opt.value ? '700' : '500',
                  color: value === opt.value ? 'var(--text-accent)' : 'var(--text-primary)',
                  background: value === opt.value ? 'var(--bg-tertiary)' : 'transparent',
                  transition: 'background 0.15s',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
                onMouseEnter={(e) => { if (value !== opt.value) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                onMouseLeave={(e) => { if (value !== opt.value) e.currentTarget.style.background = 'transparent'; }}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
// ============================================================================


export const NotesPanel = ({ 
  notas = [], 
  eventos = [], 
  addNota, 
  updateNota, 
  deleteNota, 
  currentUser, 
  workspaces = [], 
  activeWorkspaces = [],
  eventId = null 
}) => {
  const [notaAberta, setNotaAberta] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Lógica de Privacidade, Workspace e Filtro de Evento
  const activeNotas = notas.filter(n => {
    if (eventId && n.cr4a1_evento_id !== eventId) return false;
    const isInWorkspace = activeWorkspaces.includes(n.cr4a1_workspace_id);
    if (!isInWorkspace) return false;

    const isPrivate = n.cr4a1_private === true || n.cr4a1_private === 'true';
    const currentUserName = currentUser?.login || currentUser?.nome || currentUser?.name || '';
    const isAuthor = n.cr4a1_user_login === currentUserName;
    if (isPrivate && !isAuthor) return false;

    return true;
  });

  const openNota = (nota) => {
    setNotaAberta({ ...nota, isNew: false }); // Garante que a flag de edição saiba que a nota já existe
    setIsEditing(false); 
  };

  const createNewNota = () => {
    setNotaAberta({
      cr4a1_notas_kairosid: crypto.randomUUID(), 
      isNew: true, 
      cr4a1_titulo: '',
      cr4a1_private: false, 
      cr4a1_workspace_id: activeWorkspaces[0] || '',
      cr4a1_evento_id: eventId || '', 
      cr4a1_user_login: currentUser?.login || currentUser?.nome || currentUser?.name || 'Usuário Atual',
      cr4a1_conteudo: [{ id: crypto.randomUUID(), type: 'text', value: '' }]
    });
    setIsEditing(true); 
  };

  const handleBlockChange = (id, value) => {
    setNotaAberta(prev => ({
      ...prev, cr4a1_conteudo: prev.cr4a1_conteudo.map(b => b.id === id ? { ...b, value } : b)
    }));
  };

  const handleTypeChange = (id, type) => {
    setNotaAberta(prev => ({
      ...prev, cr4a1_conteudo: prev.cr4a1_conteudo.map(b => b.id === id ? { ...b, type } : b)
    }));
  };

  const addBlock = (type = 'text') => {
    setNotaAberta(prev => ({
      ...prev, cr4a1_conteudo: [...(prev.cr4a1_conteudo || []), { id: crypto.randomUUID(), type, value: '' }]
    }));
  };

  const removeBlock = (id) => {
    setNotaAberta(prev => ({
      ...prev, cr4a1_conteudo: prev.cr4a1_conteudo.filter(b => b.id !== id)
    }));
  };

  const handleSave = () => {
    const data = {
      titulo: notaAberta.cr4a1_titulo,
      privado: notaAberta.cr4a1_private,
      private: notaAberta.cr4a1_private,
      workspaceId: notaAberta.cr4a1_workspace_id,
      conteudo: notaAberta.cr4a1_conteudo, 
      eventoId: notaAberta.cr4a1_evento_id || null, 
      user: notaAberta.cr4a1_user_login, 
      user_login: notaAberta.cr4a1_user_login,

      cr4a1_notas_kairosid: notaAberta.cr4a1_notas_kairosid,
      cr4a1_titulo: notaAberta.cr4a1_titulo,
      cr4a1_private: notaAberta.cr4a1_private, 
      cr4a1_workspace_id: notaAberta.cr4a1_workspace_id,
      cr4a1_conteudo: notaAberta.cr4a1_conteudo,
      cr4a1_evento_id: notaAberta.cr4a1_evento_id || null,
      cr4a1_user_login: notaAberta.cr4a1_user_login
    };

    // CORREÇÃO DA EDIÇÃO: Valida se a nota possui ID válido e NÃO é uma nova criação
    if (notaAberta.cr4a1_notas_kairosid && !notaAberta.isNew) { 
      updateNota(notaAberta.cr4a1_notas_kairosid, data); 
    } else {
      addNota(data);
    }
    
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
    
    // CORREÇÃO DA LISTAGEM DE EVENTOS: Se não filtrar estritamente por workspace, traz todos os eventos disponíveis para evitar tela vazia
    const eventosDisponiveis = eventos.length > 0 ? eventos : [];

    const eventoAssociado = eventos.find(ev => ev.cr4a1_agenda_kairosid === notaAberta.cr4a1_evento_id);

    const workspaceOptions = workspaces.map(ws => ({ value: ws.cr4a1_calendarios_workspacesid, label: ws.cr4a1_nome }));
    const eventOptions = [
      { value: '', label: 'Desvincular evento' },
      ...eventosDisponiveis.map(ev => ({ value: ev.cr4a1_agenda_kairosid, label: `🔗 ${ev.cr4a1_titulo || 'Evento sem título'}` }))
    ];
    const blockTypeOptions = [
      { value: 'text', label: 'Texto' },
      { value: 'todo', label: 'Tópico' },
      { value: 'heading', label: 'Cabeçalho' }
    ];

    return (
      <div style={{ padding: '24px', background: 'var(--bg-primary)', borderRadius: '24px', height: '100%', overflowY: 'auto' }}>
        
        <style>{`
          @keyframes md3-slide-down {
            from { opacity: 0; transform: translateY(-10px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

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
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
          
          {isEditing ? (
            <input 
              type="text" 
              placeholder="Título da Nota..." 
              value={notaAberta.cr4a1_titulo} 
              onChange={e => setNotaAberta({ ...notaAberta, cr4a1_titulo: e.target.value })}
              style={{ fontSize: '28px', fontWeight: '800', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-title)', width: '50%' }}
            />
          ) : (
            <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: 'var(--text-title)', width: '50%' }}>
              {notaAberta.cr4a1_titulo || 'Nota sem título'}
            </h1>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end', width: '50%' }}>
            {isEditing ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: notaAberta.cr4a1_private ? '#f57c00' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', transition: 'all 0.2s' }}>
                  <input type="checkbox" checked={!!notaAberta.cr4a1_private} onChange={e => setNotaAberta({ ...notaAberta, cr4a1_private: e.target.checked })} style={{ display: 'none' }} />
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>{notaAberta.cr4a1_private ? 'lock' : 'public'}</span>
                  {notaAberta.cr4a1_private ? 'Nota Privada' : 'Nota Pública'}
                </label>
                
                {workspaces.length > 0 && (
                  <MD3Dropdown
                    value={notaAberta.cr4a1_workspace_id}
                    options={workspaceOptions}
                    placeholder="Selecione o Workspace"
                    icon="domain"
                    onChange={(val) => setNotaAberta({ ...notaAberta, cr4a1_workspace_id: val })}
                  />
                )}

                <MD3Dropdown
                  value={notaAberta.cr4a1_evento_id || ''}
                  options={eventOptions}
                  placeholder="Associar a um Evento"
                  icon="event"
                  minWidth="200px"
                  onChange={(val) => setNotaAberta({ ...notaAberta, cr4a1_evento_id: val })}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {notaAberta.cr4a1_private ? <><span className="material-symbols-rounded" style={{ fontSize: '14px', color: '#f57c00' }}>lock</span> Nota Pessoal</> : <><span className="material-symbols-rounded" style={{ fontSize: '14px' }}>public</span> Nota Pública</>}
                </span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-accent)', padding: '4px 8px', background: 'var(--bg-secondary)', borderRadius: '6px', textTransform: 'uppercase' }}>
                  {currentWorkspace?.cr4a1_nome || 'Sem Setor'}
                </span>
                
                {eventoAssociado && (
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)', padding: '4px 8px', background: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '14px', color: 'var(--text-accent)' }}>link</span>
                    {eventoAssociado.cr4a1_titulo}
                  </span>
                )}
                
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Escrito por {notaAberta.cr4a1_user_login}</span>
              </div>
            )}
          </div>
        </div>

        {/* CORPO DA NOTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '300px' }}>
          
          {isEditing ? (
            <>
              {(notaAberta.cr4a1_conteudo || []).map((bloco) => (
                <div key={bloco.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'var(--bg-primary)', padding: '4px', borderRadius: '12px', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'} onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}>
                  
                  <MD3Dropdown
                    value={bloco.type}
                    options={blockTypeOptions}
                    placeholder="Tipo"
                    minWidth="120px"
                    onChange={(val) => handleTypeChange(bloco.id, val)}
                  />

                  {bloco.type === 'heading' ? (
                    <input 
                      type="text" 
                      value={bloco.value} 
                      onChange={e => handleBlockChange(bloco.id, e.target.value)}
                      placeholder="Cabeçalho principal..." 
                      style={{ flex: 1, fontSize: '22px', fontWeight: '800', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-title)', padding: '8px 0' }}
                    />
                  ) : bloco.type === 'todo' ? (
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '8px' }}>
                      <span style={{ color: '#f57c00', fontSize: '18px' }}>•</span>
                      <input 
                        type="text" 
                        value={bloco.value} 
                        onChange={e => handleBlockChange(bloco.id, e.target.value)}
                        placeholder="Listar item..." 
                        style={{ flex: 1, fontSize: '15px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', padding: '8px 0' }}
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
                      style={{ flex: 1, fontSize: '15px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', padding: '10px 0', resize: 'none', overflow: 'hidden', minHeight: '38px', lineHeight: '1.5' }}
                      rows={1}
                    />
                  )}

                  <button onClick={() => removeBlock(bloco.id)} className="boing-effect" style={{ border: 'none', background: '#ffebee', color: '#c62828', borderRadius: '10px', cursor: 'pointer', padding: '8px', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Remover bloco">
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span>
                  </button>
                </div>
              ))}

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button type="button" onClick={() => addBlock('text')} className="boing-effect" style={{ padding: '8px 16px', borderRadius: '12px', border: '1px dashed var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>+ Texto</button>
                <button type="button" onClick={() => addBlock('todo')} className="boing-effect" style={{ padding: '8px 16px', borderRadius: '12px', border: '1px dashed var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>+ Tópico</button>
                <button type="button" onClick={() => addBlock('heading')} className="boing-effect" style={{ padding: '8px 16px', borderRadius: '12px', border: '1px dashed var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>+ Cabeçalho</button>
              </div>
            </>

          ) : (
            
            /* MODO LEITURA */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 8px' }}>
              {(notaAberta.cr4a1_conteudo || []).length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic' }}>Esta nota está vazia.</p>
              )}
              {(notaAberta.cr4a1_conteudo || []).map((bloco) => {
                if (!bloco.value.trim()) return null; 
                
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
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>person</span>
                  {nota.cr4a1_user_login}
                </div>
                {nota.cr4a1_evento_id && (
                  <span className="material-symbols-rounded" style={{ fontSize: '14px', color: 'var(--text-accent)' }} title="Nota associada a um evento">
                    link
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};