import { useMetricCards, type MetricValue } from "@/hooks/useOpsDashboard";
import { useMetricExplanations } from "@/hooks/useMetricExplanations";
import {
  GlassCard,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import { WhatChangedMicroCard, WhatChangedMicroCardSkeleton } from "@/components/metrics/WhatChangedMicroCard";
import { ArrowUp, ArrowDown, Clock, Users, MousePointerClick, UserPlus, Loader2, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MetricKey, MetricExplanation } from "../../../../shared/types/metricExplanation";
import { Link } from "wouter";
import { buildRoute } from "@shared/routes";

interface MetricCardConfig {
  key: keyof ReturnType<typeof useMetricCards>["data"] extends { metrics: infer M } ? M : never;
  metricKey: string; // For routing to metric detail page
  label: string;
  icon: LucideIcon;
  color: string;
  bgGrad: string;
  tint: "cyan" | "purple" | "green" | "pink" | "amber";
  format: (v: number) => string;
  explainer: {
    what: string;
    why: string;
  };
}

const METRIC_CARDS: MetricCardConfig[] = [
  {
    key: "activeUsers" as any,
    metricKey: "activeUsers",
    label: "Active Users",
    icon: Users,
    color: "#7c3aed",
    bgGrad: "rgba(124,58,237,0.12), rgba(245,158,11,0.08)",
    tint: "cyan",
    format: (v: number) => v.toLocaleString(),
    explainer: {
      what: "People who actively visited your site during this period.",
      why: "Drops usually come from traffic changes, SEO shifts, or paused ads.",
    },
  },
  {
    key: "eventCount" as any,
    metricKey: "eventCount",
    label: "Event Count",
    icon: MousePointerClick,
    color: "#ec4899",
    bgGrad: "rgba(236,72,153,0.12), rgba(124,58,237,0.08)",
    tint: "pink",
    format: (v: number) => v.toLocaleString(),
    explainer: {
      what: "Total meaningful actions taken on your site (clicks, forms, navigation).",
      why: "Declines often mean fewer visitors or less interaction on key pages.",
    },
  },
  {
    key: "newUsers" as any,
    metricKey: "newUsers",
    label: "New Users",
    icon: UserPlus,
    color: "#22c55e",
    bgGrad: "rgba(34,197,94,0.12), rgba(34,197,94,0.06)",
    tint: "green",
    format: (v: number) => v.toLocaleString(),
    explainer: {
      what: "First-time visitors discovering your site.",
      why: "Often affected by search rankings, ads, and referral traffic.",
    },
  },
  {
    key: "avgTimeToLeadSubmit" as any,
    metricKey: "avgTimeToLeadSubmit",
    label: "Time to Lead",
    icon: Timer,
    color: "#f59e0b",
    bgGrad: "rgba(245,158,11,0.12), rgba(236,72,153,0.08)",
    tint: "amber",
    format: (v: number) => {
      const mins = Math.floor(v / 60);
      const secs = Math.round(v % 60);
      return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    },
    explainer: {
      what: "How long visitors browse before submitting a lead form.",
      why: "Shorter times can mean easier conversions; longer times suggest more research.",
    },
  },
];

function ConfigAwareMetricCard({
  label,
  metric,
  icon: Icon,
  color,
  bgGrad,
  tint,
  format,
  metricKey,
  explainer,
  explanation,
  explanationLoading,
}: {
  label: string;
  metric: MetricValue;
  icon: LucideIcon;
  color: string;
  bgGrad: string;
  tint: "cyan" | "purple" | "green" | "pink" | "amber";
  format: (v: number) => string;
  metricKey: string;
  explainer: { what: string; why: string };
  explanation?: MetricExplanation;
  explanationLoading?: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <Link href={buildRoute.metricDetail(metricKey)} className="flex-1 flex flex-col">
        <GlassCard variant="marketing" hover tint={tint} className="cursor-pointer h-full flex flex-col">
          <GlassCardContent className="p-6 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium" style={{ color: "#475569" }}>{label}</p>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${bgGrad})`,
                  border: `1px solid ${color}20`,
                }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
            </div>

            {/* Metric value area - fixed height */}
            <div className="h-14 flex flex-col justify-center">
              {metric.available && metric.value != null ? (
                <>
                  <p className="text-3xl font-bold" style={{ color: "#0F172A" }}>
                    {format(metric.value)}
                  </p>
                  {metric.change7d != null && (
                    <div className="flex items-center gap-1 mt-1">
                      {metric.change7d > 0 ? (
                        <ArrowUp className="w-3.5 h-3.5" style={{ color: "#22c55e" }} />
                      ) : metric.change7d < 0 ? (
                        <ArrowDown className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                      ) : null}
                      <span
                        className="text-xs font-medium"
                        style={{
                          color: metric.change7d > 0 ? "#22c55e" : metric.change7d < 0 ? "#ef4444" : "#94A3B8",
                        }}
                      >
                        {metric.change7d > 0 ? "+" : ""}
                        {metric.change7d.toFixed(1)}% 7d
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold" style={{ color: "#CBD5E1" }}>&mdash;</p>
                  <p className="text-xs mt-1 leading-relaxed line-clamp-2" style={{ color: "#64748B" }}>
                    {metric.reason || "Not available"}
                  </p>
                </>
              )}
            </div>

            {/* KPI Explainer - visible by default under the metric */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex-1">
              <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "#64748B" }}>
                {explainer.what}
              </p>
              <p className="text-xs leading-relaxed mt-1 line-clamp-2" style={{ color: "#94A3B8" }}>
                {explainer.why}
              </p>
            </div>
          </GlassCardContent>
        </GlassCard>
      </Link>

      {/* What Changed micro-card */}
      {explanationLoading ? (
        <WhatChangedMicroCardSkeleton />
      ) : explanation ? (
        <WhatChangedMicroCard explanation={explanation} />
      ) : null}
    </div>
  );
}

interface MetricCardsSectionProps {
  siteId: string;
}

export function MetricCardsSection({ siteId }: MetricCardsSectionProps) {
  const { data, isLoading, isError } = useMetricCards(siteId);
  const {
    data: explanations,
    isLoading: explanationsLoading,
  } = useMetricExplanations(siteId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
        {METRIC_CARDS.map((card) => (
          <div key={card.label} className="flex flex-col h-full">
            <GlassCard variant="marketing" hover tint={card.tint} className="flex-1 flex flex-col">
              <GlassCardContent className="p-6 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium" style={{ color: "#475569" }}>{card.label}</p>
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#94A3B8" }} />
                </div>
                <div className="h-14 flex items-center">
                  <div className="h-8 w-20 rounded bg-gray-100 animate-pulse" />
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex-1">
                  <div className="h-3 w-full rounded bg-gray-100 animate-pulse" />
                  <div className="h-3 w-3/4 rounded bg-gray-100 animate-pulse mt-2" />
                </div>
              </GlassCardContent>
            </GlassCard>
            <WhatChangedMicroCardSkeleton />
          </div>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {METRIC_CARDS.map((card) => (
          <ConfigAwareMetricCard
            key={card.label}
            label={card.label}
            metric={{ value: null, change7d: null, available: false, reason: "Unable to load metrics" }}
            icon={card.icon}
            color={card.color}
            bgGrad={card.bgGrad}
            tint={card.tint}
            format={card.format}
            metricKey={card.metricKey}
            explainer={card.explainer}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {METRIC_CARDS.map((card) => {
        const metric = data.metrics[card.key as keyof typeof data.metrics];
        const explanation = explanations?.[card.key as MetricKey];
        return (
          <ConfigAwareMetricCard
            key={card.label}
            label={card.label}
            metric={metric}
            icon={card.icon}
            color={card.color}
            bgGrad={card.bgGrad}
            tint={card.tint}
            format={card.format}
            metricKey={card.metricKey}
            explainer={card.explainer}
            explanation={explanation}
            explanationLoading={explanationsLoading}
          />
        );
      })}
    </div>
  );
}
