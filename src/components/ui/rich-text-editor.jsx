import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, FontFamily } from '@tiptap/extension-text-style';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Highlight } from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extensions';
import { Bold, Italic, List, ListOrdered, CheckSquare, Highlighter, Ban } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './select';
import { Popover, PopoverTrigger, PopoverContent } from './popover';
import { textFonts } from '../../constants/textFonts';
import { themeColors } from '../../constants/materialColors';
import { filtrarUsuariosParaMencao, MentionSuggestionsMenu } from './mention-autocomplete';

// Marca-texto aplicado em opacidade reduzida (não na cor cheia) — assim a paleta inteira do
// tema (claras e escuras) continua legível por cima, sem precisar restringir as opções a só
// tons pastel nem trocar a cor da fonte conforme a marcação escolhida.
const hexParaRgba = (hex, alpha) => {
  const limpo = hex.replace('#', '');
  const r = parseInt(limpo.substring(0, 2), 16);
  const g = parseInt(limpo.substring(2, 4), 16);
  const b = parseInt(limpo.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const HighlightSuave = Highlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      color: {
        default: null,
        parseHTML: element => element.getAttribute('data-color') || element.style.backgroundColor || null,
        renderHTML: attributes => (attributes.color
          ? { 'data-color': attributes.color, style: `background-color: ${hexParaRgba(attributes.color, 0.45)}` }
          : {})
      }
    };
  }
}).configure({ multicolor: true });

// Microtarefas (checklist) ganham dois atributos extras além do texto/"concluída" que o TipTap
// já suporta nativamente: data de vencimento e responsável. Precisam entrar no schema do nó
// (não só existir como atributo cru no HTML), senão qualquer edição de texto reescreve o HTML
// a partir do estado interno do editor e perde os dois atributos na hora.
const TaskItemComDados = TaskItem.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      due: {
        default: null,
        parseHTML: element => element.getAttribute('data-due') || null,
        renderHTML: attributes => (attributes.due ? { 'data-due': attributes.due } : {})
      },
      assignee: {
        default: null,
        parseHTML: element => element.getAttribute('data-assignee') || null,
        renderHTML: attributes => (attributes.assignee ? { 'data-assignee': attributes.assignee } : {})
      }
    };
  }
});

// Acha a n-ésima microtarefa do documento (mesma ordem que extrairTarefas usa) e atualiza seus
// atributos através do próprio editor — assim a mudança passa pelo onUpdate normal do TipTap
// (e não se perde na próxima vez que o usuário editar o texto).
export const aplicarAtributoTarefa = (editor, index, atributos) => {
  if (!editor) return;
  let contador = -1;
  let posAlvo = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'taskItem') return;
    contador += 1;
    if (contador === index) posAlvo = pos;
  });
  if (posAlvo === null) return;
  const node = editor.state.doc.nodeAt(posAlvo);
  editor.chain().command(({ tr }) => {
    tr.setNodeMarkup(posAlvo, undefined, { ...node.attrs, ...atributos });
    return true;
  }).run();
};

