import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-xl border text-card-foreground shadow transition-all",
  {
    variants: {
      variant: {
        default: "bg-card",
        glass: "bg-card/80 backdrop-blur-sm border-border",
        panel: "bg-surface-panel backdrop-blur-xl border-white/8",
        success: "bg-success-soft [border-color:var(--color-semantic-success-border)] shadow-[inset_0_1px_0_0_rgba(34,197,94,0.15),0_0_20px_-5px_rgba(34,197,94,0.2)]",
        warning: "bg-warning-soft [border-color:var(--color-semantic-warning-border)] shadow-[inset_0_1px_0_0_rgba(234,179,8,0.15),0_0_20px_-5px_rgba(234,179,8,0.2)]",
        danger: "bg-danger-soft [border-color:var(--color-semantic-danger-border)] shadow-[inset_0_1px_0_0_rgba(239,68,68,0.15),0_0_20px_-5px_rgba(239,68,68,0.2)]",
        info: "bg-info-soft [border-color:var(--color-semantic-info-border)] shadow-[inset_0_1px_0_0_rgba(59,130,246,0.15),0_0_20px_-5px_rgba(59,130,246,0.2)]",
        gold: "bg-gold-soft [border-color:var(--color-gold-border)] shadow-gold",
        purple: "bg-purple-soft [border-color:var(--color-purple-border)] shadow-purple",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants }
