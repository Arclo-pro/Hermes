/**
 * MetricBreakdown - Detailed analysis page for a single metric
 *
 * Shows: definition, delta, likely causes, evidence, and recommendations.
 */

import { useRoute, Link } from "wouter";
import { useSiteContext } from "@/hooks/useSiteContext";
import { useMetricExplanation } from "@/hooks/useMetricExplanations";
import { Loader2, ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import { GlassCard, GlassCardContent } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { colors, pageStyles, gradients } from "@/lib/design-system";
import { MetricDefinition } from "./components/MetricDefinition";
import { MetricDelta } from "./components/MetricDelta";
import { DriversSection } from "./components/DriversSection";
import { EvidenceSection } from "./components/EvidenceSection";
import { RecommendationsSection } from "./components/RecommendationsSection";
import { METRIC_DEFINITIONS, type MetricKey } from "../../../../shared/types/metricExplanation";

export default function MetricBreakdown() {
  const [, params] = useRoute("/app/insights/metrics/:metricKey");
  const metricKey = params?.metricKey as MetricKey | undefined;
  const { siteId } = useSiteContext();

  const { data, isLoading, isError, refetch, isRefetching } = useMetricExplanation(
    siteId,
    metricKey
  );

  // Invalid metric key
  const validKeys: MetricKey[] = ["activeUsers", "eventCount", "newUsers", "avgEngagement"];
  if (metricKey && !validKeys.includes(metricKey)) {
    return (
      <div className="min-h-screen p-6" style={pageStyles.background}>
        <div className="max-w-4xl mx-auto">
          <GlassCard variant="marketing" tint="amber">
            <GlassCardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.brand.amber }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text.primary }}>
                Invalid Metric
              </h3>
              <p className="mb-4" style={{ color: colors.text.secondary }}>
                The metric "{metricKey}" is not recognized.
              </p>
              <Link href="/app/insights/metrics">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Metrics
                </Button>
              </Link>
            </GlassCardContent>
          </GlassCard>
        </div>
      </div>
    );
  }

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
          <Link href="/app/insights/metrics">
            <span
              className="inline-flex items-center gap-2 text-sm cursor-pointer hover:underline mb-6"
              style={{ color: colors.text.secondary }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Metrics
            </span>
          </Link>
          <GlassCard variant="marketing" tint="amber">
            <GlassCardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.brand.amber }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text.primary }}>
                Unable to Load Analysis
              </h3>
              <p className="mb-4" style={{ color: colors.text.secondary }}>
                We couldn't load the metric analysis. Please try again.
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

  const definition = metricKey ? METRIC_DEFINITIONS[metricKey] : null;

  return (
    <div className="min-h-screen p-6" style={pageStyles.background}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back link */}
        <Link href="/app/insights/metrics">
          <span
            className="inline-flex items-center gap-2 text-sm cursor-pointer hover:underline"
            style={{ color: colors.text.secondary }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Metrics
          </span>
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-3xl font-bold mb-1"
              style={{ color: colors.text.primary, letterSpacing: "-0.02em" }}
            >
              <span style={gradients.brandText}>{definition?.title || "Metric Analysis"}</span>
            </h1>
            <p className="text-sm" style={{ color: colors.text.secondary }}>
              Last updated: {new Date(data.lastUpdated).toLocaleString()}
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

        {/* Section 1: What it means */}
        {definition && <MetricDefinition definition={definition.definition} />}

        {/* Section 2: What changed */}
        <MetricDelta
          delta={data.delta}
          status={data.status}
          confidence={data.confidence}
        />

        {/* Section 3: Likely causes */}
        <DriversSection drivers={data.topDrivers} />

        {/* Section 4: Evidence */}
        {metricKey && (
          <EvidenceSection evidence={data.evidence} metricKey={metricKey} />
        )}

        {/* Section 5: Recommendations */}
        <RecommendationsSection recommendations={data.recommendations} />

        {/* Error message if present */}
        {data.error && (
          <GlassCard variant="marketing" tint="amber">
            <GlassCardContent className="p-4">
              <p className="text-sm" style={{ color: colors.text.secondary }}>
                <span className="font-medium" style={{ color: colors.brand.amber }}>Note:</span>{" "}
                {data.error}
              </p>
            </GlassCardContent>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
