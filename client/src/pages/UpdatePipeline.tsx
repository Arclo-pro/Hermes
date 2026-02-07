import { useSiteContext } from "@/hooks/useSiteContext";
import { useUpdatePipeline, type SuggestionData } from "@/hooks/useOpsDashboard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import { pageStyles } from "@/lib/design-system";
import {
  Loader2,
  TrendingUp,
  Clock,
  Bot,
  ArrowRight,
  Archive,
  CheckCircle2,
  XCircle,
  Inbox,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const PIPELINE_COLUMNS = [
  { status: "backlog", label: "Backlog", icon: Inbox, color: "#64748B", description: "All agent suggestions" },
  { status: "proposed", label: "Proposed", icon: Sparkles, color: "#7c3aed", description: "Under consideration" },
  { status: "selected", label: "Selected", icon: CheckCircle2, color: "#22c55e", description: "This week's picks" },
  { status: "published", label: "Published", icon: Archive, color: "#3b82f6", description: "Actioned/completed" },
  { status: "skipped", label: "Skipped", icon: XCircle, color: "#94a3b8", description: "Dismissed" },
] as const;

type PipelineStatus = (typeof PIPELINE_COLUMNS)[number]["status"];

const IMPACT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: "High", color: "#22c55e", bg: "rgba(34, 197, 94, 0.08)" },
  medium: { label: "Med", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.08)" },
  low: { label: "Low", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.08)" },
};

const EFFORT_CONFIG: Record<string, { label: string; color: string }> = {
  quick_win: { label: "Quick", color: "#22c55e" },
  moderate: { label: "Mod", color: "#f59e0b" },
  significant: { label: "Big", color: "#ef4444" },
};

