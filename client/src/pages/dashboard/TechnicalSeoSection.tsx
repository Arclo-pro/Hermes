import { useTechnicalSeo, type TechnicalSeoIssue } from "@/hooks/useOpsDashboard";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import {
  Settings2,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Loader2,
  Gauge,
  Clock,
  LayoutGrid,
  Zap,
  MousePointer,
  RefreshCw,
} from "lucide-react";

interface TechnicalSeoSectionProps {
  siteId: string;
}

const SEVERITY_STYLES: Record<string, { icon: typeof AlertCircle; color: string; bg: string }> = {
  error: { icon: AlertCircle, color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
  warning: { icon: AlertTriangle, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
  info: { icon: Info, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
};

function IssueRow({ issue }: { issue: TechnicalSeoIssue }) {
  const style = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.info;
  const Icon = style.icon;

  return (
    <div
      className="p-3 rounded-xl"
      style={{ background: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.06)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: style.bg }}
        >
          <Icon className="w-4 h-4" style={{ color: style.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm" style={{ color: "#0F172A" }}>
            {issue.title}
          </p>
          {issue.description && (
            <p className="text-xs mt-1" style={{ color: "#64748B" }}>
              {issue.description}
            </p>
          )}
          {issue.url && issue.url !== "/" && (
            <p className="text-xs mt-1 font-mono truncate" style={{ color: "#94A3B8" }}>
              {issue.url}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CoreWebVitalCard({
  label,
  value,
  unit,
  icon: Icon,
  threshold,
}: {
  label: string;
  value: number | null;
  unit: string;
  icon: typeof Gauge;
  threshold: { good: number; poor: number };
}) {
  let color = "#94A3B8";
  let status = "Unknown";

  if (value != null) {
    if (value <= threshold.good) {
      color = "#22c55e";
      status = "Good";
    } else if (value <= threshold.poor) {
      color = "#f59e0b";
      status = "Needs work";
    } else {
      color = "#ef4444";
      status = "Poor";
    }
  }

  return (
    <div
      className="p-3 rounded-xl text-center"
      style={{ background: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.06)" }}
    >
      <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
      <p className="text-lg font-bold" style={{ color: "#0F172A" }}>
        {value != null ? `${value.toFixed(value < 10 ? 2 : 0)}${unit}` : "---"}
      </p>
      <p className="text-xs" style={{ color: "#64748B" }}>{label}</p>
      <p className="text-[10px] mt-1" style={{ color }}>{status}</p>
    </div>
  );
}

export function TechnicalSeoSection({ siteId }: TechnicalSeoSectionProps) {
  const { data, isLoading, isError, refetch, isRefetching } = useTechnicalSeo(siteId);

  if (isLoading) {
    return (
      <GlassCard variant="marketing" tint="cyan">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" style={{ color: "#06b6d4" }} />
            Technical SEO
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#94A3B8" }} />
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  if (isError || !data) {
    return (
      <GlassCard variant="marketing" tint="cyan">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" style={{ color: "#06b6d4" }} />
            Technical SEO
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="py-6 text-center">
            <p className="text-sm" style={{ color: "#94A3B8" }}>Unable to load technical SEO data</p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  if (!data.hasData) {
    return (
      <GlassCard variant="marketing" tint="cyan">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" style={{ color: "#06b6d4" }} />
            Technical SEO
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="py-8 text-center">
            <Settings2 className="w-8 h-8 mx-auto mb-3" style={{ color: "#CBD5E1" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "#475569" }}>No technical data yet</p>
            <p className="text-xs" style={{ color: "#94A3B8" }}>
              Run a site crawl to identify technical SEO issues.
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  const { summary, coreWebVitals, issues } = data;

  return (
    <GlassCard variant="marketing" tint="cyan">
      <GlassCardHeader>
        <div className="flex items-center justify-between">
          <GlassCardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" style={{ color: "#06b6d4" }} />
            Technical SEO
          </GlassCardTitle>
          <div className="flex items-center gap-2">
            {data.lastCrawled && (
              <span className="text-xs" style={{ color: "#94A3B8" }}>
                Last crawled: {new Date(data.lastCrawled).toLocaleDateString()}
              </span>
            )}
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-1.5 rounded-lg transition-colors hover:bg-muted disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`}
                style={{ color: "#94A3B8" }}
              />
            </button>
          </div>
        </div>
      </GlassCardHeader>
      <GlassCardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div
            className="p-3 rounded-xl text-center"
            style={{ background: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.06)" }}
          >
            <Gauge className="w-4 h-4 mx-auto mb-1" style={{ color: summary.score != null && summary.score >= 80 ? "#22c55e" : summary.score != null && summary.score >= 50 ? "#f59e0b" : "#ef4444" }} />
            <p className="text-2xl font-bold" style={{ color: "#0F172A" }}>
              {summary.score != null ? summary.score : "---"}
            </p>
            <p className="text-xs" style={{ color: "#64748B" }}>Score</p>
          </div>
          <div
            className="p-3 rounded-xl text-center"
            style={{ background: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.06)" }}
          >
            <AlertCircle className="w-4 h-4 mx-auto mb-1" style={{ color: "#ef4444" }} />
            <p className="text-2xl font-bold" style={{ color: "#0F172A" }}>{summary.errorCount}</p>
            <p className="text-xs" style={{ color: "#64748B" }}>Errors</p>
          </div>
          <div
            className="p-3 rounded-xl text-center"
            style={{ background: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.06)" }}
          >
            <AlertTriangle className="w-4 h-4 mx-auto mb-1" style={{ color: "#f59e0b" }} />
            <p className="text-2xl font-bold" style={{ color: "#0F172A" }}>{summary.warningCount}</p>
            <p className="text-xs" style={{ color: "#64748B" }}>Warnings</p>
          </div>
          <div
            className="p-3 rounded-xl text-center"
            style={{ background: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.06)" }}
          >
            <CheckCircle2 className="w-4 h-4 mx-auto mb-1" style={{ color: "#22c55e" }} />
            <p className="text-2xl font-bold" style={{ color: "#0F172A" }}>{summary.infoCount}</p>
            <p className="text-xs" style={{ color: "#64748B" }}>Passed</p>
          </div>
        </div>

        {/* Core Web Vitals */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#94A3B8" }}>
            Core Web Vitals
          </p>
          <div className="grid grid-cols-5 gap-2">
            <CoreWebVitalCard
              label="LCP"
              value={coreWebVitals.lcp}
              unit="s"
              icon={Clock}
              threshold={{ good: 2.5, poor: 4 }}
            />
            <CoreWebVitalCard
              label="FID"
              value={coreWebVitals.fid}
              unit="ms"
              icon={MousePointer}
              threshold={{ good: 100, poor: 300 }}
            />
            <CoreWebVitalCard
              label="CLS"
              value={coreWebVitals.cls}
              unit=""
              icon={LayoutGrid}
              threshold={{ good: 0.1, poor: 0.25 }}
            />
            <CoreWebVitalCard
              label="FCP"
              value={coreWebVitals.fcp}
              unit="s"
              icon={Zap}
              threshold={{ good: 1.8, poor: 3 }}
            />
            <CoreWebVitalCard
              label="TTFB"
              value={coreWebVitals.ttfb}
              unit="ms"
              icon={Gauge}
              threshold={{ good: 800, poor: 1800 }}
            />
          </div>
        </div>

        {/* Issues List */}
        {issues.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#94A3B8" }}>
              Issues ({issues.length})
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {issues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} />
              ))}
            </div>
          </div>
        )}

        {issues.length === 0 && (
          <div className="py-4 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: "#22c55e" }} />
            <p className="text-sm font-medium" style={{ color: "#475569" }}>No issues found</p>
            <p className="text-xs" style={{ color: "#94A3B8" }}>Your site's technical SEO looks healthy.</p>
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}
