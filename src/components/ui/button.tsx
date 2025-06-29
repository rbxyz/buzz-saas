import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// Define as variantes com design minimalista refinado
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-lg text-body-small font-medium ring-offset-background transition-all duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-minimal hover:bg-primary/90 hover:shadow-soft",
        destructive: "bg-destructive text-destructive-foreground shadow-minimal hover:bg-destructive/90 hover:shadow-soft",
        outline: "border border-subtle bg-background hover:bg-muted/50 hover:text-accent-foreground hover:border-border/80 shadow-minimal",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-minimal",
        ghost: "hover:bg-muted/60 hover:text-accent-foreground transition-colors",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
        // Variantes da marca
        brand: "bg-gradient-brand text-white shadow-soft hover:shadow-medium hover:bg-gradient-brand-hover",
        "brand-outline": "border border-brand-primary/20 bg-brand-light/30 text-brand-primary hover:bg-brand-light/50 hover:border-brand-primary/40",
        "brand-ghost": "text-brand-primary hover:bg-brand-light/30 hover:text-brand-secondary",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-md px-4 text-caption",
        lg: "h-12 rounded-lg px-6 text-body",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, asChild = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled ?? isLoading}
        {...props}
      >
        {isLoading && (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
        )}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
