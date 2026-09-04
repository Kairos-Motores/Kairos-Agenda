import React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

export const Label = React.forwardRef(({ className, ...props }, ref) => (
    <LabelPrimitive.Root
        ref={ref}
        className={cn(
            "text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block select-none",
            className
        )}
        {...props}
    />
));
Label.displayName = 'Label';
