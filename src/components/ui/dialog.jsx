import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

export const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
            "fixed inset-0 z-[12000] bg-black/40 backdrop-blur-sm",
            "data-[state=open]:animate-[fade-in_0.25s_ease-out] data-[state=closed]:animate-[fade-out_0.2s_ease-in]",
            className
        )}
        {...props}
    />
));
DialogOverlay.displayName = 'DialogOverlay';

export const DialogContent = React.forwardRef(({ className, overlayClassName, children, showClose = true, ...props }, ref) => (
    <DialogPortal>
        <DialogOverlay className={overlayClassName} />
        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                "fixed inset-x-0 bottom-0 z-[12001] w-full max-h-[92dvh] overflow-y-auto overscroll-contain",
                "rounded-t-[28px] rounded-b-none border-t border-border/80 bg-card px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl outline-none",
                "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[92vw] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[85vh] sm:rounded-[28px] sm:border sm:p-6",
                "data-[state=open]:animate-[sheet-in_0.3s_cubic-bezier(0.2,0,0,1)] data-[state=closed]:animate-[sheet-out_0.2s_ease-in]",
                "sm:data-[state=open]:animate-[dialog-in_0.35s_var(--ease-elastic)] sm:data-[state=closed]:animate-[dialog-out_0.15s_ease-in]",
                className
            )}
            {...props}
        >
            <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30 sm:hidden" />
            {children}
            {showClose && (
                <DialogPrimitive.Close className="absolute right-3.5 top-3.5 sm:right-5 sm:top-5 rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <X className="size-4" />
                    <span className="sr-only">Fechar</span>
                </DialogPrimitive.Close>
            )}
        </DialogPrimitive.Content>
    </DialogPortal>
));
DialogContent.displayName = 'DialogContent';

export const DialogHeader = ({ className, ...props }) => (
    <div className={cn("mb-4 sm:mb-5 flex flex-col gap-1 pr-6 sm:pr-8", className)} {...props} />
);

export const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
    <DialogPrimitive.Title ref={ref} className={cn("flex items-center gap-2 text-lg sm:text-xl font-bold text-foreground", className)} {...props} />
));
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
    <DialogPrimitive.Description ref={ref} className={cn("text-xs sm:text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = 'DialogDescription';

export const DialogFooter = ({ className, ...props }) => (
    <div className={cn("mt-5 sm:mt-6 flex flex-wrap sm:flex-nowrap items-center justify-end gap-2", className)} {...props} />
);
