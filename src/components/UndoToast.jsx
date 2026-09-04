import React from 'react';
import { Button } from './ui/button';

// Conteúdo de um toast com botão "Desfazer" -- é uma função simples (não um
// componente React "de verdade"), pensada para ser chamada a partir de um
// arquivo .js puro (useCalendar.js) sem precisar de sintaxe JSX lá.
export const renderUndoToast = (message, onUndo) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
    <span>{message}</span>
    <Button onClick={onUndo} variant="ghost" size="sm" className="h-auto px-2 py-1 uppercase tracking-wide text-primary">
      Desfazer
    </Button>
  </div>
);
