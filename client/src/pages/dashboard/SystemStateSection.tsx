import { useSystemState } from "@/hooks/useOpsDashboard";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import { Shield, Lock, Unlock, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

interface SystemStateSectionProps {
  siteId: string;
}

const TRUST_LEVEL_COLORS: Record<number, { color: string; bg: string }> = {
  0: { color: "#64748B", bg: "rgba(100, 116, 139, 0.1)" },
  1: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
  2: { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
  3: { color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)" },
};

const PLAN_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  free: { label: "Free", color: "#64748B", bg: "rgba(100, 116, 139, 0.1)" },
  core: { label: "Core", color: "#7c3aed", bg: "rgba(124, 58, 237, 0.1)" },
  pro: { label: "Pro", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
};

export function SystemStateSection({ siteId }: SystemStateSectionProps) {
  const { data, isLoading, isError } = useSystemState(siteId);
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <GlassCard variant="marketing" tint="purple">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: "#7c3aed" }} />
            Plan & System State
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#94A3B8" }} />
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  if (isError || !data) {
    return (
      <GlassCard variant="marketing" tint="purple">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: "#7c3aed" }} />
            Plan & System State
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="py-6 text-center">
            <p className="text-sm" style={{ color: "#94A3B8" }}>Unable to load system state</p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  const planBadge = PLAN_BADGES[data.plan] || PLAN_BADGES.free;
  const hasCapabilities = data.capabilities.enabled.length > 0 || data.capabilities.locked.length > 0;

  return (
    <GlassCard variant="marketing" tint="purple">
      <GlassCardHeader>
        <GlassCardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" style={{ color: "#7c3aed" }} />
          Plan & System State
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="space-y-6">
          {/* Plan Badge */}
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.06)" }}
          >
            <span
              className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold"
              style={{ color: planBadge.color, background: planBadge.bg }}
            >
              {planBadge.label} Plan
            </span>
            {data.policies && (
              <div className="flex items-center gap-2 ml-auto">
                {data.policies.canAutoFixTechnical && (
                  <PolicyBadge label="Auto Tech Fix" />
                )}
                {data.policies.canAutoPublishContent && (
                  <PolicyBadge label="Auto Publish" />
                )}
                {data.policies.canAutoUpdateContent && (
                  <PolicyBadge label="Auto Update" />
                )}
              </div>
            )}
          </div>

          {/* Capabilities */}
          {hasCapabilities && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Enabled */}
              {data.capabilities.enabled.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Unlock className="w-4 h-4" style={{ color: "#22c55e" }} />
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#94A3B8" }}>
                      Enabled ({data.capabilities.enabled.length})
                    </p>
                  </div>
                  <div className="space-y-2">
                    {data.capabilities.enabled.map(cap => {
                      const tlColor = TRUST_LEVEL_COLORS[cap.trustLevel] || TRUST_LEVEL_COLORS[0];
                      return (
                        <div
                          key={cap.category}
                          className="flex items-center justify-between p-3 rounded-xl"
                          style={{ background: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.06)" }}
                        >
                          <span className="text-sm font-medium" style={{ color: "#0F172A" }}>
                            {cap.label}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-md text-xs font-medium"
                            style={{ color: tlColor.color, background: tlColor.bg }}
                          >
                            {cap.trustLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Locked */}
              {data.capabilities.locked.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4" style={{ color: "#94A3B8" }} />
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#94A3B8" }}>
                      Locked ({data.capabilities.locked.length})
                    </p>
                  </div>
                  <div className="space-y-2">
                    {data.capabilities.locked.map(cap => (
                      <div
                        key={cap.category}
                        className="flex items-center justify-between p-3 rounded-xl"
                        style={{
                          background: "rgba(15, 23, 42, 0.02)",
                          border: "1px solid rgba(15, 23, 42, 0.06)",
                        }}
                      >
                        <span className="text-sm" style={{ color: "#64748B" }}>
                          {cap.label}
                        </span>
                        <span className="text-xs" style={{ color: "#94A3B8" }}>
                          {cap.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!hasCapabilities && (
            <div className="py-4 text-center">
              <p className="text-sm" style={{ color: "#94A3B8" }}>
                No automation capabilities configured for this site yet.
              </p>
            </div>
          )}

          {/* Pending Approvals */}
          {data.pendingApprovals.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" style={{ color: "#f59e0b" }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#94A3B8" }}>
                  Pending Approvals ({data.pendingApprovals.length})
                </p>
              </div>
              <div className="space-y-2">
                {data.pendingApprovals.map(approval => (
                  <div
                    key={approval.proposalId}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{
                      background: "rgba(245, 158, 11, 0.04)",
                      border: "1px solid rgba(245, 158, 11, 0.15)",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#0F172A" }}>
                        {approval.title}
                      </p>
                      <p className="text-xs" style={{ color: "#64748B" }}>
                        {new Date(approval.createdAt).toLocaleDateString()} &middot;{" "}
                        <span
                          className="font-medium"
                          style={{
                            color: approval.riskLevel === "high"
                              ? "#ef4444"
                              : approval.riskLevel === "medium"
                              ? "#f59e0b"
                              : "#22c55e",
                          }}
                        >
                          {approval.riskLevel} risk
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => navigate("/app/changes")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-amber-50"
                      style={{ color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.25)" }}
                    >
                      Review
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.pendingApprovals.length === 0 && hasCapabilities && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl"
              style={{ background: "rgba(34, 197, 94, 0.04)", border: "1px solid rgba(34, 197, 94, 0.12)" }}
            >
              <CheckCircle2 className="w-4 h-4" style={{ color: "#22c55e" }} />
              <p className="text-sm" style={{ color: "#22c55e" }}>No pending approvals. All clear.</p>
            </div>
          )}
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}

function PolicyBadge({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ color: "#22c55e", background: "rgba(34, 197, 94, 0.1)" }}
    >
      {label}
    </span>
  );
}
