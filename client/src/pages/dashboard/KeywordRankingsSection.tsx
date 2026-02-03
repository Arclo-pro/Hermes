import { useState, useMemo } from "react";
import { useSerpSnapshot, useSerpKeywords, type SerpKeywordEntry, type KeywordIntent } from "@/hooks/useOpsDashboard";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import {
  Trophy,
  Target,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Minus,
  Sparkles,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Lock,
  Zap,
  ArrowUpDown,
} from "lucide-react";

interface KeywordRankingsSectionProps {
  siteId: string;
}

const ITEMS_PER_PAGE = 25;

// Keyword tier limits
const KEYWORD_TIERS = [
  { limit: 25, label: "25", plan: "free" },
  { limit: 100, label: "100", plan: "starter" },
  { limit: 250, label: "250", plan: "pro" },
  { limit: 500, label: "500", plan: "enterprise" },
] as const;

type SortField = "keyword" | "position" | "volume" | "intent";
type SortDirection = "asc" | "desc";

const INTENT_ORDER: Record<string, number> = {
  local: 1,
  transactional: 2,
  commercial: 3,
  navigational: 4,
  informational: 5,
};

export function KeywordRankingsSection({ siteId }: KeywordRankingsSectionProps) {
  const snapshot = useSerpSnapshot(siteId);
  const keywords = useSerpKeywords(siteId);
  const [page, setPage] = useState(1);
  const [keywordLimit, setKeywordLimit] = useState(25); // Default to 25
  const [sortField, setSortField] = useState<SortField>("position");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // For now, assume free plan - this would come from user context in production
  const currentPlan = "free";
  const maxAllowedKeywords = currentPlan === "free" ? 25 :
                              currentPlan === "starter" ? 100 :
                              currentPlan === "pro" ? 250 : 500;

  const isLoading = snapshot.isLoading || keywords.isLoading;
  const isError = snapshot.isError || keywords.isError;

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "keyword" ? "asc" : "desc");
    }
    setPage(1);
  };

  // Sorted and limited keywords
  const sortedKeywords = useMemo(() => {
    if (!keywords.data?.keywords) return [];

    const sorted = [...keywords.data.keywords].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "keyword":
          comparison = a.keyword.localeCompare(b.keyword);
          break;
        case "position":
          // Null positions go to the end
          if (a.currentPosition === null && b.currentPosition === null) comparison = 0;
          else if (a.currentPosition === null) comparison = 1;
          else if (b.currentPosition === null) comparison = -1;
          else comparison = a.currentPosition - b.currentPosition;
          break;
        case "volume":
          // Null volumes go to the end
          if (a.volume === null && b.volume === null) comparison = 0;
          else if (a.volume === null) comparison = 1;
          else if (b.volume === null) comparison = -1;
          else comparison = b.volume - a.volume; // Higher volume first by default
          break;
        case "intent":
          const aOrder = a.intent ? INTENT_ORDER[a.intent] ?? 99 : 99;
          const bOrder = b.intent ? INTENT_ORDER[b.intent] ?? 99 : 99;
          comparison = aOrder - bOrder;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted.slice(0, keywordLimit);
  }, [keywords.data, keywordLimit, sortField, sortDirection]);

  // Paginated keywords
  const paginatedKeywords = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return sortedKeywords.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedKeywords, page]);

  const totalPages = Math.ceil(sortedKeywords.length / ITEMS_PER_PAGE);
  const totalKeywords = keywords.data?.keywords?.length || 0;
  const displayedKeywords = sortedKeywords.length;

  // Reset page when limit changes
  const handleLimitChange = (newLimit: number) => {
    setKeywordLimit(newLimit);
    setPage(1);
  };

  if (isLoading) {
    return (
      <GlassCard variant="marketing" tint="purple">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" style={{ color: "#7c3aed" }} />
            Keyword Rankings
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#94A3B8" }} />
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  if (isError || !snapshot.data || !keywords.data) {
    return (
      <GlassCard variant="marketing" tint="purple">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" style={{ color: "#7c3aed" }} />
            Keyword Rankings
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="py-6 text-center">
            <p className="text-sm" style={{ color: "#94A3B8" }}>Unable to load keyword rankings</p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  const { rankingCounts, hasBaseline, totalTracked } = snapshot.data;

  // No data state
  if (!hasBaseline || totalTracked === 0 || !keywords.data.hasData) {
    return (
      <GlassCard variant="marketing-accent" tint="purple">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" style={{ color: "#7c3aed" }} />
            Keyword Rankings
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div
            className="rounded-xl p-5"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.06), rgba(236,72,153,0.04))",
              border: "1px solid rgba(124, 58, 237, 0.12)",
            }}
          >
            <p className="text-sm" style={{ color: "#475569" }}>
              No keywords are being tracked yet. Keywords will appear once Arclo analyzes your site with SERP data.
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
            <Search className="w-5 h-5" style={{ color: "#7c3aed" }} />
            Keyword Rankings
          </GlassCardTitle>
          <div className="flex items-center gap-3">
            {snapshot.data.lastChecked && (
              <span className="text-xs" style={{ color: "#94A3B8" }}>
                Last checked: {new Date(snapshot.data.lastChecked).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </GlassCardHeader>
      <GlassCardContent>
        {/* Ranking Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatBucket label="Total Tracked" value={totalTracked} icon={Target} color="#7c3aed" />
          <StatBucket label="#1 Rankings" value={rankingCounts.position1} icon={Trophy} color="#f59e0b" />
          <StatBucket label="Top 3" value={rankingCounts.top3} icon={Trophy} color="#ec4899" />
          <StatBucket label="Top 10" value={rankingCounts.top10} icon={TrendingUp} color="#22c55e" />
          <StatBucket label="Top 100" value={rankingCounts.top100} icon={Target} color="#64748B" />
        </div>

        {/* Keyword Limit Selector */}
        <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
          <span className="text-xs font-medium" style={{ color: "#64748B" }}>
            Showing {displayedKeywords} of {totalKeywords} keywords
          </span>
          <div className="flex items-center gap-1">
            {KEYWORD_TIERS.map((tier) => {
              const isLocked = tier.limit > maxAllowedKeywords;
              const isActive = keywordLimit === tier.limit;
              const isAvailable = totalKeywords >= tier.limit || tier.limit === 25;

              return (
                <button
                  key={tier.limit}
                  onClick={() => {
                    if (isLocked) {
                      // Could open upgrade modal here
                      alert(`Upgrade to ${tier.plan} plan to track ${tier.limit} keywords`);
                    } else if (isAvailable || tier.limit <= totalKeywords) {
                      handleLimitChange(Math.min(tier.limit, totalKeywords));
                    }
                  }}
                  className="relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: isActive ? "#7c3aed" : isLocked ? "rgba(15, 23, 42, 0.02)" : "rgba(15, 23, 42, 0.04)",
                    color: isActive ? "#FFFFFF" : isLocked ? "#CBD5E1" : "#64748B",
                    border: isLocked ? "1px dashed rgba(15, 23, 42, 0.12)" : "1px solid transparent",
                  }}
                >
                  {isLocked && <Lock className="w-3 h-3 inline mr-1" />}
                  {tier.label}
                  {isLocked && (
                    <span
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center"
                      style={{ background: "#f59e0b" }}
                    >
                      <Zap className="w-2 h-2" style={{ color: "#FFFFFF" }} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Keywords Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>
                <SortableHeader
                  label="Keyword"
                  field="keyword"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  align="left"
                />
                <SortableHeader
                  label="Position"
                  field="position"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  align="center"
                />
                <th className="text-center text-xs font-semibold py-3 px-3" style={{ color: "#64748B" }}>7d</th>
                <SortableHeader
                  label="Volume"
                  field="volume"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  align="center"
                />
                <SortableHeader
                  label="Intent"
                  field="intent"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  align="center"
                />
              </tr>
            </thead>
            <tbody>
              {paginatedKeywords.map((kw) => (
                <tr
                  key={kw.id}
                  style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.04)" }}
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <DirectionIcon direction={kw.direction} />
                      <span className="text-sm font-medium" style={{ color: "#0F172A" }}>{kw.keyword}</span>
                    </div>
                  </td>
                  <td className="text-center py-3 px-3">
                    <span
                      className="text-sm font-bold"
                      style={{
                        color: kw.currentPosition != null
                          ? kw.currentPosition <= 3 ? "#22c55e"
                            : kw.currentPosition <= 10 ? "#f59e0b"
                            : "#0F172A"
                          : "#94A3B8"
                      }}
                    >
                      {kw.currentPosition != null ? `#${kw.currentPosition}` : "Not ranking"}
                    </span>
                  </td>
                  <td className="text-center py-3 px-3">
                    <ChangeCell value={kw.change7d} />
                  </td>
                  <td className="text-center py-3 px-3">
                    <VolumeCell value={kw.volume} />
                  </td>
                  <td className="text-center py-3 px-3">
                    <IntentBadge intent={kw.intent} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid rgba(15, 23, 42, 0.06)" }}>
            <span className="text-xs" style={{ color: "#64748B" }}>
              Showing {((page - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(page * ITEMS_PER_PAGE, displayedKeywords)} of {displayedKeywords}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
                style={{
                  background: page === 1 ? "transparent" : "rgba(15, 23, 42, 0.04)",
                  color: "#64748B",
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium px-2" style={{ color: "#0F172A" }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
                style={{
                  background: page === totalPages ? "transparent" : "rgba(15, 23, 42, 0.04)",
                  color: "#64748B",
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Upgrade CTA if limited */}
        {totalKeywords > maxAllowedKeywords && keywordLimit <= maxAllowedKeywords && (
          <div
            className="mt-4 p-4 rounded-xl flex items-center justify-between"
            style={{
              background: "linear-gradient(135deg, rgba(124, 58, 237, 0.06), rgba(245, 158, 11, 0.04))",
              border: "1px solid rgba(124, 58, 237, 0.12)",
            }}
          >
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5" style={{ color: "#f59e0b" }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "#0F172A" }}>
                  {totalKeywords - maxAllowedKeywords} more keywords available
                </p>
                <p className="text-xs" style={{ color: "#64748B" }}>
                  Upgrade to track up to 500 keywords and unlock deeper insights
                </p>
              </div>
            </div>
            <button
              className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:-translate-y-0.5"
              style={{
                background: "#7c3aed",
                color: "#FFFFFF",
                boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
              }}
            >
              Upgrade Plan
            </button>
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}

function StatBucket({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: typeof Target;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-3 text-center"
      style={{ background: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.06)" }}
    >
      <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
      <p className="text-2xl font-bold" style={{ color: "#0F172A" }}>{value.toLocaleString()}</p>
      <p className="text-xs" style={{ color: "#64748B" }}>{label}</p>
    </div>
  );
}

function DirectionIcon({ direction }: { direction: SerpKeywordEntry["direction"] }) {
  switch (direction) {
    case "up":
      return <ArrowUp className="w-4 h-4" style={{ color: "#22c55e" }} />;
    case "down":
      return <ArrowDown className="w-4 h-4" style={{ color: "#ef4444" }} />;
    case "new":
      return <Sparkles className="w-4 h-4" style={{ color: "#3b82f6" }} />;
    default:
      return <Minus className="w-4 h-4" style={{ color: "#94A3B8" }} />;
  }
}

function ChangeCell({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-xs" style={{ color: "#CBD5E1" }}>---</span>;
  }
  const color = value > 0 ? "#22c55e" : value < 0 ? "#ef4444" : "#94A3B8";
  return (
    <span className="text-xs font-semibold" style={{ color }}>
      {value > 0 ? `+${value}` : `${value}`}
    </span>
  );
}

const INTENT_STYLES: Record<NonNullable<KeywordIntent>, { label: string; bg: string; color: string; border: string }> = {
  local: { label: "Local", bg: "rgba(236, 72, 153, 0.1)", color: "#ec4899", border: "rgba(236, 72, 153, 0.25)" },
  informational: { label: "Info", bg: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", border: "rgba(59, 130, 246, 0.25)" },
  transactional: { label: "Txn", bg: "rgba(34, 197, 94, 0.1)", color: "#22c55e", border: "rgba(34, 197, 94, 0.25)" },
  navigational: { label: "Nav", bg: "rgba(168, 85, 247, 0.1)", color: "#a855f7", border: "rgba(168, 85, 247, 0.25)" },
  commercial: { label: "Comm", bg: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", border: "rgba(245, 158, 11, 0.25)" },
};

function IntentBadge({ intent }: { intent: KeywordIntent }) {
  if (!intent) {
    return <span className="text-xs" style={{ color: "#CBD5E1" }}>---</span>;
  }
  const style = INTENT_STYLES[intent];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
    >
      {style.label}
    </span>
  );
}

function SortableHeader({
  label,
  field,
  currentField,
  direction,
  onSort,
  align = "left",
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  align?: "left" | "center" | "right";
}) {
  const isActive = currentField === field;
  const textAlign = align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";

  return (
    <th
      className={`${textAlign} text-xs font-semibold py-3 px-3 cursor-pointer select-none transition-colors hover:bg-slate-50`}
      style={{ color: isActive ? "#7c3aed" : "#64748B" }}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown
          className="w-3 h-3"
          style={{
            opacity: isActive ? 1 : 0.4,
            transform: isActive && direction === "desc" ? "scaleY(-1)" : undefined,
          }}
        />
      </span>
    </th>
  );
}

function VolumeCell({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-xs" style={{ color: "#CBD5E1" }}>---</span>;
  }

  // Format with K/M suffixes for large numbers
  let formatted: string;
  if (value >= 1_000_000) {
    formatted = `${(value / 1_000_000).toFixed(1)}M`;
  } else if (value >= 1_000) {
    formatted = `${(value / 1_000).toFixed(1)}K`;
  } else {
    formatted = value.toLocaleString();
  }

  return (
    <span className="text-xs font-medium" style={{ color: "#64748B" }}>
      {formatted}
    </span>
  );
}
