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
  BarChart3,
  Table2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Color palette for keyword lines
const KEYWORD_COLORS = [
  "#7c3aed", "#ec4899", "#f59e0b", "#22c55e", "#3b82f6",
  "#ef4444", "#8b5cf6", "#06b6d4", "#d946ef", "#f97316",
];

interface KeywordRankingsSectionProps {
  siteId: string;
}

const ITEMS_PER_PAGE = 15;

export function KeywordRankingsSection({ siteId }: KeywordRankingsSectionProps) {
  const snapshot = useSerpSnapshot(siteId);
  const keywords = useSerpKeywords(siteId);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"table" | "chart">("table");
  const [visibleKeywords, setVisibleKeywords] = useState<Set<number>>(new Set());
  const [initialized, setInitialized] = useState(false);

  const isLoading = snapshot.isLoading || keywords.isLoading;
  const isError = snapshot.isError || keywords.isError;

  // Initialize visible keywords to top 5 ranking keywords
  if (keywords.data?.keywords && keywords.data.keywords.length > 0 && !initialized) {
    const ranking = keywords.data.keywords.filter(k => k.currentPosition != null);
    const top5 = new Set(ranking.slice(0, 5).map(k => k.id));
    setVisibleKeywords(top5);
    setInitialized(true);
  }

  // Paginated keywords
  const paginatedKeywords = useMemo(() => {
    if (!keywords.data?.keywords) return [];
    const start = (page - 1) * ITEMS_PER_PAGE;
    return keywords.data.keywords.slice(start, start + ITEMS_PER_PAGE);
  }, [keywords.data, page]);

  const totalPages = Math.ceil((keywords.data?.keywords?.length || 0) / ITEMS_PER_PAGE);
  const totalKeywords = keywords.data?.keywords?.length || 0;

  // Build chart data
  const chartData = useMemo(() => {
    if (!keywords.data?.keywords) return [];

    const dateMap = new Map<string, Record<string, number | null>>();

    for (const kw of keywords.data.keywords) {
      if (!visibleKeywords.has(kw.id)) continue;
      for (const h of kw.history) {
        if (!dateMap.has(h.date)) {
          dateMap.set(h.date, { date: h.date as any });
        }
        dateMap.get(h.date)![`kw_${kw.id}`] = h.position;
      }
    }

    return Array.from(dateMap.values()).sort((a, b) =>
      (a.date as any as string).localeCompare(b.date as any as string)
    );
  }, [keywords.data, visibleKeywords]);

  const toggleKeyword = (id: number) => {
    setVisibleKeywords(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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
            {/* View Toggle */}
            <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: "rgba(15, 23, 42, 0.04)" }}>
              <button
                onClick={() => setView("table")}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{
                  background: view === "table" ? "#FFFFFF" : "transparent",
                  color: view === "table" ? "#0F172A" : "#64748B",
                  boxShadow: view === "table" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                <Table2 className="w-3.5 h-3.5 inline mr-1" />
                Table
              </button>
              <button
                onClick={() => setView("chart")}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{
                  background: view === "chart" ? "#FFFFFF" : "transparent",
                  color: view === "chart" ? "#0F172A" : "#64748B",
                  boxShadow: view === "chart" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                <BarChart3 className="w-3.5 h-3.5 inline mr-1" />
                Chart
              </button>
            </div>
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

        {view === "table" && (
          <>
            {/* Keywords Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>
                    <th className="text-left text-xs font-semibold py-3 px-3" style={{ color: "#64748B" }}>Keyword</th>
                    <th className="text-center text-xs font-semibold py-3 px-3" style={{ color: "#64748B" }}>Position</th>
                    <th className="text-center text-xs font-semibold py-3 px-3" style={{ color: "#64748B" }}>7d</th>
                    <th className="text-center text-xs font-semibold py-3 px-3" style={{ color: "#64748B" }}>Intent</th>
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
                  Showing {((page - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(page * ITEMS_PER_PAGE, totalKeywords)} of {totalKeywords} keywords
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
          </>
        )}

        {view === "chart" && (
          <>
            {/* Chart */}
            <div className="h-80 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.06)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    tickFormatter={(d) => {
                      const date = new Date(d);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis
                    reversed
                    domain={[1, "auto"]}
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    label={{ value: "Position", angle: -90, position: "insideLeft", style: { fill: "#94A3B8", fontSize: 11 } }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#FFFFFF",
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                      borderRadius: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      fontSize: 12,
                    }}
                    labelFormatter={(d) => new Date(d).toLocaleDateString()}
                    formatter={(value: number, name: string) => {
                      const kwId = parseInt(name.replace("kw_", ""));
                      const kw = keywords.data?.keywords.find(k => k.id === kwId);
                      return [value ? `#${value}` : "Not ranked", kw?.keyword || name];
                    }}
                  />
                  {keywords.data?.keywords.map((kw, idx) => {
                    if (!visibleKeywords.has(kw.id)) return null;
                    return (
                      <Line
                        key={kw.id}
                        type="monotone"
                        dataKey={`kw_${kw.id}`}
                        stroke={KEYWORD_COLORS[idx % KEYWORD_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                        name={`kw_${kw.id}`}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Keyword Toggle Chips */}
            <div className="flex flex-wrap gap-2">
              {keywords.data?.keywords.filter(k => k.currentPosition != null).slice(0, 15).map((kw, idx) => (
                <button
                  key={kw.id}
                  onClick={() => toggleKeyword(kw.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: visibleKeywords.has(kw.id)
                      ? `${KEYWORD_COLORS[idx % KEYWORD_COLORS.length]}15`
                      : "rgba(15, 23, 42, 0.04)",
                    border: `1px solid ${visibleKeywords.has(kw.id)
                      ? `${KEYWORD_COLORS[idx % KEYWORD_COLORS.length]}40`
                      : "rgba(15, 23, 42, 0.08)"}`,
                    color: visibleKeywords.has(kw.id)
                      ? KEYWORD_COLORS[idx % KEYWORD_COLORS.length]
                      : "#94A3B8",
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: visibleKeywords.has(kw.id)
                        ? KEYWORD_COLORS[idx % KEYWORD_COLORS.length]
                        : "#CBD5E1",
                    }}
                  />
                  {kw.keyword}
                  {kw.currentPosition != null && (
                    <span className="opacity-60">#{kw.currentPosition}</span>
                  )}
                </button>
              ))}
            </div>
          </>
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
