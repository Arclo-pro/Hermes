import { useSerpSnapshot } from "@/hooks/useOpsDashboard";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import { Trophy, Target, TrendingUp, ArrowUp, ArrowDown, Search, Info, Loader2 } from "lucide-react";

interface SerpSnapshotSectionProps {
  siteId: string;
}

export function SerpSnapshotSection({ siteId }: SerpSnapshotSectionProps) {
  const { data, isLoading, isError } = useSerpSnapshot(siteId);

  if (isLoading) {
    return (
      <GlassCard variant="marketing" tint="purple">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" style={{ color: "#7c3aed" }} />
            SERP Snapshot
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
      <GlassCard variant="marketing" tint="purple">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" style={{ color: "#7c3aed" }} />
            SERP Snapshot
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="py-6 text-center">
            <p className="text-sm" style={{ color: "#94A3B8" }}>Unable to load SERP data</p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  // Baseline state
  if (!data.hasBaseline || data.totalTracked === 0) {
    return (
      <GlassCard variant="marketing-accent" tint="purple">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" style={{ color: "#7c3aed" }} />
            SERP Snapshot
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div
            className="rounded-xl p-5 flex items-start gap-4"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.06), rgba(236,72,153,0.04))",
              border: "1px solid rgba(124, 58, 237, 0.12)",
            }}
          >
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#7c3aed" }} />
            <div>
              <p className="font-semibold text-sm mb-1" style={{ color: "#0F172A" }}>
                Collecting baseline data
              </p>
              <p className="text-sm" style={{ color: "#475569" }}>
                {data.totalTracked === 0
                  ? "No keywords are being tracked yet. Keywords will appear once Arclo begins analyzing your site."
                  : "SERP rankings need at least 7 days of data to show week-over-week trends. Tracking has started."}
              </p>
              {data.totalTracked > 0 && (
                <p className="text-xs mt-2" style={{ color: "#94A3B8" }}>
                  Tracking {data.totalTracked} keyword{data.totalTracked !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  const { rankingCounts, weekOverWeek } = data;

  return (
    <GlassCard variant="marketing" tint="purple">
      <GlassCardHeader>
        <div className="flex items-center justify-between">
          <GlassCardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" style={{ color: "#7c3aed" }} />
            SERP Snapshot
          </GlassCardTitle>
          {data.lastChecked && (
            <span className="text-xs" style={{ color: "#94A3B8" }}>
              Last checked: {new Date(data.lastChecked).toLocaleDateString()}
            </span>
          )}
        </div>
      </GlassCardHeader>
      <GlassCardContent>
        {/* Ranking Bucket Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatBucket label="Total Tracked" value={data.totalTracked} icon={Target} color="#7c3aed" />
          <StatBucket label="#1 Rankings" value={rankingCounts.position1} icon={Trophy} color="#f59e0b" />
          <StatBucket label="Top 3" value={rankingCounts.top3} icon={Trophy} color="#ec4899" />
          <StatBucket label="Top 10" value={rankingCounts.top10} icon={TrendingUp} color="#22c55e" />
          <StatBucket label="Top 100" value={rankingCounts.top100} icon={Target} color="#64748B" />
        </div>

        {/* Week-over-Week Summary */}
        <div
          className="rounded-xl p-4"
          style={{ background: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.06)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#94A3B8" }}>
            Week over Week
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <WowStat
              label="Net Change"
              value={weekOverWeek.netChange}
              format={(v) => (v > 0 ? `+${v}` : `${v}`)}
              color={weekOverWeek.netChange > 0 ? "#22c55e" : weekOverWeek.netChange < 0 ? "#ef4444" : "#64748B"}
            />
            <WowStat
              label="Improved"
              value={weekOverWeek.improved}
              icon={ArrowUp}
              color="#22c55e"
            />
            <WowStat
              label="Declined"
              value={weekOverWeek.declined}
              icon={ArrowDown}
              color="#ef4444"
            />
            <WowStat
              label="Gained"
              value={weekOverWeek.gained}
              color="#7c3aed"
            />
            <WowStat
              label="Lost"
              value={weekOverWeek.lost}
              color="#94A3B8"
            />
          </div>
        </div>
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

function WowStat({
  label,
  value,
  icon: Icon,
  color,
  format,
}: {
  label: string;
  value: number;
  icon?: typeof ArrowUp;
  color: string;
  format?: (v: number) => string;
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1">
        {Icon && <Icon className="w-3.5 h-3.5" style={{ color }} />}
        <span className="text-lg font-bold" style={{ color }}>
          {format ? format(value) : value}
        </span>
      </div>
      <p className="text-xs" style={{ color: "#64748B" }}>{label}</p>
    </div>
  );
}
