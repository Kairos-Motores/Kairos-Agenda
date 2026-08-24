import { useState, useEffect } from 'react';

const countryCodes = [
  { code: '+55', flag: '🇧🇷', name: 'Brasil' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+1', flag: '🇺🇸', name: 'EUA' },
  { code: '+44', flag: '🇬🇧', name: 'Reino Unido' },
  { code: '+34', flag: '🇪🇸', name: 'Espanha' }
];

export const WhatsAppInput = ({ initialValue, onSave, userId }) => {
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    if (initialValue) {
      const country = countryCodes.find(c => initialValue.startsWith(c.code.replace('+', '')));
      if (country) {
        setSelectedCountry(country);
        setPhoneNumber(initialValue.replace(country.code.replace('+', ''), ''));
      } else {
        setPhoneNumber(initialValue);
      }
    }
  }, [initialValue]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-primary)', margin: 0 }}>
          <strong>Para receber alertas no WhatsApp:</strong><br />
          1. Guarda o teu número abaixo.<br />
          2. Clica no botão verde abaixo para abrir o robô.<br />
          3. Envia <strong>"Olá"</strong> para iniciar o vínculo.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
          O Teu Número
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={selectedCountry.code}
            onChange={(e) => setSelectedCountry(countryCodes.find(c => c.code === e.target.value))}
            style={{
              padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '16px', outline: 'none', flex: '0 0 auto'
            }}
          >
            {countryCodes.map(c => (
              <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
            ))}
          </select>

          <input
            type="tel"
            placeholder="98985..."
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
            style={{
              flex: '1 1 120px', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', minWidth: '0'
            }}
          />

          <button
            onClick={() => onSave(userId, `${selectedCountry.code.replace('+', '')}${phoneNumber}`)}
            className="icon-btn boing-effect"
            aria-label="Salvar número de WhatsApp"
            style={{ background: 'var(--text-accent)', color: 'white', width: '48px', height: '48px', borderRadius: '12px', flex: '0 0 auto' }}
          >
            <span className="material-symbols-rounded">save</span>
          </button>
        </div>
      </div>

      <a
        href="https://wa.me/5591933005886"
        target="_blank"
        rel="noopener noreferrer"
        className="boing-effect"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px', borderRadius: '16px',
          background: '#25D366', color: 'white', textDecoration: 'none', fontWeight: '700', fontSize: '14px',
          boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)'
        }}
      >
        <span className="material-symbols-rounded">smart_toy</span>
        Falar com Robô Kairós
      </a>
    </div>
  );
};
