import { cn } from "@/lib/utils";
import { KeyMetricCard } from "./KeyMetricCard";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface MetricConfig {
  id: string;
  label: string;
  value: number | string;
  icon?: LucideIcon;
  iconNode?: ReactNode;
  status?: "primary" | "good" | "warning" | "neutral" | "inactive" | string;
  delta?: number | null;
  deltaLabel?: string;
  trendIsGood?: "up" | "down";
  sparklineData?: number[];
}

interface KeyMetricsGridProps {
  metrics: MetricConfig[];
  accentColor?: string;
  className?: string;
}

export function KeyMetricsGrid({ metrics, accentColor, className }: KeyMetricsGridProps) {
  // Use 4 columns for 4 metrics, or adjust dynamically based on count
  const gridCols = metrics.length <= 4
    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5";

  return (
    <div className={cn(
      "grid gap-4",
      gridCols,
      className
    )}>
      {metrics.map((metric) => (
        <KeyMetricCard
          key={metric.id}
          label={metric.label}
          value={metric.value}
          icon={metric.icon}
          iconNode={metric.iconNode}
          status={metric.status}
          accentColor={accentColor}
          delta={metric.delta}
          deltaLabel={metric.deltaLabel}
          trendIsGood={metric.trendIsGood}
          sparklineData={metric.sparklineData}
        />
      ))}
    </div>
  );
}
