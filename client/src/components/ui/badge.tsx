import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" +
  " hover-elevate ",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-xs",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-xs",
        outline: "text-foreground border [border-color:var(--badge-outline)]",
        success:
          "[border-color:var(--color-semantic-success-border)] bg-success-soft text-success",
        warning:
          "[border-color:var(--color-semantic-warning-border)] bg-warning-soft text-warning",
        danger:
          "[border-color:var(--color-semantic-danger-border)] bg-danger-soft text-danger",
        info:
          "[border-color:var(--color-semantic-info-border)] bg-info-soft text-info",
        neutral:
          "border-border bg-muted text-muted-foreground",
        gold:
          "[border-color:var(--color-gold-border)] bg-gold-soft text-gold",
        purple:
          "[border-color:var(--color-purple-border)] bg-purple-soft text-purple-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
