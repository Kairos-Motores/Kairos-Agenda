import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Activity, RefreshCw, CheckCircle2, AlertTriangle, Clock,
  Search, X, Info, Copy, Check, RotateCw, Filter
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';

export const BiMonitoringModal = ({ isOpen, onClose, userRole, biConfig = [] }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshingId, setRefreshingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'COMPLETED', 'FAILED', 'IN_PROGRESS'
  const [selectedError, setSelectedError] = useState(null);
  const [hasCopiedError, setHasCopiedError] = useState(false);

  // Busca dados consolidados de todos os relatórios
  const fetchBulkStatus = useCallback(async (force = false) => {
    setIsLoading(true);
    try {
      const url = `/api/bi-refresh?all=true&userRole=${encodeURIComponent(userRole || '')}${force ? '&force=true' : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error || 'Erro ao carregar monitoramento dos BIs.');
        return;
      }
      setData(json);
    } catch (err) {
      console.error('[BiMonitoringModal] Erro ao carregar status:', err);
      toast.error('Falha de conexão ao carregar central de monitoramento.');
    } finally {
      setIsLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    if (isOpen) {
      fetchBulkStatus(false);
    }
  }, [isOpen, fetchBulkStatus]);

  // Mescla metadados de biConfig (título amigável, workspace e ícone)
  const enrichedReports = useMemo(() => {
    if (!data?.reports) return [];
    return data.reports.map(r => {
      const meta = biConfig.find(b => b.id === r.id) || {};
      return {
        ...r,
        title: meta.title || r.id,
        workspaceName: meta.workspaceName || 'Geral',
        icon: meta.icon || 'bar_chart',
      };
    });
  }, [data, biConfig]);

  // Lista de workspaces únicos
  const workspacesList = useMemo(() => {
    const set = new Set(enrichedReports.map(r => r.workspaceName).filter(Boolean));
    return Array.from(set).sort();
  }, [enrichedReports]);

  // Filtros combinados
  const filteredReports = useMemo(() => {
    return enrichedReports.filter(r => {
      // 1. Busca textual (nome ou workspace)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = r.title.toLowerCase().includes(query);
        const matchesWs = r.workspaceName.toLowerCase().includes(query);
        if (!matchesName && !matchesWs) return false;
      }

      // 2. Filtro de Workspace
      if (selectedWorkspace !== 'ALL' && r.workspaceName !== selectedWorkspace) {
        return false;
      }

      // 3. Filtro de Status
      if (statusFilter === 'COMPLETED' && (r.isRefreshing || r.latestStatus !== 'Completed')) return false;
      if (statusFilter === 'FAILED' && (r.isRefreshing || r.latestStatus !== 'Failed')) return false;
      if (statusFilter === 'IN_PROGRESS' && !r.isRefreshing) return false;

      return true;
    });
  }, [enrichedReports, searchTerm, selectedWorkspace, statusFilter]);

  // Disparo manual de um relatório individual
  const handleTriggerSingle = async (biId) => {
    if (refreshingId) return;
    setRefreshingId(biId);
    try {
      const res = await fetch('/api/bi-refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: biId, userRole })
      });
      const result = await res.json();
      if (result.ok) {
        toast.success('Atualização disparada no Power BI!');
        // Atualiza estado local imediatamente
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            reports: prev.reports.map(r => r.id === biId ? { ...r, isRefreshing: true } : r)
          };
        });
        setTimeout(() => fetchBulkStatus(true), 2500);
      } else {
        toast.error(result.error || 'Erro ao disparar atualização.');
      }
    } catch (err) {
      console.error('[BiMonitoringModal] Erro ao disparar:', err);
      toast.error('Falha de conexão ao disparar atualização.');
    } finally {
      setRefreshingId(null);
    }
  };

  const formatDistancePtBr = (isoString) => {
    if (!isoString) return 'Nunca';
    try {
      return formatDistanceToNow(new Date(isoString), { addSuffix: true, locale: ptBR });
    } catch {
      return isoString;
    }
  };

  const formatExactPtBr = (isoString) => {
    if (!isoString) return '';
    try {
      return format(new Date(isoString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return isoString;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden !z-[10000005]" overlayClassName="!z-[10000004]">
          {/* Header */}
          <div className="p-6 border-b border-border bg-card/60 backdrop-blur-sm flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-[#fff3e0] text-[#f57c00] flex items-center justify-center shadow-sm">
                <Activity className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  Central de Monitoramento dos BIs
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#e0f2fe] text-[#0369a1]">
                    Painel do Administrador
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Acompanhamento em tempo real das atualizações agendadas, capacidade diária e diagnósticos de erros de todos os relatórios.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 mr-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchBulkStatus(true)}
                disabled={isLoading}
                className="flex items-center gap-1.5 font-medium text-xs"
                title="Recarregar dados de todos os BIs diretamente do Power BI"
              >
                <RotateCw className={cn("size-3.5", isLoading && "animate-spin text-[#f57c00]")} />
                {isLoading ? 'Atualizando...' : 'Recarregar Lista'}
              </Button>
            </div>
          </div>

          {/* Cards de Resumo KPI */}
          {data?.summary && (
            <div className="px-6 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Total */}
              <div
                onClick={() => setStatusFilter('ALL')}
                className={cn(
                  "cursor-pointer p-3.5 rounded-2xl border transition-all boing-effect",
                  statusFilter === 'ALL'
                    ? "border-[#f57c00] bg-[#fff8f0] shadow-sm ring-2 ring-[#f57c00]/20"
                    : "border-border bg-card hover:bg-muted/40"
                )}
              >
                <div className="flex justify-between items-center text-xs text-muted-foreground font-medium">
                  <span>Total de BIs</span>
                  <Clock className="size-4 text-[#f57c00]" />
                </div>
                <div className="mt-1 text-2xl font-bold text-foreground">
                  {data.summary.total}
                </div>
                <span className="text-[11px] text-muted-foreground">Monitorados</span>
              </div>

              {/* Sucesso */}
              <div
                onClick={() => setStatusFilter('COMPLETED')}
                className={cn(
                  "cursor-pointer p-3.5 rounded-2xl border transition-all boing-effect",
                  statusFilter === 'COMPLETED'
                    ? "border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20"
                    : "border-border bg-card hover:bg-muted/40"
                )}
              >
                <div className="flex justify-between items-center text-xs text-emerald-700 font-medium">
                  <span>Atualizados</span>
                  <CheckCircle2 className="size-4 text-emerald-600" />
                </div>
                <div className="mt-1 text-2xl font-bold text-emerald-700">
                  {data.summary.completed}
                </div>
                <span className="text-[11px] text-emerald-600/80">Concluídos com sucesso</span>
              </div>

              {/* Falhas */}
              <div
                onClick={() => setStatusFilter('FAILED')}
                className={cn(
                  "cursor-pointer p-3.5 rounded-2xl border transition-all boing-effect",
                  statusFilter === 'FAILED'
                    ? "border-red-500 bg-red-50/80 shadow-sm ring-2 ring-red-500/20"
                    : "border-border bg-card hover:bg-muted/40",
                  data.summary.failed > 0 && "border-red-200 bg-red-50/30"
                )}
              >
                <div className="flex justify-between items-center text-xs text-red-700 font-medium">
                  <span>Falhas Recentes</span>
                  <AlertTriangle className={cn("size-4 text-red-600", data.summary.failed > 0 && "animate-pulse")} />
                </div>
                <div className="mt-1 text-2xl font-bold text-red-700">
                  {data.summary.failed}
                </div>
                <span className="text-[11px] text-red-600/80">Requerem atenção técnica</span>
              </div>

              {/* Em Andamento */}
              <div
                onClick={() => setStatusFilter('IN_PROGRESS')}
                className={cn(
                  "cursor-pointer p-3.5 rounded-2xl border transition-all boing-effect",
                  statusFilter === 'IN_PROGRESS'
                    ? "border-blue-500 bg-blue-50/80 shadow-sm ring-2 ring-blue-500/20"
                    : "border-border bg-card hover:bg-muted/40"
                )}
              >
                <div className="flex justify-between items-center text-xs text-blue-700 font-medium">
                  <span>Em Andamento</span>
                  <RefreshCw className="size-4 text-blue-600 animate-spin" />
                </div>
                <div className="mt-1 text-2xl font-bold text-blue-700">
                  {data.summary.inProgress}
                </div>
                <span className="text-[11px] text-blue-600/80">Atualizando no Power BI</span>
              </div>
            </div>
          )}

          {/* Barra de Ferramentas / Filtros */}
          <div className="px-6 py-3 border-b border-border/80 flex flex-wrap gap-3 items-center justify-between">
            {/* Campo de Busca */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome do relatório ou workspace..."
                className="pl-9 h-9 text-xs rounded-xl"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Filtros por Workspace e Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
                <Filter className="size-3.5" />
                <span>Workspace:</span>
              </div>
              <select
                value={selectedWorkspace}
                onChange={(e) => setSelectedWorkspace(e.target.value)}
                className="h-9 px-2.5 rounded-xl border border-border bg-card text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-[#f57c00]"
              >
                <option value="ALL">Todos os Workspaces ({workspacesList.length})</option>
                {workspacesList.map(ws => (
                  <option key={ws} value={ws}>{ws}</option>
                ))}
              </select>

              {(searchTerm || selectedWorkspace !== 'ALL' || statusFilter !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedWorkspace('ALL');
                    setStatusFilter('ALL');
                  }}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>

          {/* Tabela de Relatórios com Scroll */}
          <div className="flex-1 overflow-y-auto px-6 py-2">
            {isLoading && !data ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <RefreshCw className="size-7 animate-spin text-[#f57c00]" />
                <span className="text-sm font-medium">Consultando status dos 61 relatórios no Power BI...</span>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Info className="size-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Nenhum relatório encontrado para os filtros selecionados.</p>
              </div>
            ) : (
              <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                      <th className="py-3 px-4">Relatório / Workspace</th>
                      <th className="py-3 px-4">Agendamentos Diários</th>
                      <th className="py-3 px-4 text-center">Execuções Hoje</th>
                      <th className="py-3 px-4">Última Atualização</th>
                      <th className="py-3 px-4 text-right">Ações (Admin)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredReports.map((report) => {
                      const isRef = report.isRefreshing || refreshingId === report.id;
                      const hasFailed = !isRef && report.latestStatus === 'Failed';
                      const hasSucceeded = !isRef && report.latestStatus === 'Completed';

                      return (
                        <tr key={report.id} className="hover:bg-muted/20 transition-colors">
                          {/* Nome e Workspace */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className="material-symbols-rounded text-[#f57c00] text-[18px]">
                                {report.icon}
                              </span>
                              <div>
                                <div className="font-semibold text-foreground text-sm">
                                  {report.title}
                                </div>
                                <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                                  {report.workspaceName}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Horários Agendados */}
                          <td className="py-3 px-4">
                            {report.scheduleTimes && report.scheduleTimes.length > 0 ? (
                              <div className="flex items-center gap-1 flex-wrap max-w-xs">
                                <span className="text-[11px] font-bold text-foreground mr-1">
                                  {report.scheduleTimes.length}x/dia:
                                </span>
                                {report.scheduleTimes.slice(0, 4).map(t => (
                                  <span key={t} className="px-1.5 py-0.5 rounded bg-muted/80 text-[10px] font-mono text-muted-foreground">
                                    {t}
                                  </span>
                                ))}
                                {report.scheduleTimes.length > 4 && (
                                  <span
                                    title={report.scheduleTimes.join(', ')}
                                    className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium text-muted-foreground cursor-help"
                                  >
                                    +{report.scheduleTimes.length - 4} mais
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-[11px] italic">Sem agendamento configurado</span>
                            )}
                          </td>

                          {/* Execuções Hoje */}
                          <td className="py-3 px-4 text-center">
                            <span
                              title={`${report.refreshesToday} atualizações hoje (planejadas: ${report.totalScheduledToday})`}
                              className="inline-flex items-center gap-1 font-mono font-semibold px-2.5 py-1 rounded-xl bg-muted/60 text-foreground"
                            >
                              <Clock className="size-3 text-[#f57c00]" />
                              {report.refreshesToday}/{report.totalScheduledToday > 0 ? report.totalScheduledToday : '—'}
                            </span>
                          </td>

                          {/* Status da Última Atualização */}
                          <td className="py-3 px-4">
                            {isRef ? (
                              <span className="inline-flex items-center gap-1.5 text-blue-600 font-semibold px-2 py-1 rounded-lg bg-blue-50 border border-blue-200">
                                <RefreshCw className="size-3 animate-spin text-blue-600" />
                                Em andamento...
                              </span>
                            ) : hasSucceeded ? (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                                  Concluída
                                </span>
                                <span className="text-[11px] text-muted-foreground" title={formatExactPtBr(report.lastRefreshTime)}>
                                  {formatDistancePtBr(report.lastRefreshTime)}
                                </span>
                              </div>
                            ) : hasFailed ? (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-1.5 text-red-700 font-semibold">
                                  <AlertTriangle className="size-3.5 text-red-600" />
                                  Falhou
                                </span>
                                <span className="text-[11px] text-muted-foreground" title={formatExactPtBr(report.lastRefreshTime)}>
                                  {formatDistancePtBr(report.lastRefreshTime)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic text-[11px]">Nenhum histórico recente</span>
                            )}
                          </td>

                          {/* Ações */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botão Ver Motivo de Falha */}
                              {hasFailed && report.error && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedError({ reportTitle: report.title, ...report.error })}
                                  className="h-7 px-2 text-[11px] font-semibold text-red-700 border-red-200 bg-red-50 hover:bg-red-100 flex items-center gap-1"
                                  title="Inspecionar detalhes técnicos da falha"
                                >
                                  <Info className="size-3" />
                                  Ver Erro
                                </Button>
                              )}

                              {/* Botão Atualizar Agora */}
                              <Button
                                size="sm"
                                onClick={() => handleTriggerSingle(report.id)}
                                disabled={isRef || refreshingId !== null}
                                className={cn(
                                  "h-7 px-2.5 text-[11px] font-semibold flex items-center gap-1.5",
                                  isRef
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-[#e0f2fe] text-[#0369a1] hover:bg-[#bae6fd]"
                                )}
                                title={isRef ? "Atualização já em andamento" : "Forçar atualização deste dataset no Power BI"}
                              >
                                <RefreshCw className={cn("size-3", isRef && "animate-spin")} />
                                {isRef ? 'Atualizando...' : 'Atualizar'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center text-xs text-muted-foreground">
            <div>
              Exibindo <strong>{filteredReports.length}</strong> de <strong>{enrichedReports.length}</strong> relatórios monitorados.
              {data?.updatedAt && (
                <span className="ml-2 opacity-80">
                  (Última consulta às {format(new Date(data.updatedAt), 'HH:mm:ss')})
                </span>
              )}
            </div>

            <Button onClick={onClose} style={{ background: '#f57c00' }} size="sm">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Secundário de Detalhes da Falha Técnica */}
      {selectedError && (
        <Dialog open={!!selectedError} onOpenChange={(open) => { if (!open) setSelectedError(null); }}>
          <DialogContent className="max-w-2xl !z-[10000010]" overlayClassName="!z-[10000009]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="size-5 text-red-600" />
                Diagnóstico de Falha na Atualização
              </DialogTitle>
              <DialogDescription>
                Relatório: <strong>{selectedError.reportTitle}</strong>
                {selectedError.endTime && (
                  <> • Tentativa em: {formatExactPtBr(selectedError.endTime)}</>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Código do Erro:</span>
                <div className="mt-1 font-mono text-xs bg-muted/60 p-2.5 rounded-lg text-foreground font-semibold">
                  {selectedError.errorCode || 'Desconhecido'}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mensagem da Fonte / Power BI:</span>
                <div className="mt-1 font-mono text-xs bg-red-50 text-red-900 border border-red-200 p-3.5 rounded-lg max-h-64 overflow-y-auto whitespace-pre-wrap break-all select-all">
                  {selectedError.errorDescription || 'Nenhuma descrição detalhada retornada.'}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 flex justify-between items-center sm:justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const textToCopy = `Falha na Atualização do BI: ${selectedError.reportTitle}\nData: ${selectedError.endTime || ''}\nCódigo: ${selectedError.errorCode || ''}\nErro: ${selectedError.errorDescription || ''}`;
                  navigator.clipboard.writeText(textToCopy);
                  setHasCopiedError(true);
                  toast.success('Detalhes copiados para a área de transferência!');
                  setTimeout(() => setHasCopiedError(false), 2500);
                }}
                className="flex items-center gap-1.5"
              >
                {hasCopiedError ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                {hasCopiedError ? 'Copiado!' : 'Copiar Detalhes'}
              </Button>

              <Button onClick={() => setSelectedError(null)} style={{ background: '#f57c00' }}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
