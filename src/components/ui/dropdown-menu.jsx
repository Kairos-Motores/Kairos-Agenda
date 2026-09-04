import React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export const DropdownMenuContent = React.forwardRef(({ className, sideOffset = 6, ...props }, ref) => (
    <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
                "z-[2100] min-w-[10rem] overflow-hidden rounded-2xl border border-border bg-card p-1.5 text-card-foreground shadow-xl",
                "data-[state=open]:animate-[popover-in_0.2s_var(--ease-elastic)] data-[state=closed]:animate-[popover-out_0.15s_ease-in]",
                className
            )}
            {...props}
        />
    </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

export const DropdownMenuItem = React.forwardRef(({ className, inset, destructive, ...props }, ref) => (
    <DropdownMenuPrimitive.Item
        ref={ref}
        className={cn(
            "relative flex cursor-pointer select-none items-center gap-2 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors",
            "data-[highlighted]:bg-secondary data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
            destructive ? "text-destructive data-[highlighted]:bg-destructive/10" : "text-foreground",
            inset && "pl-8",
            className
        )}
        {...props}
    />
));
DropdownMenuItem.displayName = 'DropdownMenuItem';

export const DropdownMenuCheckboxItem = React.forwardRef(({ className, children, checked, ...props }, ref) => (
    <DropdownMenuPrimitive.CheckboxItem
        ref={ref}
        checked={checked}
        className={cn(
            "relative flex cursor-pointer select-none items-center rounded-xl py-2.5 pl-8 pr-3 text-sm text-foreground outline-none transition-colors data-[highlighted]:bg-secondary",
            className
        )}
        {...props}
    >
        <span className="absolute left-2.5 flex size-3.5 items-center justify-center">
            <DropdownMenuPrimitive.ItemIndicator>
                <Check className="size-4 text-primary" />
            </DropdownMenuPrimitive.ItemIndicator>
        </span>
        {children}
    </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';

export const DropdownMenuRadioItem = React.forwardRef(({ className, children, ...props }, ref) => (
    <DropdownMenuPrimitive.RadioItem
        ref={ref}
        className={cn(
            "relative flex cursor-pointer select-none items-center rounded-xl py-2.5 pl-8 pr-3 text-sm text-foreground outline-none transition-colors data-[highlighted]:bg-secondary",
            className
        )}
        {...props}
    >
        <span className="absolute left-2.5 flex size-3.5 items-center justify-center">
            <DropdownMenuPrimitive.ItemIndicator>
                <Circle className="size-2 fill-primary text-primary" />
            </DropdownMenuPrimitive.ItemIndicator>
        </span>
        {children}
    </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem';

export const DropdownMenuLabel = React.forwardRef(({ className, inset, ...props }, ref) => (
    <DropdownMenuPrimitive.Label
        ref={ref}
        className={cn("px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground", inset && "pl-8", className)}
        {...props}
    />
));
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

export const DropdownMenuSeparator = React.forwardRef(({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Separator ref={ref} className={cn("-mx-1.5 my-1.5 h-px bg-border", className)} {...props} />
));
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

export const DropdownMenuSubTrigger = React.forwardRef(({ className, inset, children, ...props }, ref) => (
    <DropdownMenuPrimitive.SubTrigger
        ref={ref}
        className={cn(
            "flex cursor-pointer select-none items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none transition-colors data-[highlighted]:bg-secondary data-[state=open]:bg-secondary",
            inset && "pl-8",
            className
        )}
        {...props}
    >
        {children}
        <ChevronRight className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger';

export const DropdownMenuSubContent = React.forwardRef(({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.SubContent
        ref={ref}
        className={cn(
            "z-[2100] min-w-[8rem] overflow-hidden rounded-2xl border border-border bg-card p-1.5 text-card-foreground shadow-xl",
            "data-[state=open]:animate-[popover-in_0.2s_var(--ease-elastic)] data-[state=closed]:animate-[popover-out_0.15s_ease-in]",
            className
        )}
        {...props}
    />
));
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';
