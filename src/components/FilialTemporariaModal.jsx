import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { parseRoles } from '../utils/permissions';

export const FilialTemporariaModal = ({ isOpen, onClose, allUsers, onSave, mostrarTodos = false }) => {
  const trapRef = useFocusTrap(isOpen);
  const [selectedUser, setSelectedUser] = useState('');
  const [unidade, setUnidade] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const units = ['São Luís', 'Barcarena', 'Parauapebas', 'São José dos Campos', 'Aveiro'];

  const usuariosDisponiveis = useMemo(() => {
    if (mostrarTodos) return allUsers;
    return allUsers.filter(u => {
      const userRoles = parseRoles(u.cr4a1_role);
      return userRoles.includes('COMERCIAL');
    });
  }, [allUsers, mostrarTodos]);

  if (!isOpen) return null;

  const handleApply = async () => {
    if (!selectedUser || !unidade || !inicio || !fim) {
      toast.error("Preencha todos os campos do período temporário.");
      return;
    }
    const loadingToast = toast.loading("A aplicar transferência temporária...");
    const res = await onSave(selectedUser, { unidade, inicio, fim });
    if (res.success) {
      toast.success("Filial temporária aplicada e agendada no sistema!", { id: loadingToast });
      onClose();
    } else {
      toast.error("Erro ao sincronizar dados. Tente novamente.", { id: loadingToast });
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10500, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div ref={trapRef} tabIndex={-1} className="modal-content view-enter" style={{ width: '90%', maxWidth: '450px', background: 'var(--bg-primary)', borderRadius: '24px', padding: '32px', border: '1px solid var(--border-color)' }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-rounded" style={{ color: 'var(--text-accent)' }}>swap_horiz</span>
          Filial Temporária {mostrarTodos ? '(Todos)' : '(Comercial)'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group">
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Selecionar {mostrarTodos ? 'Funcionário' : 'Comercial'}
            </label>
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <option value="">Selecione um profissional...</option>
              {usuariosDisponiveis.map(u => (
                <option key={u.cr4a1_usuarios_agendaid} value={u.cr4a1_usuarios_agendaid}>
                  {u.cr4a1_nome_exibicao || u.cr4a1_username} ({u.cr4a1_unidade || 'Sem unidade'})
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Filial de Destino Temporário</label>
            <select value={unidade} onChange={e => setUnidade(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
              <option value="">Selecione a nova filial...</option>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Data Início</label>
              <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Data Fim</label>
              <input type="date" value={fim} onChange={e => setFim(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
          <button onClick={onClose} className="btn-secondary boing-effect" style={{ padding: '12px 20px', borderRadius: '12px' }}>Cancelar</button>
          <button onClick={handleApply} className="btn-primary boing-effect" style={{ padding: '12px 20px', borderRadius: '12px' }}>Aplicar Viagem</button>
        </div>
      </div>
    </div>
  );
};
