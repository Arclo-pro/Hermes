/**
 * MetricsOverview - Page listing all 4 KPIs with their status and explanations
 *
 * Entry point for the metrics analysis feature.
 */

import { Link } from "wouter";
import { useSiteContext } from "@/hooks/useSiteContext";
import { useMetricExplanations } from "@/hooks/useMetricExplanations";
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
  Users,
  MousePointerClick,
  UserPlus,
  Clock,
  BarChart2,
} from "lucide-react";
import { colors, pageStyles, gradients } from "@/lib/design-system";
import type { MetricKey, ExplanationStatus, MetricExplanation } from "../../../../shared/types/metricExplanation";

const METRIC_CONFIG: Record<MetricKey, {
  label: string;
  icon: typeof Users;
  color: string;
}> = {
  activeUsers: { label: "Active Users", icon: Users, color: "#7c3aed" },
  eventCount: { label: "Event Count", icon: MousePointerClick, color: "#ec4899" },
  newUsers: { label: "New Users", icon: UserPlus, color: "#22c55e" },
  avgEngagement: { label: "Avg Engagement", icon: Clock, color: "#f59e0b" },
};

const STATUS_CONFIG: Record<ExplanationStatus, {
  icon: typeof TrendingUp;
  color: string;
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
}> = {
  improving: { icon: TrendingUp, color: "#22c55e", label: "Improving", variant: "default" },
  stable: { icon: Minus, color: "#64748b", label: "Stable", variant: "secondary" },
  needs_attention: { icon: TrendingDown, color: "#ef4444", label: "Needs Attention", variant: "destructive" },
  no_data: { icon: AlertCircle, color: "#94a3b8", label: "No Data", variant: "outline" },
  error: { icon: AlertCircle, color: "#f59e0b", label: "Error", variant: "outline" },
};

function MetricRow({ explanation }: { explanation: MetricExplanation }) {
  const metricConfig = METRIC_CONFIG[explanation.metricKey];
  const statusConfig = STATUS_CONFIG[explanation.status];
  const Icon = metricConfig.icon;
  const StatusIcon = statusConfig.icon;

  return (
    <Link href={`/app/insights/metrics/${explanation.metricKey}`}>
      <div
        className="flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all hover:border-purple-200 hover:bg-purple-50/30"
        style={{ borderColor: "rgba(226, 232, 240, 1)" }}
      >
        {/* Metric Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${metricConfig.color}15` }}
        >
          <Icon className="w-6 h-6" style={{ color: metricConfig.color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold" style={{ color: "#0F172A" }}>
              {metricConfig.label}
            </h3>
            <Badge variant={statusConfig.variant} className="text-xs">
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
          <p
            className="text-sm line-clamp-1"
            style={{ color: "#64748B" }}
          >
            {explanation.summary}
          </p>
        </div>

        {/* Delta */}
        <div className="text-right shrink-0">
          <p
            className="text-lg font-bold"
            style={{
              color: explanation.delta.percent > 0
                ? "#22c55e"
                : explanation.delta.percent < 0
                  ? "#ef4444"
                  : "#64748b",
            }}
          >
            {explanation.delta.percent > 0 ? "+" : ""}
            {explanation.delta.percent.toFixed(1)}%
          </p>
          <p className="text-xs" style={{ color: "#94a3b8" }}>
            {explanation.delta.timeWindow}
          </p>
        </div>

        {/* Arrow */}
        <ArrowRight className="w-5 h-5 shrink-0" style={{ color: "#94a3b8" }} />
      </div>
    </Link>
  );
}

export default function MetricsOverview() {
  const { siteId } = useSiteContext();
  const { data, isLoading, isError, refetch, isRefetching } = useMetricExplanations(siteId);

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
                Unable to Load Metrics
              </h3>
              <p className="mb-4" style={{ color: colors.text.secondary }}>
                We couldn't load the metrics analysis. Please try again.
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

  const metrics: MetricExplanation[] = [
    data.activeUsers,
    data.eventCount,
    data.newUsers,
    data.avgEngagement,
  ];

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
              <span style={gradients.brandText}>Metrics Analysis</span>
            </h1>
            <p style={{ color: colors.text.secondary }}>
              Understand what's driving your key performance indicators
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

        {/* Metrics List */}
        <GlassCard variant="marketing">
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="flex items-center gap-2 text-base">
              <BarChart2 className="w-5 h-5" style={{ color: colors.brand.purple }} />
              Your KPIs
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="space-y-3">
              {metrics.map((explanation) => (
                <MetricRow key={explanation.metricKey} explanation={explanation} />
              ))}
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* Help text */}
        <p className="text-sm text-center" style={{ color: colors.text.muted }}>
          Click on any metric to see detailed analysis and recommendations.
        </p>
      </div>
    </div>
  );
}
