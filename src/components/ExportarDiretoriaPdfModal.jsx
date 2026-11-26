import React, { useMemo, useState } from 'react';
import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import { FileDown, Check, Users, CalendarRange, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { DateField } from './ui/date-field';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { parseRoles } from '../utils/permissions';
import { exportarAgendaDiretorPdf, filtrarEventosDoDiretor } from '../utils/exportarAgendaDiretoriaPdf';

const calcularIntervalo = (modoPeriodo, dataDe, dataAte) => {
  const hoje = new Date();
  if (modoPeriodo === 'mes_atual') {
    const ini = format(startOfMonth(hoje), 'yyyy-MM-dd');
    const fim = format(endOfMonth(hoje), 'yyyy-MM-dd');
    return { dataInicio: ini, dataFim: fim, label: `${format(startOfMonth(hoje), 'dd/MM/yyyy')} a ${format(endOfMonth(hoje), 'dd/MM/yyyy')}` };
  }
  if (modoPeriodo === 'semana_atual') {
    const iniD = startOfWeek(hoje, { weekStartsOn: 1 });
    const fimD = endOfWeek(hoje, { weekStartsOn: 1 });
    return { dataInicio: format(iniD, 'yyyy-MM-dd'), dataFim: format(fimD, 'yyyy-MM-dd'), label: `${format(iniD, 'dd/MM/yyyy')} a ${format(fimD, 'dd/MM/yyyy')}` };
  }
  if (modoPeriodo === 'proximos_30') {
    const ini = format(hoje, 'yyyy-MM-dd');
    const fimD = addDays(hoje, 30);
    return { dataInicio: ini, dataFim: format(fimD, 'yyyy-MM-dd'), label: `${format(hoje, 'dd/MM/yyyy')} a ${format(fimD, 'dd/MM/yyyy')}` };
  }
  if (modoPeriodo === 'personalizado') {
    const iniFmt = dataDe ? dataDe.split('-').reverse().join('/') : 'Início';
    const fimFmt = dataAte ? dataAte.split('-').reverse().join('/') : 'Sem limite';
    return { dataInicio: dataDe || '', dataFim: dataAte || '', label: dataDe || dataAte ? `${iniFmt} a ${fimFmt}` : 'Todos os períodos' };
  }
  return { dataInicio: '', dataFim: '', label: 'Todos os períodos' };
};

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

  const [selecionados, setSelecionados] = useState([]);
  const [modoPeriodo, setModoPeriodo] = useState('todos');
  const [dataDe, setDataDe] = useState('');
  const [dataAte, setDataAte] = useState('');
  const [exportando, setExportando] = useState(false);

  const intervalo = useMemo(
    () => calcularIntervalo(modoPeriodo, dataDe, dataAte),
    [modoPeriodo, dataDe, dataAte]
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
        const eventosDir = filtrarEventosDoDiretor(events, dir.cr4a1_username, intervalo);
        exportarAgendaDiretorPdf({
          diretor: dir,
          eventos: eventosDir,
          workspaces,
          emitidoPor,
          periodoLabel: intervalo.label
        });
        if (i < alvos.length - 1) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      toast.success(
        alvos.length === 1
          ? `Relatório em PDF de ${alvos[0].cr4a1_nome_exibicao || alvos[0].cr4a1_username} exportado!`
          : `${alvos.length} relatórios em PDF exportados (um por diretor)!`
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
            <FileDown className="size-5 text-primary" /> Exportar Agenda da Diretoria (PDF)
          </DialogTitle>
          <DialogDescription>
            Gera um relatório formal em PDF com o resumo de compromissos e atividades. Ao selecionar mais de um diretor, um arquivo separado é baixado para cada um.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* Período */}
          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <CalendarRange className="size-3.5 text-primary" /> Período dos Eventos
            </Label>
            <Select value={modoPeriodo} onValueChange={setModoPeriodo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os eventos registrados</SelectItem>
                <SelectItem value="mes_atual">Mês atual</SelectItem>
                <SelectItem value="semana_atual">Esta semana</SelectItem>
                <SelectItem value="proximos_30">Próximos 30 dias</SelectItem>
                <SelectItem value="personalizado">Período personalizado</SelectItem>
              </SelectContent>
            </Select>

            {modoPeriodo === 'personalizado' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
                <DateField label="De" selectedDate={dataDe} onSelect={setDataDe} allowClear />
                <DateField label="Até" selectedDate={dataAte} onSelect={setDataAte} allowClear />
              </div>
            )}
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
                  const qtd = filtrarEventosDoDiretor(events, d.cr4a1_username, intervalo).length;
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
                      <Badge variant="secondary" className="shrink-0 text-[11px]">
                        {qtd} {qtd === 1 ? 'evento' : 'eventos'}
                      </Badge>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={exportando}>
            Cancelar
          </Button>
          <Button onClick={handleExportar} disabled={exportando || selecionados.length === 0} className="gap-1.5">
            {exportando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {selecionados.length > 1
              ? `Exportar ${selecionados.length} PDFs`
              : 'Exportar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