function PipelineCard({
  suggestion,
  currentStatus,
  onMove,
  isMoving,
}: {
  suggestion: SuggestionData;
  currentStatus: PipelineStatus;
  onMove: (suggestionId: string, newStatus: PipelineStatus, reason?: string) => void;
  isMoving: boolean;
}) {
  const impactConfig = IMPACT_CONFIG[(suggestion.estimatedImpact ?? "medium").toLowerCase()] ?? IMPACT_CONFIG.medium;
  const effortConfig = EFFORT_CONFIG[(suggestion.estimatedEffort ?? "moderate").toLowerCase()] ?? EFFORT_CONFIG.moderate;

  // Determine available actions based on current status
  const actions: { label: string; status: PipelineStatus; color: string }[] = [];
  if (currentStatus === "backlog") {
    actions.push({ label: "Propose", status: "proposed", color: "#7c3aed" });
    actions.push({ label: "Skip", status: "skipped", color: "#64748B" });
  } else if (currentStatus === "proposed") {
    actions.push({ label: "Select", status: "selected", color: "#22c55e" });
    actions.push({ label: "Back", status: "backlog", color: "#64748B" });
  } else if (currentStatus === "selected") {
    actions.push({ label: "Publish", status: "published", color: "#3b82f6" });
    actions.push({ label: "Back", status: "proposed", color: "#64748B" });
  }

  return (
    <div
      className="p-3 rounded-lg mb-2"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15, 23, 42, 0.06)",
      }}
    >
      <p className="text-sm font-medium mb-1 line-clamp-2" style={{ color: "#0F172A" }}>
        {suggestion.title}
      </p>

      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs"
          style={{ color: impactConfig.color, background: impactConfig.bg }}
        >
          <TrendingUp className="w-2.5 h-2.5" />
          {impactConfig.label}
        </span>
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs"
          style={{ color: effortConfig.color, background: `${effortConfig.color}12` }}
        >
          <Clock className="w-2.5 h-2.5" />
          {effortConfig.label}
        </span>
        {suggestion.sourceAgentId && (
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs"
            style={{ color: "#7c3aed", background: "rgba(124, 58, 237, 0.08)" }}
          >
            <Bot className="w-2.5 h-2.5" />
            {suggestion.sourceAgentId}
          </span>
        )}
        {suggestion.priorityScore !== null && (
          <span className="text-xs" style={{ color: "#94a3b8" }}>
            Score: {suggestion.priorityScore}
          </span>
        )}
      </div>

      {actions.length > 0 && (
        <div className="flex gap-1.5">
          {actions.map((action) => (
            <button
              key={action.status}
              onClick={() => onMove(suggestion.suggestionId, action.status)}
              disabled={isMoving}
              className="flex items-center gap-0.5 px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
              style={{
                color: action.color,
                background: `${action.color}12`,
              }}
            >
              {action.label}
              <ChevronRight className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PipelineColumn({
  status,
  label,
  icon: Icon,
  color,
  description,
  suggestions,
  onMove,
  isMoving,
}: {
  status: PipelineStatus;
  label: string;
  icon: typeof Inbox;
  color: string;
  description: string;
  suggestions: SuggestionData[];
  onMove: (suggestionId: string, newStatus: PipelineStatus, reason?: string) => void;
  isMoving: boolean;
}) {
  return (
    <div
      className="flex flex-col min-w-[280px] rounded-xl p-3"
      style={{
        background: "rgba(255, 255, 255, 0.6)",
        border: "1px solid rgba(15, 23, 42, 0.06)",
      }}
    >
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${color}15` }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "#0F172A" }}>
              {label}
            </p>
            <p className="text-xs" style={{ color: "#94a3b8" }}>
              {description}
            </p>
          </div>
        </div>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ background: `${color}15`, color }}
        >
          {suggestions.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[500px] space-y-0">
        {suggestions.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: "#94a3b8" }}>
            No suggestions
          </p>
        ) : (
          suggestions.map((s) => (
            <PipelineCard
              key={s.suggestionId}
              suggestion={s}
              currentStatus={status}
              onMove={onMove}
              isMoving={isMoving}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function UpdatePipeline() {
  const { selectedSite } = useSiteContext();
  const siteId = selectedSite?.siteId;
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useUpdatePipeline(siteId);
  const [movingId, setMovingId] = useState<string | null>(null);

  const moveMutation = useMutation({
    mutationFn: async ({
      suggestionId,
      newStatus,
      reason,
    }: {
      suggestionId: string;
      newStatus: string;
      reason?: string;
    }) => {
      const res = await fetch(`/api/update-pipeline/suggestions/${suggestionId}/pipeline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newStatus, reason }),
      });
      if (!res.ok) {
        throw new Error("Failed to move suggestion");
      }
      return res.json();
    },
    onMutate: ({ suggestionId }) => {
      setMovingId(suggestionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/update-pipeline", siteId] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-plan", siteId] });
    },
    onSettled: () => {
      setMovingId(null);
    },
  });

  const handleMove = (suggestionId: string, newStatus: PipelineStatus, reason?: string) => {
    moveMutation.mutate({ suggestionId, newStatus, reason });
  };

  if (!siteId) {
    return (
      <div className="min-h-screen p-6" style={pageStyles.background}>
        <div className="max-w-7xl mx-auto">
          <p className="text-slate-500">Please select a site to view the update pipeline.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-6" style={pageStyles.background}>
        <div className="max-w-7xl mx-auto flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#7c3aed" }} />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen p-6" style={pageStyles.background}>
        <div className="max-w-7xl mx-auto">
          <p className="text-red-500">Failed to load pipeline data.</p>
        </div>
      </div>
    );
  }

  const domain = selectedSite?.baseUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "";

  return (
    <div className="min-h-screen p-6" style={pageStyles.background}>
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "#0F172A" }}>
            Update Pipeline
          </h1>
          <p className="text-sm mt-1" style={{ color: "#64748B" }}>
            Manage agent-recommended updates for {domain}
          </p>
        </div>

        {/* Pipeline Columns */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_COLUMNS.map((col) => (
            <PipelineColumn
              key={col.status}
              status={col.status}
              label={col.label}
              icon={col.icon}
              color={col.color}
              description={col.description}
              suggestions={data[col.status] || []}
              onMove={handleMove}
              isMoving={movingId !== null}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
