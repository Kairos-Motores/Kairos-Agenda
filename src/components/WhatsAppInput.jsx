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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        WhatsApp para Lembretes
      </label>
      
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        flexWrap: 'wrap', // Mágica da responsividade
        alignItems: 'center' 
      }}>
        
        {/* Container de Seleção do País */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '10px 12px',
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          flex: '0 1 auto'
        }}>
          <img 
            src={`https://flagcdn.com/w40/${selectedCountry.id}.png`} 
            width="20" 
            alt={selectedCountry.name} 
            style={{ borderRadius: '2px' }}
          />
          <select 
            value={selectedCountry.code}
            onChange={(e) => setSelectedCountry(countryCodes.find(c => c.code === e.target.value))}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer',
              paddingRight: '4px'
            }}
          >
            {countryCodes.map(c => (
              <option key={c.code} value={c.code} style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                {c.code}
              </option>
            ))}
          </select>
        </div>

        {/* Input do Número - Cresce para ocupar o espaço */}
        <input 
          type="tel"
          placeholder="DDD + Número"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
          style={{
            flex: '1 1 180px', // Cresce e tem tamanho mínimo de 180px
            padding: '14px 16px',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '16px', // Previne zoom automático no iOS
            outline: 'none',
            minWidth: '150px'
          }}
        />
        
        {/* Botão de Salvar - No mobile ele pode expandir */}
        <button 
          onClick={() => onSave(userId, `${selectedCountry.code.replace('+', '')}${phoneNumber}`)}
          className="fab-btn" // Reutilizando sua classe de botão flutuante se quiser
          style={{ 
            background: 'var(--text-accent)', 
            color: 'white', 
            height: '48px', 
            minWidth: '48px',
            flex: '0 0 auto',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          <span className="material-symbols-rounded">save</span>
        </button>
      </div>
    </div>
  );
};