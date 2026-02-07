import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { gradients, colors } from "@/lib/design-system";

type GlassCardTint = "cyan" | "purple" | "green" | "pink" | "amber" | "red" | "blue";

// Use centralized gradients from design-system.ts
const tintGradients = gradients.tints;

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "purple" | "white" | "marketing" | "marketing-accent";
  hover?: boolean;
  tint?: GlassCardTint;
}

export function GlassCard({
  children,
  className,
  variant = "default",
  hover = false,
  tint,
}: GlassCardProps) {
  const isMarketing = variant === "marketing" || variant === "marketing-accent";

  const variants = {
    default: "bg-white/60 border-white/20",
    purple: "bg-purple-500/10 border-purple-300/20",
    white: "bg-white/80 border-white/30",
    marketing: "",
    "marketing-accent": "",
  };

  if (isMarketing) {
    // When tint is provided, use gradient border technique
    if (tint) {
      return (
        <div
          className={cn(
            "rounded-2xl p-[1.5px] transition-all duration-200",
            hover && "hover:-translate-y-1 cursor-pointer",
          )}
          style={{
            background: tintGradients[tint],
            boxShadow: "0 4px 24px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div
            className={cn("rounded-[calc(1rem-1.5px)] h-full", className)}
            style={{
              background: variant === "marketing-accent"
                ? colors.background.cardAccent
                : colors.background.card,
            }}
          >
            {children}
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "rounded-2xl border transition-all duration-200",
          hover && "hover:-translate-y-1 cursor-pointer",
          className
        )}
        style={{
          background: variant === "marketing-accent"
            ? colors.background.cardAccent
            : colors.background.card,
          border: variant === "marketing-accent"
            ? `1px solid ${colors.border.accent}`
            : `1px solid ${colors.border.default}`,
          boxShadow: hover
            ? undefined
            : "0 20px 40px rgba(15, 23, 42, 0.08)",
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "backdrop-blur-md rounded-2xl border shadow-lg",
        "transition-all duration-300",
        variants[variant],
        hover && "hover:shadow-xl hover:scale-[1.02] cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

interface GlassCardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function GlassCardHeader({ children, className }: GlassCardHeaderProps) {
  return (
    <div className={cn("p-6 pb-3", className)}>
      {children}
    </div>
  );
}

interface GlassCardTitleProps {
  children: ReactNode;
  className?: string;
}

export function GlassCardTitle({ children, className }: GlassCardTitleProps) {
  return (
    <h3 className={cn("text-lg font-semibold", className)} style={{ color: colors.text.primary }}>
      {children}
    </h3>
  );
}

interface GlassCardContentProps {
  children: ReactNode;
  className?: string;
}

export function GlassCardContent({ children, className }: GlassCardContentProps) {
  return (
    <div className={cn("p-6 pt-0", className)}>
      {children}
    </div>
  );
}

interface GlassCardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function GlassCardDescription({ children, className }: GlassCardDescriptionProps) {
  return (
    <p className={cn("text-sm mt-1", className)} style={{ color: colors.text.muted }}>
      {children}
    </p>
  );
}
