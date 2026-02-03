import { useMemo, useState } from "react";
import { useContentStatus, type ContentDraftEntry } from "@/hooks/useOpsDashboard";
import { useQueryClient } from "@tanstack/react-query";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import {
  FileText,
  BookOpen,
  Globe,
  PenTool,
  Loader2,
  Clock,
  Calendar,
  Sparkles,
  Check,
  X,
  Send,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface ContentStatusSectionProps {
  siteId: string;
}

const STATE_BADGES: Record<string, { label: string; color: string; bg: string; clickable?: boolean }> = {
  drafted: { label: "Draft", color: "#64748B", bg: "rgba(100, 116, 139, 0.1)", clickable: true },
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
  page_edit: "Page Edit",
};

interface ContentGenerationModalProps {
  entry: ContentDraftEntry;
  onClose: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
  generationComplete: boolean;
  onPublish: () => void;
}

function ContentGenerationModal({
  entry,
  onClose,
  onGenerate,
  isGenerating,
  generationComplete,
  onPublish,
}: ContentGenerationModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 p-6 rounded-2xl"
        style={{
          background: "#FFFFFF",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(124, 58, 237, 0.1)" }}
            >
              <Sparkles className="w-5 h-5" style={{ color: "#7c3aed" }} />
            </div>
            <div>
              <h3 className="font-semibold text-lg" style={{ color: "#0F172A" }}>
                {generationComplete ? "Content Ready" : "Generate Content"}
              </h3>
              <p className="text-xs" style={{ color: "#64748B" }}>
                {TYPE_LABELS[entry.contentType] || entry.contentType}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-slate-100"
          >
            <X className="w-4 h-4" style={{ color: "#64748B" }} />
          </button>
        </div>

        <div
          className="p-4 rounded-xl mb-4"
          style={{ background: "rgba(15, 23, 42, 0.02)", border: "1px solid rgba(15, 23, 42, 0.06)" }}
        >
          <p className="font-medium text-sm mb-2" style={{ color: "#0F172A" }}>
            {entry.title || "Untitled Content"}
          </p>
          {entry.targetUrl && (
            <p className="text-xs mb-2" style={{ color: "#64748B" }}>
              Target: {entry.targetUrl}
            </p>
          )}
          {entry.targetKeywords && entry.targetKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {entry.targetKeywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-xs"
                  style={{ background: "rgba(124, 58, 237, 0.08)", color: "#7c3aed" }}
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>

        {!generationComplete ? (
          <>
            <p className="text-sm mb-4" style={{ color: "#475569" }}>
              Arclo will analyze your target keywords and competitors to generate optimized content for this {TYPE_LABELS[entry.contentType]?.toLowerCase() || "piece"}.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ background: "rgba(15, 23, 42, 0.04)", color: "#64748B" }}
              >
                Cancel
              </button>
              <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: "#7c3aed",
                  color: "#FFFFFF",
                  boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
                }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Content
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              className="p-3 rounded-xl mb-4 flex items-center gap-3"
              style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.2)" }}
            >
              <Check className="w-5 h-5" style={{ color: "#22c55e" }} />
              <p className="text-sm font-medium" style={{ color: "#166534" }}>
                Content generated successfully!
              </p>
            </div>
            <p className="text-sm mb-4" style={{ color: "#475569" }}>
              Would you like to publish this content now or save it for later review?
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ background: "rgba(15, 23, 42, 0.04)", color: "#64748B" }}
              >
                Save for Later
              </button>
              <button
                onClick={onPublish}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                style={{
                  background: "#22c55e",
                  color: "#FFFFFF",
                  boxShadow: "0 4px 12px rgba(34, 197, 94, 0.3)",
                }}
              >
                <Send className="w-4 h-4" />
                Publish Now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StateBadge({
  state,
  onClick,
}: {
  state: string;
  onClick?: () => void;
}) {
  const badge = STATE_BADGES[state] || { label: state, color: "#64748B", bg: "rgba(100, 116, 139, 0.1)" };
  const isClickable = badge.clickable && onClick;

  return (
    <span
      onClick={isClickable ? onClick : undefined}
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium transition-all ${
        isClickable ? "cursor-pointer hover:ring-2 hover:ring-offset-1" : ""
      }`}
      style={{
        color: badge.color,
        background: badge.bg,
        ...(isClickable ? { "--tw-ring-color": badge.color } as any : {}),
      }}
    >
      {badge.label}
    </span>
  );
}

function ContentEntry({
  entry,
  onDraftClick,
}: {
  entry: ContentDraftEntry;
  onDraftClick: (entry: ContentDraftEntry) => void;
}) {
  const typeLabel = TYPE_LABELS[entry.contentType] || entry.contentType;
  const isScheduled = entry.scheduledForAutoPublish && entry.autoPublishDate;

  return (
    <div
      className="p-3 rounded-xl relative"
      style={{
        background: isScheduled
          ? "linear-gradient(135deg, rgba(124, 58, 237, 0.04), rgba(34, 197, 94, 0.04))"
          : "#FFFFFF",
        border: isScheduled
          ? "1px solid rgba(124, 58, 237, 0.15)"
          : "1px solid rgba(15, 23, 42, 0.06)",
      }}
    >
      {isScheduled && (
        <div
          className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full flex items-center gap-1"
          style={{
            background: "#22c55e",
            boxShadow: "0 2px 4px rgba(34, 197, 94, 0.3)",
          }}
        >
          <Clock className="w-3 h-3" style={{ color: "#FFFFFF" }} />
          <span className="text-[10px] font-semibold" style={{ color: "#FFFFFF" }}>
            Scheduled
          </span>
        </div>
      )}
      <div className="flex items-start justify-between mb-1">
        <p className="font-medium text-sm truncate flex-1 pr-2" style={{ color: "#0F172A" }}>
          {entry.title || "Untitled"}
        </p>
        <StateBadge
          state={entry.state}
          onClick={entry.state === "drafted" ? () => onDraftClick(entry) : undefined}
        />
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
      {isScheduled && entry.autoPublishDate && (
        <div className="mt-2 flex items-center gap-1.5">
          <Calendar className="w-3 h-3" style={{ color: "#22c55e" }} />
          <span className="text-xs" style={{ color: "#22c55e" }}>
            Auto-publish: {new Date(entry.autoPublishDate).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
}

function AutoPublishToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
      style={{
        background: enabled ? "rgba(34, 197, 94, 0.1)" : "rgba(15, 23, 42, 0.04)",
        border: enabled ? "1px solid rgba(34, 197, 94, 0.2)" : "1px solid rgba(15, 23, 42, 0.08)",
      }}
    >
      {enabled ? (
        <ToggleRight className="w-5 h-5" style={{ color: "#22c55e" }} />
      ) : (
        <ToggleLeft className="w-5 h-5" style={{ color: "#94A3B8" }} />
      )}
      <span
        className="text-xs font-medium"
        style={{ color: enabled ? "#22c55e" : "#64748B" }}
      >
        Auto-publish
      </span>
    </button>
  );
}

export function ContentStatusSection({ siteId }: ContentStatusSectionProps) {
  const { data, isLoading, isError } = useContentStatus(siteId);
  const queryClient = useQueryClient();
  const [selectedEntry, setSelectedEntry] = useState<ContentDraftEntry | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(data?.autoPublishEnabled ?? true);

  // Split content into three categories
  const { newBlogs, newWebPages, webPageEdits } = useMemo(() => {
    if (!data) return { newBlogs: [], newWebPages: [], webPageEdits: [] };

    // New content comes from upcoming + recentlyPublished
    const newContent = [...data.upcoming, ...data.recentlyPublished];

    return {
      newBlogs: newContent.filter(e => e.contentType === "blog_post"),
      newWebPages: newContent.filter(e =>
        ["landing_page", "service_page", "faq"].includes(e.contentType)
      ),
      // contentUpdates already contains page edits
      webPageEdits: data.contentUpdates,
    };
  }, [data]);

  const handleDraftClick = (entry: ContentDraftEntry) => {
    setSelectedEntry(entry);
    setIsGenerating(false);
    setGenerationComplete(false);
  };

  const handleGenerate = async () => {
    if (!selectedEntry) return;

    setIsGenerating(true);

    try {
      // Call content generation API
      const response = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          siteId,
          draftId: selectedEntry.draftId,
          contentType: selectedEntry.contentType,
          targetKeywords: selectedEntry.targetKeywords,
          targetUrl: selectedEntry.targetUrl,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate content");
      }

      setGenerationComplete(true);
      // Refresh content status
      queryClient.invalidateQueries({ queryKey: ["/api/ops-dashboard", siteId, "content-status"] });
    } catch (error) {
      console.error("Content generation failed:", error);
      alert("Failed to generate content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedEntry) return;

    try {
      const response = await fetch("/api/content/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          siteId,
          draftId: selectedEntry.draftId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to publish content");
      }

      // Refresh content status
      queryClient.invalidateQueries({ queryKey: ["/api/ops-dashboard", siteId, "content-status"] });
      setSelectedEntry(null);
    } catch (error) {
      console.error("Content publish failed:", error);
      alert("Failed to publish content. Please try again.");
    }
  };

  const handleAutoPublishToggle = async () => {
    const newValue = !autoPublishEnabled;
    setAutoPublishEnabled(newValue);

    try {
      await fetch("/api/site/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          siteId,
          autoPublishEnabled: newValue,
        }),
      });
    } catch (error) {
      console.error("Failed to update auto-publish setting:", error);
      setAutoPublishEnabled(!newValue); // Revert on error
    }
  };

  const handleCloseModal = () => {
    setSelectedEntry(null);
    setIsGenerating(false);
    setGenerationComplete(false);
  };

  if (isLoading) {
    return (
      <GlassCard variant="marketing" tint="amber">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: "#f59e0b" }} />
            Content
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
            Content
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
            Content
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
    <>
      {selectedEntry && (
        <ContentGenerationModal
          entry={selectedEntry}
          onClose={handleCloseModal}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          generationComplete={generationComplete}
          onPublish={handlePublish}
        />
      )}

      <GlassCard variant="marketing" tint="amber">
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <GlassCardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" style={{ color: "#f59e0b" }} />
              Content
            </GlassCardTitle>
            <AutoPublishToggle
              enabled={autoPublishEnabled}
              onToggle={handleAutoPublishToggle}
            />
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="grid grid-cols-3 gap-4">
            {/* New Blogs */}
            <ContentColumn
              icon={BookOpen}
              iconColor="#7c3aed"
              title="New Blogs"
              entries={newBlogs}
              emptyText="No blog posts"
              onDraftClick={handleDraftClick}
            />

            {/* New Web Pages */}
            <ContentColumn
              icon={Globe}
              iconColor="#3b82f6"
              title="New Web Pages"
              entries={newWebPages}
              emptyText="No new pages"
              onDraftClick={handleDraftClick}
            />

            {/* Web Page Edits */}
            <ContentColumn
              icon={PenTool}
              iconColor="#f59e0b"
              title="Web Page Edits"
              entries={webPageEdits}
              emptyText="No edits pending"
              onDraftClick={handleDraftClick}
            />
          </div>

          {/* Auto-publish Footer */}
          <div
            className="mt-6 pt-4 flex items-center justify-between"
            style={{ borderTop: "1px solid rgba(15, 23, 42, 0.06)" }}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: autoPublishEnabled ? "#22c55e" : "#94A3B8" }} />
              <span className="text-xs" style={{ color: "#64748B" }}>
                {autoPublishEnabled
                  ? data.nextAutoPublish
                    ? `Next auto-publish: ${new Date(data.nextAutoPublish).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}`
                    : "Auto-publish enabled (no content scheduled)"
                  : "Auto-publish disabled"}
              </span>
            </div>
            {autoPublishEnabled && data.nextAutoPublish && (
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22c55e" }}
              >
                {getTimeUntil(data.nextAutoPublish)}
              </span>
            )}
          </div>
        </GlassCardContent>
      </GlassCard>
    </>
  );
}

function ContentColumn({
  icon: Icon,
  iconColor,
  title,
  entries,
  emptyText,
  onDraftClick,
}: {
  icon: typeof FileText;
  iconColor: string;
  title: string;
  entries: ContentDraftEntry[];
  emptyText: string;
  onDraftClick: (entry: ContentDraftEntry) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#94A3B8" }}>
          {title} ({entries.length})
        </p>
      </div>
      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map(entry => (
            <ContentEntry key={entry.draftId} entry={entry} onDraftClick={onDraftClick} />
          ))}
        </div>
      ) : (
        <p className="text-xs py-4 text-center" style={{ color: "#CBD5E1" }}>
          {emptyText}
        </p>
      )}
    </div>
  );
}

function getTimeUntil(dateString: string): string {
  const target = new Date(dateString);
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return "Soon";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `in ${days}d`;
  if (hours > 0) return `in ${hours}h`;

  const minutes = Math.floor(diff / (1000 * 60));
  return `in ${minutes}m`;
}
