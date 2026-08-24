import { useState } from 'react';
import { toast } from 'react-hot-toast';

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
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-page)' }}>
      <form onSubmit={handleSubmit} style={{ padding: '40px', background: 'var(--bg-primary)', borderRadius: '16px', boxShadow: 'var(--shadow-hover)', width: '350px' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--text-title)', marginBottom: '30px', fontWeight: '600' }}>Portal Kairós</h2>
        <input type="text" placeholder="Utilizador" value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid var(--border-strong)', boxSizing: 'border-box', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s' }} />
        <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '25px', borderRadius: '8px', border: '1px solid var(--border-strong)', boxSizing: 'border-box', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s' }} />
        <button type="submit" disabled={isAuthenticating} className="boing-effect" style={{ width: '100%', padding: '12px', background: 'var(--text-accent)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
          {isAuthenticating ? 'A validar...' : 'Entrar'}
        </button>

        {window.location.hostname === 'localhost' && (
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px dashed var(--border-color)', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>Modo Desenvolvimento</p>
            <button
              type="button"
              onClick={handleDevLogin}
              style={{ background: 'none', border: '1px solid var(--text-accent)', color: 'var(--text-accent)', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}
            >
              Ignorar Login (Localhost)
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
