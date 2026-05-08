const WhatsAppInput = ({ initialValue, onSave, userId }) => {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
        WhatsApp para Lembretes
      </label>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'auto 1fr auto', // Colunas: Automática (Bandeira) | Flexível (Número) | Automática (Botão)
        gap: '8px', 
        alignItems: 'center' 
      }}>
        
        {/* Seletor de País */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '0 12px',
          background: 'var(--bg-secondary)',
          borderRadius: '14px',
          border: '1px solid var(--border-color)',
          height: '48px',
          boxSizing: 'border-box'
        }}>
          <img 
            src={`https://flagcdn.com/w40/${selectedCountry.id}.png`} 
            width="20" 
            style={{ borderRadius: '2px', objectFit: 'cover' }}
          />
          <select 
            value={selectedCountry.code}
            onChange={(e) => setSelectedCountry(countryCodes.find(c => c.code === e.target.value))}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: '700',
              outline: 'none',
              cursor: 'pointer',
              width: '50px'
            }}
          >
            {countryCodes.map(c => (
              <option key={c.code} value={c.code} style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                {c.code}
              </option>
            ))}
          </select>
        </div>

        {/* Input do Número */}
        <input 
          type="tel"
          placeholder="DDD + Número"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
          style={{
            width: '100%',
            height: '48px',
            padding: '0 12px',
            borderRadius: '14px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '16px',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        
        {/* Botão Salvar */}
        <button 
          onClick={() => onSave(userId, `${selectedCountry.code.replace('+', '')}${phoneNumber}`)}
          style={{ 
            background: 'var(--text-accent)', 
            color: 'white', 
            height: '48px', 
            width: '48px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <span className="material-symbols-rounded">save</span>
        </button>
      </div>
    </div>
  );
};