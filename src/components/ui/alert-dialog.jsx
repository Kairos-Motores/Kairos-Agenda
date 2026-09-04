import React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from '@/lib/utils';
import { buttonVariants } from './button';

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogPortal = AlertDialogPrimitive.Portal;

export const AlertDialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Overlay
        ref={ref}
        className={cn(
            "fixed inset-0 z-[2000] bg-black/40 backdrop-blur-sm",
            "data-[state=open]:animate-[fade-in_0.25s_ease-out] data-[state=closed]:animate-[fade-out_0.2s_ease-in]",
            className
        )}
        {...props}
    />
));
AlertDialogOverlay.displayName = 'AlertDialogOverlay';

export const AlertDialogContent = React.forwardRef(({ className, ...props }, ref) => (
    <AlertDialogPortal>
        <AlertDialogOverlay />
        <AlertDialogPrimitive.Content
            ref={ref}
            className={cn(
                "fixed left-1/2 top-1/2 z-[2001] w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2",
                "rounded-3xl border border-border bg-card p-7 text-center shadow-2xl outline-none",
                "data-[state=open]:animate-[dialog-in_0.35s_var(--ease-elastic)] data-[state=closed]:animate-[dialog-out_0.15s_ease-in]",
                className
            )}
            {...props}
        />
    </AlertDialogPortal>
));
AlertDialogContent.displayName = 'AlertDialogContent';

export const AlertDialogHeader = ({ className, ...props }) => (
    <div className={cn("mb-2 flex flex-col items-center gap-2", className)} {...props} />
);

export const AlertDialogTitle = React.forwardRef(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Title ref={ref} className={cn("text-xl font-bold text-foreground", className)} {...props} />
));
AlertDialogTitle.displayName = 'AlertDialogTitle';

export const AlertDialogDescription = React.forwardRef(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Description ref={ref} className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />
));
AlertDialogDescription.displayName = 'AlertDialogDescription';

export const AlertDialogFooter = ({ className, ...props }) => (
    <div className={cn("mt-7 flex gap-3", className)} {...props} />
);

export const AlertDialogAction = React.forwardRef(({ className, variant = 'default', ...props }, ref) => (
    <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants({ variant }), "flex-1", className)} {...props} />
));
AlertDialogAction.displayName = 'AlertDialogAction';

export const AlertDialogCancel = React.forwardRef(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Cancel ref={ref} className={cn(buttonVariants({ variant: 'outline' }), "flex-1", className)} {...props} />
));
AlertDialogCancel.displayName = 'AlertDialogCancel';
