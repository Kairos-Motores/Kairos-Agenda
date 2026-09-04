import React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
    <SelectPrimitive.Trigger
        ref={ref}
        className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-secondary px-4 py-2 text-sm text-foreground transition-[border-color,box-shadow] duration-200 outline-none",
            "focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15",
            "disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
            className
        )}
        {...props}
    >
        {children}
        <SelectPrimitive.Icon asChild>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = 'SelectTrigger';

export const SelectContent = React.forwardRef(({ className, children, position = 'popper', ...props }, ref) => (
    <SelectPrimitive.Portal>
        <SelectPrimitive.Content
            ref={ref}
            position={position}
            className={cn(
                "relative z-[2100] max-h-72 min-w-[8rem] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl",
                "data-[state=open]:animate-[popover-in_0.2s_var(--ease-elastic)] data-[state=closed]:animate-[popover-out_0.15s_ease-in]",
                position === 'popper' && "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
                className
            )}
            {...props}
        >
            <SelectPrimitive.Viewport className={cn("p-1.5", position === 'popper' && "w-full min-w-[var(--radix-select-trigger-width)]")}>
                {children}
            </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
));
SelectContent.displayName = 'SelectContent';

export const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item
        ref={ref}
        className={cn(
            "relative flex w-full cursor-pointer select-none items-center rounded-xl py-2.5 pl-8 pr-3 text-sm text-foreground outline-none transition-colors",
            "data-[highlighted]:bg-secondary data-[state=checked]:font-semibold data-[state=checked]:text-primary",
            className
        )}
        {...props}
    >
        <span className="absolute left-2.5 flex size-3.5 items-center justify-center">
            <SelectPrimitive.ItemIndicator>
                <Check className="size-4 text-primary" />
            </SelectPrimitive.ItemIndicator>
        </span>
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
));
SelectItem.displayName = 'SelectItem';
