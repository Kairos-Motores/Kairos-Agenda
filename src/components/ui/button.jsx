import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Botão pílula (radius-full) com a mesma transição elástica e o "boing" de clique
// (active:scale-90) que o resto do app já usa em .btn-primary/.icon-btn — o objetivo
// é o shadcn imitar a identidade visual existente, não trazer uma nova.
const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold cursor-pointer select-none transition-[transform,box-shadow,filter,background-color,color,border-color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-90 disabled:pointer-events-none disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:pointer-events-none [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground shadow-[0_4px_14px_-2px_rgba(var(--text-accent-rgb),0.45)] hover:brightness-110 hover:shadow-[0_6px_18px_-2px_rgba(var(--text-accent-rgb),0.55)]",
                destructive: "bg-destructive text-destructive-foreground shadow-sm hover:brightness-110",
                success: "bg-success text-success-foreground shadow-sm hover:brightness-110",
                outline: "border border-border bg-transparent text-foreground hover:bg-secondary",
                secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
                ghost: "bg-transparent text-foreground hover:bg-secondary",
                link: "bg-transparent text-primary underline-offset-4 hover:underline rounded-md active:scale-100"
            },
            size: {
                default: "h-11 px-6 py-2 has-[>svg]:px-5",
                sm: "h-9 px-4 text-[13px] has-[>svg]:px-3.5",
                lg: "h-14 px-8 text-base has-[>svg]:px-7",
                icon: "size-11 rounded-full p-0"
            }
        },
        defaultVariants: { variant: "default", size: "default" }
    }
);

export const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
});
Button.displayName = 'Button';

export { buttonVariants };
