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
            "fixed inset-0 z-[2000] bg-black/40 backdrop-blur-sm",
            "data-[state=open]:animate-[fade-in_0.25s_ease-out] data-[state=closed]:animate-[fade-out_0.2s_ease-in]",
            className
        )}
        {...props}
    />
));
DialogOverlay.displayName = 'DialogOverlay';

export const DialogContent = React.forwardRef(({ className, children, showClose = true, ...props }, ref) => (
    <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                "fixed left-1/2 top-1/2 z-[2001] w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2",
                "max-h-[85vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl outline-none",
                "data-[state=open]:animate-[dialog-in_0.35s_var(--ease-elastic)] data-[state=closed]:animate-[dialog-out_0.15s_ease-in]",
                className
            )}
            {...props}
        >
            {children}
            {showClose && (
                <DialogPrimitive.Close className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <X className="size-4" />
                    <span className="sr-only">Fechar</span>
                </DialogPrimitive.Close>
            )}
        </DialogPrimitive.Content>
    </DialogPortal>
));
DialogContent.displayName = 'DialogContent';

export const DialogHeader = ({ className, ...props }) => (
    <div className={cn("mb-5 flex flex-col gap-1 pr-8", className)} {...props} />
);

export const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
    <DialogPrimitive.Title ref={ref} className={cn("flex items-center gap-2 text-xl font-bold text-foreground", className)} {...props} />
));
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
    <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = 'DialogDescription';

export const DialogFooter = ({ className, ...props }) => (
    <div className={cn("mt-6 flex justify-end gap-2", className)} {...props} />
);
