import { useSiteContext } from "@/hooks/useSiteContext";
import { useCrewStatus } from "@/hooks/useCrewStatus";
import { USER_FACING_AGENTS, getCrewMember } from "@/config/agents";
import { SERVICE_TO_CREW } from "@shared/registry";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExternalLink, Loader2, CheckCircle, AlertTriangle, XCircle, Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildRoute } from "@shared/routes";

interface AgentRowProps {
  serviceId: string;
  siteId: string;
  isSubscribed?: boolean;
}

function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

function getFreshnessFromUpdatedAt(updatedAt: string | null | undefined): "fresh" | "stale" | "error" {
  if (!updatedAt) return "error";
  const date = new Date(updatedAt);
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffHours < 24) return "fresh";
  if (diffHours < 72) return "stale";
  return "error";
}

function AgentRow({ serviceId, siteId, isSubscribed = true }: AgentRowProps) {
  const crewId = SERVICE_TO_CREW[serviceId as keyof typeof SERVICE_TO_CREW] || serviceId;
  const crew = getCrewMember(serviceId);
  const Icon = crew.icon;
  
  const { 
    crewStatus, 
    isLoading, 
    isError, 
    score, 
    missions, 
    readiness,
    isDegraded,
    degradedSince,
    consecutiveFailures,
    lastErrorMessage,
  } = useCrewStatus({
    siteId,
    crewId,
    enabled: !!siteId,
  });

  const isReady = readiness?.isReady !== false;
  const isLocked = !isSubscribed && crew.category === "additional";
  const status = isLocked ? "Locked" : !isReady ? "Not Configured" : isDegraded ? "Degraded" : "Active";
  
  const hasError = crewStatus?.status === "needs_attention";
  const freshness = isDegraded 
    ? "degraded" 
    : hasError 
      ? "error" 
      : crewStatus?.updatedAt 
        ? getFreshnessFromUpdatedAt(crewStatus.updatedAt)
        : "error";
  const lastRun = formatRelativeTime(crewStatus?.updatedAt);
  
  const outputSummary = missions?.open 
    ? `${missions.open} open, ${missions.completed} done`
    : score !== null 
      ? `Score: ${score}/100`
      : "No data";

  const formatDegradedDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const degradedLabel = isDegraded 
    ? `Degraded (${consecutiveFailures}x failed${degradedSince ? ` since ${formatDegradedDate(degradedSince)}` : ""})`
    : "";

  const freshnessConfig = {
    fresh: { label: "Fresh", className: "bg-semantic-success-soft text-semantic-success" },
    stale: { label: "Stale", className: "bg-gold-soft text-gold" },
    error: { label: "Error", className: "bg-semantic-danger-soft text-semantic-danger" },
    degraded: { label: degradedLabel, className: "bg-semantic-warning-soft text-semantic-warning" },
  };

  const statusConfig = {
    "Active": { icon: CheckCircle, className: "text-semantic-success" },
    "Locked": { icon: Lock, className: "text-gold" },
    "Not Configured": { icon: AlertTriangle, className: "text-muted-foreground" },
    "Degraded": { icon: AlertTriangle, className: "text-semantic-warning" },
  };

  const StatusIcon = statusConfig[status as keyof typeof statusConfig]?.icon || Clock;
  const statusClassName = statusConfig[status as keyof typeof statusConfig]?.className || "text-muted-foreground";

  if (isLoading) {
    return (
      <tr className="border-b border-border" data-testid={`row-agent-${serviceId}`}>
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            {crew.avatar ? (
              <img src={crew.avatar} alt={crew.nickname} className="w-8 h-8 object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${crew.color}20` }}>
                <Icon className="w-4 h-4" style={{ color: crew.color }} />
              </div>
            )}
            <div>
              <span className="font-medium text-foreground">{crew.nickname}</span>
              <p className="text-xs text-muted-foreground">{crew.role}</p>
            </div>
          </div>
        </td>
        <td colSpan={5} className="py-3 px-4 text-center">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
        </td>
      </tr>
    );
  }

  if (isError) {
    return (
      <tr className="border-b border-border" data-testid={`row-agent-${serviceId}`}>
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            {crew.avatar ? (
              <img src={crew.avatar} alt={crew.nickname} className="w-8 h-8 object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${crew.color}20` }}>
                <Icon className="w-4 h-4" style={{ color: crew.color }} />
              </div>
            )}
            <div>
              <span className="font-medium text-foreground">{crew.nickname}</span>
              <p className="text-xs text-muted-foreground">{crew.role}</p>
            </div>
          </div>
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-1.5">
            <XCircle className="w-4 h-4 text-semantic-danger" />
            <span className="text-sm text-semantic-danger">Error</span>
          </div>
        </td>
        <td className="py-3 px-4 text-sm text-muted-foreground">—</td>
        <td className="py-3 px-4">
          <Badge className="bg-semantic-danger-soft text-semantic-danger">Error</Badge>
        </td>
        <td className="py-3 px-4 text-sm text-muted-foreground">—</td>
        <td className="py-3 px-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => window.open(`${buildRoute.agent(crewId)}?tab=logs`, "_blank")}
            data-testid={`button-logs-${serviceId}`}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Logs
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border hover:bg-muted/50" data-testid={`row-agent-${serviceId}`}>
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          {crew.avatar ? (
            <img src={crew.avatar} alt={crew.nickname} className="w-8 h-8 object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${crew.color}20` }}>
              <Icon className="w-4 h-4" style={{ color: crew.color }} />
            </div>
          )}
          <div>
            <span className="font-medium text-foreground">{crew.nickname}</span>
            <p className="text-xs text-muted-foreground">{crew.role}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5">
          <StatusIcon className={cn("w-4 h-4", statusClassName)} />
          <span className="text-sm text-foreground">{status}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm text-muted-foreground">{lastRun}</span>
      </td>
      <td className="py-3 px-4">
        <Badge className={freshnessConfig[freshness].className}>
          {freshnessConfig[freshness].label}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm text-muted-foreground">{outputSummary}</span>
      </td>
      <td className="py-3 px-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7"
          onClick={() => window.open(`${buildRoute.agent(crewId)}?tab=logs`, "_blank")}
          data-testid={`button-logs-${serviceId}`}
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          Logs
        </Button>
      </td>
    </tr>
  );
}

interface AgentCoveragePanelProps {
  subscriptions?: Record<string, boolean>;
}

export function AgentCoveragePanel({ subscriptions = {} }: AgentCoveragePanelProps) {
  const { siteId, isLoading: siteLoading } = useSiteContext();

  if (siteLoading) {
    return (
      <Card className="bg-card border-border" data-testid="panel-agent-coverage">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Agent Coverage Status</CardTitle>
          <p className="text-sm text-muted-foreground">Internal debugging surface for agent health</p>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!siteId) {
    return (
      <Card className="bg-card border-border" data-testid="panel-agent-coverage">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Agent Coverage Status</CardTitle>
          <p className="text-sm text-muted-foreground">Internal debugging surface for agent health</p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No site selected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border" data-testid="panel-agent-coverage">
      <CardHeader>
        <CardTitle className="text-lg text-foreground">Agent Coverage Status</CardTitle>
        <p className="text-sm text-muted-foreground">Internal debugging surface for agent health</p>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agent</th>
                <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Run</th>
                <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Freshness</th>
                <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outputs</th>
                <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {USER_FACING_AGENTS.map((serviceId) => (
                <AgentRow 
                  key={serviceId} 
                  serviceId={serviceId} 
                  siteId={siteId} 
                  isSubscribed={subscriptions[serviceId] !== false}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
