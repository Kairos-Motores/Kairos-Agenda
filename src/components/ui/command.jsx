import React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Command = React.forwardRef(({ className, ...props }, ref) => (
    <CommandPrimitive
        ref={ref}
        className={cn("flex h-full w-full flex-col overflow-hidden rounded-2xl bg-card text-card-foreground", className)}
        {...props}
    />
));
Command.displayName = 'Command';

export const CommandInput = React.forwardRef(({ className, ...props }, ref) => (
    <div className="flex items-center gap-2 border-b border-border px-3.5">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <CommandPrimitive.Input
            ref={ref}
            className={cn(
                "flex h-11 w-full bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        />
    </div>
));
CommandInput.displayName = 'CommandInput';

export const CommandList = React.forwardRef(({ className, ...props }, ref) => (
    <CommandPrimitive.List ref={ref} className={cn("max-h-72 overflow-y-auto overflow-x-hidden p-1.5", className)} {...props} />
));
CommandList.displayName = 'CommandList';

export const CommandEmpty = React.forwardRef((props, ref) => (
    <CommandPrimitive.Empty ref={ref} className="py-8 text-center text-sm text-muted-foreground" {...props} />
));
CommandEmpty.displayName = 'CommandEmpty';

export const CommandGroup = React.forwardRef(({ className, ...props }, ref) => (
    <CommandPrimitive.Group
        ref={ref}
        className={cn(
            "text-foreground [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground",
            className
        )}
        {...props}
    />
));
CommandGroup.displayName = 'CommandGroup';

export const CommandItem = React.forwardRef(({ className, ...props }, ref) => (
    <CommandPrimitive.Item
        ref={ref}
        className={cn(
            "relative flex cursor-pointer select-none items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none transition-colors",
            "data-[selected=true]:bg-secondary data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40",
            className
        )}
        {...props}
    />
));
CommandItem.displayName = 'CommandItem';
