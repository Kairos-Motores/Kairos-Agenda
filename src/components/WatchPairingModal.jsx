import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Watch, RefreshCw, CheckCircle2, ShieldCheck, Clock, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';

export const WatchPairingModal = ({ isOpen, onClose, user, currentUser, userRole }) => {
  const [pin, setPin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const gerarPin = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/watch-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-pin',
          user,
          displayName: currentUser?.cr4a1_nome_exibicao || user,
          role: userRole
        })
      });
      const data = await res.json();
      if (data.success && data.pin) {
        setPin(data.pin);
        setTimeLeft(600); // 10 minutos
      } else {
        toast.error('Erro ao gerar código de pareamento.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao gerar código.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      gerarPin();
    } else {
      setPin(null);
      setTimeLeft(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Watch className="size-5 text-primary" />
            Conectar Galaxy Watch
          </DialogTitle>
          <DialogDescription>
            Conecte seu smartwatch Samsung Galaxy Watch à Agenda Kairós para acessar suas Fichas do Trello e Notas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4 text-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Gerando código de pareamento...</p>
            </div>
          ) : pin && timeLeft > 0 ? (
            <>
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 w-full">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold block mb-1">
                  Código de Pareamento
                </span>
                <div className="flex items-center justify-center gap-2 my-2">
                  {pin.split('').map((digito, i) => (
                    <span
                      key={i}
                      className="flex size-11 items-center justify-center rounded-xl border border-border bg-card text-2xl font-black text-foreground shadow-sm"
                    >
                      {digito}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-2">
                  <Clock className="size-3.5" />
                  <span>Válido por mais <strong>{formatTime(timeLeft)}</strong></span>
                </div>
              </div>

              <div className="flex flex-col gap-2 text-left text-xs text-muted-foreground bg-secondary/50 p-3.5 rounded-xl border border-border w-full">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-foreground">1.</span>
                  <span>Abra o app <strong>Kairos Motores</strong> no seu Galaxy Watch.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-foreground">2.</span>
                  <span>Digite os <strong>6 dígitos</strong> acima no teclado numérico do relógio.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-foreground">3.</span>
                  <span>Pronto! O relógio será vinculado permanentemente ao usuário <strong>{currentUser?.cr4a1_nome_exibicao || user}</strong>.</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-sm text-muted-foreground">O código anterior expirou.</p>
              <Button onClick={gerarPin} variant="outline" size="sm" className="gap-1.5">
                <RefreshCw className="size-4" /> Gerar Novo Código
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
          {pin && timeLeft > 0 && (
            <Button variant="ghost" size="sm" onClick={gerarPin} disabled={loading} className="gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="size-3.5" /> Gerar outro código
            </Button>
          )}
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
