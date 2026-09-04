import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap transition-colors",
    {
        variants: {
            variant: {
                default: "border-transparent bg-primary/10 text-primary",
                secondary: "border-transparent bg-secondary text-secondary-foreground",
                destructive: "border-transparent bg-destructive/15 text-destructive",
                success: "border-transparent bg-success/15 text-success",
                warning: "border-transparent bg-warning/20 text-warning",
                info: "border-transparent bg-info/15 text-info",
                outline: "border-border bg-transparent text-foreground"
            }
        },
        defaultVariants: { variant: "default" }
    }
);

export const Badge = ({ className, variant, ...props }) => (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
);

export { badgeVariants };
