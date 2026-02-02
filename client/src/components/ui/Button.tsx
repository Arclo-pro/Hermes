import React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "destructive"
  | "outline"
  | "default"
  | "link"
  | "gold"
  | "purple"
  | "primaryGradient";

export type ButtonSize = "sm" | "md" | "lg" | "icon" | "default";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  asChild?: boolean;
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-4 py-2 text-sm rounded-xl",
  default: "px-4 py-2 text-sm rounded-xl",
  lg: "px-5 py-2.5 text-base rounded-2xl",
  icon: "h-9 w-9 rounded-lg",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-gradient text-white shadow-card hover:opacity-95 focus:ring-brand-pink/60 focus:ring-offset-surface-primary",
  primaryGradient:
    "bg-brand-gradient text-white shadow-card hover:opacity-95 focus:ring-brand-pink/60 focus:ring-offset-surface-primary",
  secondary:
    "bg-surface-primary text-text-primary shadow-card ring-1 ring-surface-border hover:bg-surface-soft focus:ring-brand-orange/50 focus:ring-offset-surface-primary",
  default:
    "bg-surface-primary text-text-primary shadow-card ring-1 ring-surface-border hover:bg-surface-soft focus:ring-brand-orange/50 focus:ring-offset-surface-primary",
  outline:
    "border border-surface-border bg-transparent text-text-primary hover:bg-surface-soft focus:ring-brand-orange/50 focus:ring-offset-surface-primary",
  ghost:
    "text-text-primary hover:bg-surface-soft focus:ring-brand-orange/50 focus:ring-offset-surface-primary",
  link:
    "text-brand-orange underline-offset-4 hover:underline focus:ring-brand-orange/50 p-0 h-auto",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-400/60 focus:ring-offset-surface-primary",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-400/60 focus:ring-offset-surface-primary",
  gold:
    "bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400/60 focus:ring-offset-surface-primary",
  purple:
    "bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-400/60 focus:ring-offset-surface-primary",
};

/**
 * buttonVariants — callable like shadcn's cva-based buttonVariants.
 * Usage: buttonVariants({ variant: "outline", size: "sm" })
 * Returns a className string.
 */
export function buttonVariants(
  opts: { variant?: ButtonVariant; size?: ButtonSize } = {}
): string {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2";
  const v = opts.variant || "secondary";
  const s = opts.size || "md";
  return cn(base, sizeClasses[s], variantClasses[v]);
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "secondary",
      size = "md",
      fullWidth,
      className,
      disabled,
      asChild: _asChild,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        {...props}
        disabled={disabled}
        className={cn(
          buttonVariants({ variant, size }),
          fullWidth && "w-full",
          disabled && "opacity-60 cursor-not-allowed",
          className
        )}
      />
    );
  }
);
Button.displayName = "Button";
