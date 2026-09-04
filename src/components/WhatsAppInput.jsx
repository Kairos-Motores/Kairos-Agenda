import { useState, useEffect } from 'react';
import { Save, Bot } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';

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
    <div className="flex w-full flex-col gap-4">
      <div className="rounded-2xl border border-border bg-secondary p-4">
        <p className="m-0 text-[13px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          <strong>Para receber alertas no WhatsApp:</strong><br />
          1. Guarda o teu número abaixo.<br />
          2. Clica no botão verde abaixo para abrir o robô.<br />
          3. Envia <strong>"Olá"</strong> para iniciar o vínculo.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>O Teu Número</Label>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedCountry.code} onValueChange={(v) => setSelectedCountry(countryCodes.find(c => c.code === v))}>
            <SelectTrigger className="w-auto flex-none">
              <SelectValue>{selectedCountry.flag} {selectedCountry.code}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {countryCodes.map(c => (
                <SelectItem key={c.code} value={c.code}>{c.flag} {c.code} · {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="tel"
            placeholder="98985..."
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
            className="min-w-0 flex-1 basis-[120px]"
          />

          <Button
            onClick={() => onSave(userId, `${selectedCountry.code.replace('+', '')}${phoneNumber}`)}
            size="icon"
            aria-label="Salvar número de WhatsApp"
            className="size-12 shrink-0 rounded-xl"
          >
            <Save className="size-5" />
          </Button>
        </div>
      </div>

      <a
        href="https://wa.me/5591933005886"
        target="_blank"
        rel="noopener noreferrer"
        className="boing-effect flex items-center justify-center gap-3 rounded-2xl px-4 py-4 text-sm font-bold text-white no-underline"
        style={{ background: '#25D366', boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)' }}
      >
        <Bot className="size-5" />
        Falar com Robô Kairós
      </a>
    </div>
  );
};
