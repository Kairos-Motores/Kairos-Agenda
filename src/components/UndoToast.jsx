import React from 'react';

// Conteúdo de um toast com botão "Desfazer" -- é uma função simples (não um
// componente React "de verdade"), pensada para ser chamada a partir de um
// arquivo .js puro (useCalendar.js) sem precisar de sintaxe JSX lá.
export const renderUndoToast = (message, onUndo) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
    <span>{message}</span>
    <button
      onClick={onUndo}
      style={{
        background: 'none',
        border: 'none',
        color: 'var(--text-accent)',
        fontWeight: '700',
        fontSize: '13px',
        cursor: 'pointer',
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        padding: '4px 8px',
        borderRadius: '8px'
      }}
    >
      Desfazer
    </button>
  </div>
);
