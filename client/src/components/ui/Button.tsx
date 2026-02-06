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
    "border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:shadow-md hover:border-gray-300 focus:ring-purple-400/50 focus:ring-offset-white transition-all",
  ghost:
    "text-text-primary hover:bg-surface-soft focus:ring-brand-orange/50 focus:ring-offset-surface-primary",
  link:
    "text-brand-orange underline-offset-4 hover:underline focus:ring-brand-orange/50 p-0 h-auto",
  danger:
    "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-md shadow-red-500/25 hover:from-red-600 hover:to-red-700 focus:ring-red-400/60 focus:ring-offset-surface-primary transition-all",
  destructive:
    "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-md shadow-red-500/25 hover:from-red-600 hover:to-red-700 focus:ring-red-400/60 focus:ring-offset-surface-primary transition-all",
  gold:
    "bg-gradient-to-b from-amber-400 to-amber-500 text-white shadow-md shadow-amber-500/25 hover:from-amber-500 hover:to-amber-600 focus:ring-amber-400/60 focus:ring-offset-surface-primary transition-all",
  purple:
    "bg-gradient-to-b from-purple-500 to-purple-600 text-white shadow-md shadow-purple-500/25 hover:from-purple-600 hover:to-purple-700 focus:ring-purple-400/60 focus:ring-offset-surface-primary transition-all",
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
