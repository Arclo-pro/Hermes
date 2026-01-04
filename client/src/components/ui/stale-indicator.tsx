import { RefreshCw, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Button } from "./button";

interface StaleIndicatorProps {
  isRefreshing?: boolean;
  isError?: boolean;
  dataUpdatedAt?: number;
  onRetry?: () => void;
  className?: string;
  showTimestamp?: boolean;
  staleThresholdMs?: number;
}

export function StaleIndicator({
  isRefreshing,
  isError,
  dataUpdatedAt,
  onRetry,
  className,
  showTimestamp = true,
  staleThresholdMs = 5 * 60 * 1000,
}: StaleIndicatorProps) {
  const isStale = dataUpdatedAt && Date.now() - dataUpdatedAt > staleThresholdMs;
  const timeAgo = dataUpdatedAt
    ? formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })
    : null;

  if (isRefreshing) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
          className
        )}
        data-testid="stale-indicator-refreshing"
      >
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span>Updating...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-semantic-danger",
          className
        )}
        data-testid="stale-indicator-error"
      >
        <AlertCircle className="w-3 h-3" />
        <span>Update failed</span>
        {onRetry && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="h-5 px-1.5 text-xs"
          >
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (isStale && showTimestamp && timeAgo) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-semantic-warning",
          className
        )}
        data-testid="stale-indicator-stale"
      >
        <Clock className="w-3 h-3" />
        <span>Updated {timeAgo}</span>
        {onRetry && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="h-5 px-1.5 text-xs"
          >
            Refresh
          </Button>
        )}
      </div>
    );
  }

  if (showTimestamp && timeAgo && dataUpdatedAt) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 text-xs text-muted-foreground",
          className
        )}
        data-testid="stale-indicator-timestamp"
      >
        <Clock className="w-3 h-3" />
        <span>{timeAgo}</span>
      </div>
    );
  }

  return null;
}

interface RefreshingBadgeProps {
  isRefreshing?: boolean;
  className?: string;
}

export function RefreshingBadge({ isRefreshing, className }: RefreshingBadgeProps) {
  if (!isRefreshing) return null;

  return (
    <div
      className={cn(
        "absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs",
        className
      )}
      data-testid="refreshing-badge"
    >
      <RefreshCw className="w-3 h-3 animate-spin" />
      <span>Updating</span>
    </div>
  );
}
