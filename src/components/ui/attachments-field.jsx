import { useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Paperclip, X, FileText, Download, File as FileIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import {
  MAX_ANEXO_BYTES, MAX_TOTAL_ANEXOS_BYTES, formatarTamanho,
  lerArquivoComoBase64, somaTamanhos, tipoDoAnexo
} from '../../utils/anexos';

// Lista de anexos com pré-visualização embutida (imagem/PDF abrem num modal dentro do próprio
// app — não precisa abrir outra aba) e aviso claro de limite de tamanho, já que tudo fica
// guardado em base64 numa coluna do Dataverse (sem storage externo).
export const AttachmentsField = ({ anexos = [], onChange, label = 'Anexos', readOnly = false }) => {
  const inputRef = useRef(null);
  const [enviando, setEnviando] = useState(false);
  const [visualizando, setVisualizando] = useState(null);

  const adicionarArquivos = async (files) => {
    setEnviando(true);
    const novosAnexos = [...anexos];
    for (const file of Array.from(files)) {
      if (file.size > MAX_ANEXO_BYTES) {
        toast.error(`"${file.name}" tem ${formatarTamanho(file.size)} — o limite é ${formatarTamanho(MAX_ANEXO_BYTES)} por arquivo.`);
        continue;
      }
      if (somaTamanhos(novosAnexos) + file.size > MAX_TOTAL_ANEXOS_BYTES) {
        toast.error(`Limite total de anexos (${formatarTamanho(MAX_TOTAL_ANEXOS_BYTES)}) atingido — remova algum anexo antes de adicionar "${file.name}".`);
        continue;
      }
      try {
        const base64 = await lerArquivoComoBase64(file);
        novosAnexos.push({ name: file.name, size: file.size, type: file.type, base64 });
      } catch {
        toast.error(`Erro ao ler "${file.name}".`);
      }
    }
    onChange(novosAnexos);
    setEnviando(false);
  };

  const removerAnexo = (idx) => onChange(anexos.filter((_, i) => i !== idx));

  const baixarAnexo = (anexo) => {
    const a = document.createElement('a');
    a.href = anexo.base64;
    a.download = anexo.name;
    a.click();
  };

  if (readOnly && anexos.length === 0) return null;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-primary">{label}</span>
        {!readOnly && (
          <span className="text-[10px] text-muted-foreground">Até {formatarTamanho(MAX_ANEXO_BYTES)} por arquivo, {formatarTamanho(MAX_TOTAL_ANEXOS_BYTES)} no total</span>
        )}
      </div>

      {anexos.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {anexos.map((anexo, idx) => {
            const tipo = tipoDoAnexo(anexo);
            return (
              <div key={idx} className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-sm">
                {tipo === 'imagem' ? (
                  <button type="button" onClick={() => setVisualizando(anexo)} className="shrink-0" aria-label={`Visualizar ${anexo.name}`}>
                    <img src={anexo.base64} alt={anexo.name} className="size-9 rounded-lg object-cover" />
                  </button>
                ) : (
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground">
                    {tipo === 'pdf' ? <FileText className="size-4" /> : <FileIcon className="size-4" />}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => (tipo === 'arquivo' ? baixarAnexo(anexo) : setVisualizando(anexo))}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate font-medium text-foreground">{anexo.name}</span>
                  <span className="text-[11px] text-muted-foreground">{formatarTamanho(anexo.size || 0)}</span>
                </button>
                {!readOnly && (
                  <button type="button" onClick={() => removerAnexo(idx)} aria-label={`Remover ${anexo.name}`} className="shrink-0 text-muted-foreground hover:text-destructive">
                    <X className="size-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!readOnly && (
        <>
          <Button type="button" variant="outline" size="sm" className="mt-2" disabled={enviando} onClick={() => inputRef.current?.click()}>
            <Paperclip className="size-4" /> {enviando ? 'Lendo...' : 'Anexar arquivo'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => { if (e.target.files.length) adicionarArquivos(e.target.files); e.target.value = ''; }}
          />
        </>
      )}

      {visualizando && (
        <Dialog open onOpenChange={(open) => !open && setVisualizando(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-2 pr-6">
                <span className="truncate">{visualizando.name}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => baixarAnexo(visualizando)}>
                  <Download className="size-4" /> Baixar
                </Button>
              </DialogTitle>
            </DialogHeader>
            {tipoDoAnexo(visualizando) === 'imagem' ? (
              <img src={visualizando.base64} alt={visualizando.name} className="max-h-[70vh] w-full rounded-xl object-contain" />
            ) : (
              <iframe src={visualizando.base64} title={visualizando.name} className="h-[70vh] w-full rounded-xl border border-border" />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
