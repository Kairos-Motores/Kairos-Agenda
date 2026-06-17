import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const NotesPanel = ({ isOpen, onClose, notes, onSave, onDelete, currentUser, activeWorkspaceId, events }) => {
  const [editingNote, setEditingNote] = useState(null);
  const [search, setSearch] = useState('');

  // Filtra as notas: Mesma workspace ou Privadas do próprio usuário
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const isOwner = n.cr4a1_user_login === currentUser?.cr4a1_username;
      const isSameWorkspace = n.cr4a1_workspace_id === activeWorkspaceId;
      const isPrivate = n.cr4a1_privado === 'true' || n.cr4a1_privado === true;

      const matchesFilter = isPrivate ? isOwner : isSameWorkspace;
      const matchesSearch = n.cr4a1_titulo?.toLowerCase().includes(search.toLowerCase()) || 
                           n.cr4a1_conteudo?.toLowerCase().includes(search.toLowerCase());
      
      return matchesFilter && matchesSearch;
    });
  }, [notes, currentUser, activeWorkspaceId, search]);

  const handleCreateNew = () => {
    setEditingNote({
      cr4a1_titulo: '',
      cr4a1_conteudo: JSON.stringify([{ type: 'text', value: '' }]),
      cr4a1_privado: 'false',
      cr4a1_evento_id: '',
      cr4a1_user_login: currentUser?.cr4a1_username,
      cr4a1_workspace_id: activeWorkspaceId
    });
  };

  const handleSave = () => {
    onSave(editingNote);
    setEditingNote(null);
  };

  if (!isOpen) return null;

  return (
    <div className={`notes-sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <div className="notes-sidebar-content" onClick={e => e.stopPropagation()}>
        <header className="notes-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--text-accent)' }}>sticky_note_2</span>
            <h2 style={{ margin: 0, fontSize: '20px' }}>Notas</h2>
          </div>
          <button onClick={onClose} className="icon-btn boing-effect"><span className="material-symbols-rounded">close</span></button>
        </header>

        {editingNote ? (
          <div className="note-editor view-enter">
            <div className="editor-actions">
              <button onClick={() => setEditingNote(null)} className="btn-secondary boing-effect">Voltar</button>
              <button onClick={handleSave} className="btn-primary boing-effect">Guardar</button>
            </div>

            <input 
              className="note-title-input"
              placeholder="Título (opcional)"
              value={editingNote.cr4a1_titulo}
              onChange={e => setEditingNote({...editingNote, cr4a1_titulo: e.target.value})}
            />

            <div className="notion-editor-mock">
              {/* Aqui simulamos o editor de blocos. 
                  Em uma implementação real, usaríamos Tiptap ou Editor.js */}
              <textarea 
                placeholder="Escreva aqui... Use '-' para tópicos (Simulação Notion)"
                value={typeof editingNote.cr4a1_conteudo === 'string' ? editingNote.cr4a1_conteudo : JSON.stringify(editingNote.cr4a1_conteudo)}
                onChange={e => setEditingNote({...editingNote, cr4a1_conteudo: e.target.value})}
              />
            </div>

            <div className="editor-settings">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={editingNote.cr4a1_privado === 'true'} 
                  onChange={e => setEditingNote({...editingNote, cr4a1_privado: e.target.checked ? 'true' : 'false'})}
                />
                Nota Privada
              </label>
              
              <select 
                value={editingNote.cr4a1_evento_id}
                onChange={e => setEditingNote({...editingNote, cr4a1_evento_id: e.target.value})}
                className="event-linker"
              >
                <option value="">Vincular a um evento...</option>
                {events.map(ev => (
                  <option key={ev.cr4a1_agenda_kairosid} value={ev.cr4a1_agenda_kairosid}>{ev.cr4a1_titulo}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="notes-list-view">
            <div className="notes-search-bar">
              <span className="material-symbols-rounded">search</span>
              <input placeholder="Procurar notas..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <button onClick={handleCreateNew} className="add-note-btn boing-effect">
              <span className="material-symbols-rounded">add</span> Nova Nota
            </button>

            <div className="notes-grid">
              {filteredNotes.map(note => (
                <div key={note.cr4a1_id_da_nota} className="note-card boing-effect" onClick={() => setEditingNote(note)}>
                  <div className="note-card-header">
                    <span className="user-tag">{note.cr4a1_user_login}</span>
                    {note.cr4a1_privado === 'true' && <span className="material-symbols-rounded private-icon">lock</span>}
                  </div>
                  <h3>{note.cr4a1_titulo || 'Sem título'}</h3>
                  <p>{note.cr4a1_conteudo?.substring(0, 80)}...</p>
                  {note.cr4a1_evento_id && (
                    <div className="event-tag">
                      <span className="material-symbols-rounded">event</span> Evento vinculado
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .notes-sidebar-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 5000;
          display: flex; justify-content: flex-end; opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
        }
        .notes-sidebar-overlay.active { opacity: 1; pointer-events: auto; }
        .notes-sidebar-content {
          width: 450px; max-width: 90vw; background: var(--bg-primary); height: 100%;
          transform: translateX(100%); transition: transform 0.5s var(--easing-elastic);
          display: flex; flexDirection: column; padding: 24px; box-shadow: -10px 0 30px rgba(0,0,0,0.1);
        }
        .notes-sidebar-overlay.active .notes-sidebar-content { transform: translateX(0); }
        
        .notes-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .notes-search-bar { 
          display: flex; align-items: center; gap: 8px; background: var(--bg-secondary);
          padding: 10px 16px; borderRadius: 12px; margin-bottom: 16px;
        }
        .notes-search-bar input { border: none; background: transparent; color: var(--text-primary); outline: none; flex: 1; }
        
        .add-note-btn {
          width: 100%; padding: 14px; borderRadius: 12px; border: 1px dashed var(--border-color);
          background: transparent; color: var(--text-accent); cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px; fontWeight: 600; margin-bottom: 20px;
        }
        
        .notes-grid { display: grid; grid-template-columns: 1fr; gap: 12px; overflow-y: auto; }
        .note-card {
          padding: 16px; borderRadius: 16px; border: 1px solid var(--border-color); background: var(--bg-secondary);
          cursor: pointer; transition: all 0.2s ease;
        }
        .note-card:hover { border-color: var(--text-accent); transform: translateY(-2px); }
        .note-card-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .user-tag { font-size: 10px; background: var(--md-primary-container); color: var(--md-on-primary-container); padding: 2px 8px; borderRadius: 4px; fontWeight: 700; }
        .private-icon { fontSize: 14px; color: var(--text-secondary); }
        .event-tag { fontSize: 11px; color: var(--text-accent); display: flex; alignItems: center; gap: 4px; marginTop: 8px; }
        
        .note-title-input {
          width: 100%; fontSize: 24px; fontWeight: 700; border: none; background: transparent;
          color: var(--text-title); outline: none; margin-bottom: 20px;
        }
        .notion-editor-mock textarea {
          width: 100%; min-height: 300px; border: none; background: transparent;
          color: var(--text-primary); fontSize: 16px; line-height: 1.6; outline: none; resize: none;
        }
        .editor-actions { display: flex; justify-content: space-between; margin-bottom: 24px; }
        .editor-settings {
          marginTop: auto; padding-top: 20px; border-top: 1px solid var(--border-color);
          display: flex; flexDirection: column; gap: 12px;
        }
        .checkbox-label { display: flex; align-items: center; gap: 8px; fontSize: 14px; cursor: pointer; }
        .event-linker {
          padding: 10px; borderRadius: 8px; background: var(--bg-secondary); border: 1px solid var(--border-color);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
};