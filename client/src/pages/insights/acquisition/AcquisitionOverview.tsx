/**
 * AcquisitionOverview - Paid vs Organic Acquisition Analysis
 *
 * Shows channel split, quality comparison, and spend zone indicator.
 */

import { Link } from "wouter";
import { useSiteContext } from "@/hooks/useSiteContext";
import { useAcquisitionOverview } from "@/hooks/useOpsDashboard";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  DollarSign,
  Users,
  Target,
  Lightbulb,
  BarChart3,
  Award,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { colors, pageStyles, gradients } from "@/lib/design-system";
import type { ChannelSplit, LeadQualityComparison, SensitivityZone } from "../../../../../shared/types/acquisitionAnalysis";

// Zone color mapping
const ZONE_COLORS: Record<SensitivityZone["name"], string> = {
  efficient: "#22c55e",
  optimal: "#3b82f6",
  diminishing: "#f59e0b",
  wasteful: "#ef4444",
};

const ZONE_LABELS: Record<SensitivityZone["name"], string> = {
  efficient: "Efficient",
  optimal: "Optimal",
  diminishing: "Diminishing Returns",
  wasteful: "Overspending",
};

function ChannelSplitBar({ label, paid, organic }: { label: string; paid: number; organic: number }) {
  const total = paid + organic;
  const paidPercent = total > 0 ? (paid / total) * 100 : 50;
  const organicPercent = total > 0 ? (organic / total) * 100 : 50;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span style={{ color: colors.text.secondary }}>{label}</span>
        <div className="flex gap-4 text-xs">
          <span style={{ color: "#7c3aed" }}>Paid: {paidPercent.toFixed(0)}%</span>
          <span style={{ color: "#22c55e" }}>Organic: {organicPercent.toFixed(0)}%</span>
        </div>
      </div>
      <div className="h-4 rounded-full overflow-hidden flex" style={{ background: "#f1f5f9" }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${paidPercent}%`, background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
        />
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${organicPercent}%`, background: "linear-gradient(135deg, #22c55e, #4ade80)" }}
        />
      </div>
    </div>
  );
}