const ToolbarButton = ({ active, onClick, title, children }) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={`flex size-7 items-center justify-center rounded-md transition-colors ${active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}
  >
    {children}
  </button>
);

export const RichTextEditor = ({
  value,
  onChange,
  onEditorReady,
  editable = true,
  placeholder = '',
  minHeightClass = 'min-h-[120px]',
  allUsers = []
}) => {
  const [marcadorAberto, setMarcadorAberto] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionCoords, setMentionCoords] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredUsers = useMemo(() => {
    return filtrarUsuariosParaMencao(allUsers, mentionQuery);
  }, [allUsers, mentionQuery]);

  const mentionOpenRef = useRef(false);
  mentionOpenRef.current = mentionOpen;
  const filteredUsersRef = useRef([]);
  filteredUsersRef.current = filteredUsers;
  const selectedIndexRef = useRef(0);
  selectedIndexRef.current = selectedIndex;
  const selectUserRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily,
      TaskList,
      TaskItemComDados.configure({ nested: true }),
      HighlightSuave,
      ...(placeholder ? [Placeholder.configure({ placeholder })] : [])
    ],
    content: value || '',
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      checkMention();
    },
    onSelectionUpdate: () => {
      checkMention();
    },
    editorProps: {
      attributes: { class: `rich-text-content ${minHeightClass} px-3 py-2 text-sm text-foreground outline-none` },
      handleKeyDown: (view, event) => {
        if (mentionOpenRef.current && filteredUsersRef.current.length > 0) {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredUsersRef.current.length);
            return true;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredUsersRef.current.length) % filteredUsersRef.current.length);
            return true;
          }
          if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            const user = filteredUsersRef.current[selectedIndexRef.current];
            if (user) selectUserRef.current?.(user);
            return true;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setMentionOpen(false);
            return true;
          }
        }
        return false;
      }
    }
  });

  const selectUser = useCallback((user) => {
    if (!editor || !user) return;
    const { from } = editor.state.selection;
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 50), from, '\n', '\0');
    const match = textBefore.match(/@([a-zA-Z0-9._-]*)$/);
    if (match) {
      const matchStart = from - match[0].length;
      editor.chain().focus().deleteRange({ from: matchStart, to: from }).insertContent(`@${user.cr4a1_username} `).run();
      setMentionOpen(false);
    }
  }, [editor]);
  selectUserRef.current = selectUser;

  const checkMention = useCallback(() => {
    if (!editor || !editor.isEditable) return;
    const { from } = editor.state.selection;
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 50), from, '\n', '\0');
    const match = textBefore.match(/@([a-zA-Z0-9._-]*)$/);

    if (match) {
      setMentionQuery(match[1]);
      setSelectedIndex(0);
      try {
        const coords = editor.view.coordsAtPos(from);
        setMentionCoords({
          top: coords.bottom + 6,
          left: coords.left,
          bottom: coords.bottom
        });
        setMentionOpen(true);
      } catch {
        setMentionOpen(false);
      }
    } else {
      setMentionOpen(false);
    }
  }, [editor]);

  useEffect(() => {
    if (editor && onEditorReady) onEditorReady(editor);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable);
  }, [editor, editable]);

  if (!editor) return null;

  if (!editable) {
    return <EditorContent editor={editor} />;
  }

  const aplicarFonte = (fontValue) => {
    if (fontValue === 'padrao') editor.chain().focus().unsetFontFamily().run();
    else editor.chain().focus().setFontFamily(fontValue).run();
  };

  const marcarTexto = (hex) => {
    editor.chain().focus().setHighlight({ color: hex }).run();
    setMarcadorAberto(false);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-secondary">
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-card p-1.5">
        <Select onValueChange={aplicarFonte}>
          <SelectTrigger className="h-7 w-36 text-xs"><SelectValue placeholder="Fonte" /></SelectTrigger>
          <SelectContent>
            {textFonts.map(f => (
              <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value === 'padrao' ? undefined : f.value }}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton title="Negrito" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="size-3.5" /></ToolbarButton>
        <ToolbarButton title="Itálico" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="size-3.5" /></ToolbarButton>
        <ToolbarButton title="Lista" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="size-3.5" /></ToolbarButton>
        <ToolbarButton title="Lista numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-3.5" /></ToolbarButton>
        <ToolbarButton title="Checklist (microtarefas)" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}><CheckSquare className="size-3.5" /></ToolbarButton>
        <Popover open={marcadorAberto} onOpenChange={setMarcadorAberto}>
          <PopoverTrigger asChild>
            <span>
              <ToolbarButton title="Marcar texto" active={editor.isActive('highlight')} onClick={() => setMarcadorAberto(v => !v)}>
                <Highlighter className="size-3.5" />
              </ToolbarButton>
            </span>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => { editor.chain().focus().unsetHighlight().run(); setMarcadorAberto(false); }}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary"
              >
                <Ban className="size-3.5" /> Remover marcação
              </button>
              <div className="grid max-h-40 grid-cols-10 gap-1.5 overflow-y-auto p-1">
                {themeColors.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => marcarTexto(c.hex)}
                    title={c.label}
                    aria-label={c.label}
                    className="size-5 shrink-0 rounded-full transition-transform active:scale-90"
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <EditorContent editor={editor} />
      {mentionOpen && filteredUsers.length > 0 && (
        <MentionSuggestionsMenu
          users={filteredUsers}
          selectedIndex={selectedIndex}
          onSelect={selectUser}
          coords={mentionCoords}
        />
      )}
    </div>
  );
};
