import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { GlassSparkline } from "./GlassSparkline";

type SemanticColor = "primary" | "success" | "warning" | "danger" | "info" | "purple";
type TrendDirection = "up" | "down" | "neutral";

interface GlassMetricCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  trend?: TrendDirection;
  trendIsGood?: boolean;
  sparklineData?: number[];
  sparklineColor?: SemanticColor;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function GlassMetricCard({
  label,
  value,
  delta,
  deltaLabel,
  trend,
  trendIsGood = true,
  sparklineData,
  sparklineColor,
  size = "md",
  className,
}: GlassMetricCardProps) {
  const inferredTrend = trend || (delta !== undefined ? (delta > 0 ? "up" : delta < 0 ? "down" : "neutral") : undefined);

  const deltaColor = inferredTrend === "neutral"
    ? "text-muted-foreground"
    : (inferredTrend === "up" && trendIsGood) || (inferredTrend === "down" && !trendIsGood)
      ? "text-success"
      : "text-danger";

  const inferredSparklineColor = sparklineColor || (
    inferredTrend === "neutral"
      ? "primary"
      : (inferredTrend === "up" && trendIsGood) || (inferredTrend === "down" && !trendIsGood)
        ? "success"
        : "danger"
  );

  const TrendIcon = inferredTrend === "up" ? TrendingUp : inferredTrend === "down" ? TrendingDown : Minus;

  const sizeStyles = {
    sm: {
      container: "p-3",
      label: "text-xs",
      value: "text-xl",
      delta: "text-xs",
      sparkHeight: 24,
    },
    md: {
      container: "p-4",
      label: "text-xs",
      value: "text-2xl",
      delta: "text-xs",
      sparkHeight: 32,
    },
    lg: {
      container: "p-5",
      label: "text-sm",
      value: "text-3xl",
      delta: "text-sm",
      sparkHeight: 40,
    },
  };

  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm",
        "shadow-[0_4px_24px_-8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]",
        styles.container,
        className
      )}
      data-testid="glass-metric-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn("text-muted-foreground font-medium mb-1", styles.label)}>
            {label}
          </p>
          <p className={cn("font-bold text-foreground tabular-nums leading-tight", styles.value)}>
            {value}
          </p>
          {delta !== undefined && (
            <div className={cn("flex items-center gap-1 mt-1.5", deltaColor, styles.delta)}>
              <TrendIcon className="w-3 h-3" />
              <span className="font-medium tabular-nums">
                {delta > 0 ? "+" : ""}{typeof delta === "number" ? delta.toFixed(1) : delta}%
              </span>
              {deltaLabel && (
                <span className="text-muted-foreground ml-1">{deltaLabel}</span>
              )}
            </div>
          )}
        </div>

        {sparklineData && sparklineData.length > 0 && (
          <div className="flex-shrink-0 w-20">
            <GlassSparkline
              data={sparklineData}
              color={inferredSparklineColor}
              showFill
              height={styles.sparkHeight}
            />
          </div>
        )}
      </div>
    </div>
  );
}
