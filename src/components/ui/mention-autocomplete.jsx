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

  const content = (
    <div
      className={`fixed z-[999999] w-72 rounded-xl border border-border bg-card/95 backdrop-blur-md p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100 ${className}`}
      style={{
        ...(coords ? {
          top: `${Math.min(coords.top, window.innerHeight - 280)}px`,
          left: `${Math.min(coords.left, Math.max(10, window.innerWidth - 300))}px`
        } : {}),
        ...style
      }}
      onMouseDown={(e) => e.preventDefault()} // evita perder foco do editor/input
    >
      <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold tracking-wider text-muted-foreground uppercase border-b border-border/60 mb-1">
        <AtSign className="size-3 text-primary" />
        <span>Mencionar usuário</span>
      </div>

      <div ref={listRef} className="max-h-60 overflow-y-auto flex flex-col gap-0.5">
        {users.map((u, idx) => {
          const isSelected = idx === selectedIndex;
          const displayNome = u.cr4a1_nome_exibicao || u.cr4a1_username;
          const handle = u.cr4a1_username;
          const email = u.cr4a1_email || u.email;

          return (
            <button
              key={u.cr4a1_usuarios_agendaid || handle}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(u);
              }}
              className={`flex items-center gap-2.5 w-full rounded-lg px-2 py-1.5 text-left transition-colors cursor-pointer select-none ${
                isSelected ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'hover:bg-secondary text-foreground'
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

      <div className="mt-1 border-t border-border/60 px-2 pt-1 text-[10px] text-muted-foreground/80 flex items-center justify-between">
        <span>↑↓ navegar</span>
        <span>Enter selecionar</span>
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
  ...props
}, ref) => {
  const innerRef = useRef(null);
  const textareaRef = ref || innerRef;

  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [coords, setCoords] = useState(null);

  const filteredUsers = useMemo(() => {
    return filtrarUsuariosParaMencao(allUsers, mentionQuery);
  }, [allUsers, mentionQuery]);

  const checkMention = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    const cursor = el.selectionStart;
    const textBefore = (el.value || '').slice(0, cursor);
    const match = textBefore.match(/@([a-zA-Z0-9._-]*)$/);

    if (match) {
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
      setMentionOpen(false);
    }
  }, [textareaRef]);

  const selectUser = useCallback((user) => {
    const el = textareaRef.current;
    if (!el || !user) return;

    const cursor = el.selectionStart;
    const text = el.value || '';
    const textBefore = text.slice(0, cursor);
    const textAfter = text.slice(cursor);
    const match = textBefore.match(/@([a-zA-Z0-9._-]*)$/);

    if (match) {
      const matchStart = cursor - match[0].length;
      const insertion = `@${user.cr4a1_username} `;
      const newText = text.slice(0, matchStart) + insertion + textAfter;

      if (onChange) {
        onChange({ target: { value: newText } });
      }

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
      setMentionOpen(false);
    }
  }, [inputRef]);

  const selectUser = useCallback((user) => {
    const el = inputRef.current;
    if (!el || !user) return;

    const cursor = el.selectionStart;
    const text = el.value || '';
    const textBefore = text.slice(0, cursor);
    const textAfter = text.slice(cursor);
    const match = textBefore.match(/@([a-zA-Z0-9._-]*)$/);

    if (match) {
      const matchStart = cursor - match[0].length;
      const insertion = `@${user.cr4a1_username} `;
      const newText = text.slice(0, matchStart) + insertion + textAfter;

      if (onChange) {
        onChange({ target: { value: newText } });
      }

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
