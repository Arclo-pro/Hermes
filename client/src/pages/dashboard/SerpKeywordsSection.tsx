import { useState, useMemo } from "react";
import { useSerpKeywords, type SerpKeywordEntry, type KeywordIntent } from "@/hooks/useOpsDashboard";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import { TrendingUp, ArrowUp, ArrowDown, Minus, Sparkles, Loader2, BarChart3, Table2, ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 20;
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Color palette for keyword lines
const KEYWORD_COLORS = [
  "#7c3aed", "#ec4899", "#f59e0b", "#22c55e", "#3b82f6",
  "#ef4444", "#8b5cf6", "#06b6d4", "#d946ef", "#f97316",
  "#14b8a6", "#6366f1", "#e11d48", "#84cc16", "#0ea5e9",
  "#a855f7", "#f43f5e", "#10b981", "#eab308", "#6d28d9",
  "#be185d", "#059669", "#dc2626", "#2563eb", "#9333ea",
];

interface SerpKeywordsSectionProps {
  siteId: string;
}

export function SerpKeywordsSection({ siteId }: SerpKeywordsSectionProps) {
  const { data, isLoading, isError } = useSerpKeywords(siteId);
  const [view, setView] = useState<"chart" | "table">("chart");
  const [visibleKeywords, setVisibleKeywords] = useState<Set<number>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Initialize visible keywords to top 5 by default
  if (data?.keywords && data.keywords.length > 0 && !initialized) {
    const top5 = new Set(data.keywords.slice(0, 5).map(k => k.id));
    setVisibleKeywords(top5);
    setInitialized(true);
  }

  // Build chart data: pivot keyword histories into date-keyed rows
  const chartData = useMemo(() => {
    if (!data?.keywords) return [];

    const dateMap = new Map<string, Record<string, number | null>>();

    for (const kw of data.keywords) {
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
  }, [data, visibleKeywords]);

  // Pagination logic for table view
  const totalPages = Math.ceil((data?.keywords?.length || 0) / ITEMS_PER_PAGE);
  const paginatedKeywords = useMemo(() => {
    if (!data?.keywords) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return data.keywords.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [data?.keywords, currentPage]);

  // Reset to page 1 when switching to table view or when data changes
  const handleViewChange = (newView: "chart" | "table") => {
    setView(newView);
    if (newView === "table") {
      setCurrentPage(1);
    }
  };

  if (isLoading) {
    return (
      <GlassCard variant="marketing" tint="green">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: "#7c3aed" }} />
            Top Keywords
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

  if (isError || !data || !data.hasData) {
    return (
      <GlassCard variant="marketing" tint="green">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: "#7c3aed" }} />
            Top Keywords
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="py-8 text-center">
            <p className="text-sm" style={{ color: "#94A3B8" }}>
              No priority keywords configured yet. Keywords will appear once Arclo identifies what matters for your site.
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

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

  return (
    <GlassCard variant="marketing" tint="green">
      <GlassCardHeader>
        <div className="flex items-center justify-between">
          <GlassCardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: "#7c3aed" }} />
            Top Keywords
          </GlassCardTitle>
          <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: "rgba(15, 23, 42, 0.04)" }}>
            <button
              onClick={() => handleViewChange("chart")}
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
            <button
              onClick={() => handleViewChange("table")}
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
          </div>
        </div>
      </GlassCardHeader>
      <GlassCardContent>
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
                      const kw = data.keywords.find(k => k.id === kwId);
                      return [value ? `#${value}` : "Not ranked", kw?.keyword || name];
                    }}
                  />
                  {data.keywords.map((kw, idx) => {
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
              {data.keywords.map((kw, idx) => (
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

        {view === "table" && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>
                    <th className="text-left text-xs font-semibold py-3 px-3" style={{ color: "#64748B" }}>Keyword</th>
                    <th className="text-center text-xs font-semibold py-3 px-3" style={{ color: "#64748B" }}>Position</th>
                    <th className="text-center text-xs font-semibold py-3 px-3" style={{ color: "#64748B" }}>7d</th>
                    <th className="text-center text-xs font-semibold py-3 px-3" style={{ color: "#64748B" }}>30d</th>
                    <th className="text-center text-xs font-semibold py-3 px-3" style={{ color: "#64748B" }}>90d</th>
                    <th className="text-center text-xs font-semibold py-3 px-3" style={{ color: "#64748B" }}>Volume</th>
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
                        <span className="text-sm font-bold" style={{ color: "#0F172A" }}>
                          {kw.currentPosition != null ? `#${kw.currentPosition}` : "---"}
                        </span>
                      </td>
                      <td className="text-center py-3 px-3">
                        <ChangeCell value={kw.change7d} />
                      </td>
                      <td className="text-center py-3 px-3">
                        <ChangeCell value={kw.change30d} />
                      </td>
                      <td className="text-center py-3 px-3">
                        <ChangeCell value={kw.change90d} />
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className="text-xs" style={{ color: "#64748B" }}>
                          {kw.volume != null ? kw.volume.toLocaleString() : "---"}
                        </span>
                      </td>
                      <td className="text-center py-3 px-3">
                        <IntentBadge intent={kw.intent} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid rgba(15, 23, 42, 0.06)" }}>
                <span className="text-xs" style={{ color: "#64748B" }}>
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, data.keywords.length)} of {data.keywords.length} keywords
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: currentPage === 1 ? "transparent" : "rgba(15, 23, 42, 0.04)",
                      color: "#64748B",
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                    }}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Previous
                  </button>
                  <span className="text-xs font-medium px-2" style={{ color: "#0F172A" }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: currentPage === totalPages ? "transparent" : "rgba(15, 23, 42, 0.04)",
                      color: "#64748B",
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                    }}
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
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

  // Positive change = position improved (moved up in rankings)
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
  local: { label: "Local", bg: "rgba(236, 72, 153, 0.1)", color: "#ec4899", border: "rgba(236, 72, 153, 0.25)" },
};

function IntentBadge({ intent }: { intent: KeywordIntent }) {
  if (!intent) {
    return <span className="text-xs" style={{ color: "#CBD5E1" }}>---</span>;
  }
  const style = INTENT_STYLES[intent];
  if (!style) {
    // Fallback for unknown intent types
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
        style={{ background: "rgba(148, 163, 184, 0.1)", color: "#94A3B8", border: "1px solid rgba(148, 163, 184, 0.25)" }}
      >
        {intent}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
    >
      {style.label}
    </span>
  );
}
