import { useSiteContext } from "@/hooks/useSiteContext";
import { useTrafficDiagnosis, type DiagnosisInsight, type DimensionBreakdown } from "@/hooks/useOpsDashboard";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { colors, pageStyles, badgeStyles, gradients } from "@/lib/design-system";
import {
  TrendingDown,
  TrendingUp,
  Minus,
  Activity,
  Smartphone,
  Monitor,
  Globe,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

function getChangeIcon(change: number) {
  if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
  return <Minus className="h-4 w-4 text-gray-500" />;
}

function formatPercent(value: number): string {
  if (value > 0) return `+${value.toFixed(1)}%`;
  return `${value.toFixed(1)}%`;
}

function InsightCard({ insight }: { insight: DiagnosisInsight }) {
  const severityStyles = {
    high: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "destructive" as const },
    medium: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "secondary" as const },
    low: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", badge: "outline" as const },
  };

  const style = severityStyles[insight.severity];

  return (
    <GlassCard variant="marketing"className={cn("transition-all", style.bg, style.border)}>
      <GlassCardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <Badge variant={style.badge}>{insight.severity.toUpperCase()}</Badge>
          <span className={cn("text-sm font-bold", insight.change < 0 ? "text-red-600" : "text-green-600")}>
            {formatPercent(insight.change)}
          </span>
        </div>
        <h4 className={cn("font-semibold text-sm mb-1", style.text)}>{insight.title}</h4>
        <p className="text-sm text-gray-600">{insight.body}</p>
      </GlassCardContent>
    </GlassCard>
  );
}

function BreakdownTable({
  title,
  icon: Icon,
  breakdowns
}: {
  title: string;
  icon: typeof Activity;
  breakdowns: DimensionBreakdown[]
}) {
  if (!breakdowns || breakdowns.length === 0) return null;

  return (
    <GlassCard variant="marketing">
      <GlassCardHeader className="pb-3">
        <GlassCardTitle className="text-base flex items-center gap-2">
          <Icon className="w-5 h-5 text-purple-600" />
          {title}
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="space-y-2">
          {breakdowns.slice(0, 8).map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                  {item.dimension || "Unknown"}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500 w-16 text-right">
                  {item.current.toLocaleString()}
                </span>
                <span className={cn(
                  "flex items-center gap-1 w-20 justify-end font-medium",
                  item.changePercent > 0 ? "text-green-600" : item.changePercent < 0 ? "text-red-600" : "text-gray-500"
                )}>
                  {item.changePercent > 0 ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : item.changePercent < 0 ? (
                    <ArrowDownRight className="w-3 h-3" />
                  ) : null}
                  {formatPercent(item.changePercent)}
                </span>
                <div className="w-16">
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, item.contributionPercent)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}

export default function TrafficInsights() {
  const { siteId } = useSiteContext();
  const { data, isLoading, isError, refetch, isRefetching } = useTrafficDiagnosis(siteId);

  if (isLoading) {
    return (
      <div className="min-h-screen p-6" style={pageStyles.background}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.brand.purple }} />
        </div>
      </div>
    );
  }

  if (isError || !data?.ok) {
    return (
      <div className="min-h-screen p-6" style={pageStyles.background}>
        <div className="max-w-4xl mx-auto">
          <GlassCard variant="marketing" tint="amber">
            <GlassCardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.brand.amber }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text.primary }}>Unable to Load Traffic Data</h3>
              <p className="mb-4" style={{ color: colors.text.secondary }}>
                {data?.message || "Connect Google Analytics to see traffic insights and diagnosis."}
              </p>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white transition-colors"
                style={{ background: colors.brand.amber }}
              >
                <RefreshCw className={cn("w-4 h-4", isRefetching && "animate-spin")} />
                Retry
              </button>
            </GlassCardContent>
          </GlassCard>
        </div>
      </div>
    );
  }

  const { summary, hasDrop, insights, breakdowns } = data;

  return (
    <div className="min-h-screen p-6" style={pageStyles.background}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: colors.text.primary, letterSpacing: "-0.03em" }}>
              <span style={gradients.brandText}>Traffic Insights</span>
            </h1>
            <p style={{ color: colors.text.secondary }}>{summary.periodLabel}</p>
          </div>
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", isRefetching && "animate-spin")} />
              Refresh
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassCard variant="marketing"className={cn(
              hasDrop ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"
            )}>
              <GlassCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Traffic Status</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      hasDrop ? "text-red-700" : "text-green-700"
                    )}>
                      {hasDrop ? "Significant Drop" : "Stable"}
                    </p>
                  </div>
                  {hasDrop ? (
                    <TrendingDown className="w-10 h-10 text-red-400" />
                  ) : (
                    <CheckCircle2 className="w-10 h-10 text-green-400" />
                  )}
                </div>
              </GlassCardContent>
            </GlassCard>

            <GlassCard variant="marketing">
              <GlassCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Users Change</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      summary.usersChange > 0 ? "text-green-700" : summary.usersChange < 0 ? "text-red-700" : "text-gray-700"
                    )}>
                      {formatPercent(summary.usersChange)}
                    </p>
                  </div>
                  {getChangeIcon(summary.usersChange)}
                </div>
              </GlassCardContent>
            </GlassCard>

            <GlassCard variant="marketing">
              <GlassCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Sessions Change</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      summary.sessionsChange > 0 ? "text-green-700" : summary.sessionsChange < 0 ? "text-red-700" : "text-gray-700"
                    )}>
                      {formatPercent(summary.sessionsChange)}
                    </p>
                  </div>
                  {getChangeIcon(summary.sessionsChange)}
                </div>
              </GlassCardContent>
            </GlassCard>
          </div>

          {/* Insights */}
          {insights && insights.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Key Findings ({insights.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {insights.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>
            </div>
          )}

          {/* Breakdowns */}
          {breakdowns && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BreakdownTable
                title="By Channel"
                icon={BarChart3}
                breakdowns={breakdowns.channels || []}
              />
              <BreakdownTable
                title="By Device"
                icon={Smartphone}
                breakdowns={breakdowns.devices || []}
              />
              <BreakdownTable
                title="By Geography"
                icon={Globe}
                breakdowns={breakdowns.geos || []}
              />
              <BreakdownTable
                title="By Landing Page"
                icon={FileText}
                breakdowns={breakdowns.landingPages || []}
              />
            </div>
          )}

          {/* No Drop Message */}
          {!hasDrop && (!insights || insights.length === 0) && (
            <GlassCard variant="marketing"className="border-green-200 bg-green-50">
              <GlassCardContent className="p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-800 mb-2">Traffic Looks Healthy</h3>
                <p style={{ color: colors.semantic.success }}>
                  No significant traffic drops detected. Your site traffic is stable or growing.
                </p>
              </GlassCardContent>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
