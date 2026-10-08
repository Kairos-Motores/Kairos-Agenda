import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './popover';

// selectedDate deveria vir sempre como 'yyyy-MM-dd', mas alguns registros antigos/externos
// guardam datetime completo (ou lixo) — sem essa checagem, `format()` do date-fns estoura
// RangeError: Invalid time value e derruba a tela inteira.
const parseDataSegura = (str) => {
    if (!str) return null;
    const data = new Date(`${str}T12:00:00`);
    return isNaN(data.getTime()) ? null : data;
};

// Campo de data no visual do app (botão + calendário num popover), em vez do seletor
// nativo do navegador. `selectedDate`/`onSelect` trabalham sempre com string 'yyyy-MM-dd'.
export const DateField = ({
    label,
    icon,
    selectedDate,
    onSelect,
    formatValue,
    placeholder = 'Selecionar data',
    allowClear = false,
    disabled = false,
    className
}) => {
    const Icon = icon || CalendarDays;
    const [open, setOpen] = useState(false);
    const [pickerMonth, setPickerMonth] = useState(() => parseDataSegura(selectedDate) || new Date());

    const dataValida = parseDataSegura(selectedDate);
    const display = selectedDate
        ? (formatValue ? formatValue(selectedDate) : (dataValida ? format(dataValida, 'dd/MM/yyyy') : 'Data inválida'))
        : placeholder;

    return (
        <Popover open={open} onOpenChange={(o) => { if (disabled) return; setOpen(o); if (o) setPickerMonth(parseDataSegura(selectedDate) || new Date()); }}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={`flex min-h-[62px] w-full flex-col justify-center rounded-[20px] border border-border bg-secondary px-4 py-2.5 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-secondary ${className || ''}`}
                >
                    {label && <span className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">{label}</span>}
                    <span className={`flex items-center gap-2 text-[15px] font-semibold ${selectedDate ? 'text-foreground' : 'text-muted-foreground'}`}>
                        <Icon className="size-[18px] text-primary" /> {display}
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[270px] p-4">
                <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-bold capitalize text-foreground">{format(pickerMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                    <div className="flex gap-1">
                        <button onClick={() => setPickerMonth(subMonths(pickerMonth, 1))} aria-label="Mês anterior" className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"><ChevronLeft className="size-4" /></button>
                        <button onClick={() => setPickerMonth(addMonths(pickerMonth, 1))} aria-label="Próximo mês" className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"><ChevronRight className="size-4" /></button>
                    </div>
                </div>
                <div className="mb-2 grid grid-cols-7 text-center">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <span key={i} className="text-[11px] font-bold text-muted-foreground">{d}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {eachDayOfInterval({ start: startOfWeek(startOfMonth(pickerMonth)), end: endOfWeek(endOfMonth(pickerMonth)) }).map((day, i) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const isSelected = selectedDate === dateStr;
                        const isCurrentMonth = day.getMonth() === pickerMonth.getMonth();
                        return (
                            <button
                                key={i}
                                onClick={() => { onSelect(dateStr); setOpen(false); }}
                                className={`flex size-[34px] items-center justify-center rounded-full text-xs font-bold transition-transform active:scale-90 ${isSelected ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary'} ${isCurrentMonth ? '' : 'opacity-30'}`}
                            >
                                {format(day, 'd')}
                            </button>
                        );
                    })}
                </div>
                {allowClear && selectedDate && (
                    <button
                        onClick={() => { onSelect(''); setOpen(false); }}
                        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary"
                    >
                        <X className="size-3.5" /> Limpar data
                    </button>
                )}
            </PopoverContent>
        </Popover>
    );
};
