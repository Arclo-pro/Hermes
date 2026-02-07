/**
 * BudgetImpact - Budget Sensitivity Analysis Page
 *
 * Shows spend curve, zones, scenarios, and recommendations.
 */

import { Link } from "wouter";
import { useSiteContext } from "@/hooks/useSiteContext";
import { useAcquisitionBudget } from "@/hooks/useOpsDashboard";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  Minus,
  DollarSign,
  Target,
  Lightbulb,
  BarChart3,
  AlertTriangle,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import { colors, pageStyles, gradients } from "@/lib/design-system";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { SensitivityZone, SpendRecommendation, ScenarioPreview } from "../../../../../shared/types/acquisitionAnalysis";

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

const ZONE_DESCRIPTIONS: Record<SensitivityZone["name"], string> = {
  efficient: "Low spend with good cost efficiency. Room to scale.",
  optimal: "Best balance of volume and cost per lead.",
  diminishing: "Each additional dollar yields fewer leads.",
  wasteful: "High spend with poor return on investment.",
};

function ZoneCard({ zone, isCurrent }: { zone: SensitivityZone; isCurrent: boolean }) {
  return (
    <div
      className="p-3 rounded-lg border relative"
      style={{
        borderColor: isCurrent ? ZONE_COLORS[zone.name] : "rgba(226, 232, 240, 1)",
        background: isCurrent ? `${ZONE_COLORS[zone.name]}08` : "transparent",
      }}
    >
      {isCurrent && (
        <Badge
          className="absolute -top-2 -right-2 text-xs"
          style={{ background: ZONE_COLORS[zone.name], color: "white" }}
        >
          Current
        </Badge>
      )}
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: ZONE_COLORS[zone.name] }}
        />
        <span className="text-sm font-medium" style={{ color: colors.text.primary }}>
          {ZONE_LABELS[zone.name]}
        </span>
      </div>
      <p className="text-xs mb-2" style={{ color: colors.text.muted }}>
        ${zone.minSpend.toFixed(0)} - ${zone.maxSpend.toFixed(0)}/week
      </p>
      <p className="text-xs" style={{ color: colors.text.secondary }}>
        Avg CPL: ${zone.avgCostPerLead.toFixed(2)}
      </p>
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: ScenarioPreview }) {
  const isDecrease = scenario.spendChange < 0;
  const isIncrease = scenario.spendChange > 0;

  const riskColors = {
    low: "#22c55e",
    medium: "#f59e0b",
    high: "#ef4444",
  };

  return (
    <div className="p-4 rounded-xl border" style={{ borderColor: "rgba(226, 232, 240, 1)" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium" style={{ color: colors.text.primary }}>
          {scenario.label}
        </span>
        <Badge
          variant="outline"
          className="text-xs"
          style={{ borderColor: riskColors[scenario.risk], color: riskColors[scenario.risk] }}
        >
          {scenario.risk} risk
        </Badge>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span style={{ color: colors.text.muted }}>Monthly Spend</span>
          <span style={{ color: colors.text.primary }}>
            ${scenario.newMonthlySpend.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: colors.text.muted }}>Expected Leads</span>
          <span
            style={{
              color: scenario.expectedLeadChange > 0
                ? "#22c55e"
                : scenario.expectedLeadChange < 0
                  ? "#ef4444"
                  : colors.text.primary,
            }}
          >
            {scenario.expectedLeadChange > 0 ? "+" : ""}
            {scenario.expectedLeadChange}%
          </span>
        </div>
      </div>
    </div>
  );
}

function RecommendationSection({ recommendation }: { recommendation: SpendRecommendation }) {
  const actionIcons = {
    decrease: TrendingDown,
    increase: TrendingUp,
    maintain: Minus,
  };
  const actionColors = {
    decrease: "#22c55e", // Green - saving money
    increase: "#3b82f6", // Blue - growth
    maintain: "#64748b", // Gray - stable
  };
  const actionLabels = {
    decrease: "Reduce Spend",
    increase: "Scale Up",
    maintain: "Maintain",
  };

  const Icon = actionIcons[recommendation.action];
  const color = actionColors[recommendation.action];

  return (
    <GlassCard variant="marketing" tint="purple">
      <GlassCardHeader className="pb-3">
        <GlassCardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="w-5 h-5" style={{ color: colors.brand.purple }} />
          Recommendation
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent className="space-y-4">
        {/* Action Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: `${color}15` }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: colors.text.primary }}>
              {actionLabels[recommendation.action]}
            </p>
            {recommendation.action !== "maintain" && (
              <p className="text-sm" style={{ color: colors.text.secondary }}>
                Target: ${recommendation.suggestedSpend.min.toLocaleString()} - ${recommendation.suggestedSpend.max.toLocaleString()}/week
              </p>
            )}
          </div>
        </div>

        {/* Rationale */}
        <p className="text-sm leading-relaxed" style={{ color: colors.text.secondary }}>
          {recommendation.rationale}
        </p>

        {/* Expected Impact */}
        <div className="p-3 rounded-lg" style={{ background: "rgba(124, 58, 237, 0.05)" }}>
          <p className="text-xs font-medium mb-2" style={{ color: colors.brand.purple }}>
            Expected Impact
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span style={{ color: colors.text.muted }}>Leads: </span>
              <span
                style={{
                  color: recommendation.expectedImpact.leadChange >= 0 ? "#22c55e" : "#ef4444",
                }}
              >
                {recommendation.expectedImpact.leadChange > 0 ? "+" : ""}
                {recommendation.expectedImpact.leadChange}%
              </span>
            </div>
            <div>
              <span style={{ color: colors.text.muted }}>CPL: </span>
              <span
                style={{
                  color: recommendation.expectedImpact.costPerLeadChange <= 0 ? "#22c55e" : "#ef4444",
                }}
              >
                {recommendation.expectedImpact.costPerLeadChange > 0 ? "+" : ""}
                {recommendation.expectedImpact.costPerLeadChange}%
              </span>
            </div>
          </div>
          <p className="text-xs mt-2" style={{ color: colors.text.secondary }}>
            {recommendation.expectedImpact.qualityImpact}
          </p>
        </div>

        {/* Confidence */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: colors.text.muted }}>Confidence:</span>
          <div className="flex gap-1">
            {["low", "med", "high"].map((level) => (
              <div
                key={level}
                className="w-2 h-2 rounded-full"
                style={{
                  background:
                    recommendation.confidence === level ||
                    (recommendation.confidence === "high" && level !== "high") ||
                    (recommendation.confidence === "med" && level === "low")
                      ? colors.brand.purple
                      : "#e2e8f0",
                }}
              />
            ))}
          </div>
          <span className="text-xs capitalize" style={{ color: colors.text.secondary }}>
            {recommendation.confidence}
          </span>
        </div>

        {/* Caveats */}
        {recommendation.caveats.length > 0 && (
          <div className="pt-2 border-t" style={{ borderColor: "rgba(226, 232, 240, 0.5)" }}>
            <p className="text-xs font-medium mb-1" style={{ color: colors.text.muted }}>
              Keep in mind:
            </p>
            <ul className="space-y-1">
              {recommendation.caveats.map((caveat, i) => (
                <li key={i} className="text-xs flex items-start gap-1" style={{ color: colors.text.muted }}>
                  <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />
                  {caveat}
                </li>
              ))}
            </ul>
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}

export default function BudgetImpact() {
  const { siteId } = useSiteContext();
  const { data, isLoading, isError, refetch, isRefetching } = useAcquisitionBudget(siteId);

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

  // No data state
  if (!data) {
    return (
      <div className="min-h-screen p-6" style={pageStyles.background}>
        <div className="max-w-4xl mx-auto">
          <Link href="/app/insights/acquisition">
            <span
              className="inline-flex items-center gap-2 text-sm cursor-pointer hover:underline mb-6"
              style={{ color: colors.text.secondary }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Overview
            </span>
          </Link>
          <GlassCard variant="marketing" tint="amber">
            <GlassCardContent className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.brand.amber }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text.primary }}>
                Insufficient Data
              </h3>
              <p className="mb-4" style={{ color: colors.text.secondary }}>
                We need at least 4 weeks of spend data to analyze budget sensitivity.
                Keep tracking and check back later.
              </p>
              <Link href="/app/insights/acquisition">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Overview
                </Button>
              </Link>
            </GlassCardContent>
          </GlassCard>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="min-h-screen p-6" style={pageStyles.background}>
        <div className="max-w-4xl mx-auto">
          <Link href="/app/insights/acquisition">
            <span
              className="inline-flex items-center gap-2 text-sm cursor-pointer hover:underline mb-6"
              style={{ color: colors.text.secondary }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Overview
            </span>
          </Link>
          <GlassCard variant="marketing" tint="amber">
            <GlassCardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.brand.amber }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text.primary }}>
                Unable to Load Analysis
              </h3>
              <p className="mb-4" style={{ color: colors.text.secondary }}>
                We couldn't load the budget analysis. Please try again.
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

  const { sensitivityCurve, recommendation, scenarioPreviews, weeklyData, warnings } = data;

  // Prepare chart data
  const chartData = weeklyData.map(d => ({
    week: d.week.slice(5), // MM-DD format
    spend: d.spend,
    leads: d.leads,
    cpl: d.costPerLead,
  }));

  return (
    <div className="min-h-screen p-6" style={pageStyles.background}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back link */}
        <Link href="/app/insights/acquisition">
          <span
            className="inline-flex items-center gap-2 text-sm cursor-pointer hover:underline"
            style={{ color: colors.text.secondary }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Overview
          </span>
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-3xl font-bold mb-1"
              style={{ color: colors.text.primary, letterSpacing: "-0.02em" }}
            >
              <span style={gradients.brandText}>Budget Sensitivity</span>
            </h1>
            <p className="text-sm" style={{ color: colors.text.secondary }}>
              Analyze spend efficiency and find optimal budget levels
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

        {/* Spend vs Leads Chart */}
        <GlassCard variant="marketing">
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5" style={{ color: colors.brand.purple }} />
              Weekly Spend vs Leads
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: colors.text.muted }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: colors.text.muted }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: colors.text.muted }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === "spend") return [`$${value.toFixed(0)}`, "Spend"];
                      if (name === "leads") return [value, "Leads"];
                      return [value, name];
                    }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="spend"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    fill="url(#spendGradient)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="leads"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="none"
                  />
                  {sensitivityCurve.currentSpendLevel > 0 && (
                    <ReferenceLine
                      yAxisId="left"
                      x={chartData[chartData.length - 1]?.week}
                      stroke={ZONE_COLORS[sensitivityCurve.currentZone]}
                      strokeDasharray="3 3"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: "#7c3aed" }} />
                <span className="text-xs" style={{ color: colors.text.muted }}>Spend</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: "#22c55e" }} />
                <span className="text-xs" style={{ color: colors.text.muted }}>Leads</span>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* Zones */}
        <GlassCard variant="marketing">
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="flex items-center gap-2 text-base">
              <Target className="w-5 h-5" style={{ color: colors.brand.purple }} />
              Spend Zones
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {sensitivityCurve.zones.map((zone) => (
                <ZoneCard
                  key={zone.name}
                  zone={zone}
                  isCurrent={zone.name === sensitivityCurve.currentZone}
                />
              ))}
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* Scenarios */}
        <GlassCard variant="marketing">
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="w-5 h-5" style={{ color: colors.brand.purple }} />
              What If Scenarios
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {scenarioPreviews.map((scenario) => (
                <ScenarioCard key={scenario.label} scenario={scenario} />
              ))}
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* Recommendation */}
        <RecommendationSection recommendation={recommendation} />

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
      </div>
    </div>
  );
}
