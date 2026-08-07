import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const NotesPanel = ({ 
  // O JSON em string vindo da coluna cr4a1_novacoluna
  rawNotes = "[]", 
  currentUser, 
  onSaveNote, 
  readOnly = true 
}) => {
  const [newNoteText, setNewNoteText] = useState('');
  const [noteType, setNoteType] = useState('publica'); // publica ou pessoal

  // Parse seguro do JSON
  let notesArray = [];
  try {
    notesArray = typeof rawNotes === 'string' ? JSON.parse(rawNotes) : rawNotes;
    if (!Array.isArray(notesArray)) notesArray = [];
  } catch (e) {
    notesArray = [];
  }

  // Filtra as notas:
  // Mostra todas as públicas do workspace + as pessoais SOMENTE se o autor for o usuário logado
  const visibleNotes = notesArray.filter(note => 
    note.tipo === 'publica' || (note.tipo === 'pessoal' && note.autor === currentUser?.nome)
  );

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;

    const newNote = {
      id: Date.now().toString(),
      texto: newNoteText,
      autor: currentUser?.nome || 'Usuário Desconhecido',
      tipo: noteType,
      data: new Date().toISOString()
    };

    const updatedNotes = [...notesArray, newNote];
    onSaveNote(JSON.stringify(updatedNotes)); // Salva devolvendo na prop
    setNewNoteText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Área de Visualização (Read-Only) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
        {visibleNotes.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', padding: '16px' }}>
            Nenhuma nota visível registrada.
          </p>
        ) : (
          visibleNotes.map(note => (
            <div 
              key={note.id} 
              style={{
                background: note.tipo === 'pessoal' ? '#fef3c7' : 'var(--bg-secondary)',
                border: `1px solid ${note.tipo === 'pessoal' ? '#fde68a' : 'var(--border-color)'}`,
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  color: note.tipo === 'pessoal' ? '#b45309' : 'var(--text-accent)'
                }}>
                  {note.autor}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {note.tipo === 'pessoal' && (
                    <span className="material-symbols-rounded" style={{ fontSize: '14px', color: '#d97706' }}>
                      lock
                    </span>
                  )}
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    {format(new Date(note.data), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
              <p style={{ 
                margin: 0, 
                fontSize: '13px', 
                color: note.tipo === 'pessoal' ? '#92400e' : 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.4'
              }}>
                {note.texto}
              </p>
            </div>
          ))
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
          <textarea
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Adicionar nova nota..."
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
                onClick={() => setNoteType('publica')}
                style={{
                  background: noteType === 'publica' ? 'var(--text-accent)' : 'transparent',
                  color: noteType === 'publica' ? '#fff' : 'var(--text-secondary)',
                  border: 'none', padding: '6px 12px', borderRadius: '6px',
                  fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Pública
              </button>
              <button
                onClick={() => setNoteType('pessoal')}
                style={{
                  background: noteType === 'pessoal' ? '#f59e0b' : 'transparent',
                  color: noteType === 'pessoal' ? '#fff' : 'var(--text-secondary)',
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
              disabled={!newNoteText.trim()}
              style={{
                background: 'var(--text-accent)', color: '#fff',
                border: 'none', padding: '8px 16px', borderRadius: '8px',
                fontSize: '13px', fontWeight: '700', cursor: newNoteText.trim() ? 'pointer' : 'not-allowed',
                opacity: newNoteText.trim() ? 1 : 0.5, transition: 'opacity 0.2s'
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