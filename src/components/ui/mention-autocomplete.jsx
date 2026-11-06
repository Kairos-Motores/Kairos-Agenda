import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { AtSign, Check, User } from 'lucide-react';

/**
 * Filtra e classifica usuários compatíveis com a query digitada após o '@'
 */
export const filtrarUsuariosParaMencao = (allUsers = [], query = '') => {
  const limpo = (query || '').trim().toLowerCase();
  if (!allUsers || allUsers.length === 0) return [];

  if (!limpo) {
    // Sem query: retorna os primeiros 8 usuários com nome válido
    return allUsers.slice(0, 8);
  }

  return allUsers
    .filter(u => {
      const username = (u.cr4a1_username || '').toLowerCase();
      const nome = (u.cr4a1_nome_exibicao || '').toLowerCase();
      const email = (u.cr4a1_email || u.email || '').toLowerCase();
      return username.includes(limpo) || nome.includes(limpo) || email.includes(limpo);
    })
    .slice(0, 8);
};

/**
 * Avatar compacto para os itens da lista de sugestões
 */
export const UserMentionAvatar = ({ user, size = 26 }) => {
  if (user?.cr4a1_foto) {
    return (
      <img
        src={user.cr4a1_foto}
        alt={user.cr4a1_nome_exibicao || user.cr4a1_username}
        className="rounded-full object-cover shrink-0 border border-border"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    );
  }

  const letra = (user?.cr4a1_nome_exibicao || user?.cr4a1_username || '?')[0].toUpperCase();
  const bgCor = user?.cr4a1_cor || '#3498db';

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-xs"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: bgCor,
        fontSize: `${Math.round(size * 0.45)}px`
      }}
    >
      {letra}
    </div>
  );
};

/**
 * Menu suspenso flutuante com a lista de usuários sugeridos
 */
