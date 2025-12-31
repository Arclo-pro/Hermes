import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Wrench,
  RefreshCw,
  Clock,
  Zap,
  ChevronRight,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MissionStatusState, MissionItem, CompletedAction, WidgetState } from "../types";
import { formatDistanceToNow } from "date-fns";

interface MissionOverviewWidgetProps {
  status: MissionStatusState;
  missions: MissionItem[];
  recentlyCompleted?: CompletedAction | null;
  state?: WidgetState;
  onFixEverything?: () => void;
  onViewAllMissions?: () => void;
  onMissionAction?: (missionId: string, actionId: string) => void;
  onRetry?: () => void;
  isFixing?: boolean;
  maxActions?: number;
}

const statusConfig = {
  looking_good: {
    label: "Looking good",
    icon: CheckCircle2,
    badgeClass: "bg-semantic-success-soft text-semantic-success border-semantic-success-border",
  },
  doing_okay: {
    label: "Doing okay",
    icon: CheckCircle2,
    badgeClass: "bg-semantic-info-soft text-semantic-info border-semantic-info-border",
  },
  needs_attention: {
    label: "Needs attention",
    icon: AlertTriangle,
    badgeClass: "bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border",
  },
};

function ImpactIndicator({ impact }: { impact: string }) {
  const config = {
    high: { color: 'bg-semantic-danger', bars: 3, label: 'High Impact' },
    medium: { color: 'bg-semantic-warning', bars: 2, label: 'Medium Impact' },
    low: { color: 'bg-semantic-success', bars: 1, label: 'Low Impact' },
  }[impact.toLowerCase()] || { color: 'bg-muted', bars: 1, label: 'Impact' };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-end gap-0.5 h-3">
            {[1, 2, 3].map((bar) => (
              <div
                key={bar}
                className={cn(
                  "w-0.5 rounded-sm transition-colors",
                  bar <= config.bars ? config.color : "bg-muted/40"
                )}
                style={{ height: `${bar * 3 + 3}px` }}
              />
            ))}
          </div>
        </TooltipTrigger>
        <TooltipContent><p>{config.label}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function EffortIndicator({ effort }: { effort: string }) {
  const effortMap: Record<string, { label: string; icon: React.ReactNode }> = {
    'S': { label: 'Quick fix', icon: <Zap className="w-3 h-3 text-semantic-success" /> },
    'M': { label: 'Medium effort', icon: <Clock className="w-3 h-3 text-semantic-warning" /> },
    'L': { label: 'Long effort', icon: <Clock className="w-3 h-3 text-semantic-danger" /> },
  };
  const config = effortMap[effort] || effortMap['M'];
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center">{config.icon}</span>
        </TooltipTrigger>
        <TooltipContent><p>{config.label}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function CompactMissionRow({
  mission,
  onAction,
}: {
  mission: MissionItem;
  onAction?: (actionId: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
      data-testid={`mission-row-${mission.id}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm text-foreground truncate">{mission.title}</h4>
          {mission.impact && <ImpactIndicator impact={mission.impact} />}
          {mission.effort && <EffortIndicator effort={mission.effort} />}
        </div>
        {mission.reason && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {mission.reason}
          </p>
        )}
      </div>

      <div className="shrink-0">
        {mission.action && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              mission.action?.onClick();
            }}
            disabled={mission.action.disabled}
            className="bg-emerald-600 hover:bg-emerald-700 h-7 px-3 text-xs"
            data-testid={`button-mission-${mission.id}-action`}
          >
            {mission.action.label}
          </Button>
        )}

        {!mission.action && mission.status === "pending" && (
          <Button
            type="button"
            variant="default"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 h-7 px-3 text-xs"
            onClick={(e) => {
              e.preventDefault();
              onAction?.("fix");
            }}
            data-testid={`button-mission-${mission.id}-fix`}
          >
            Fix it
          </Button>
        )}
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <Card className="bg-card/60 backdrop-blur-md border-border rounded-2xl overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-stretch">
          <div className="w-24 shrink-0 bg-muted/40 flex items-center justify-center p-5">
            <Skeleton className="w-14 h-14 rounded-full" />
          </div>
          <div className="flex-1 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="pt-4 space-y-2">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewUnavailable({ onRetry }: { onRetry?: () => void }) {
  return (
    <Card className="bg-muted/30 border-border rounded-2xl overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Status temporarily unavailable</p>
              <p className="text-sm text-muted-foreground">
                We couldn't load mission data. This may be a temporary issue.
              </p>
            </div>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function MissionOverviewWidget({
  status,
  missions,
  recentlyCompleted,
  state = "ready",
  onFixEverything,
  onViewAllMissions,
  onMissionAction,
  onRetry,
  isFixing = false,
  maxActions = 3,
}: MissionOverviewWidgetProps) {
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  if (state === "loading") {
    return <OverviewSkeleton />;
  }

  if (state === "unavailable") {
    return <OverviewUnavailable onRetry={onRetry} />;
  }

  const config = statusConfig[status.tier];
  const StatusIcon = config.icon;

  const hasPerformanceScore = status.performanceScore !== undefined;
  const scoreValue = status.performanceScore;

  const pendingMissions = missions.filter(m => m.status === "pending" || m.status === "in_progress");
  const visibleMissions = pendingMissions.slice(0, maxActions);
  const hasMoreMissions = pendingMissions.length > maxActions;

  return (
    <>
      <Card
        className="bg-card/60 backdrop-blur-md border-border rounded-2xl overflow-hidden"
        style={{
          boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 4px 24px -8px rgba(0,0,0,0.3)",
        }}
        data-testid="mission-overview-widget"
      >
        <div className="flex flex-col">
          <div className="flex items-start">
            {hasPerformanceScore && (
              <div 
                className="w-24 shrink-0 flex flex-col items-center justify-start bg-muted/40 border-r border-border/50 self-stretch"
                style={{
                  background: "linear-gradient(135deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.08) 100%)",
                }}
                data-testid={scoreValue === null ? "score-block-performance-empty" : "score-block-performance"}
              >
                <div className="flex flex-col items-center pt-5 pb-3">
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center bg-gold-soft ring-2 ring-gold/40 ring-offset-2 ring-offset-transparent"
                  >
                    <span className="text-2xl font-bold leading-none text-gold">
                      {scoreValue === null ? "—" : Math.round(scoreValue)}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground mt-2 tracking-wide">
                    Performance
                  </span>
                </div>
              </div>
            )}

            <div className="flex-1 p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-base font-semibold text-foreground leading-tight">
                      Mission Overview
                    </h2>
                    <Badge
                      variant="outline"
                      className={cn("text-xs px-2 py-0.5 border", config.badgeClass)}
                    >
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground leading-snug">{status.summaryLine}</p>

                  <div className="flex items-center gap-1.5 text-sm">
                    <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-foreground/80 font-medium">Next:</span>
                    <span className="text-muted-foreground truncate">{status.nextStep}</span>
                  </div>
                </div>

                <Button
                  variant="gold"
                  size="sm"
                  className="rounded-xl shrink-0"
                  onClick={() => setConfirmModalOpen(true)}
                  disabled={isFixing || status.autoFixableCount === 0}
                  data-testid="button-fix-everything"
                >
                  {isFixing ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Wrench className="w-4 h-4 mr-1.5" />
                  )}
                  Fix Everything
                </Button>
              </div>

              {visibleMissions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    Next Actions
                  </h3>
                  <div className="space-y-2">
                    {visibleMissions.map((mission) => (
                      <CompactMissionRow
                        key={mission.id}
                        mission={mission}
                        onAction={(actionId) => onMissionAction?.(mission.id, actionId)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {visibleMissions.length === 0 && (
                <div className="py-4 text-center">
                  <CheckCircle2 className="w-8 h-8 text-semantic-success mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No open missions. Nice work!</p>
                </div>
              )}

              {(hasMoreMissions || missions.length > 0) && onViewAllMissions && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full mt-3 text-muted-foreground hover:text-foreground"
                  onClick={onViewAllMissions}
                  data-testid="button-view-all-missions"
                >
                  View all missions
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>

          {recentlyCompleted && (
            <div className="border-t border-border/50 px-5 py-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Recently Completed
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div className="w-6 h-6 rounded-full bg-semantic-success-soft flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-semantic-success" />
                </div>
                <span className="text-sm text-foreground flex-1">{recentlyCompleted.title}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(recentlyCompleted.completedAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-gold" />
              Confirm Fix Everything
            </DialogTitle>
            <DialogDescription>
              This will create a PR with {status.autoFixableCount} auto-fixable items.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {status.autoFixableCount} items will be fixed automatically.
              {status.priorityCount - status.autoFixableCount > 0 && (
                <> {status.priorityCount - status.autoFixableCount} items require manual attention.</>
              )}
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
              className="rounded-xl"
              data-testid="button-cancel-fix"
            >
              Cancel
            </Button>
            <Button
              variant="gold"
              onClick={() => {
                onFixEverything?.();
                setConfirmModalOpen(false);
              }}
              disabled={isFixing || status.autoFixableCount === 0}
              className="rounded-xl"
              data-testid="button-confirm-fix"
            >
              {isFixing ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
