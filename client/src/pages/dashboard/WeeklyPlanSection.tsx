import { useWeeklyPlan, type SuggestionData } from "@/hooks/useOpsDashboard";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import { Sparkles, Loader2, TrendingUp, Clock, Bot, ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface WeeklyPlanSectionProps {
  siteId: string;
}

// Parse ISO week string "2026-W06" to readable date range
function formatWeekDisplay(weekString: string): string {
  const [yearStr, weekPart] = weekString.split("-");
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekPart.replace("W", ""), 10);

  // Get January 4th of the year (always in week 1)
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;

  // Calculate start of week 1
  const week1Start = new Date(jan4);
  week1Start.setDate(jan4.getDate() - jan4Day + 1);

  // Calculate start of target week
  const start = new Date(week1Start);
  start.setDate(week1Start.getDate() + (week - 1) * 7);

  // End is 6 days after start
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", options)}`;
}

const IMPACT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: "High Impact", color: "#22c55e", bg: "rgba(34, 197, 94, 0.08)" },
  medium: { label: "Medium Impact", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.08)" },
  low: { label: "Low Impact", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.08)" },
};

const EFFORT_CONFIG: Record<string, { label: string; color: string }> = {
  quick_win: { label: "Quick Win", color: "#22c55e" },
  moderate: { label: "Moderate", color: "#f59e0b" },
  significant: { label: "Significant", color: "#ef4444" },
};

function ImpactBadge({ impact }: { impact: string | null }) {
  const config = IMPACT_CONFIG[(impact ?? "medium").toLowerCase()] ?? IMPACT_CONFIG.medium;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
      style={{ color: config.color, background: config.bg }}
    >
      <TrendingUp className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function EffortBadge({ effort }: { effort: string | null }) {
  const config = EFFORT_CONFIG[(effort ?? "moderate").toLowerCase()] ?? EFFORT_CONFIG.moderate;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
      style={{ color: config.color, background: `${config.color}12` }}
    >
      <Clock className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function AgentBadge({ agentId }: { agentId: string | null }) {
  if (!agentId) return null;

  // Capitalize first letter
  const displayName = agentId.charAt(0).toUpperCase() + agentId.slice(1);

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
      style={{ color: "#7c3aed", background: "rgba(124, 58, 237, 0.08)" }}
    >
      <Bot className="w-3 h-3" />
      {displayName}
    </span>
  );
}

function WeeklyUpdateCard({ update, rank }: { update: SuggestionData; rank: number }) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg"
      style={{
        background: "rgba(255, 255, 255, 0.5)",
        border: "1px solid rgba(15, 23, 42, 0.06)",
      }}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(124, 58, 237, 0.12)" }}
      >
        <span className="text-sm font-bold" style={{ color: "#7c3aed" }}>
          {rank}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "#0F172A" }}>
          {update.title}
        </p>
        {update.description && (
          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#64748B" }}>
            {update.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <ImpactBadge impact={update.estimatedImpact} />
          <EffortBadge effort={update.estimatedEffort} />
          <AgentBadge agentId={update.sourceAgentId} />
        </div>
      </div>
    </div>
  );
}

function WeeklyPlanSkeleton() {
  return (
    <GlassCard variant="marketing" tint="purple">
      <GlassCardHeader>
        <GlassCardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" style={{ color: "#7c3aed" }} />
          <span style={{ color: "#0F172A" }}>This Week's Top Updates</span>
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent className="pt-0">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#7c3aed" }} />
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}

export function WeeklyPlanSection({ siteId }: WeeklyPlanSectionProps) {
  const { data, isLoading, isError } = useWeeklyPlan(siteId);

  if (isLoading) return <WeeklyPlanSkeleton />;

  // Don't show section if no plan or error
  if (isError || !data?.plan || !data.updates?.length) {
    return null;
  }

  const { plan, updates } = data;

  return (
    <GlassCard variant="marketing" tint="purple">
      <GlassCardHeader>
        <div className="flex items-center justify-between w-full">
          <GlassCardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: "#7c3aed" }} />
            <span style={{ color: "#0F172A" }}>This Week's Top Updates</span>
          </GlassCardTitle>
          <span className="text-xs" style={{ color: "#64748B" }}>
            {formatWeekDisplay(plan.weekString)}
          </span>
        </div>
      </GlassCardHeader>
      <GlassCardContent className="pt-0">
        <div className="space-y-3">
          {updates.map((update, idx) => (
            <WeeklyUpdateCard
              key={update.suggestionId}
              update={update}
              rank={idx + 1}
            />
          ))}
        </div>
        <Link href="/app/update-pipeline">
          <span
            className="flex items-center gap-1 text-xs mt-4 cursor-pointer hover:underline"
            style={{ color: "#7c3aed" }}
          >
            View full pipeline
            <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
      </GlassCardContent>
    </GlassCard>
  );
}
