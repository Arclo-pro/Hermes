import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus, AlertCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KpiDescriptor, WidgetState } from "../types";

interface KpiStripWidgetProps {
  kpis: KpiDescriptor[];
  state?: WidgetState;
  onRetry?: () => void;
  className?: string;
}

function KpiCard({ kpi }: { kpi: KpiDescriptor }) {
  const isLoading = kpi.status === "loading";
  const isUnavailable = kpi.status === "unavailable";

  const getDeltaIcon = () => {
    if (kpi.delta === undefined || kpi.delta === null) return null;
    if (kpi.delta > 0) return <TrendingUp className="w-3 h-3" />;
    if (kpi.delta < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getDeltaColor = () => {
    if (kpi.delta === undefined || kpi.delta === null) return "text-muted-foreground";
    const isPositive = kpi.delta > 0;
    if (kpi.deltaIsGood !== undefined) {
      return kpi.deltaIsGood ? "text-semantic-success" : "text-semantic-danger";
    }
    return isPositive ? "text-semantic-success" : "text-semantic-danger";
  };

  return (
    <div
      className="flex flex-col gap-1 p-4 rounded-xl bg-card/40 border border-border min-w-[140px]"
      data-testid={`kpi-${kpi.id}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground truncate">{kpi.label}</span>
        {kpi.tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-3 h-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-[200px]">{kpi.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-7 w-16 mt-1" />
      ) : isUnavailable ? (
        <div className="flex items-center gap-1 text-muted-foreground mt-1">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">—</span>
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-1">
            {kpi.icon && <span className="mr-1">{kpi.icon}</span>}
            <span className="text-xl font-bold text-foreground">
              {kpi.value ?? "—"}
            </span>
            {kpi.unit && (
              <span className="text-xs text-muted-foreground">{kpi.unit}</span>
            )}
          </div>

          {(kpi.delta !== undefined && kpi.delta !== null) && (
            <div className={cn("flex items-center gap-1 text-xs", getDeltaColor())}>
              {getDeltaIcon()}
              <span>
                {kpi.delta > 0 ? "+" : ""}
                {kpi.delta}
                {kpi.deltaLabel && ` ${kpi.deltaLabel}`}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiStripSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 p-4 rounded-xl bg-card/40 border border-border min-w-[140px]"
        >
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-12" />
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>
  );
}

function KpiStripUnavailable({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="p-6 rounded-xl bg-muted/30 border border-border text-center">
      <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm text-muted-foreground mb-3">
        KPI data temporarily unavailable
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-primary hover:underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function KpiStripWidget({
  kpis,
  state = "ready",
  onRetry,
  className,
}: KpiStripWidgetProps) {
  if (state === "loading") {
    return <KpiStripSkeleton count={kpis.length || 6} />;
  }

  if (state === "unavailable") {
    return <KpiStripUnavailable onRetry={onRetry} />;
  }

  if (state === "empty" || kpis.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-muted/20 border border-dashed border-border text-center">
        <p className="text-sm text-muted-foreground">
          No KPIs configured yet
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-3 overflow-x-auto pb-2", className)} data-testid="kpi-strip">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.id} kpi={kpi} />
      ))}
    </div>
  );
}