export const MentionSuggestionsMenu = ({
  users = [],
  selectedIndex = 0,
  onSelect,
  coords = null, // { top, left, bottom }
  className = '',
  style = {}
}) => {
  const listRef = useRef(null);

  // Auto-scroll para manter o item selecionado visível
  useEffect(() => {
    if (listRef.current) {
      const activeItem = listRef.current.children[selectedIndex];
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!users || users.length === 0) return null;

  const menuWidth = typeof window !== 'undefined' ? Math.min(288, window.innerWidth - 16) : 288;
  const clampedTop = coords && typeof window !== 'undefined'
    ? Math.max(8, Math.min(coords.top, window.innerHeight - 260))
    : undefined;
  const clampedLeft = coords && typeof window !== 'undefined'
    ? Math.max(8, Math.min(coords.left, window.innerWidth - menuWidth - 8))
    : undefined;

  const content = (
    <div
      data-mention-menu="true"
      className={`fixed z-[10000010] w-72 max-w-[calc(100vw-1rem)] pointer-events-auto rounded-xl border border-border bg-card/95 backdrop-blur-md p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100 ${className}`}
      style={{
        pointerEvents: 'auto',
        ...(coords ? {
          top: `${clampedTop}px`,
          left: `${clampedLeft}px`
        } : {}),
        ...style
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold tracking-wider text-muted-foreground uppercase border-b border-border/60 mb-1">
        <AtSign className="size-3 text-primary" />
        <span>Mencionar usuário</span>
      </div>

      <div ref={listRef} className="max-h-56 overflow-y-auto overscroll-contain flex flex-col gap-0.5 touch-pan-y">
        {users.map((u, idx) => {
          const isSelected = idx === selectedIndex;
          const displayNome = u.cr4a1_nome_exibicao || u.cr4a1_username;
          const handle = u.cr4a1_username;
          const email = u.cr4a1_email || u.email;

          return (
            <button
              key={u.cr4a1_usuarios_agendaid || handle}
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(u);
              }}
              className={`flex items-center gap-2.5 w-full rounded-lg px-2 py-2 sm:py-1.5 text-left transition-colors cursor-pointer select-none pointer-events-auto ${
                isSelected ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'hover:bg-secondary active:bg-secondary text-foreground'
              }`}
            >
              <UserMentionAvatar user={u} size={28} />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate text-xs leading-snug">{displayNome}</span>
                <span className={`truncate text-[10px] ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  @{handle} {email ? `• ${email}` : ''}
                </span>
              </div>
              {isSelected && <Check className="size-3.5 shrink-0 opacity-90" />}
            </button>
          );
        })}
      </div>

      <div className="mt-1 border-t border-border/60 px-2 pt-1 text-[10px] text-muted-foreground/80 hidden sm:flex items-center justify-between">
        <span>↑↓ navegar</span>
        <span>Enter ou clique</span>
        <span>Esc fechar</span>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? ReactDOM.createPortal(content, document.body) : null;
};

/**
 * Componente Textarea com suporte nativo a autocomplete de @menções
 */
export const MentionTextarea = React.forwardRef(({
  allUsers = [],
  value = '',
  onChange,
  onKeyDown,
  className = '',
  autoResize = false,
  ...props
}, ref) => {
  const innerRef = useRef(null);
  const textareaRef = ref || innerRef;

  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [coords, setCoords] = useState(null);
  const lastMatchRef = useRef(null);

  const filteredUsers = useMemo(() => {
    return filtrarUsuariosParaMencao(allUsers, mentionQuery);
  }, [allUsers, mentionQuery]);

  const adjustHeight = useCallback(() => {
    if (!autoResize) return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [autoResize, textareaRef]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const checkMention = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    const cursor = el.selectionStart;
    const textBefore = (el.value || '').slice(0, cursor);
    const match = textBefore.match(/@([a-zA-Z0-9._-]*)$/);

    if (match) {
      lastMatchRef.current = { start: cursor - match[0].length, end: cursor };
      setMentionQuery(match[1]);
      setSelectedIndex(0);

      // Calcula posição baseada no retângulo do textarea
      const rect = el.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: rect.left,
        bottom: rect.bottom
      });
      setMentionOpen(true);
    } else {
      lastMatchRef.current = null;
      setMentionOpen(false);
    }
  }, [textareaRef]);

  const selectUser = useCallback((user) => {
    const el = textareaRef.current;
    if (!el || !user) return;

    const text = el.value || '';
    const cursor = typeof el.selectionStart === 'number' ? el.selectionStart : text.length;
    const textBefore = text.slice(0, cursor);
    const match = textBefore.match(/@([a-zA-Z0-9._-]*)$/);

    let matchStart = -1;
    let matchEnd = cursor;
    if (match) {
      matchStart = cursor - match[0].length;
    } else if (lastMatchRef.current) {
      matchStart = lastMatchRef.current.start;
      matchEnd = lastMatchRef.current.end;
    }

    if (matchStart >= 0) {
      const insertion = `@${user.cr4a1_username} `;
      const newText = text.slice(0, matchStart) + insertion + text.slice(matchEnd);

      if (onChange) {
        onChange({ target: { value: newText } });
      }

      lastMatchRef.current = null;
      setMentionOpen(false);

      setTimeout(() => {
        el.focus();
        const newCursor = matchStart + insertion.length;
        el.setSelectionRange(newCursor, newCursor);
      }, 0);
    }
  }, [textareaRef, onChange]);

  const handleKeyDown = (e) => {
    if (mentionOpen && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredUsers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (!e.shiftKey) {
          e.preventDefault();
          selectUser(filteredUsers[selectedIndex]);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionOpen(false);
        return;
      }
    }

    if (onKeyDown) onKeyDown(e);
  };

  return (
    <>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          if (onChange) onChange(e);
          checkMention();
          if (autoResize) adjustHeight();
        }}
        onInput={() => {
          if (autoResize) adjustHeight();
        }}
        onKeyUp={checkMention}
        onClick={checkMention}
        onKeyDown={handleKeyDown}
        className={className}
        {...props}
      />
      {mentionOpen && filteredUsers.length > 0 && (
        <MentionSuggestionsMenu
          users={filteredUsers}
          selectedIndex={selectedIndex}
          onSelect={selectUser}
          coords={coords}
        />
      )}
    </>
  );
});

MentionTextarea.displayName = 'MentionTextarea';

/**
 * Componente Input com suporte nativo a autocomplete de @menções
 */
export const MentionInput = React.forwardRef(({
  allUsers = [],
  value = '',
  onChange,
  onKeyDown,
  className = '',
  ...props
}, ref) => {
  const innerRef = useRef(null);
  const inputRef = ref || innerRef;

  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [coords, setCoords] = useState(null);
  const lastMatchRef = useRef(null);

  const filteredUsers = useMemo(() => {
    return filtrarUsuariosParaMencao(allUsers, mentionQuery);
  }, [allUsers, mentionQuery]);

  const checkMention = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;

    const cursor = el.selectionStart;
    const textBefore = (el.value || '').slice(0, cursor);
    const match = textBefore.match(/@([a-zA-Z0-9._-]*)$/);

    if (match) {
      lastMatchRef.current = { start: cursor - match[0].length, end: cursor };
      setMentionQuery(match[1]);
      setSelectedIndex(0);

      const rect = el.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: rect.left,
        bottom: rect.bottom
      });
      setMentionOpen(true);
    } else {
      lastMatchRef.current = null;
      setMentionOpen(false);
    }
  }, [inputRef]);

  const selectUser = useCallback((user) => {
    const el = inputRef.current;
    if (!el || !user) return;

    const text = el.value || '';
    const cursor = typeof el.selectionStart === 'number' ? el.selectionStart : text.length;
    const textBefore = text.slice(0, cursor);
    const match = textBefore.match(/@([a-zA-Z0-9._-]*)$/);

    let matchStart = -1;
    let matchEnd = cursor;
    if (match) {
      matchStart = cursor - match[0].length;
    } else if (lastMatchRef.current) {
      matchStart = lastMatchRef.current.start;
      matchEnd = lastMatchRef.current.end;
    }

    if (matchStart >= 0) {
      const insertion = `@${user.cr4a1_username} `;
      const newText = text.slice(0, matchStart) + insertion + text.slice(matchEnd);

      if (onChange) {
        onChange({ target: { value: newText } });
      }

      lastMatchRef.current = null;
      setMentionOpen(false);

      setTimeout(() => {
        el.focus();
        const newCursor = matchStart + insertion.length;
        el.setSelectionRange(newCursor, newCursor);
      }, 0);
    }
  }, [inputRef, onChange]);

  const handleKeyDown = (e) => {
    if (mentionOpen && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredUsers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectUser(filteredUsers[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionOpen(false);
        return;
      }
    }

    if (onKeyDown) onKeyDown(e);
  };

  return (
    <>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          if (onChange) onChange(e);
          checkMention();
        }}
        onKeyUp={checkMention}
        onClick={checkMention}
        onKeyDown={handleKeyDown}
        className={className}
        {...props}
      />
      {mentionOpen && filteredUsers.length > 0 && (
        <MentionSuggestionsMenu
          users={filteredUsers}
          selectedIndex={selectedIndex}
          onSelect={selectUser}
          coords={coords}
        />
      )}
    </>
  );
});

MentionInput.displayName = 'MentionInput';
