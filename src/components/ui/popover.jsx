import React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

export const PopoverContent = React.forwardRef(({ className, align = 'center', sideOffset = 6, collisionPadding = 16, ...props }, ref) => (
    <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
            ref={ref}
            align={align}
            sideOffset={sideOffset}
            collisionPadding={collisionPadding}
            className={cn(
                "z-[12100] w-72 max-w-[calc(100vw-1.5rem)] max-h-[82dvh] overflow-y-auto overscroll-contain rounded-[20px] border border-border/80 bg-card p-3.5 text-card-foreground shadow-2xl outline-none",
                "data-[state=open]:animate-[popover-in_0.2s_var(--ease-elastic)] data-[state=closed]:animate-[popover-out_0.15s_ease-in]",
                className
            )}
            {...props}
        />
    </PopoverPrimitive.Portal>
));
PopoverContent.displayName = 'PopoverContent';
