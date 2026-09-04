import React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef(({ className, type, ...props }, ref) => (
    <input
        ref={ref}
        type={type}
        className={cn(
            "flex h-11 w-full rounded-xl border border-border bg-secondary px-4 py-2 text-sm text-foreground transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-muted-foreground",
            "focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
        )}
        {...props}
    />
));
Input.displayName = 'Input';
