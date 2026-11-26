import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { FileDown, Check, Users, CalendarDays, Loader2, MessageSquare, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { DateField } from './ui/date-field';
import { parseRoles } from '../utils/permissions';
import {
  exportarAgendaDiretorPdf,
  filtrarEventosDoDiretor,
  gerarTextoAgendaWhatsapp,
  copiarTextoClipboard
} from '../utils/exportarAgendaDiretoriaPdf';

export const ExportarDiretoriaPdfModal = ({
  isOpen,
  onClose,
  allUsers = [],
  events = [],
  workspaces = [],
  currentUser
}) => {
  const diretores = useMemo(() => {
    return (allUsers || [])
      .filter((u) => parseRoles(u.cr4a1_role).includes('DIRETORIA'))
      .sort((a, b) =>
        (a.cr4a1_nome_exibicao || a.cr4a1_username || '').localeCompare(
          b.cr4a1_nome_exibicao || b.cr4a1_username || '',
          'pt-BR'
        )
      );
  }, [allUsers]);

  const hojeIso = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const [diaSelecionado, setDiaSelecionado] = useState(hojeIso);
  const [selecionados, setSelecionados] = useState([]);
  const [exportando, setExportando] = useState(false);
  const [copiando, setCopiando] = useState(false);

  const diaEfetivo = diaSelecionado || hojeIso;
  const intervaloDia = useMemo(
    () => ({ dataInicio: diaEfetivo, dataFim: diaEfetivo }),
    [diaEfetivo]
  );

  const toggleDiretor = (username) => {
    setSelecionados((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    );
  };

  const selecionarTodos = () => {
    if (selecionados.length === diretores.length) {
      setSelecionados([]);
    } else {
      setSelecionados(diretores.map((d) => d.cr4a1_username));
    }
  };

  const handleCopiarDiretorIndividual = async (diretorAlvo) => {
    setCopiando(true);
    try {
      const emitidoPor = currentUser?.cr4a1_nome_exibicao || currentUser?.cr4a1_username || '';
      const eventosDir = filtrarEventosDoDiretor(events, diretorAlvo.cr4a1_username, intervaloDia);
      const texto = gerarTextoAgendaWhatsapp({
        diretor: diretorAlvo,
        eventos: eventosDir,
        workspaces,
        emitidoPor,
        diaIso: diaEfetivo
      });

      const copiou = await copiarTextoClipboard(texto);
      const nomeDir = diretorAlvo.cr4a1_nome_exibicao || diretorAlvo.cr4a1_username;
      if (copiou) {
        toast.success(`Agenda de ${nomeDir} copiada para o WhatsApp!`);
      } else {
        toast.error('Não foi possível copiar automaticamente para a área de transferência.');
      }
    } catch (err) {
      console.error('Erro ao copiar agenda do WhatsApp:', err);
      toast.error('Erro ao gerar texto para o WhatsApp.');
    } finally {
      setCopiando(false);
    }
  };

  const handleCopiarWhatsapp = async () => {
    if (selecionados.length === 0) {
      toast.error('Selecione pelo menos um membro da Diretoria.');
      return;
    }

    setCopiando(true);
    try {
      const emitidoPor = currentUser?.cr4a1_nome_exibicao || currentUser?.cr4a1_username || '';
      const alvos = diretores.filter((d) => selecionados.includes(d.cr4a1_username));

      const blocosTexto = alvos.map((dir) => {
        const eventosDir = filtrarEventosDoDiretor(events, dir.cr4a1_username, intervaloDia);
        return gerarTextoAgendaWhatsapp({
          diretor: dir,
          eventos: eventosDir,
          workspaces,
          emitidoPor,
          diaIso: diaEfetivo
        });
      });

      const textoCompleto = blocosTexto.join('\n\n─────────────────────────────\n\n');

      const copiou = await copiarTextoClipboard(textoCompleto);
      if (copiou) {
        toast.success(
          alvos.length === 1
            ? `Agenda de ${alvos[0].cr4a1_nome_exibicao || alvos[0].cr4a1_username} copiada para o WhatsApp!`
            : `${alvos.length} agendas copiadas para o WhatsApp (área de transferência)!`
        );
      } else {
        toast.error('Não foi possível copiar automaticamente para a área de transferência.');
      }
    } catch (err) {
      console.error('Erro ao copiar agenda do WhatsApp:', err);
      toast.error('Erro ao gerar texto para o WhatsApp.');
    } finally {
      setCopiando(false);
    }
  };

  const handleExportar = async () => {
    if (selecionados.length === 0) {
      toast.error('Selecione pelo menos um membro da Diretoria.');
      return;
    }

    setExportando(true);
    try {
      const emitidoPor = currentUser?.cr4a1_nome_exibicao || currentUser?.cr4a1_username || '';
      const alvos = diretores.filter((d) => selecionados.includes(d.cr4a1_username));

      for (let i = 0; i < alvos.length; i++) {
        const dir = alvos[i];
        const eventosDir = filtrarEventosDoDiretor(events, dir.cr4a1_username, intervaloDia);
        exportarAgendaDiretorPdf({
          diretor: dir,
          eventos: eventosDir,
          workspaces,
          emitidoPor,
          diaIso: diaEfetivo
        });
        if (i < alvos.length - 1) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      toast.success(
        alvos.length === 1
          ? `Agenda do dia de ${alvos[0].cr4a1_nome_exibicao || alvos[0].cr4a1_username} exportada em PDF!`
          : `${alvos.length} agendas do dia exportadas em PDF (uma por diretor)!`
      );
      onClose();
    } catch (err) {
      console.error('Erro ao exportar PDF da Diretoria:', err);
      toast.error('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg sm:max-w-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="size-5 text-primary" /> Exportar Agenda do Dia (Diretoria)
          </DialogTitle>
          <DialogDescription>
            Exporte relatórios formais em PDF ou copie o resumo estruturado para o WhatsApp dos compromissos e atividades do dia de cada diretor selecionado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* Dia da Agenda (padrão: Hoje) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="mb-0 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="size-3.5 text-primary" /> Dia da Agenda
              </Label>
              {diaEfetivo !== hojeIso && (
                <button
                  type="button"
                  onClick={() => setDiaSelecionado(hojeIso)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Voltar para Hoje
                </button>
              )}
            </div>
            <DateField
              selectedDate={diaEfetivo}
              onSelect={(d) => setDiaSelecionado(d || hojeIso)}
              allowClear={false}
            />
          </div>

          {/* Lista de Diretores */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="mb-0 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Users className="size-3.5 text-primary" /> Selecionar Diretoria ({selecionados.length}/{diretores.length})
              </Label>
              {diretores.length > 1 && (
                <button
                  type="button"
                  onClick={selecionarTodos}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {selecionados.length === diretores.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              )}
            </div>

            {diretores.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Nenhum usuário com a role <strong>DIRETORIA</strong> foi encontrado.
              </div>
            ) : (
              <div className="flex max-h-60 flex-col gap-1.5 overflow-y-auto pr-1">
                {diretores.map((d) => {
                  const marcado = selecionados.includes(d.cr4a1_username);
                  const qtd = filtrarEventosDoDiretor(events, d.cr4a1_username, intervaloDia).length;
                  const nome = d.cr4a1_nome_exibicao || d.cr4a1_username;
                  return (
                    <label
                      key={d.cr4a1_username}
                      className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 cursor-pointer transition-colors ${
                        marcado
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-secondary/40 hover:bg-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox
                          checked={marcado}
                          onCheckedChange={() => toggleDiretor(d.cr4a1_username)}
                        />
                        {d.cr4a1_foto ? (
                          <img src={d.cr4a1_foto} alt={nome} className="size-7 rounded-full object-cover shrink-0" />
                        ) : (
                          <span
                            className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: d.cr4a1_cor || '#1a73e8' }}
                          >
                            {nome[0]?.toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{nome}</p>
                          {d.cr4a1_unidade && (
                            <p className="text-[11px] text-muted-foreground truncate">{d.cr4a1_unidade}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="secondary" className="shrink-0 text-[11px]">
                          {qtd} {qtd === 1 ? 'evento hoje' : 'eventos no dia'}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          title={`Copiar agenda de ${nome} para o WhatsApp`}
                          disabled={copiando || exportando}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCopiarDiretorIndividual(d);
                          }}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={exportando || copiando}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCopiarWhatsapp}
            disabled={exportando || copiando || selecionados.length === 0}
            className="gap-1.5 border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          >
            {copiando ? <Loader2 className="size-4 animate-spin" /> : <MessageSquare className="size-4 text-emerald-600 dark:text-emerald-400" />}
            {selecionados.length > 1
              ? `Copiar p/ WhatsApp (${selecionados.length})`
              : 'Copiar p/ WhatsApp'}
          </Button>
          <Button onClick={handleExportar} disabled={exportando || copiando || selecionados.length === 0} className="gap-1.5">
            {exportando ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
            {selecionados.length > 1
              ? `Exportar ${selecionados.length} PDFs`
              : 'Exportar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
