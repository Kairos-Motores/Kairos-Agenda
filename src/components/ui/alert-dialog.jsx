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
            "fixed inset-0 z-[12000] bg-black/40 backdrop-blur-sm",
            "data-[state=open]:animate-[fade-in_0.25s_ease-out] data-[state=closed]:animate-[fade-out_0.2s_ease-in]",
            className
        )}
        {...props}
    />
));
AlertDialogOverlay.displayName = 'AlertDialogOverlay';

export const AlertDialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
    <AlertDialogPortal>
        <AlertDialogOverlay />
        <AlertDialogPrimitive.Content
            ref={ref}
            className={cn(
                "fixed inset-x-0 bottom-0 z-[12001] w-full max-h-[92dvh] overflow-y-auto overscroll-contain",
                "rounded-t-[28px] rounded-b-none border-t border-border/80 bg-card px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center shadow-2xl outline-none",
                "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[90dvh] sm:rounded-[28px] sm:border sm:p-7 w-full max-w-md sm:w-[92vw]",
                "data-[state=open]:animate-[sheet-in_0.3s_cubic-bezier(0.2,0,0,1)] data-[state=closed]:animate-[sheet-out_0.2s_ease-in]",
                "sm:data-[state=open]:animate-[dialog-in_0.35s_var(--ease-elastic)] sm:data-[state=closed]:animate-[dialog-out_0.15s_ease-in]",
                className
            )}
            {...props}
        >
            <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30 sm:hidden" />
            {children}
        </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
));
AlertDialogContent.displayName = 'AlertDialogContent';

export const AlertDialogHeader = ({ className, ...props }) => (
    <div className={cn("mb-2 flex flex-col items-center gap-2", className)} {...props} />
);

export const AlertDialogTitle = React.forwardRef(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Title ref={ref} className={cn("text-lg sm:text-xl font-bold text-foreground", className)} {...props} />
));
AlertDialogTitle.displayName = 'AlertDialogTitle';

export const AlertDialogDescription = React.forwardRef(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Description ref={ref} className={cn("text-xs sm:text-sm leading-relaxed text-muted-foreground", className)} {...props} />
));
AlertDialogDescription.displayName = 'AlertDialogDescription';

export const AlertDialogFooter = ({ className, ...props }) => (
    <div className={cn("mt-5 sm:mt-7 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3", className)} {...props} />
);

export const AlertDialogAction = React.forwardRef(({ className, variant = 'default', ...props }, ref) => (
    <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants({ variant }), "flex-1", className)} {...props} />
));
AlertDialogAction.displayName = 'AlertDialogAction';

export const AlertDialogCancel = React.forwardRef(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Cancel ref={ref} className={cn(buttonVariants({ variant: 'outline' }), "flex-1", className)} {...props} />
));
AlertDialogCancel.displayName = 'AlertDialogCancel';
