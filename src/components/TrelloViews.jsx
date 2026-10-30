import React, { useMemo, useState } from 'react';
import { format, addDays, startOfDay, differenceInCalendarDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CheckCircle2,
  Circle,
  CalendarDays,
  Copy,
  Archive,
  ExternalLink,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  BarChart3,
  Users,
  Layers,
  Tag,
  Flag,
  DollarSign
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { parseAssignees } from '../utils/assignees';
import { corUrgenciaData } from '../utils/dateUrgency';
import {
  parseFichaMeta,
  PRIORIDADES_FICHA,
  STATUS_APROVACAO_FICHA,
  calcularTempoTotalMin,
  formatarDuracaoMin
} from '../utils/atividades';

// ============================================================================
// 1. VISÃO EM TABELA / PLANILHA
// ============================================================================
export const TrelloTabelaView = ({
  fichas = [],
  listas = [],
  etiquetas = [],
  membros = [],
  allUsers = [],
  nomeDe,
  UserAvatar,
  EtiquetaChip,
  onAbrirFicha,
  onToggleConcluida,
  onMoverLista,
  onMudarResponsavel,
  onMudarPrioridade,
  onDuplicarFicha,
  onArquivarFicha
}) => {
  if (fichas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/90 p-12 text-center">
        <Layers className="size-8 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">Nenhuma ficha encontrada para exibir na tabela.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
      <table className="w-full min-w-[920px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/70 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <th className="w-10 px-3 py-3 text-center">Status</th>
            <th className="px-3 py-3">Ficha</th>
            <th className="w-44 px-3 py-3">Lista</th>
            <th className="w-48 px-3 py-3">Responsável</th>
            <th className="w-36 px-3 py-3">Prioridade</th>
            <th className="w-48 px-3 py-3">Etiquetas</th>
            <th className="w-40 px-3 py-3">Início / Prazo</th>
            <th className="w-32 px-3 py-3">Tempo / Valor</th>
            <th className="w-24 px-3 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {fichas.map(ficha => {
            const concluida = ficha.cr4a1_concluida === 'Sim';
            const meta = parseFichaMeta(ficha.cr4a1_atividades);
            const etiquetasDaFicha = parseAssignees(ficha.cr4a1_etiquetas)
              .map(id => etiquetas.find(e => e.cr4a1_etiquetaid === id))
              .filter(Boolean);
            const tempoMin = calcularTempoTotalMin(meta);
            const statusAprov = STATUS_APROVACAO_FICHA[meta.statusAprovacao || ''];

            return (
              <tr key={ficha.cr4a1_fichaid} className="transition-colors hover:bg-secondary/40">
                <td className="px-3 py-2.5 text-center">
                  <button
                    type="button"
                    onClick={() => onToggleConcluida(ficha)}
                    title={concluida ? 'Marcar como pendente' : 'Marcar como concluída'}
                    className={concluida ? 'text-success' : 'text-muted-foreground hover:text-primary'}
                  >
                    {concluida ? <CheckCircle2 className="size-[18px] mx-auto" /> : <Circle className="size-[18px] mx-auto" />}
                  </button>
                </td>

                <td className="px-3 py-2.5">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {ficha.cr4a1_cor && (
                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: ficha.cr4a1_cor }} />
                      )}
                      <button
                        type="button"
                        onClick={() => onAbrirFicha(ficha)}
                        className={`text-left font-semibold text-foreground hover:text-primary ${concluida ? 'line-through opacity-60' : ''}`}
                      >
                        {ficha.cr4a1_titulo}
                      </button>
                      {meta.ehModelo && (
                        <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">Modelo</Badge>
                      )}
                      {meta.statusAprovacao && statusAprov && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusAprov.badgeClass}`}>
                          {statusAprov.label}
                        </span>
                      )}
                    </div>
                    {(meta.campoTexto || meta.linkUrl) && (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        {meta.campoTexto && <span>{meta.campoTexto}</span>}
                        {meta.linkUrl && (
                          <a
                            href={meta.linkUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-0.5 text-primary hover:underline"
                          >
                            <ExternalLink className="size-3" /> Link
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </td>

                <td className="px-3 py-2.5">
                  <Select value={ficha.cr4a1_lista_id} onValueChange={novaListaId => onMoverLista(ficha, novaListaId)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {listas.map(l => (
                        <SelectItem key={l.cr4a1_listaid} value={l.cr4a1_listaid}>{l.cr4a1_nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={ficha.cr4a1_responsavel_login || ''}
                      onValueChange={novoLogin => onMudarResponsavel(ficha, novoLogin)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Sem responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {(membros.length ? membros : allUsers).map(u => (
                          <SelectItem key={u.cr4a1_username} value={u.cr4a1_username}>
                            {u.cr4a1_nome_exibicao || u.cr4a1_username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {meta.coResponsaveis?.length > 0 && (
                      <div className="flex -space-x-1.5 shrink-0" title={`Co-responsáveis: ${meta.coResponsaveis.map(l => nomeDe(l, allUsers)).join(', ')}`}>
                        {meta.coResponsaveis.slice(0, 2).map(login => (
                          <UserAvatar key={login} login={login} allUsers={allUsers} size={20} className="ring-1 ring-card" />
                        ))}
                      </div>
                    )}
                  </div>
                </td>

                <td className="px-3 py-2.5">
                  <Select
                    value={meta.prioridade || '__nenhuma__'}
                    onValueChange={v => onMudarPrioridade(ficha, v === '__nenhuma__' ? '' : v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORIDADES_FICHA).map(([k, cfg]) => (
                        <SelectItem key={k || '__nenhuma__'} value={k || '__nenhuma__'}>
                          {cfg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {etiquetasDaFicha.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      etiquetasDaFicha.map(et => <EtiquetaChip key={et.cr4a1_etiquetaid} etiqueta={et} compacta />)
                    )}
                  </div>
                </td>

                <td className="px-3 py-2.5">
                  <div className="flex flex-col gap-0.5 text-xs">
                    {meta.dataInicioTrabalho && (
                      <span className="text-[11px] text-muted-foreground">
                        Início: {format(new Date(`${meta.dataInicioTrabalho}T12:00:00`), 'dd/MM/yy')}
                      </span>
                    )}
                    {ficha.cr4a1_data_inicio ? (
                      <span className={`inline-flex w-fit items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${corUrgenciaData(ficha.cr4a1_data_inicio, concluida)}`}>
                        <CalendarDays className="size-3" />
                        {format(new Date(ficha.cr4a1_data_inicio), 'dd/MM HH:mm')}
                      </span>
                    ) : (
                      !meta.dataInicioTrabalho && <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </td>

                <td className="px-3 py-2.5 text-xs">
                  <div className="flex flex-col gap-0.5">
                    {(tempoMin > 0 || meta.tempoEstimadoMin > 0) && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground">
                        <Clock className="size-3 text-primary" />
                        {formatarDuracaoMin(tempoMin)}
                        {meta.tempoEstimadoMin > 0 ? ` / ${formatarDuracaoMin(meta.tempoEstimadoMin)}` : ''}
                      </span>
                    )}
                    {meta.custo && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        R$ {meta.custo}
                      </span>
                    )}
                    {!tempoMin && !meta.tempoEstimadoMin && !meta.custo && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </td>

                <td className="px-3 py-2.5 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onDuplicarFicha(ficha)}
                      title="Duplicar ficha"
                      className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onArquivarFicha(ficha)}
                      title="Arquivar ficha"
                      className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary"
                    >
                      <Archive className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================================
// 2. VISÃO DE CRONOGRAMA / LINHA DO TEMPO (GANTT)
// ============================================================================
export const TrelloCronogramaView = ({
  fichas = [],
  listas = [],
  allUsers = [],
  nomeDe,
  UserAvatar,
  onAbrirFicha
}) => {
  const [inicioJanela, setInicioJanela] = useState(() => startOfDay(addDays(new Date(), -2)));
  const [agrupamento, setAgrupamento] = useState('lista'); // 'lista' | 'responsavel'
  const DIAS_JANELA = 14;

  const dias = useMemo(
    () => Array.from({ length: DIAS_JANELA }, (_, i) => addDays(inicioJanela, i)),
    [inicioJanela]
  );

  const comDatas = useMemo(() => fichas.filter(f => {
    const meta = parseFichaMeta(f.cr4a1_atividades);
    return !!f.cr4a1_data_inicio || !!meta.dataInicioTrabalho;
  }), [fichas]);

  const semDatas = useMemo(() => fichas.filter(f => {
    const meta = parseFichaMeta(f.cr4a1_atividades);
    return !f.cr4a1_data_inicio && !meta.dataInicioTrabalho;
  }), [fichas]);

  const grupos = useMemo(() => {
    if (agrupamento === 'lista') {
      return listas.map(l => ({
        id: l.cr4a1_listaid,
        titulo: l.cr4a1_nome,
        itens: comDatas.filter(f => f.cr4a1_lista_id === l.cr4a1_listaid)
      })).filter(g => g.itens.length > 0);
    }
    const logins = [...new Set(comDatas.map(f => f.cr4a1_responsavel_login || ''))];
    return logins.map(login => ({
      id: login || '__sem__',
      titulo: nomeDe(login, allUsers),
      login,
      itens: comDatas.filter(f => (f.cr4a1_responsavel_login || '') === login)
    }));
  }, [agrupamento, listas, comDatas, allUsers, nomeDe]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setInicioJanela(d => addDays(d, -7))}>
            <ChevronLeft className="size-4" /> -7 dias
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setInicioJanela(startOfDay(addDays(new Date(), -2)))}>
            Hoje
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setInicioJanela(d => addDays(d, 7))}>
            +7 dias <ChevronRight className="size-4" />
          </Button>
          <span className="ml-2 text-xs font-semibold text-muted-foreground">
            {format(dias[0], "dd 'de' MMM", { locale: ptBR })} — {format(dias[dias.length - 1], "dd 'de' MMM yyyy", { locale: ptBR })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Agrupar por:</span>
          <Select value={agrupamento} onValueChange={setAgrupamento}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lista">Lista</SelectItem>
              <SelectItem value="responsavel">Responsável</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Cabeçalho de dias */}
          <div className="grid grid-cols-[220px_repeat(14,minmax(48px,1fr))] border-b border-border bg-secondary/60 text-center text-[11px] font-bold">
            <div className="px-3 py-2 text-left text-muted-foreground">Grupo / Ficha</div>
            {dias.map(d => {
              const ehHoje = isSameDay(d, new Date());
              return (
                <div
                  key={d.toISOString()}
                  className={`border-l border-border/60 py-1.5 ${ehHoje ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}
                >
                  <div className="uppercase">{format(d, 'EEE', { locale: ptBR }).slice(0, 3)}</div>
                  <div className="text-xs font-extrabold">{format(d, 'dd/MM')}</div>
                </div>
              );
            })}
          </div>

          {grupos.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma ficha possui data de início ou prazo definida.
            </div>
          ) : (
            grupos.map(grupo => (
              <div key={grupo.id} className="border-b border-border/70">
                <div className="flex items-center gap-2 bg-secondary/30 px-3 py-1.5 text-xs font-bold text-foreground">
                  {grupo.login !== undefined && <UserAvatar login={grupo.login} allUsers={allUsers} size={18} />}
                  <span>{grupo.titulo}</span>
                  <Badge variant="secondary" className="text-[10px]">{grupo.itens.length}</Badge>
                </div>

                {grupo.itens.map(ficha => {
                  const meta = parseFichaMeta(ficha.cr4a1_atividades);
                  const dataFim = ficha.cr4a1_data_inicio
                    ? startOfDay(new Date(ficha.cr4a1_data_inicio))
                    : startOfDay(new Date(`${meta.dataInicioTrabalho}T12:00:00`));
                  const dataIni = meta.dataInicioTrabalho
                    ? startOfDay(new Date(`${meta.dataInicioTrabalho}T12:00:00`))
                    : dataFim;

                  const offsetIni = differenceInCalendarDays(dataIni < dataFim ? dataIni : dataFim, dias[0]);
                  const offsetFim = differenceInCalendarDays(dataFim >= dataIni ? dataFim : dataIni, dias[0]);
                  const colStart = Math.max(0, Math.min(DIAS_JANELA - 1, offsetIni));
                  const colEnd = Math.max(0, Math.min(DIAS_JANELA - 1, offsetFim));
                  const foraDaJanela = offsetFim < 0 || offsetIni >= DIAS_JANELA;
                  const concluida = ficha.cr4a1_concluida === 'Sim';
                  const prioCfg = PRIORIDADES_FICHA[meta.prioridade || ''];

                  return (
                    <div
                      key={ficha.cr4a1_fichaid}
                      className="grid grid-cols-[220px_repeat(14,minmax(48px,1fr))] items-center border-t border-border/40 hover:bg-secondary/20"
                    >
                      <button
                        type="button"
                        onClick={() => onAbrirFicha(ficha)}
                        className="flex items-center gap-1.5 truncate px-3 py-2 text-left text-xs font-medium text-foreground hover:text-primary"
                        title={ficha.cr4a1_titulo}
                      >
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: ficha.cr4a1_cor || prioCfg?.dotColor || '#7A4536' }}
                        />
                        <span className={`truncate ${concluida ? 'line-through opacity-60' : ''}`}>
                          {ficha.cr4a1_titulo}
                        </span>
                      </button>

                      <div className="col-span-14 relative grid grid-cols-14 h-9 items-center">
                        {dias.map(d => (
                          <div
                            key={d.toISOString()}
                            className={`h-full border-l border-border/40 ${isSameDay(d, new Date()) ? 'bg-primary/5' : ''}`}
                          />
                        ))}
                        {!foraDaJanela && (
                          <button
                            type="button"
                            onClick={() => onAbrirFicha(ficha)}
                            style={{
                              gridColumnStart: colStart + 1,
                              gridColumnEnd: colEnd + 2,
                              backgroundColor: ficha.cr4a1_cor || (concluida ? '#10b981' : '#7A4536')
                            }}
                            className="absolute inset-y-1.5 mx-1 flex items-center gap-1.5 overflow-hidden rounded-lg px-2 text-[11px] font-semibold text-white shadow-sm transition-transform hover:scale-[1.01]"
                            title={`${ficha.cr4a1_titulo} (${format(dataIni, 'dd/MM')} → ${format(dataFim, 'dd/MM')})`}
                          >
                            <span className="truncate">{ficha.cr4a1_titulo}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {semDatas.length > 0 && (
        <div className="border-t border-border pt-3">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Fichas sem data definida ({semDatas.length}) — clique para definir prazo
          </span>
          <div className="flex flex-wrap gap-1.5">
            {semDatas.map(f => (
              <button
                key={f.cr4a1_fichaid}
                type="button"
                onClick={() => onAbrirFicha(f)}
                className="rounded-lg border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary"
              >
                {f.cr4a1_titulo}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. VISÃO DE PAINEL (DASHBOARD DO QUADRO)
// ============================================================================
export const TrelloPainelView = ({
  fichas = [],
  listas = [],
  etiquetas = [],
  allUsers = [],
  nomeDe,
  UserAvatar
}) => {
  const stats = useMemo(() => {
    const agoraIso = new Date().toISOString();
    const total = fichas.length;
    const concluidas = fichas.filter(f => f.cr4a1_concluida === 'Sim').length;
    const pendentes = total - concluidas;
    const atrasadas = fichas.filter(
      f => f.cr4a1_concluida !== 'Sim' && f.cr4a1_data_inicio && f.cr4a1_data_inicio < agoraIso
    ).length;

    let tempoGastoTotal = 0;
    let tempoEstimadoTotal = 0;
    let custoTotal = 0;

    const porPrioridade = { critica: 0, alta: 0, media: 0, baixa: 0, '': 0 };

    fichas.forEach(f => {
      const meta = parseFichaMeta(f.cr4a1_atividades);
      tempoGastoTotal += calcularTempoTotalMin(meta);
      tempoEstimadoTotal += Number(meta.tempoEstimadoMin) || 0;
      if (meta.custo) {
        const valorNum = parseFloat(String(meta.custo).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, ''));
        if (!Number.isNaN(valorNum)) custoTotal += valorNum;
      }
      const pKey = meta.prioridade || '';
      porPrioridade[pKey] = (porPrioridade[pKey] || 0) + 1;
    });

    const porLista = listas.map(l => {
      const daLista = fichas.filter(f => f.cr4a1_lista_id === l.cr4a1_listaid);
      const conc = daLista.filter(f => f.cr4a1_concluida === 'Sim').length;
      return {
        id: l.cr4a1_listaid,
        nome: l.cr4a1_nome,
        total: daLista.length,
        concluidas: conc
      };
    });

    const logins = [...new Set(fichas.map(f => f.cr4a1_responsavel_login || ''))];
    const porResponsavel = logins.map(login => {
      const doResp = fichas.filter(f => (f.cr4a1_responsavel_login || '') === login);
      const conc = doResp.filter(f => f.cr4a1_concluida === 'Sim').length;
      const atras = doResp.filter(f => f.cr4a1_concluida !== 'Sim' && f.cr4a1_data_inicio && f.cr4a1_data_inicio < agoraIso).length;
      return {
        login,
        nome: nomeDe(login, allUsers),
        total: doResp.length,
        concluidas: conc,
        atrasadas: atras
      };
    }).sort((a, b) => b.total - a.total);

    const porEtiqueta = etiquetas.map(et => {
      const qtd = fichas.filter(f => parseAssignees(f.cr4a1_etiquetas).includes(et.cr4a1_etiquetaid)).length;
      return { ...et, qtd };
    }).sort((a, b) => b.qtd - a.qtd);

    return {
      total,
      concluidas,
      pendentes,
      atrasadas,
      tempoGastoTotal,
      tempoEstimadoTotal,
      custoTotal,
      porLista,
      porResponsavel,
      porPrioridade,
      porEtiqueta
    };
  }, [fichas, listas, etiquetas, allUsers, nomeDe]);

  const taxaConclusao = stats.total > 0 ? Math.round((stats.concluidas / stats.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs principais */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Total de Fichas</span>
          <div className="mt-1 text-2xl font-extrabold text-foreground">{stats.total}</div>
          <span className="text-[11px] text-muted-foreground">em {listas.length} lista(s)</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wide text-success">Concluídas</span>
          <div className="mt-1 text-2xl font-extrabold text-success">{stats.concluidas}</div>
          <span className="text-[11px] text-muted-foreground">{taxaConclusao}% do quadro</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wide text-primary">Pendentes</span>
          <div className="mt-1 text-2xl font-extrabold text-foreground">{stats.pendentes}</div>
          <span className="text-[11px] text-muted-foreground">em andamento</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-destructive">
            <AlertTriangle className="size-3.5" /> Atrasadas
          </span>
          <div className="mt-1 text-2xl font-extrabold text-destructive">{stats.atrasadas}</div>
          <span className="text-[11px] text-muted-foreground">com prazo vencido</span>
        </div>

        <div className="col-span-2 rounded-2xl border border-border bg-card p-4 shadow-sm sm:col-span-1">
          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Clock className="size-3.5" /> Tempo & Orçamento
          </span>
          <div className="mt-1 text-lg font-extrabold text-foreground">
            {formatarDuracaoMin(stats.tempoGastoTotal)}
            {stats.tempoEstimadoTotal > 0 ? ` / ${formatarDuracaoMin(stats.tempoEstimadoTotal)}` : ''}
          </div>
          {stats.custoTotal > 0 ? (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              Total: R$ {stats.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">tempo registrado</span>
          )}
        </div>
      </div>

      {/* Gráficos em Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Fichas por Lista */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <BarChart3 className="size-4 text-primary" /> Fichas por Lista
          </h3>
          <div className="flex flex-col gap-2.5">
            {stats.porLista.map(l => {
              const pct = stats.total > 0 ? Math.round((l.total / stats.total) * 100) : 0;
              return (
                <div key={l.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{l.nome}</span>
                    <span className="text-muted-foreground">
                      {l.total} ficha(s) • {l.concluidas} concluída(s) ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fichas por Responsável */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Users className="size-4 text-primary" /> Carga por Responsável
          </h3>
          <div className="flex flex-col gap-2.5">
            {stats.porResponsavel.map(r => {
              const pct = stats.total > 0 ? Math.round((r.total / stats.total) * 100) : 0;
              return (
                <div key={r.login || '__sem__'} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <UserAvatar login={r.login} allUsers={allUsers} size={18} />
                      <span>{r.nome}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{r.total} ficha(s)</span>
                      <span className="text-success">{r.concluidas} ok</span>
                      {r.atrasadas > 0 && <span className="font-bold text-destructive">{r.atrasadas} atras.</span>}
                    </div>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribuição por Prioridade */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Flag className="size-4 text-primary" /> Distribuição por Prioridade
          </h3>
          <div className="flex flex-col gap-2.5">
            {['critica', 'alta', 'media', 'baixa', ''].map(pKey => {
              const cfg = PRIORIDADES_FICHA[pKey];
              const qtd = stats.porPrioridade[pKey] || 0;
              const pct = stats.total > 0 ? Math.round((qtd / stats.total) * 100) : 0;
              return (
                <div key={pKey || 'sem'} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-foreground">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: cfg.dotColor }} />
                      {cfg.label}
                    </span>
                    <span className="text-muted-foreground">{qtd} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cfg.dotColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Uso por Etiqueta */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Tag className="size-4 text-primary" /> Fichas por Etiqueta
          </h3>
          {stats.porEtiqueta.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma etiqueta cadastrada neste quadro.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {stats.porEtiqueta.map(et => {
                const pct = stats.total > 0 ? Math.round((et.qtd / stats.total) * 100) : 0;
                return (
                  <div key={et.cr4a1_etiquetaid} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-semibold text-foreground">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: et.cr4a1_cor }} />
                        {et.cr4a1_nome}
                      </span>
                      <span className="text-muted-foreground">{et.qtd} ficha(s) ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: et.cr4a1_cor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
