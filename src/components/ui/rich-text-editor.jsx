import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, FontFamily } from '@tiptap/extension-text-style';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Bold, Italic, List, ListOrdered, CheckSquare } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './select';
import { textFonts } from '../../constants/textFonts';

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

export const RichTextEditor = ({ value, onChange, onEditorReady }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily,
      TaskList,
      TaskItemComDados.configure({ nested: true })
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: 'rich-text-content min-h-[120px] px-3 py-2 text-sm text-foreground outline-none' }
    }
  });

  useEffect(() => {
    if (editor && onEditorReady) onEditorReady(editor);
  }, [editor, onEditorReady]);

  if (!editor) return null;

  const aplicarFonte = (fontValue) => {
    if (fontValue === 'padrao') editor.chain().focus().unsetFontFamily().run();
    else editor.chain().focus().setFontFamily(fontValue).run();
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
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};
