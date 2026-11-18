import { useState, useMemo, useEffect } from 'react';
import { Building2, ArrowLeftRight, Check, Loader2, ShieldCheck, X } from 'lucide-react';
import { UNITS_KAIROS, canBorrowUnit, checkAccess, parseUnidadesEmprestimo } from '../utils/permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { cn } from '@/lib/utils';

export const EmprestimoUnidadeModal = ({
  isOpen,
  onClose,
  currentUser,
  userRole,
  allUsers = [],
  onSave
}) => {
  const podeGerenciarOutros = checkAccess(userRole, ['ADMIN', 'DIRETORIA']);
  const meuLogin = currentUser?.cr4a1_username || '';

  const [selectedUsername, setSelectedUsername] = useState(meuLogin);
  const [unidadesSelecionadas, setUnidadesSelecionadas] = useState([]);
  const [salvando, setSalvando] = useState(false);

  // Usuários elegíveis (ADMIN, DIRETORIA e COORD) caso ADMIN/DIRETORIA queira gerenciar para outro colega
  const usuariosElegiveis = useMemo(() => {
    if (!podeGerenciarOutros) return currentUser ? [currentUser] : [];
    return (allUsers || [])
      .filter(u => canBorrowUnit(u.cr4a1_role))
      .sort((a, b) => (a.cr4a1_nome_exibicao || a.cr4a1_username || '').localeCompare(b.cr4a1_nome_exibicao || b.cr4a1_username || '', 'pt-BR'));
  }, [allUsers, currentUser, podeGerenciarOutros]);

  const usuarioAlvo = useMemo(() => {
    const alvoLower = String(selectedUsername || meuLogin).trim().toLowerCase();
    return allUsers.find(u => String(u.cr4a1_username || '').trim().toLowerCase() === alvoLower) || currentUser;
  }, [allUsers, selectedUsername, meuLogin, currentUser]);

  const unidadeOrigem = (usuarioAlvo?.cr4a1_unidade || '').trim();

  // Sincroniza estado ao abrir o modal ou trocar o usuário alvo
  useEffect(() => {
    if (!isOpen) return;
    setSelectedUsername(meuLogin);
  }, [isOpen, meuLogin]);

  useEffect(() => {
    if (!isOpen || !usuarioAlvo) return;
    const emprestadas = parseUnidadesEmprestimo(usuarioAlvo.cr4a1_unidades_emprestimo || usuarioAlvo.unidadesEmprestimo)
      .filter(u => u.toLowerCase() !== unidadeOrigem.toLowerCase());
    setUnidadesSelecionadas(emprestadas);
  }, [isOpen, usuarioAlvo, unidadeOrigem]);

  const unidadesParaEmprestimo = useMemo(
    () => UNITS_KAIROS.filter(u => u.toLowerCase() !== unidadeOrigem.toLowerCase()),
    [unidadeOrigem]
  );

  const toggleUnidade = (unidade) => {
    setUnidadesSelecionadas(prev =>
      prev.includes(unidade) ? prev.filter(u => u !== unidade) : [...prev, unidade]
    );
  };

  const handleSalvar = async () => {
    if (!usuarioAlvo?.cr4a1_username) return;
    setSalvando(true);
    try {
      const res = await onSave(usuarioAlvo.cr4a1_username, unidadesSelecionadas);
      if (res?.success) {
        onClose();
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !salvando) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="size-5 text-primary" />
            Empréstimo de Unidade
          </DialogTitle>
          <DialogDescription>
            Acesse menus, workspaces e painéis de outras unidades sem alterar a sua unidade principal no sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {podeGerenciarOutros && usuariosElegiveis.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Colaborador (ADMIN / DIRETORIA / COORD)</Label>
              <Select value={usuarioAlvo?.cr4a1_username || meuLogin} onValueChange={setSelectedUsername}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione um colaborador..." />
                </SelectTrigger>
                <SelectContent>
                  {usuariosElegiveis.map(u => (
                    <SelectItem key={u.cr4a1_username} value={u.cr4a1_username}>
                      {u.cr4a1_nome_exibicao || u.cr4a1_username}
                      {u.cr4a1_username === meuLogin ? ' (Você)' : ''}
                      {u.cr4a1_unidade ? ` — ${u.cr4a1_unidade}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Unidade principal (sempre preservada) */}
          <div className="rounded-xl border border-border bg-secondary/50 p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="size-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Unidade Principal (Inalterada)
                </span>
                <span className="text-sm font-bold text-foreground truncate block">
                  {unidadeOrigem || 'Não definida'}
                </span>
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px] shrink-0 gap-1">
              <ShieldCheck className="size-3 text-primary" /> Origem
            </Badge>
          </div>

          {/* Seleção de unidades para empréstimo */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Unidades emprestadas para acesso</Label>
              {unidadesSelecionadas.length > 0 && (
                <button
                  type="button"
                  onClick={() => setUnidadesSelecionadas([])}
                  className="text-[11px] text-destructive hover:underline flex items-center gap-0.5 font-medium"
                >
                  <X className="size-3" /> Encerrar empréstimo
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              {unidadesParaEmprestimo.map(unit => {
                const selecionada = unidadesSelecionadas.includes(unit);
                return (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => toggleUnidade(unit)}
                    className={cn(
                      'flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm transition-all cursor-pointer',
                      selecionada
                        ? 'border-primary bg-primary/10 font-semibold text-foreground shadow-xs'
                        : 'border-border bg-card hover:bg-secondary/60 text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className={cn('size-4', selecionada ? 'text-primary' : 'text-muted-foreground')} />
                      <span>{unit}</span>
                    </div>
                    <div className={cn(
                      'flex size-5 items-center justify-center rounded-md border transition-colors',
                      selecionada ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30 bg-background'
                    )}>
                      {selecionada && <Check className="size-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed rounded-lg bg-secondary/30 p-2.5 border border-border/60">
            Sua unidade continuará aparecendo como <strong>{unidadeOrigem || 'sua unidade atual'}</strong> em todo o sistema, mas você poderá acessar workspaces, menus e painéis das unidades emprestadas acima.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSalvar} disabled={salvando} className="gap-1.5">
            {salvando && <Loader2 className="size-4 animate-spin" />}
            {salvando ? 'Salvando...' : 'Salvar Empréstimo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
