import React from 'react';
import { cn } from '@/lib/utils';

export const Textarea = React.forwardRef(({ className, ...props }, ref) => (
    <textarea
        ref={ref}
        className={cn(
            "flex min-h-[80px] w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-muted-foreground resize-y",
            "focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
        )}
        {...props}
    />
));
Textarea.displayName = 'Textarea';
