import React, { useId, useState } from 'react';
import { Clock } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './popover';
import { Button } from './button';

// Campo de horário no visual do app: botão + popover com hora/minuto, em vez do
// seletor nativo do navegador. `value`/`onSelect` trabalham com string 'HH:mm'.
export const TimeField = ({ label, icon, value, onSelect, disabled = false, className }) => {
    const Icon = icon || Clock;
    const [open, setOpen] = useState(false);
    const id = useId();
    const [h, m] = (value || '00:00').split(':');

    return (
        <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={`flex min-h-[62px] w-full flex-col justify-center rounded-[20px] border border-border bg-secondary px-4 py-2.5 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-secondary ${className || ''}`}
                >
                    {label && <span className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">{label}</span>}
                    <span className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
                        <Icon className="size-[18px] text-primary" /> {value || '--:--'}
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-60 text-center">
                <span className="mb-4 block text-xs font-bold uppercase tracking-wide text-primary">Definir Horário</span>
                <div className="mb-5 flex items-center justify-center gap-2">
                    <input type="text" maxLength={2} defaultValue={h} id={`h-${id}`} className="h-16 w-[68px] rounded-2xl border border-border bg-card text-center text-2xl font-bold text-foreground outline-none" />
                    <span className="text-2xl font-light text-muted-foreground">:</span>
                    <input type="text" maxLength={2} defaultValue={m} id={`m-${id}`} className="h-16 w-[68px] rounded-2xl border border-border bg-card text-center text-2xl font-bold text-foreground outline-none" />
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button
                        size="sm"
                        onClick={() => {
                            const hVal = document.getElementById(`h-${id}`).value || '00';
                            const mVal = document.getElementById(`m-${id}`).value || '00';
                            onSelect(`${hVal.padStart(2, '0')}:${mVal.padStart(2, '0')}`);
                            setOpen(false);
                        }}
                    >
                        OK
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};
