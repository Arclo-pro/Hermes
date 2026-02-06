import { useSiteContext } from "@/hooks/useSiteContext";
import { useCrewStatus } from "@/hooks/useCrewStatus";
import { USER_FACING_AGENTS, getCrewMember } from "@/config/agents";
import { SERVICE_TO_CREW } from "@shared/registry";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
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
import { colors, badgeStyles, tableStyles } from "@/lib/design-system";

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
    fresh: { label: "Fresh", style: badgeStyles.green },
    stale: { label: "Stale", style: badgeStyles.amber },
    error: { label: "Error", style: badgeStyles.red },
    degraded: { label: degradedLabel, style: badgeStyles.amber },
  };

  const statusConfig = {
    "Active": { icon: CheckCircle, color: colors.semantic.success },
    "Locked": { icon: Lock, color: colors.brand.amber },
    "Not Configured": { icon: AlertTriangle, color: colors.text.muted },
    "Degraded": { icon: AlertTriangle, color: colors.semantic.warning },
  };

  const StatusIcon = statusConfig[status as keyof typeof statusConfig]?.icon || Clock;
  const statusColor = statusConfig[status as keyof typeof statusConfig]?.color || colors.text.muted;

  if (isLoading) {
    return (
      <tr style={{ borderBottom: `1px solid ${colors.border.default}` }} data-testid={`row-agent-${serviceId}`}>
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
              <span className="font-medium" style={{ color: colors.text.primary }}>{crew.nickname}</span>
              <p className="text-xs" style={{ color: colors.text.muted }}>{crew.role}</p>
            </div>
          </div>
        </td>
        <td colSpan={5} className="py-3 px-4 text-center">
          <Loader2 className="w-4 h-4 animate-spin mx-auto" style={{ color: colors.text.muted }} />
        </td>
      </tr>
    );
  }

  if (isError) {
    return (
      <tr style={{ borderBottom: `1px solid ${colors.border.default}` }} data-testid={`row-agent-${serviceId}`}>
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
              <span className="font-medium" style={{ color: colors.text.primary }}>{crew.nickname}</span>
              <p className="text-xs" style={{ color: colors.text.muted }}>{crew.role}</p>
            </div>
          </div>
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-1.5">
            <XCircle className="w-4 h-4" style={{ color: colors.semantic.danger }} />
            <span className="text-sm" style={{ color: colors.semantic.danger }}>Error</span>
          </div>
        </td>
        <td className="py-3 px-4 text-sm" style={{ color: colors.text.muted }}>—</td>
        <td className="py-3 px-4">
          <span
            className="px-2 py-0.5 rounded-md text-xs font-semibold"
            style={{ color: badgeStyles.red.color, background: badgeStyles.red.bg }}
          >
            Error
          </span>
        </td>
        <td className="py-3 px-4 text-sm" style={{ color: colors.text.muted }}>—</td>
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
    <tr
      className="hover:bg-slate-50 transition-colors"
      style={{ borderBottom: `1px solid ${colors.border.default}` }}
      data-testid={`row-agent-${serviceId}`}
    >
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
            <span className="font-medium" style={{ color: colors.text.primary }}>{crew.nickname}</span>
            <p className="text-xs" style={{ color: colors.text.muted }}>{crew.role}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5">
          <StatusIcon className="w-4 h-4" style={{ color: statusColor }} />
          <span className="text-sm" style={{ color: colors.text.primary }}>{status}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm" style={{ color: colors.text.muted }}>{lastRun}</span>
      </td>
      <td className="py-3 px-4">
        <span
          className="px-2 py-0.5 rounded-md text-xs font-semibold"
          style={{ color: freshnessConfig[freshness].style.color, background: freshnessConfig[freshness].style.bg }}
        >
          {freshnessConfig[freshness].label}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm" style={{ color: colors.text.muted }}>{outputSummary}</span>
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
      <GlassCard variant="marketing" tint="purple" data-testid="panel-agent-coverage">
        <GlassCardHeader>
          <GlassCardTitle style={{ color: colors.text.primary }}>Agent Coverage Status</GlassCardTitle>
          <p className="text-sm" style={{ color: colors.text.muted }}>Internal debugging surface for agent health</p>
        </GlassCardHeader>
        <GlassCardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.text.muted }} />
        </GlassCardContent>
      </GlassCard>
    );
  }

  if (!siteId) {
    return (
      <GlassCard variant="marketing" tint="purple" data-testid="panel-agent-coverage">
        <GlassCardHeader>
          <GlassCardTitle style={{ color: colors.text.primary }}>Agent Coverage Status</GlassCardTitle>
          <p className="text-sm" style={{ color: colors.text.muted }}>Internal debugging surface for agent health</p>
        </GlassCardHeader>
        <GlassCardContent>
          <p className="text-sm text-center py-4" style={{ color: colors.text.muted }}>No site selected</p>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="marketing" tint="purple" data-testid="panel-agent-coverage">
      <GlassCardHeader>
        <GlassCardTitle style={{ color: colors.text.primary }}>Agent Coverage Status</GlassCardTitle>
        <p className="text-sm" style={{ color: colors.text.muted }}>Internal debugging surface for agent health</p>
      </GlassCardHeader>
      <GlassCardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border.strong}`, background: colors.background.muted }}>
                <th className="text-left py-2 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.text.muted }}>Agent</th>
                <th className="text-left py-2 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.text.muted }}>Status</th>
                <th className="text-left py-2 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.text.muted }}>Last Run</th>
                <th className="text-left py-2 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.text.muted }}>Freshness</th>
                <th className="text-left py-2 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.text.muted }}>Outputs</th>
                <th className="text-left py-2 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.text.muted }}>Actions</th>
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
      </GlassCardContent>
    </GlassCard>
  );
}
