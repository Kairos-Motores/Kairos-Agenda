import { useEffect } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

export const DayVisitasModal = ({ isOpen, onClose, visitas, onEditVisita, allUsers = [] }) => {
  const isReallyOpen = !!(isOpen && visitas && visitas.length > 0);
  const trapRef = useFocusTrap(isReallyOpen);

  useEffect(() => {
    if (!isReallyOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isReallyOpen, onClose]);

  if (!isReallyOpen) return null;

  const getUserName = (login) => {
    const user = allUsers.find(u => u.cr4a1_username === login);
    return user?.cr4a1_nome_exibicao || login;
  };

  const getVisitaTime = (v) => {
    if (v.originalData?.cr4a1_dataconexao) {
      const d = new Date(v.originalData.cr4a1_dataconexao);
      if (!isNaN(d)) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return v.cr4a1_hora_inicio || '08:00';
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10600, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div ref={trapRef} tabIndex={-1} className="modal-content view-enter" style={{ width: '90%', maxWidth: '400px', background: 'var(--bg-primary)', borderRadius: '24px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: 'var(--text-title)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded" style={{ color: '#f57c00' }}>view_agenda</span>
            Visitas do Dia
          </h3>
          <button onClick={onClose} className="icon-btn boing-effect" aria-label="Fechar" style={{ color: 'var(--text-primary)' }}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
          {visitas.map((v, idx) => (
            <div
              key={v.cr4a1_agenda_kairosid || idx}
              onClick={() => {
                onEditVisita(v);
                onClose();
              }}
              style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'var(--bg-secondary)',
                cursor: 'pointer',
                transition: 'background 0.2s, transform 0.2s',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
              className="boing-effect"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: '700', color: 'var(--text-title)', fontSize: '15px' }}>
                  {v.cr4a1_titulo.replace('📍 Visita: ', '')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff3e0', color: '#f57c00', padding: '4px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>schedule</span>
                  {getVisitaTime(v)}
                </div>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>person</span>
                {getUserName(v.cr4a1_user_login)}
              </div>

              {(v.originalData?.cr4a1_motivo || v.originalData?.cr4a1_filial) && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                  {v.originalData?.cr4a1_motivo && (
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Motivo:</strong> {v.originalData.cr4a1_motivo}
                    </div>
                  )}
                  {v.originalData?.cr4a1_filial && (
                    <div>
                      <strong>Unidade:</strong> {v.originalData.cr4a1_filial}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
