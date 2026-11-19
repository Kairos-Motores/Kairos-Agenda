import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Paperclip, X, FileText, Download, File as FileIcon, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import {
  MAX_ANEXO_BYTES, MAX_TOTAL_ANEXOS_BYTES, MAX_ANEXO_FICHA_BYTES, formatarTamanho,
  somaTamanhos, tipoDoAnexo, baixarAnexo, ehImagem, processarArquivoParaAnexo,
  obterBase64Anexo, uploadAnexoDataverse, removerAnexoDataverse
} from '../../utils/anexos';

// Modal de pré-visualização (imagem/PDF renderizam dentro do próprio app, sem abrir outra
// aba) — exportado à parte pra poder ser reaproveitado fora do AttachmentsField, por exemplo
// na miniatura de capa do card do Trello. Suporta tanto base64 imediato quanto carregamento
// sob demanda via ID de anotação do Dataverse.
export const AttachmentPreviewDialog = ({ anexo, onClose }) => {
  if (!anexo) return null;
  const [base64, setBase64] = useState(anexo.base64 || null);
  const [carregando, setCarregando] = useState(!anexo.base64 && Boolean(anexo.annotationId));

  useEffect(() => {
    let cancelado = false;
    if (anexo.base64) {
      setBase64(anexo.base64);
      setCarregando(false);
      return;
    }
    if (anexo.annotationId) {
      setCarregando(true);
      obterBase64Anexo(anexo).then(b64 => {
        if (!cancelado) {
          setBase64(b64);
          setCarregando(false);
        }
      }).catch(() => {
        if (!cancelado) setCarregando(false);
      });
    }
    return () => { cancelado = true; };
  }, [anexo]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl sm:max-w-5xl sm:w-[90vw]">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 pr-6">
            <span className="truncate">{anexo.name}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => baixarAnexo(anexo)} className="shrink-0">
              <Download className="size-4" /> Baixar
            </Button>
          </DialogTitle>
        </DialogHeader>
        {carregando ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
            <span className="text-xs">Baixando anexo do Dataverse...</span>
          </div>
        ) : !base64 ? (
          <div className="flex h-48 flex-col items-center justify-center text-sm text-destructive">
            Não foi possível carregar a pré-visualização deste anexo.
          </div>
        ) : tipoDoAnexo(anexo) === 'imagem' ? (
          <img src={base64} alt={anexo.name} className="max-h-[65dvh] w-full rounded-xl object-contain" />
        ) : (
          <iframe src={base64} title={anexo.name} className="h-[65dvh] w-full rounded-xl border border-border" />
        )}
      </DialogContent>
    </Dialog>
  );
};

// Lista de anexos com pré-visualização embutida.
// Para fichas com fichaId: salva direto na tabela dedicada "annotations" do Dataverse,
// permitindo anexos de até 3.5 MB cada sem limite na coluna do cartão.
export const AttachmentsField = ({
  anexos = [],
  onChange,
  label = 'Anexos',
  readOnly = false,
  fichaId = null
}) => {
  const inputRef = useRef(null);
  const [enviando, setEnviando] = useState(false);
  const [visualizando, setVisualizando] = useState(null);

  const adicionarArquivos = async (files) => {
    setEnviando(true);
    const novosAnexos = [...anexos];
    for (const file of Array.from(files)) {
      const isImg = ehImagem(file);

      if (fichaId) {
        // MODO FICHAS (Dataverse annotations): aceita arquivos até 3.5 MB
        if (file.size > MAX_ANEXO_FICHA_BYTES) {
          toast.error(`"${file.name}" tem ${formatarTamanho(file.size)} — o limite máximo por anexo nas fichas é ${formatarTamanho(MAX_ANEXO_FICHA_BYTES)}.`);
          continue;
        }

        try {
          const processado = await processarArquivoParaAnexo(file);
          const anexoSalvo = await uploadAnexoDataverse(fichaId, processado);
          novosAnexos.push(anexoSalvo);
          toast.success(`"${file.name}" anexado!`);
        } catch (err) {
          console.error('Erro ao anexar arquivo na ficha:', err);
          toast.error(`Erro ao anexar "${file.name}": ${err.message || 'Falha de upload'}`);
        }
      } else {
        // MODO LEGADO / EVENTOS: coluna de texto direta (400 KB por arquivo, 700 KB total)
        if (!isImg && file.size > MAX_ANEXO_BYTES) {
          toast.error(`"${file.name}" tem ${formatarTamanho(file.size)} — para documentos (PDF/arquivos), o limite é ${formatarTamanho(MAX_ANEXO_BYTES)}.`);
          continue;
        }

        try {
          const processado = await processarArquivoParaAnexo(file);

          if (processado.size > MAX_ANEXO_BYTES) {
            toast.error(`Não foi possível comprimir "${file.name}" abaixo de ${formatarTamanho(MAX_ANEXO_BYTES)}.`);
            continue;
          }

          if (somaTamanhos(novosAnexos) + processado.size > MAX_TOTAL_ANEXOS_BYTES) {
            toast.error(`Limite total de anexos (${formatarTamanho(MAX_TOTAL_ANEXOS_BYTES)}) atingido — remova algum anexo antes de adicionar "${file.name}".`);
            continue;
          }

          novosAnexos.push({
            name: processado.name,
            size: processado.size,
            type: processado.type,
            base64: processado.base64
          });

          if (processado.foiComprimido && file.size > 350 * 1024) {
            toast.success(`"${file.name}" otimizada! (${formatarTamanho(file.size)} ➔ ${formatarTamanho(processado.size)})`);
          }
        } catch (err) {
          console.error('Erro ao processar anexo:', err);
          toast.error(`Erro ao processar "${file.name}".`);
        }
      }
    }
    onChange(novosAnexos);
    setEnviando(false);
  };

  const removerAnexo = async (idx) => {
    const alvo = anexos[idx];
    if (alvo?.annotationId) {
      removerAnexoDataverse(alvo.annotationId).catch(() => {});
    }
    onChange(anexos.filter((_, i) => i !== idx));
  };

  if (readOnly && anexos.length === 0) return null;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-primary">{label}</span>
        {!readOnly && (
          <span className="text-[10px] text-muted-foreground">
            {fichaId
              ? `Máx. ${formatarTamanho(MAX_ANEXO_FICHA_BYTES)} por arquivo • Sem limite no cartão`
              : `Fotos comprimidas automaticamente • Máx. ${formatarTamanho(MAX_TOTAL_ANEXOS_BYTES)} total`}
          </span>
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
                    {anexo.thumbnail || anexo.base64 ? (
                      <img src={anexo.thumbnail || anexo.base64} alt={anexo.name} className="size-9 rounded-lg object-cover" />
                    ) : (
                      <div className="flex size-9 items-center justify-center rounded-lg bg-card text-muted-foreground">
                        <Paperclip className="size-4" />
                      </div>
                    )}
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
            <Paperclip className="size-4" /> {enviando ? 'Enviando anexo...' : 'Anexar arquivo'}
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

      <AttachmentPreviewDialog anexo={visualizando} onClose={() => setVisualizando(null)} />
    </div>
  );
};
