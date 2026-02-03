import { useMetricCards, type MetricValue } from "@/hooks/useOpsDashboard";
import {
  GlassCard,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import { ArrowUp, ArrowDown, Percent, Clock, MousePointerClick, Layers, Timer, Activity, Settings, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation } from "wouter";

interface MetricCardConfig {
  key: keyof ReturnType<typeof useMetricCards>["data"] extends { metrics: infer M } ? M : never;
  label: string;
  icon: LucideIcon;
  color: string;
  bgGrad: string;
  tint: "cyan" | "purple" | "green" | "pink" | "amber";
  format: (v: number) => string;
}

const METRIC_CARDS: MetricCardConfig[] = [
  {
    key: "conversionRate" as any,
    label: "Conversion Rate",
    icon: MousePointerClick,
    color: "#7c3aed",
    bgGrad: "rgba(124,58,237,0.12), rgba(245,158,11,0.08)",
    tint: "cyan",
    format: (v: number) => `${v.toFixed(1)}%`,
  },
  {
    key: "bounceRate" as any,
    label: "Bounce Rate",
    icon: Activity,
    color: "#ec4899",
    bgGrad: "rgba(236,72,153,0.12), rgba(124,58,237,0.08)",
    tint: "pink",
    format: (v: number) => `${v.toFixed(1)}%`,
  },
  {
    key: "avgSessionDuration" as any,
    label: "Avg Session Duration",
    icon: Clock,
    color: "#f59e0b",
    bgGrad: "rgba(245,158,11,0.12), rgba(236,72,153,0.08)",
    tint: "amber",
    format: (v: number) => {
      const mins = Math.floor(v / 60);
      const secs = Math.round(v % 60);
      return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    },
  },
  {
    key: "pagesPerSession" as any,
    label: "Pages / Session",
    icon: Layers,
    color: "#22c55e",
    bgGrad: "rgba(34,197,94,0.12), rgba(34,197,94,0.06)",
    tint: "green",
    format: (v: number) => v.toFixed(1),
  },
  {
    key: "organicCtr" as any,
    label: "Organic CTR",
    icon: Percent,
    color: "#7c3aed",
    bgGrad: "rgba(124,58,237,0.08), rgba(236,72,153,0.12)",
    tint: "purple",
    format: (v: number) => `${(v * 100).toFixed(1)}%`,
  },
  {
    key: "pageLoadTime" as any,
    label: "Page Load Time",
    icon: Timer,
    color: "#ec4899",
    bgGrad: "rgba(236,72,153,0.08), rgba(245,158,11,0.08)",
    tint: "pink",
    format: (v: number) => `${v.toFixed(1)}s`,
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
  onConfigure,
}: {
  label: string;
  metric: MetricValue;
  icon: LucideIcon;
  color: string;
  bgGrad: string;
  tint: "cyan" | "purple" | "green" | "pink" | "amber";
  format: (v: number) => string;
  onConfigure?: () => void;
}) {
  const [, navigate] = useLocation();

  const handleConfigure = () => {
    if (onConfigure) {
      onConfigure();
    } else {
      navigate("/app/integrations");
    }
  };

  return (
    <GlassCard variant="marketing" hover tint={tint}>
      <GlassCardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium" style={{ color: "#475569" }}>{label}</p>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${bgGrad})`,
              border: `1px solid ${color}20`,
            }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
        </div>

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
            <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>
              {metric.reason || "Not available"}
            </p>
            <button
              onClick={handleConfigure}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-purple-50"
              style={{ color: "#7c3aed", border: "1px solid rgba(124, 58, 237, 0.2)" }}
            >
              <Settings className="w-3 h-3" />
              Configure
            </button>
          </>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}

interface MetricCardsSectionProps {
  siteId: string;
  onConfigureGA?: () => void;
}

export function MetricCardsSection({ siteId, onConfigureGA }: MetricCardsSectionProps) {
  const { data, isLoading, isError } = useMetricCards(siteId);

  // Determine if a metric is GA4-related (should use the GA wizard)
  const isGA4Metric = (key: string) => {
    return ["conversionRate", "bounceRate", "avgSessionDuration", "pagesPerSession"].includes(key);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {METRIC_CARDS.map((card) => (
          <GlassCard key={card.label} variant="marketing" hover tint={card.tint}>
            <GlassCardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium" style={{ color: "#475569" }}>{card.label}</p>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#94A3B8" }} />
              </div>
              <div className="h-8 w-20 rounded bg-gray-100 animate-pulse" />
            </GlassCardContent>
          </GlassCard>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
            onConfigure={isGA4Metric(card.key as string) ? onConfigureGA : undefined}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {METRIC_CARDS.map((card) => {
        const metric = data.metrics[card.key as keyof typeof data.metrics];
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
            onConfigure={isGA4Metric(card.key as string) ? onConfigureGA : undefined}
          />
        );
      })}
    </div>
  );
}
