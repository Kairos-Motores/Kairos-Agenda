import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Bell, CheckCheck, Trash2, MessageSquare, Clock, Share2, ShieldCheck, CheckSquare, UserPlus } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'react-hot-toast';
import { parseFichaMeta } from '../utils/atividades';
import { parseListaNotificacoes } from '../utils/automacoes';

const NOTIFICACOES_STORAGE_KEY = 'kairos_notificacoes_recentes';
const NOTIFICACOES_LIDAS_KEY = 'kairos_notificacoes_lidas_ids';
const NOTIFICACOES_OCULTAS_KEY = 'kairos_notificacoes_ocultas_ids';
const API_PROXY = '/api/dataverse-proxy';

const ICONES_TIPO = {
  mencao: <MessageSquare className="size-4 text-purple-500 shrink-0" />,
  evento_proximo: <Clock className="size-4 text-amber-500 shrink-0" />,
  compartilhamento: <Share2 className="size-4 text-emerald-500 shrink-0" />,
  cogerente: <ShieldCheck className="size-4 text-blue-500 shrink-0" />,
  subtask: <CheckSquare className="size-4 text-amber-500 shrink-0" />,
  convite: <UserPlus className="size-4 text-blue-500 shrink-0" />,
  padrao: <Bell className="size-4 text-primary shrink-0" />
};

const lerSetLocal = (key) => {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || '[]'));
  } catch {
    return new Set();
  }
};

const salvarSetLocal = (key, setVal) => {
  try {
    localStorage.setItem(key, JSON.stringify([...setVal].slice(-300)));
  } catch { /* sem localStorage */ }
};

