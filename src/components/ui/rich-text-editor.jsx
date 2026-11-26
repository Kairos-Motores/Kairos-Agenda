import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, FontFamily } from '@tiptap/extension-text-style';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Highlight } from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extensions';
import { Bold, Italic, List, ListOrdered, CheckSquare, Highlighter, Ban, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
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
      },
      reminder: {
        default: null,
        parseHTML: element => element.getAttribute('data-reminder') || null,
        renderHTML: attributes => (attributes.reminder ? { 'data-reminder': String(attributes.reminder) } : {})
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

const MAX_IMAGENS_EDITOR = 25;
const MAX_HTML_TAMANHO = 950_000;

const renderizarCanvasImagem = (img, maxDim, quality) => {
  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    if (width >= height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  const webp = canvas.toDataURL('image/webp', quality);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', quality);
};

// Comprime imagens coladas/arrastadas mantendo nitidez para prints e textos,
// sem estourar o tamanho das colunas HTML no Dataverse.
const comprimirImagemParaEditor = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Falha ao ler imagem'));
  reader.onload = (event) => {
    const img = new window.Image();
    img.onerror = () => reject(new Error('Formato de imagem inválido'));
    img.onload = () => {
      let dataUrl = renderizarCanvasImagem(img, 1600, 0.82);
      if (dataUrl.length > 220_000) {
        dataUrl = renderizarCanvasImagem(img, 1200, 0.72);
      }
      resolve(dataUrl);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

const contarImagensNoEditor = (editorInstance) => {
  if (!editorInstance) return 0;
  let total = 0;
  editorInstance.state.doc.descendants((node) => {
    if (node.type.name === 'image') total += 1;
  });
  return total;
};

const extrairArquivosImagem = (dataTransfer) => {
  if (!dataTransfer) return [];
  const imagens = [];
  if (dataTransfer.items) {
    for (const item of Array.from(dataTransfer.items)) {
      if (item.kind === 'file' && item.type?.startsWith('image/')) {
        const f = item.getAsFile();
        if (f) imagens.push(f);
      }
    }
  }
  if (imagens.length === 0 && dataTransfer.files) {
    for (const f of Array.from(dataTransfer.files)) {
      if (f.type?.startsWith('image/')) imagens.push(f);
    }
  }
  return imagens;
};

const ToolbarButton = ({ active, onClick, title, children }) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={`flex size-7 shrink-0 items-center justify-center rounded-md transition-colors ${active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
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
  allUsers = [],
  coresRecentes = [],
  onSelectCorRecente
}) => {
  const [marcadorAberto, setMarcadorAberto] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionCoords, setMentionCoords] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [imagemAmpliada, setImagemAmpliada] = useState(null);

  const coresRecentesResolvidas = useMemo(() => {
    if (Array.isArray(coresRecentes) && coresRecentes.length > 0) return coresRecentes;
    if (typeof window !== 'undefined' && Array.isArray(allUsers) && allUsers.length > 0) {
      const logged = (localStorage.getItem('kairos_logged_user') || '').trim().toLowerCase();
      const found = allUsers.find(u => (u.cr4a1_username || '').toLowerCase() === logged);
      if (found?.coresRecentesMarcaTexto?.length) return found.coresRecentesMarcaTexto;
    }
    return [];
  }, [coresRecentes, allUsers]);

  const ultimaCorMarcaTexto = coresRecentesResolvidas[0] || null;

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
  const mentionRangeRef = useRef(null);
  const editorRef = useRef(null);

  const inserirImagensNoEditor = useCallback(async (arquivos, posDestino = null) => {
    const ed = editorRef.current;
    if (!ed || !arquivos?.length) return;

    let qtdAtual = contarImagensNoEditor(ed);
    let htmlTamanhoAtual = ed.getHTML().length;

    for (let i = 0; i < arquivos.length; i += 1) {
      if (qtdAtual >= MAX_IMAGENS_EDITOR) {
        toast.error(`Limite máximo de ${MAX_IMAGENS_EDITOR} imagens por texto atingido.`);
        break;
      }
      try {
        const dataUrl = await comprimirImagemParaEditor(arquivos[i]);
        if (htmlTamanhoAtual + dataUrl.length > MAX_HTML_TAMANHO) {
          toast.error('O texto atingiu o tamanho máximo suportado para imagens.');
          break;
        }
        const chain = ed.chain().focus();
        if (typeof posDestino === 'number' && i === 0) {
          chain.setTextSelection(posDestino);
        }
        chain.setImage({ src: dataUrl }).run();
        qtdAtual += 1;
        htmlTamanhoAtual += dataUrl.length;
      } catch {
        toast.error('Não foi possível processar uma das imagens coladas.');
      }
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily,
      TaskList,
      TaskItemComDados.configure({ nested: true }),
      HighlightSuave,
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto max-h-[420px] rounded-lg border border-border/60 my-2 object-contain cursor-zoom-in transition-opacity hover:opacity-95'
        }
      }),
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
      handlePaste: (view, event) => {
        const imagens = extrairArquivosImagem(event.clipboardData);
        if (imagens.length === 0) return false;
        event.preventDefault();
        inserirImagensNoEditor(imagens);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const imagens = extrairArquivosImagem(event.dataTransfer);
        if (imagens.length === 0) return false;
        event.preventDefault();
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        inserirImagensNoEditor(imagens, coords?.pos ?? null);
        return true;
      },
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
      mentionRangeRef.current = null;
      setMentionOpen(false);
    } else if (mentionRangeRef.current) {
      const { from: savedFrom, to: savedTo } = mentionRangeRef.current;
      editor.chain().focus().deleteRange({ from: savedFrom, to: savedTo }).insertContent(`@${user.cr4a1_username} `).run();
      mentionRangeRef.current = null;
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
      mentionRangeRef.current = { from: from - match[0].length, to: from };
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
      mentionRangeRef.current = null;
      setMentionOpen(false);
    }
  }, [editor]);

  useEffect(() => {
    editorRef.current = editor;
    if (editor && onEditorReady) onEditorReady(editor);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!imagemAmpliada) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setImagemAmpliada(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [imagemAmpliada]);

  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable);
  }, [editor, editable]);

  const handleClickContainer = (e) => {
    const imgEl = e.target?.closest?.('img');
    if (!imgEl?.src) return;
    if (!editable || e.detail >= 2) {
      setImagemAmpliada(imgEl.src);
    }
  };

  const lightbox = imagemAmpliada ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={() => setImagemAmpliada(null)}
    >
      <button
        type="button"
        onClick={() => setImagemAmpliada(null)}
        aria-label="Fechar imagem"
        className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
      >
        <X className="size-5" />
      </button>
      <img
        src={imagemAmpliada}
        alt="Visualização ampliada"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
      />
    </div>
  ) : null;

  if (!editor) return null;

  if (!editable) {
    return (
      <div onClick={handleClickContainer}>
        <EditorContent editor={editor} />
        {lightbox}
      </div>
    );
  }

  const aplicarFonte = (fontValue) => {
    if (fontValue === 'padrao') editor.chain().focus().unsetFontFamily().run();
    else editor.chain().focus().setFontFamily(fontValue).run();
  };

  const marcarTexto = (hex) => {
    editor.chain().focus().setHighlight({ color: hex }).run();
    onSelectCorRecente?.(hex);
    setMarcadorAberto(false);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-secondary">
      <div className="flex items-center gap-1 border-b border-border bg-card p-1.5 overflow-x-auto whitespace-nowrap scrollbar-none sm:flex-wrap">
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
                <span className="relative flex flex-col items-center justify-center">
                  <Highlighter className="size-3.5" />
                  {ultimaCorMarcaTexto && (
                    <span
                      className="mt-0.5 h-1 w-3.5 rounded-full"
                      style={{ backgroundColor: ultimaCorMarcaTexto }}
                    />
                  )}
                </span>
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
              {coresRecentesResolvidas.length > 0 && (
                <div className="flex flex-col gap-1.5 border-b border-border pb-2">
                  <span className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Cores recentes
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 px-1">
                    {coresRecentesResolvidas.map((hex, idx) => {
                      const corInfo = themeColors.find(c => c.hex.toLowerCase() === hex.toLowerCase());
                      const label = corInfo ? `${corInfo.label}${idx === 0 ? ' (Última usada)' : ''}` : hex;
                      return (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => marcarTexto(hex)}
                          title={label}
                          aria-label={label}
                          className="size-5 shrink-0 rounded-full transition-transform hover:scale-110 active:scale-90"
                          style={{
                            backgroundColor: hex,
                            boxShadow: idx === 0 ? `0 0 0 2px var(--card), 0 0 0 3.5px ${hex}` : 'none'
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
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
      <div onClick={handleClickContainer}>
        <EditorContent editor={editor} />
      </div>
      {lightbox}
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
