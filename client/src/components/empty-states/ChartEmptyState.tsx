import { NoDeadEndsState } from "./NoDeadEndsState";
import { cn } from "@/lib/utils";
import type { MetaStatus, RemediationAction } from "@shared/noDeadEnds";

interface ChartEmptyStateProps {
  meta: MetaStatus;
  title?: string;
  onAction?: (action: RemediationAction) => void;
  isLoading?: boolean;
  className?: string;
  height?: number;
}

export function ChartEmptyState({ 
  meta, 
  title = "No chart data",
  onAction, 
  isLoading,
  className,
  height = 200,
}: ChartEmptyStateProps) {
  return (
    <div 
      className={cn("flex items-center justify-center", className)} 
      style={{ minHeight: height }}
      data-testid="chart-empty-state"
    >
      <NoDeadEndsState
        meta={meta}
        title={title}
        onAction={onAction}
        isLoading={isLoading}
        compact
      />
    </div>
  );
}