export const NotificationBell = ({ user }) => {
  const [notificacoesLocais, setNotificacoesLocais] = useState([]);
  const [notificacoesRemotas, setNotificacoesRemotas] = useState([]);
  const [lidasIds, setLidasIds] = useState(() => lerSetLocal(NOTIFICACOES_LIDAS_KEY));
  const [ocultasIds, setOcultasIds] = useState(() => lerSetLocal(NOTIFICACOES_OCULTAS_KEY));
  const [aberto, setAberto] = useState(false);
  const vistasRemotasRef = useRef(new Set());
  const primeiraCargaRemotaRef = useRef(true);

  const carregarNotificacoes = useCallback(() => {
    try {
      const salvas = JSON.parse(localStorage.getItem(NOTIFICACOES_STORAGE_KEY) || '[]');
      const minhas = salvas.filter(n => !n.destinatario || n.destinatario.toLowerCase() === (user || '').toLowerCase());
      setNotificacoesLocais(minhas);
    } catch {
      setNotificacoesLocais([]);
    }
  }, [user]);

  // Busca notificações persistidas na nuvem (Dataverse) para este usuário (atribuições de subtasks, lembretes, convites)
  const carregarNotificacoesRemotas = useCallback(async () => {
    const userLower = String(user || '').trim().toLowerCase();
    if (!userLower || (typeof document !== 'undefined' && document.hidden)) return;
    try {
      const termo = `"para":"${userLower}"`;
      const filtroFicha = encodeURIComponent(`contains(cr4a1_atividades, '${termo}')`);
      const filtroLista = encodeURIComponent(`contains(cr4a1_automacao, '${termo}')`);
      const [resFichas, resListas] = await Promise.all([
        fetch(`${API_PROXY}?table=cr4a1_fichas&$select=cr4a1_fichaid,cr4a1_atividades&$filter=${filtroFicha}`).then(r => r.ok ? r.json() : { value: [] }).catch(() => ({ value: [] })),
        fetch(`${API_PROXY}?table=cr4a1_listas&$select=cr4a1_listaid,cr4a1_automacao&$filter=${filtroLista}`).then(r => r.ok ? r.json() : { value: [] }).catch(() => ({ value: [] }))
      ]);

      const coletadas = [];
      for (const f of (resFichas.value || [])) {
        const meta = parseFichaMeta(f.cr4a1_atividades);
        for (const n of (meta.notificacoesInbox || [])) {
          if (n && n.id && String(n.para || '').toLowerCase() === userLower) {
            coletadas.push(n);
          }
        }
      }
      for (const l of (resListas.value || [])) {
        const inbox = parseListaNotificacoes(l.cr4a1_automacao);
        for (const n of inbox) {
          if (n && n.id && String(n.para || '').toLowerCase() === userLower) {
            coletadas.push(n);
          }
        }
      }

      // Dispara toast apenas para notificações recém-chegadas após a carga inicial
      if (!primeiraCargaRemotaRef.current) {
        const lidasAtuais = lerSetLocal(NOTIFICACOES_LIDAS_KEY);
        const ocultasAtuais = lerSetLocal(NOTIFICACOES_OCULTAS_KEY);
        for (const item of coletadas) {
          if (!vistasRemotasRef.current.has(item.id) && !lidasAtuais.has(item.id) && !ocultasAtuais.has(item.id)) {
            toast(item.mensagem || item.titulo, {
              icon: item.tipo === 'subtask' ? '✅' : item.tipo === 'convite' ? '🎟️' : item.tipo === 'evento_proximo' ? '⏰' : '🔔',
              duration: 6000
            });
          }
        }
      }
      coletadas.forEach(item => vistasRemotasRef.current.add(item.id));
      primeiraCargaRemotaRef.current = false;

      setNotificacoesRemotas(coletadas);
    } catch { /* falha silenciosa no polling do sininho */ }
  }, [user]);

  useEffect(() => {
    carregarNotificacoes();
    carregarNotificacoesRemotas();

    const handleNovaNotificacao = (e) => {
      const item = e.detail;
      if (!item) return;
      if (!item.destinatario || item.destinatario.toLowerCase() === (user || '').toLowerCase()) {
        carregarNotificacoes();
        toast(item.mensagem || item.titulo, {
          icon: item.tipo === 'mencao' ? '💬' : item.tipo === 'evento_proximo' ? '⏰' : item.tipo === 'cogerente' ? '⭐' : item.tipo === 'subtask' ? '✅' : item.tipo === 'convite' ? '🎟️' : '🔔',
          duration: 6000
        });
      }
    };

    window.addEventListener('kairos:nova_notificacao', handleNovaNotificacao);
    window.addEventListener('storage', carregarNotificacoes);
    const timerRemoto = setInterval(carregarNotificacoesRemotas, 30000);

    return () => {
      window.removeEventListener('kairos:nova_notificacao', handleNovaNotificacao);
      window.removeEventListener('storage', carregarNotificacoes);
      clearInterval(timerRemoto);
    };
  }, [user, carregarNotificacoes, carregarNotificacoesRemotas]);

  const notificacoes = useMemo(() => {
    const mapa = new Map();
    for (const item of [...notificacoesRemotas, ...notificacoesLocais]) {
      if (!item?.id || ocultasIds.has(item.id)) continue;
      if (!mapa.has(item.id)) {
        mapa.set(item.id, {
          ...item,
          lida: Boolean(item.lida) || lidasIds.has(item.id)
        });
      }
    }
    return [...mapa.values()]
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      .slice(0, 50);
  }, [notificacoesLocais, notificacoesRemotas, lidasIds, ocultasIds]);

  const naoLidas = useMemo(() => {
    return notificacoes.filter(n => !n.lida).length;
  }, [notificacoes]);

  const marcarTodasComoLidas = () => {
    try {
      const novoSetLidas = new Set(lidasIds);
      notificacoes.forEach(n => { if (n.id) novoSetLidas.add(n.id); });
      setLidasIds(novoSetLidas);
      salvarSetLocal(NOTIFICACOES_LIDAS_KEY, novoSetLidas);

      const salvas = JSON.parse(localStorage.getItem(NOTIFICACOES_STORAGE_KEY) || '[]');
      const atualizadas = salvas.map(n => {
        if (!n.destinatario || n.destinatario.toLowerCase() === (user || '').toLowerCase()) {
          return { ...n, lida: true };
        }
        return n;
      });
      localStorage.setItem(NOTIFICACOES_STORAGE_KEY, JSON.stringify(atualizadas));
      carregarNotificacoes();
    } catch (err) {
      console.error(err);
    }
  };

  const limparNotificacoes = () => {
    try {
      const novoSetOcultas = new Set(ocultasIds);
      notificacoes.forEach(n => { if (n.id) novoSetOcultas.add(n.id); });
      setOcultasIds(novoSetOcultas);
      salvarSetLocal(NOTIFICACOES_OCULTAS_KEY, novoSetOcultas);

      const salvas = JSON.parse(localStorage.getItem(NOTIFICACOES_STORAGE_KEY) || '[]');
      const restantes = salvas.filter(n => n.destinatario && n.destinatario.toLowerCase() !== (user || '').toLowerCase());
      localStorage.setItem(NOTIFICACOES_STORAGE_KEY, JSON.stringify(restantes));
      carregarNotificacoes();
      toast.success('Notificações limpas');
    } catch (err) {
      console.error(err);
    }
  };

  const formatarHora = (iso) => {
    if (!iso) return '';
    try {
      const data = new Date(iso);
      return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' • ' + data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-foreground hover:bg-secondary rounded-full size-9"
          aria-label="Notificações"
          title="Notificações e Alertas"
        >
          <Bell className="size-[19px]" />
          {naoLidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-extrabold text-destructive-foreground animate-pulse">
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 sm:w-96 max-w-[calc(100vw-24px)] p-0 shadow-2xl border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">Notificações</h3>
            {naoLidas > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                {naoLidas} nova(s)
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {notificacoes.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={marcarTodasComoLidas}
                  title="Marcar todas como lidas"
                  className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                >
                  <CheckCheck className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={limparNotificacoes}
                  title="Limpar histórico"
                  className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
          {notificacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-2">
              <Bell className="size-8 opacity-30" />
              <p className="text-xs">Tudo tranquilo por aqui!<br />Nenhuma notificação no momento.</p>
            </div>
          ) : (
            notificacoes.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3 transition-colors ${item.lida ? 'opacity-70 bg-card hover:bg-secondary/40' : 'bg-primary/5 hover:bg-primary/10'}`}
              >
                <div className="mt-0.5">
                  {ICONES_TIPO[item.tipo] || ICONES_TIPO.padrao}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs font-bold text-foreground truncate">{item.titulo}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatarHora(item.timestamp)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {item.mensagem}
                  </p>
                </div>
                {!item.lida && (
                  <span className="size-2 rounded-full bg-primary shrink-0 mt-1" />
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
