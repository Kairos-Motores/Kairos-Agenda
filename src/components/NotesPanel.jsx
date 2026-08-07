import React, { useState } from 'react';

export const NotesPanel = ({ 
  notes = [], // Array de objetos vindos da tabela cr4a1_notas_kairos
  currentUserLogin, // login do usuário atual
  eventId, // ID do evento/ficha atual
  workspaceId, // ID do workspace atual
  onSaveNote, // Função para salvar no Dataverse
  readOnly = true 
}) => {
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false); // false = pública, true = pessoal

  // Filtra as notas:
  // Mostra as públicas (cr4a1_private === false) E as pessoais SOMENTE se o autor for o usuário logado
  const visibleNotes = notes.filter(note => {
    if (note.cr4a1_private === false || note.cr4a1_private === "false") return true;
    return note.cr4a1_user_login === currentUserLogin;
  });

  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;

    // Constrói o objeto exatamente com as colunas da tabela cr4a1_notas_kairos
    const newNote = {
      cr4a1_id_da_nota: Date.now().toString(), // ID temporário até o Dataverse gerar o oficial
      cr4a1_evento_id: eventId,
      cr4a1_workspace_id: workspaceId,
      cr4a1_titulo: newNoteTitle.trim() || 'Sem título',
      cr4a1_conteudo: newNoteContent,
      cr4a1_user_login: currentUserLogin,
      cr4a1_private: isPrivate
    };

    onSaveNote(newNote); 
    setNewNoteTitle('');
    setNewNoteContent('');
    setIsPrivate(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Área de Visualização (Read-Only) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto' }}>
        {visibleNotes.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', padding: '16px' }}>
            Nenhuma nota visível registrada para esta ficha.
          </p>
        ) : (
          visibleNotes.map(note => {
            const isNotePrivate = note.cr4a1_private === true || note.cr4a1_private === "true";
            
            return (
              <div 
                key={note.cr4a1_id_da_nota} 
                style={{
                  background: isNotePrivate ? '#fef3c7' : 'var(--bg-secondary)',
                  border: `1px solid ${isNotePrivate ? '#fde68a' : 'var(--border-color)'}`,
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ 
                      fontSize: '13px', 
                      fontWeight: '700', 
                      color: isNotePrivate ? '#92400e' : 'var(--text-title)'
                    }}>
                      {note.cr4a1_titulo}
                    </span>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: '600', 
                      color: isNotePrivate ? '#b45309' : 'var(--text-accent)'
                    }}>
                      {note.cr4a1_user_login}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isNotePrivate && (
                      <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#d97706' }} title="Nota Pessoal">
                        lock
                      </span>
                    )}
                  </div>
                </div>
                <p style={{ 
                  margin: 0, 
                  fontSize: '13px', 
                  color: isNotePrivate ? '#92400e' : 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.4'
                }}>
                  {note.cr4a1_conteudo}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Área de Criação (Oculta se readOnly for true) */}
      {!readOnly && (
        <div style={{
          background: 'var(--bg-tertiary)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <input
            type="text"
            value={newNoteTitle}
            onChange={(e) => setNewNoteTitle(e.target.value)}
            placeholder="Título da nota..."
            style={{
              width: '100%', padding: '10px',
              borderRadius: '8px', border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)', color: 'var(--text-primary)',
              fontSize: '13px', fontWeight: '600', outline: 'none'
            }}
          />
          <textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Escreva os detalhes da nota aqui..."
            style={{
              width: '100%', minHeight: '80px', padding: '10px',
              borderRadius: '8px', border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)', color: 'var(--text-primary)',
              fontFamily: 'inherit', fontSize: '13px', resize: 'vertical',
              outline: 'none'
            }}
          />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            
            {/* Toggle Tipo de Nota */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-primary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setIsPrivate(false)}
                style={{
                  background: !isPrivate ? 'var(--text-accent)' : 'transparent',
                  color: !isPrivate ? '#fff' : 'var(--text-secondary)',
                  border: 'none', padding: '6px 12px', borderRadius: '6px',
                  fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Pública
              </button>
              <button
                onClick={() => setIsPrivate(true)}
                style={{
                  background: isPrivate ? '#f59e0b' : 'transparent',
                  color: isPrivate ? '#fff' : 'var(--text-secondary)',
                  border: 'none', padding: '6px 12px', borderRadius: '6px',
                  fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>lock</span>
                Pessoal
              </button>
            </div>

            <button
              onClick={handleAddNote}
              disabled={!newNoteContent.trim()}
              style={{
                background: 'var(--text-accent)', color: '#fff',
                border: 'none', padding: '8px 16px', borderRadius: '8px',
                fontSize: '13px', fontWeight: '700', cursor: newNoteContent.trim() ? 'pointer' : 'not-allowed',
                opacity: newNoteContent.trim() ? 1 : 0.5, transition: 'opacity 0.2s'
              }}
            >
              Salvar Nota
            </button>
          </div>
        </div>
      )}
    </div>
  );
};