import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from './input';
import { cn } from '@/lib/utils';

// Campo de filtro padrão do app: ícone de lupa, botão para limpar e mesmo visual em
// todas as telas. Recebe o valor e um onChange que já entrega a string (não o evento).
export const SearchField = ({ value, onChange, placeholder = 'Pesquisar...', className, inputClassName }) => (
  <div className={cn('relative', className)}>
    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn('pl-10 pr-10 [&::-webkit-search-cancel-button]:appearance-none', inputClassName)}
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Limpar pesquisa"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    )}
  </div>
);
