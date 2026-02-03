import { useSystemState, useContentStatus, type PendingApproval, type ContentDraftEntry } from "@/hooks/useOpsDashboard";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import { Calendar, AlertTriangle, Info, CheckCircle2, Loader2, Clock, BookOpen, Globe, PenTool } from "lucide-react";

interface PlannedUpdatesSectionProps {
  siteId: string;
}

const RISK_CONFIG: Record<string, { label: string; icon: typeof AlertTriangle; color: string; bg: string }> = {
  high: { label: "High Risk", icon: AlertTriangle, color: "#ef4444", bg: "rgba(239, 68, 68, 0.08)" },
  medium: { label: "Medium Risk", icon: AlertTriangle, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.08)" },
  low: { label: "Low Risk", icon: Info, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.08)" },
  safe: { label: "Safe", icon: CheckCircle2, color: "#22c55e", bg: "rgba(34, 197, 94, 0.08)" },
};

const CONTENT_TYPE_CONFIG: Record<string, { icon: typeof BookOpen; label: string; color: string }> = {
  blog_post: { icon: BookOpen, label: "Blog Post", color: "#7c3aed" },
  landing_page: { icon: Globe, label: "Landing Page", color: "#3b82f6" },
  service_page: { icon: Globe, label: "Service Page", color: "#3b82f6" },
  faq: { icon: Globe, label: "FAQ Page", color: "#3b82f6" },
  page_edit: { icon: PenTool, label: "Page Edit", color: "#f59e0b" },
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

function futureTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) return "Soon";

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `in ${diffMins}m`;
  if (diffHours < 24) return `in ${diffHours}h`;
  if (diffDays < 7) return `in ${diffDays}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function PlannedEntry({ entry }: { entry: PendingApproval }) {
  const risk = RISK_CONFIG[entry.riskLevel] || RISK_CONFIG.low;
  const RiskIcon = risk.icon;

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15, 23, 42, 0.06)",
        borderLeft: `3px solid ${risk.color}`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: risk.bg }}
        >
          <RiskIcon className="w-4 h-4" style={{ color: risk.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm" style={{ color: "#0F172A" }}>
            {entry.title}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs" style={{ color: "#94A3B8" }}>
              {relativeTime(entry.createdAt)}
            </span>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
              style={{ color: risk.color, background: risk.bg }}
            >
              {risk.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduledContentEntry({ entry }: { entry: ContentDraftEntry }) {
  const config = CONTENT_TYPE_CONFIG[entry.contentType] || CONTENT_TYPE_CONFIG.blog_post;
  const Icon = config.icon;
  const scheduledDate = entry.autoPublishDate ? futureTime(entry.autoPublishDate) : "Pending";

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: "linear-gradient(135deg, rgba(34, 197, 94, 0.04), rgba(124, 58, 237, 0.04))",
        border: "1px solid rgba(34, 197, 94, 0.15)",
        borderLeft: `3px solid #22c55e`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: "rgba(34, 197, 94, 0.1)" }}
        >
          <Icon className="w-4 h-4" style={{ color: config.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm" style={{ color: "#0F172A" }}>
            {entry.title || "Untitled Content"}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
              style={{ color: "#22c55e", background: "rgba(34, 197, 94, 0.1)" }}
            >
              <Clock className="w-3 h-3" />
              {scheduledDate}
            </span>
            <span className="text-xs" style={{ color: "#94A3B8" }}>
              {config.label}
            </span>
          </div>
          {entry.targetKeywords && entry.targetKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {entry.targetKeywords.slice(0, 2).map((kw, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded text-xs"
                  style={{ background: "rgba(124, 58, 237, 0.08)", color: "#7c3aed" }}
                >
                  {kw}
                </span>
              ))}
              {entry.targetKeywords.length > 2 && (
                <span className="text-xs" style={{ color: "#94A3B8" }}>
                  +{entry.targetKeywords.length - 2} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PlannedUpdatesSection({ siteId }: PlannedUpdatesSectionProps) {
  const { data: systemData, isLoading: systemLoading, isError: systemError } = useSystemState(siteId);
  const { data: contentData, isLoading: contentLoading, isError: contentError } = useContentStatus(siteId);

  const isLoading = systemLoading || contentLoading;
  const isError = systemError || contentError;

  if (isLoading) {
    return (
      <GlassCard variant="marketing" tint="purple">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" style={{ color: "#7c3aed" }} />
            Planned Updates
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

  if (isError || !systemData) {
    return (
      <GlassCard variant="marketing" tint="purple">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" style={{ color: "#7c3aed" }} />
            Planned Updates
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="py-6 text-center">
            <p className="text-sm" style={{ color: "#94A3B8" }}>Unable to load planned updates</p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  const pendingApprovals = systemData.pendingApprovals || [];

  // Get scheduled content items (not yet published)
  const scheduledContent = contentData?.upcoming?.filter(
    (entry) => entry.scheduledForAutoPublish && entry.autoPublishDate && entry.state !== "published"
  ) || [];

  // Sort scheduled content by auto-publish date
  const sortedScheduledContent = [...scheduledContent].sort((a, b) => {
    const dateA = a.autoPublishDate ? new Date(a.autoPublishDate).getTime() : 0;
    const dateB = b.autoPublishDate ? new Date(b.autoPublishDate).getTime() : 0;
    return dateA - dateB;
  });

  const totalPlanned = pendingApprovals.length + sortedScheduledContent.length;

  if (totalPlanned === 0) {
    return (
      <GlassCard variant="marketing" tint="purple">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" style={{ color: "#7c3aed" }} />
            Planned Updates
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="py-8 text-center">
            <Calendar className="w-8 h-8 mx-auto mb-3" style={{ color: "#CBD5E1" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "#475569" }}>No planned updates</p>
            <p className="text-xs" style={{ color: "#94A3B8" }}>
              Arclo will show upcoming changes here before they happen.
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="marketing" tint="purple">
      <GlassCardHeader>
        <div className="flex items-center justify-between">
          <GlassCardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" style={{ color: "#7c3aed" }} />
            Planned Updates
          </GlassCardTitle>
          <span className="text-xs" style={{ color: "#94A3B8" }}>
            {totalPlanned} pending
          </span>
        </div>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {/* Scheduled Content First (most immediate) */}
          {sortedScheduledContent.map((entry) => (
            <ScheduledContentEntry key={entry.draftId} entry={entry} />
          ))}

          {/* Then Pending Approvals */}
          {pendingApprovals.map((entry) => (
            <PlannedEntry key={entry.proposalId} entry={entry} />
          ))}
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}
