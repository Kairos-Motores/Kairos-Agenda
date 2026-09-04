import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef(({ className, ...props }, ref) => (
    <TabsPrimitive.List
        ref={ref}
        className={cn("inline-flex items-center gap-1 border-b border-border overflow-x-auto", className)}
        {...props}
    />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
        ref={ref}
        className={cn(
            "relative whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground cursor-pointer select-none transition-colors duration-200 outline-none",
            "hover:text-foreground data-[state=active]:text-primary data-[state=active]:bg-primary/10",
            "focus-visible:ring-2 focus-visible:ring-ring",
            className
        )}
        {...props}
    />
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
    <TabsPrimitive.Content
        ref={ref}
        className={cn("mt-4 outline-none animate-[fade-in_0.25s_ease-out]", className)}
        {...props}
    />
));
TabsContent.displayName = 'TabsContent';
