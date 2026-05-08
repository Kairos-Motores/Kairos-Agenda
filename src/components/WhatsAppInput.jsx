const countryCodes = [
  { code: '+55', flag: '🇧🇷', name: 'Brasil' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+1', flag: '🇺🇸', name: 'EUA' },
  { code: '+44', flag: '🇬🇧', name: 'Reino Unido' },
  { code: '+34', flag: '🇪🇸', name: 'Espanha' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina' },
];

const WhatsAppInput = ({ initialValue, onSave, userId }) => {
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [phoneNumber, setPhoneNumber] = useState('');

  // Ao carregar, tenta separar o código do país do número (se já existir no banco)
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
        WHATSAPP PARA ALERTAS
      </label>
      <div style={{ display: 'flex', gap: '8px' }}>
        {/* Seletor de Bandeira/Código */}
        <select 
          value={selectedCountry.code}
          onChange={(e) => setSelectedCountry(countryCodes.find(c => c.code === e.target.value))}
          style={{
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          {countryCodes.map(c => (
            <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
          ))}
        </select>

        {/* Input do Número */}
        <input 
          type="tel"
          placeholder="(98) 90000-0000"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        
        <button 
          onClick={() => onSave(userId, `${selectedCountry.code.replace('+', '')}${phoneNumber}`)}
          className="icon-btn"
          style={{ background: 'var(--text-accent)', color: 'white', width: '44px' }}
        >
          <span className="material-symbols-rounded">save</span>
        </button>
      </div>
    </div>
  );
};