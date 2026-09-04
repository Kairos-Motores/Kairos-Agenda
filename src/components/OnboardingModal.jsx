import { useState } from 'react';
import { Building2, Loader2, Check } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export const OnboardingModal = ({ user, onSaveUnit }) => {
  const [selectedUnit, setSelectedUnit] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const units = ['São Luís', 'Barcarena', 'Parauapebas', 'São José dos Campos', 'Aveiro'];

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4" style={{ background: 'var(--bg-page)' }}>
      <Card className="w-full max-w-[400px] text-center shadow-2xl">
        <CardContent className="p-8">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <Building2 className="size-8 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-extrabold" style={{ color: 'var(--text-title)' }}>Bem-vindo à Kairós!</h2>
          <p className="mb-6 text-sm text-muted-foreground">Seleciona a tua unidade:</p>

          <div className="mb-6 flex flex-col gap-2">
            {units.map(unit => (
              <button
                key={unit}
                onClick={() => setSelectedUnit(unit)}
                className={cn(
                  "boing-effect flex items-center justify-between rounded-xl border px-4 py-3.5 text-sm transition-colors",
                  selectedUnit === unit
                    ? "border-2 border-primary bg-primary/10 font-bold text-foreground"
                    : "border-border bg-secondary font-medium text-foreground"
                )}
              >
                {unit}
                {selectedUnit === unit && <Check className="size-4 text-primary" />}
              </button>
            ))}
          </div>

          <Button
            disabled={!selectedUnit || isLoading}
            onClick={() => onSaveUnit(selectedUnit, setIsLoading)}
            className="w-full"
            size="lg"
          >
            {isLoading ? <><Loader2 className="size-4 animate-spin" /> Configurando ambiente...</> : 'Confirmar e Entrar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
