import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { CalendarDays, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';

export const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleDevLogin = () => {
    localStorage.setItem('kairos_logged_user', 'admin');
    localStorage.setItem('kairos_user_role', 'ADMIN');
    window.location.reload();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    const result = await onLogin(username, password);
    if (!result.success) {
      toast.error(result.reason === 'connection_error' ? 'Erro de conexão.' : 'Utilizador ou senha inválidos.');
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center p-4" style={{ background: 'var(--bg-page)' }}>
      <Card className="w-full max-w-[380px] shadow-2xl">
        <CardHeader className="items-center pb-2 pt-8 text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <CalendarDays className="size-7 text-primary" />
          </div>
          <h2 className="text-xl font-extrabold" style={{ color: 'var(--text-title)' }}>Portal Kairós</h2>
          <p className="text-[13px] text-muted-foreground">Entre com suas credenciais para continuar</p>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-user">Utilizador</Label>
              <Input id="login-user" type="text" placeholder="Utilizador" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-pass">Senha</Label>
              <Input id="login-pass" type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={isAuthenticating} className="mt-1 w-full">
              {isAuthenticating ? <><Loader2 className="size-4 animate-spin" /> A validar...</> : 'Entrar'}
            </Button>
          </form>

          {window.location.hostname === 'localhost' && (
            <div className="mt-5 border-t border-dashed border-border pt-5 text-center">
              <p className="mb-2.5 text-xs text-muted-foreground">Modo Desenvolvimento</p>
              <Button type="button" variant="outline" size="sm" onClick={handleDevLogin}>
                Ignorar Login (Localhost)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
