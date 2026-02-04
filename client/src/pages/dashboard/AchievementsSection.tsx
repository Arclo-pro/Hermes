import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import {
  Trophy,
  TrendingUp,
  Target,
  FileText,
  RefreshCw,
  Shield,
  Loader2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";

interface AchievementTrack {
  id: number;
  siteId: string;
  crewId: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  currentLevel: number;
  currentTier: string;
  currentValue: number;
  nextThreshold: number;
  baseThreshold: number;
  growthFactor: number;
  lastUpdated: string;
  createdAt: string;
}

interface AchievementMilestone {
  id: number;
  siteId: string;
  trackId: number;
  categoryId: string;
  trackKey: string;
  level: number;
  tier: string;
  previousTier: string | null;
  headline: string;
  notifiedAt: string | null;
  achievedAt: string;
}

interface AchievementsSectionProps {
  siteId: string;
}

const CATEGORIES: Record<string, { label: string; icon: typeof Trophy; color: string }> = {
  website_traffic: { label: "Traffic", icon: TrendingUp, color: "#10b981" },
  leads: { label: "Leads", icon: Target, color: "#8b5cf6" },
  content_creation: { label: "Content", icon: FileText, color: "#f59e0b" },
  content_updates: { label: "Updates", icon: RefreshCw, color: "#3b82f6" },
  technical_improvements: { label: "Technical", icon: Shield, color: "#ef4444" },
};

const CATEGORY_ORDER = [
  "website_traffic",
  "leads",
  "content_creation",
  "content_updates",
  "technical_improvements",
];

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  bronze: { bg: "rgba(180, 83, 9, 0.1)", text: "#b45309", border: "rgba(180, 83, 9, 0.3)" },
  silver: { bg: "rgba(100, 116, 139, 0.1)", text: "#64748b", border: "rgba(100, 116, 139, 0.3)" },
  gold: { bg: "rgba(234, 179, 8, 0.1)", text: "#ca8a04", border: "rgba(234, 179, 8, 0.3)" },
  platinum: { bg: "rgba(6, 182, 212, 0.1)", text: "#0891b2", border: "rgba(6, 182, 212, 0.3)" },
  mythic: { bg: "rgba(168, 85, 247, 0.1)", text: "#9333ea", border: "rgba(168, 85, 247, 0.3)" },
};

export function AchievementsSection({ siteId }: AchievementsSectionProps) {
  const [, navigate] = useLocation();

  const { data: tracks, isLoading: isLoadingTracks } = useQuery({
    queryKey: ["achievements", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/achievements?siteId=${siteId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch achievements");
      const json = await res.json();
      return json.data as AchievementTrack[];
    },
  });

  const { data: milestones } = useQuery({
    queryKey: ["achievements-milestones", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/achievements/milestones?siteId=${siteId}&limit=5`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch milestones");
      const json = await res.json();
      return json.data as AchievementMilestone[];
    },
  });

  // Group tracks by category
  const categoryStats = useMemo(() => {
    if (!tracks) return [];

    const stats = CATEGORY_ORDER.map((categoryId) => {
      const categoryTracks = tracks.filter((t) => t.crewId === categoryId);
      const totalLevels = categoryTracks.reduce((sum, t) => sum + t.currentLevel, 0);
      const highestTier = categoryTracks.reduce((highest, t) => {
        const tierOrder = ["bronze", "silver", "gold", "platinum", "mythic"];
        const currentIdx = tierOrder.indexOf(t.currentTier);
        const highestIdx = tierOrder.indexOf(highest);
        return currentIdx > highestIdx ? t.currentTier : highest;
      }, "bronze");

      return {
        categoryId,
        category: CATEGORIES[categoryId],
        totalLevels,
        highestTier,
        trackCount: categoryTracks.length,
      };
    }).filter((s) => s.trackCount > 0);

    return stats;
  }, [tracks]);

  const totalLevels = categoryStats.reduce((sum, s) => sum + s.totalLevels, 0);
  const recentMilestones = milestones?.slice(0, 3) || [];

  if (isLoadingTracks) {
    return (
      <GlassCard variant="marketing" tint="purple">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" style={{ color: "#f59e0b" }} />
            Achievements
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

  // Empty state
  if (!tracks || tracks.length === 0) {
    return (
      <GlassCard variant="marketing" tint="purple">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" style={{ color: "#f59e0b" }} />
            Achievements
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-center py-6">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "rgba(245, 158, 11, 0.1)" }}
            >
              <Sparkles className="w-6 h-6" style={{ color: "#f59e0b" }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: "#0F172A" }}>
              No achievements yet
            </p>
            <p className="text-xs" style={{ color: "#64748B" }}>
              Achievements are earned from real outcomes like traffic growth and content published.
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="marketing" tint="purple">
      <GlassCardHeader>
        <div className="flex items-center justify-between">
          <GlassCardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" style={{ color: "#f59e0b" }} />
            Achievements
          </GlassCardTitle>
          <button
            onClick={() => navigate("/app/achievements")}
            className="inline-flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
            style={{ color: "#7c3aed" }}
          >
            View All
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </GlassCardHeader>
      <GlassCardContent className="space-y-4">
        {/* Total summary */}
        <div
          className="rounded-xl p-4 text-center"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(234,179,8,0.04))" }}
        >
          <p className="text-3xl font-bold" style={{ color: "#0F172A" }}>
            {totalLevels}
          </p>
          <p className="text-xs" style={{ color: "#64748B" }}>
            Total Levels Earned
          </p>
        </div>

        {/* Category breakdown */}
        <div className="space-y-2">
          {categoryStats.map(({ categoryId, category, totalLevels, highestTier }) => {
            const Icon = category.icon;
            const tierStyle = TIER_COLORS[highestTier] || TIER_COLORS.bronze;

            return (
              <div
                key={categoryId}
                className="flex items-center justify-between p-2.5 rounded-lg"
                style={{ background: "rgba(15, 23, 42, 0.02)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${category.color}15` }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: category.color }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: "#0F172A" }}>
                    {category.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: "#0F172A" }}>
                    {totalLevels}
                  </span>
                  <span
                    className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                    style={{
                      background: tierStyle.bg,
                      color: tierStyle.text,
                      border: `1px solid ${tierStyle.border}`,
                    }}
                  >
                    {highestTier}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent milestones */}
        {recentMilestones.length > 0 && (
          <div className="pt-3" style={{ borderTop: "1px solid rgba(15, 23, 42, 0.06)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#94A3B8" }}>
              Recent Wins
            </p>
            <div className="space-y-1.5">
              {recentMilestones.map((milestone) => {
                const category = CATEGORIES[milestone.categoryId];
                const timeAgo = getTimeAgo(new Date(milestone.achievedAt));

                return (
                  <div
                    key={milestone.id}
                    className="flex items-center gap-2 text-xs"
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category?.color || "#6b7280" }}
                    />
                    <span className="flex-1 truncate" style={{ color: "#475569" }}>
                      {milestone.headline}
                    </span>
                    <span style={{ color: "#94A3B8" }}>{timeAgo}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1d";
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
  return `${Math.floor(diffDays / 30)}mo`;
}
