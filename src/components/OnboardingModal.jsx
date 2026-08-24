import { useState } from 'react';

export const OnboardingModal = ({ user, onSaveUnit }) => {
  const [selectedUnit, setSelectedUnit] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const units = ['São Luís', 'Barcarena', 'Parauapebas', 'São José dos Campos', 'Aveiro'];

  return (
    <div className="modal-overlay" style={{ zIndex: 20000, backgroundColor: 'var(--bg-page)' }}>
      <div className="modal-content" style={{ maxWidth: '400px', width: '90%', textAlign: 'center', padding: '40px', borderRadius: '32px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: '48px' }}>🏢</span>
        <h2 style={{ margin: '20px 0 10px', color: 'var(--text-title)' }}>Bem-vindo à Kairós!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '14px' }}>Seleciona a tua unidade:</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
          {units.map(unit => (
            <button key={unit} onClick={() => setSelectedUnit(unit)} className="boing-effect" style={{ padding: '14px', borderRadius: '12px', border: selectedUnit === unit ? '2px solid var(--text-accent)' : '1px solid var(--border-color)', background: selectedUnit === unit ? 'var(--bg-tertiary)' : 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: selectedUnit === unit ? '700' : '500' }}>{unit}</button>
          ))}
        </div>

        <button
          disabled={!selectedUnit || isLoading}
          onClick={() => onSaveUnit(selectedUnit, setIsLoading)}
          className="btn-primary boing-effect"
          style={{ width: '100%', padding: '16px', opacity: (selectedUnit && !isLoading) ? 1 : 0.5 }}
        >
          {isLoading ? 'Configurando ambiente...' : 'Confirmar e Entrar'}
        </button>
      </div>
    </div>
  );
};
