import { useContentStatus, type ContentDraftEntry } from "@/hooks/useOpsDashboard";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import { FileText, Clock, CheckCircle2, PenTool, Loader2 } from "lucide-react";

interface ContentStatusSectionProps {
  siteId: string;
}

const STATE_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  drafted: { label: "Draft", color: "#64748B", bg: "rgba(100, 116, 139, 0.1)" },
  generating: { label: "Generating", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
  revision_needed: { label: "Revision", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
  qa_passed: { label: "QA Passed", color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)" },
  approved: { label: "Approved", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
  published: { label: "Published", color: "#7c3aed", bg: "rgba(124, 58, 237, 0.1)" },
};

const TYPE_LABELS: Record<string, string> = {
  blog_post: "Blog",
  landing_page: "Landing Page",
  faq: "FAQ",
  service_page: "Service Page",
};

function StateBadge({ state }: { state: string }) {
  const badge = STATE_BADGES[state] || { label: state, color: "#64748B", bg: "rgba(100, 116, 139, 0.1)" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ color: badge.color, background: badge.bg }}
    >
      {badge.label}
    </span>
  );
}

function ContentEntry({ entry }: { entry: ContentDraftEntry }) {
  const typeLabel = TYPE_LABELS[entry.contentType] || entry.contentType;
  return (
    <div
      className="p-3 rounded-xl"
      style={{ background: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.06)" }}
    >
      <div className="flex items-start justify-between mb-1">
        <p className="font-medium text-sm truncate flex-1" style={{ color: "#0F172A" }}>
          {entry.title || "Untitled"}
        </p>
        <StateBadge state={entry.state} />
      </div>
      <div className="flex items-center gap-3 text-xs" style={{ color: "#64748B" }}>
        <span>{typeLabel}</span>
        {entry.targetUrl && (
          <>
            <span>&middot;</span>
            <span className="truncate">{entry.targetUrl}</span>
          </>
        )}
      </div>
      {entry.targetKeywords && entry.targetKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {entry.targetKeywords.slice(0, 3).map((kw, i) => (
            <span
              key={i}
              className="px-1.5 py-0.5 rounded text-xs"
              style={{ background: "rgba(124, 58, 237, 0.06)", color: "#7c3aed" }}
            >
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ContentStatusSection({ siteId }: ContentStatusSectionProps) {
  const { data, isLoading, isError } = useContentStatus(siteId);

  if (isLoading) {
    return (
      <GlassCard variant="marketing" tint="amber">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: "#f59e0b" }} />
            Content Execution
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
      <GlassCard variant="marketing" tint="amber">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: "#f59e0b" }} />
            Content Execution
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="py-6 text-center">
            <p className="text-sm" style={{ color: "#94A3B8" }}>Unable to load content status</p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  if (!data.hasContent) {
    return (
      <GlassCard variant="marketing" tint="amber">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: "#f59e0b" }} />
            Content Execution
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="py-8 text-center">
            <PenTool className="w-8 h-8 mx-auto mb-3" style={{ color: "#CBD5E1" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "#475569" }}>No content in the pipeline</p>
            <p className="text-xs" style={{ color: "#94A3B8" }}>
              Arclo will start planning and generating content once your strategy is configured.
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="marketing" tint="amber">
      <GlassCardHeader>
        <GlassCardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" style={{ color: "#f59e0b" }} />
          Content Execution
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="space-y-6">
          {/* Upcoming */}
          {data.upcoming.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4" style={{ color: "#f59e0b" }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#94A3B8" }}>
                  Upcoming ({data.upcoming.length})
                </p>
              </div>
              <div className="space-y-2">
                {data.upcoming.map(entry => (
                  <ContentEntry key={entry.draftId} entry={entry} />
                ))}
              </div>
            </div>
          )}

          {/* Recently Published */}
          {data.recentlyPublished.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4" style={{ color: "#22c55e" }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#94A3B8" }}>
                  Recently Published ({data.recentlyPublished.length})
                </p>
              </div>
              <div className="space-y-2">
                {data.recentlyPublished.map(entry => (
                  <ContentEntry key={entry.draftId} entry={entry} />
                ))}
              </div>
            </div>
          )}

          {/* Content Updates */}
          {data.contentUpdates.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <PenTool className="w-4 h-4" style={{ color: "#7c3aed" }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#94A3B8" }}>
                  Content Updates ({data.contentUpdates.length})
                </p>
              </div>
              <div className="space-y-2">
                {data.contentUpdates.map(entry => (
                  <ContentEntry key={entry.draftId} entry={entry} />
                ))}
              </div>
            </div>
          )}
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}
