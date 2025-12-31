import * as React from "react";
import { cn } from "@/lib/utils";

interface GlassChartContainerProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function GlassChartContainer({
  children,
  className,
  title,
  subtitle,
  actions,
}: GlassChartContainerProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm",
        "shadow-[0_4px_24px_-8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]",
        className
      )}
      data-testid="glass-chart-container"
    >
      {(title || actions) && (
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4 pt-2">{children}</div>
    </div>
  );
}
