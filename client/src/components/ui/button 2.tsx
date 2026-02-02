import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-card hover:opacity-95 focus:ring-primary/60 focus:ring-offset-background",
        primaryGradient:
          "bg-gradient-to-r from-[#15803D] to-[#0EA5E9] text-white shadow-card hover:opacity-90 focus:ring-[#15803D]/50 focus:ring-offset-background",
        default:
          "bg-secondary text-foreground shadow-card ring-1 ring-border hover:bg-accent focus:ring-primary/50 focus:ring-offset-background",
        secondary:
          "bg-secondary text-foreground shadow-card ring-1 ring-border hover:bg-accent focus:ring-primary/50 focus:ring-offset-background",
        ghost:
          "text-foreground hover:bg-accent focus:ring-primary/50 focus:ring-offset-background",
        danger:
          "bg-red-600 text-white hover:bg-red-700 focus:ring-red-400/60 focus:ring-offset-background",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 focus:ring-red-400/60 focus:ring-offset-background",
        outline:
          "bg-transparent text-foreground ring-1 ring-border hover:bg-accent focus:ring-primary/50 focus:ring-offset-background",
        gold:
          "bg-gradient-to-r from-amber-500 to-yellow-400 text-white shadow-card hover:opacity-95 focus:ring-amber-400/60 focus:ring-offset-background",
        link:
          "text-primary underline-offset-4 hover:underline focus:ring-primary/50",
        purple:
          "bg-gradient-to-r from-violet-600 to-purple-500 text-white shadow-card hover:opacity-95 focus:ring-violet-400/60 focus:ring-offset-background",
      },
      size: {
        default: "px-4 py-2 text-sm rounded-xl",
        sm: "px-3 py-1.5 text-sm rounded-lg",
        md: "px-4 py-2 text-sm rounded-xl",
        lg: "px-5 py-2.5 text-base rounded-2xl",
        icon: "h-9 w-9 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  }
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    fullWidth?: boolean;
    asChild?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size }),
          fullWidth && "w-full",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
export type { ButtonProps };
