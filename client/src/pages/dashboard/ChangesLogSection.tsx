import { useChangesLog, type ChangeLogEntry } from "@/hooks/useOpsDashboard";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import { History, CheckCircle2, XCircle, Clock, Loader2, Eye, Bell, HelpCircle } from "lucide-react";

interface ChangesLogSectionProps {
  siteId: string;
}

const SEVERITY_CONFIG = {
  silent: {
    label: "Silent",
    icon: Eye,
    color: "#64748B",
    bg: "rgba(100, 116, 139, 0.08)",
    borderColor: "rgba(100, 116, 139, 0.2)",
  },
  notify: {
    label: "Notify",
    icon: Bell,
    color: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.08)",
    borderColor: "rgba(124, 58, 237, 0.2)",
  },
  ask: {
    label: "Ask",
    icon: HelpCircle,
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
};

const OUTCOME_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  success: { label: "Success", icon: CheckCircle2, color: "#22c55e" },
  failure: { label: "Failed", icon: XCircle, color: "#ef4444" },
  pending: { label: "Pending", icon: Clock, color: "#f59e0b" },
  rollback: { label: "Rolled Back", icon: XCircle, color: "#ef4444" },
};

function relativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function ChangeEntry({ entry }: { entry: ChangeLogEntry }) {
  const severity = SEVERITY_CONFIG[entry.severity];
  const outcome = OUTCOME_CONFIG[entry.outcome] || OUTCOME_CONFIG.pending;
  const SeverityIcon = severity.icon;
  const OutcomeIcon = outcome.icon;

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15, 23, 42, 0.06)",
        borderLeft: `3px solid ${severity.borderColor}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: severity.bg }}
          >
            <SeverityIcon className="w-4 h-4" style={{ color: severity.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm" style={{ color: "#0F172A" }}>
              {entry.what}
            </p>
            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#64748B" }}>
              {entry.why}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs" style={{ color: "#94A3B8" }}>
                {relativeTime(entry.when)}
              </span>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                style={{ color: severity.color, background: severity.bg }}
              >
                {severity.label}
              </span>
              <span className="text-xs" style={{ color: "#94A3B8" }}>
                {entry.category}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <OutcomeIcon className="w-4 h-4" style={{ color: outcome.color }} />
          <span className="text-xs font-medium" style={{ color: outcome.color }}>
            {outcome.label}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ChangesLogSection({ siteId }: ChangesLogSectionProps) {
  const { data, isLoading, isError } = useChangesLog(siteId);

  if (isLoading) {
    return (
      <GlassCard variant="marketing" tint="cyan">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" style={{ color: "#06b6d4" }} />
            Recent Updates
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
      <GlassCard variant="marketing" tint="cyan">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" style={{ color: "#06b6d4" }} />
            Recent Updates
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="py-6 text-center">
            <p className="text-sm" style={{ color: "#94A3B8" }}>Unable to load changes</p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  if (!data.hasHistory) {
    return (
      <GlassCard variant="marketing" tint="cyan">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" style={{ color: "#06b6d4" }} />
            Recent Updates
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="py-8 text-center">
            <History className="w-8 h-8 mx-auto mb-3" style={{ color: "#CBD5E1" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "#475569" }}>No changes yet</p>
            <p className="text-xs" style={{ color: "#94A3B8" }}>
              Arclo will log every action it takes here, so you always know what happened and why.
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="marketing" tint="cyan">
      <GlassCardHeader>
        <div className="flex items-center justify-between">
          <GlassCardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" style={{ color: "#06b6d4" }} />
            Recent Updates
          </GlassCardTitle>
          <span className="text-xs" style={{ color: "#94A3B8" }}>
            {data.entries.length} action{data.entries.length !== 1 ? "s" : ""}
          </span>
        </div>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="space-y-2">
          {data.entries.map(entry => (
            <ChangeEntry key={entry.id} entry={entry} />
          ))}
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}