function QualityCard({
  label,
  metrics,
  isWinner,
  color,
}: {
  label: string;
  metrics: { totalLeads: number; conversionRate: number; qualityScore: number };
  isWinner: boolean;
  color: string;
}) {
  return (
    <div
      className="p-4 rounded-xl border relative"
      style={{
        borderColor: isWinner ? color : "rgba(226, 232, 240, 1)",
        background: isWinner ? `${color}08` : "transparent",
      }}
    >
      {isWinner && (
        <Badge
          className="absolute -top-2 -right-2 text-xs"
          style={{ background: color, color: "white" }}
        >
          <Award className="w-3 h-3 mr-1" />
          Better
        </Badge>
      )}
      <p className="text-sm font-medium mb-3" style={{ color: colors.text.secondary }}>
        {label}
      </p>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: colors.text.muted }}>Leads</span>
          <span className="text-sm font-semibold" style={{ color: colors.text.primary }}>
            {metrics.totalLeads}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: colors.text.muted }}>Conversion</span>
          <span className="text-sm font-semibold" style={{ color: colors.text.primary }}>
            {metrics.conversionRate.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: colors.text.muted }}>Quality Score</span>
          <span className="text-sm font-semibold" style={{ color }}>
            {metrics.qualityScore}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AcquisitionOverview() {
  const { siteId } = useSiteContext();
  const { data, isLoading, isError, refetch, isRefetching } = useAcquisitionOverview(siteId);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen p-6" style={pageStyles.background}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.brand.purple }} />
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !data) {
    return (
      <div className="min-h-screen p-6" style={pageStyles.background}>
        <div className="max-w-4xl mx-auto">
          <GlassCard variant="marketing" tint="amber">
            <GlassCardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.brand.amber }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text.primary }}>
                Unable to Load Analysis
              </h3>
              <p className="mb-4" style={{ color: colors.text.secondary }}>
                We couldn't load the acquisition analysis. Please try again.
              </p>
              <Button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
                Retry
              </Button>
            </GlassCardContent>
          </GlassCard>
        </div>
      </div>
    );
  }

  const { channelSplit, qualityComparison, currentSpendZone, currentWeeklySpend, toplineRecommendation, quickInsights, dataStatus, warnings } = data;

  const paidSplit = channelSplit.current.find(c => c.channel === "paid");
  const organicSplit = channelSplit.current.find(c => c.channel === "organic");

  return (
    <div className="min-h-screen p-6" style={pageStyles.background}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-3xl font-bold mb-2"
              style={{ color: colors.text.primary, letterSpacing: "-0.02em" }}
            >
              <span style={gradients.brandText}>Acquisition Efficiency</span>
            </h1>
            <p style={{ color: colors.text.secondary }}>
              Understand your paid vs organic performance
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Topline Recommendation */}
        <GlassCard variant="marketing" tint="purple">
          <GlassCardContent className="p-4">
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${colors.brand.purple}15` }}
              >
                <Lightbulb className="w-5 h-5" style={{ color: colors.brand.purple }} />
              </div>
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: colors.text.primary }}>
                  Key Insight
                </p>
                <p className="text-sm" style={{ color: colors.text.secondary }}>
                  {toplineRecommendation}
                </p>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* Channel Split */}
        <GlassCard variant="marketing">
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5" style={{ color: colors.brand.purple }} />
              Channel Split
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            <ChannelSplitBar
              label="Traffic"
              paid={paidSplit?.traffic.sessions || 0}
              organic={organicSplit?.traffic.sessions || 0}
            />
            <ChannelSplitBar
              label="Leads"
              paid={paidSplit?.leads.count || 0}
              organic={organicSplit?.leads.count || 0}
            />
            <ChannelSplitBar
              label="Conversions"
              paid={paidSplit?.conversions.count || 0}
              organic={organicSplit?.conversions.count || 0}
            />

            {/* Trend indicator */}
            <div className="pt-2 flex items-center gap-2">
              {channelSplit.delta.trendDirection === "shifting_to_organic" ? (
                <>
                  <TrendingUp className="w-4 h-4" style={{ color: "#22c55e" }} />
                  <span className="text-sm" style={{ color: "#22c55e" }}>
                    Organic share growing (+{Math.abs(channelSplit.delta.organicShareChange).toFixed(1)}%)
                  </span>
                </>
              ) : channelSplit.delta.trendDirection === "shifting_to_paid" ? (
                <>
                  <TrendingUp className="w-4 h-4" style={{ color: "#7c3aed" }} />
                  <span className="text-sm" style={{ color: "#7c3aed" }}>
                    Paid share growing (+{Math.abs(channelSplit.delta.paidShareChange).toFixed(1)}%)
                  </span>
                </>
              ) : (
                <>
                  <Minus className="w-4 h-4" style={{ color: colors.text.muted }} />
                  <span className="text-sm" style={{ color: colors.text.muted }}>
                    Channel mix stable
                  </span>
                </>
              )}
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* Lead Quality Comparison */}
        <GlassCard variant="marketing">
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="flex items-center gap-2 text-base">
              <Target className="w-5 h-5" style={{ color: colors.brand.purple }} />
              Lead Quality
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <QualityCard
                label="Paid"
                metrics={qualityComparison.paid}
                isWinner={qualityComparison.winner === "paid"}
                color="#7c3aed"
              />
              <QualityCard
                label="Organic"
                metrics={qualityComparison.organic}
                isWinner={qualityComparison.winner === "organic"}
                color="#22c55e"
              />
            </div>
            {qualityComparison.winner !== "unknown" && (
              <p className="text-sm" style={{ color: colors.text.secondary }}>
                <span className="font-medium" style={{ color: qualityComparison.winner === "organic" ? "#22c55e" : "#7c3aed" }}>
                  {qualityComparison.winner === "organic" ? "Organic" : "Paid"}
                </span>
                {" "}leads are performing better: {qualityComparison.winnerReason}
              </p>
            )}
            {qualityComparison.confidence === "low" && (
              <p className="text-xs mt-2" style={{ color: colors.text.muted }}>
                Limited data for confident comparison
              </p>
            )}
          </GlassCardContent>
        </GlassCard>

        {/* Current Spend Zone */}
        {dataStatus.hasAds && currentSpendZone && currentWeeklySpend !== null ? (
          <GlassCard variant="marketing">
            <GlassCardHeader className="pb-3">
              <GlassCardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="w-5 h-5" style={{ color: colors.brand.purple }} />
                Current Spend Level
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold" style={{ color: colors.text.primary }}>
                    ${currentWeeklySpend.toLocaleString()}
                    <span className="text-sm font-normal ml-1" style={{ color: colors.text.muted }}>/week</span>
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: ZONE_COLORS[currentSpendZone] }}
                    />
                    <span className="text-sm font-medium" style={{ color: ZONE_COLORS[currentSpendZone] }}>
                      {ZONE_LABELS[currentSpendZone]}
                    </span>
                  </div>
                </div>
                <Link href="/app/insights/acquisition/budget">
                  <Button variant="outline" className="gap-2">
                    View Details
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </GlassCardContent>
          </GlassCard>
        ) : (
          <GlassCard variant="marketing" tint="amber">
            <GlassCardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5" style={{ color: colors.brand.amber }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: colors.text.primary }}>
                    Connect Google Ads
                  </p>
                  <p className="text-sm" style={{ color: colors.text.secondary }}>
                    Link your Google Ads account to see budget sensitivity analysis.
                  </p>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Quick Insights */}
        {quickInsights.length > 0 && (
          <GlassCard variant="marketing">
            <GlassCardHeader className="pb-3">
              <GlassCardTitle className="flex items-center gap-2 text-base">
                <CheckCircle className="w-5 h-5" style={{ color: colors.brand.purple }} />
                Quick Insights
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <ul className="space-y-2">
                {quickInsights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                      style={{ background: colors.brand.purple }}
                    />
                    <span className="text-sm" style={{ color: colors.text.secondary }}>
                      {insight}
                    </span>
                  </li>
                ))}
              </ul>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((warning, i) => (
              <p key={i} className="text-xs" style={{ color: colors.text.muted }}>
                {warning}
              </p>
            ))}
          </div>
        )}

        {/* Budget CTA */}
        {dataStatus.hasAds && (
          <div className="text-center pt-4">
            <Link href="/app/insights/acquisition/budget">
              <Button className="gap-2">
                View Budget Sensitivity Analysis
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
