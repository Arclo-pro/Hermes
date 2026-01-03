import { Button } from "@/components/ui/button";
import { Settings, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MetaStatus, RemediationAction } from "@shared/noDeadEnds";

interface InlineKpiEmptyProps {
  meta: MetaStatus;
  onAction?: (action: RemediationAction) => void;
  isLoading?: boolean;
  className?: string;
}

export function InlineKpiEmpty({ meta, onAction, isLoading, className }: InlineKpiEmptyProps) {
  const primaryAction = meta.actions[0];
  
  const handleAction = (action: RemediationAction) => {
    if (onAction) {
      onAction(action);
    } else if (action.kind === "route" && action.route) {
      window.location.href = action.route;
    }
  };

  return (
    <div className={cn("flex flex-col items-start gap-1", className)} data-testid="inline-kpi-empty">
      <span className="text-xs text-muted-foreground">{meta.userMessage}</span>
      {primaryAction && (
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          onClick={() => handleAction(primaryAction)}
          disabled={isLoading}
          data-testid={`button-${primaryAction.id}`}
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : primaryAction.kind === "retry" ? (
            <RefreshCw className="w-3 h-3 mr-1" />
          ) : (
            <Settings className="w-3 h-3 mr-1" />
          )}
          {primaryAction.label}
        </Button>
      )}
    </div>
  );
}
