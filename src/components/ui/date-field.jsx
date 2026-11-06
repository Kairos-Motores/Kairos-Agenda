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
    className,
    compact = false
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
                {compact ? (
                    <button
                        type="button"
                        disabled={disabled}
                        className={`flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs transition-colors hover:bg-secondary/50 text-left disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
                    >
                        <span className="flex items-center gap-2 truncate">
                            <Icon className="size-3.5 text-primary shrink-0" />
                            <span className={selectedDate ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                                {display}
                            </span>
                        </span>
                        {allowClear && selectedDate && (
                            <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => { e.stopPropagation(); onSelect(''); }}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onSelect(''); } }}
                                className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer ml-1 shrink-0"
                                title="Limpar data"
                            >
                                <X className="size-3" />
                            </span>
                        )}
                    </button>
                ) : (
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
                )}
            </PopoverTrigger>
            <PopoverContent className="w-[270px] p-4" align="start">
                <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-bold capitalize text-foreground">{format(pickerMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                    <div className="flex gap-1">
                        <button type="button" onClick={() => setPickerMonth(subMonths(pickerMonth, 1))} aria-label="Mês anterior" className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"><ChevronLeft className="size-4" /></button>
                        <button type="button" onClick={() => setPickerMonth(addMonths(pickerMonth, 1))} aria-label="Próximo mês" className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"><ChevronRight className="size-4" /></button>
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
                        const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => { onSelect(dateStr); setOpen(false); }}
                                className={`flex size-[34px] items-center justify-center rounded-full text-xs font-bold transition-transform active:scale-90 ${isSelected ? 'bg-primary text-primary-foreground shadow-xs' : (isToday ? 'border border-primary text-primary hover:bg-primary/10' : 'text-foreground hover:bg-secondary')} ${isCurrentMonth ? '' : 'opacity-30'}`}
                            >
                                {format(day, 'd')}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                    <button
                        type="button"
                        onClick={() => { const todayStr = format(new Date(), 'yyyy-MM-dd'); onSelect(todayStr); setOpen(false); }}
                        className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                    >
                        Hoje
                    </button>
                    {allowClear && selectedDate && (
                        <button
                            type="button"
                            onClick={() => { onSelect(''); setOpen(false); }}
                            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                            <X className="size-3" /> Limpar
                        </button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};
