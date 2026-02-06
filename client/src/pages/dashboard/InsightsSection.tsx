import { useState, useRef, useEffect, useMemo } from "react";
import { useInsights, useTrafficDiagnosis, type DashboardTip, type TipCategory, type TipSentiment, type DiagnosisInsight } from "@/hooks/useOpsDashboard";
import { GlassCard, GlassCardContent } from "@/components/ui/GlassCard";
import {
  Lightbulb,
  Trophy,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calendar,
  TrendingDown,
  Smartphone,
  Globe,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation } from "wouter";

// ── Category badge styles ────────────────────────────────────

type ExtendedTipCategory = TipCategory | "diagnosis";

const CATEGORY_STYLES: Record<ExtendedTipCategory, { label: string; color: string; bg: string }> = {
  rankings:  { label: "Rankings",  color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
  traffic:   { label: "Traffic",   color: "#ec4899", bg: "rgba(236,72,153,0.08)" },
  content:   { label: "Content",   color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  technical: { label: "Technical", color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  system:    { label: "Setup",     color: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
  win:       { label: "Win",       color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
  diagnosis: { label: "Why?",      color: "#f97316", bg: "rgba(249,115,22,0.08)" },
};

// ── Diagnosis category icons ─────────────────────────────────

const DIAGNOSIS_ICONS: Record<DiagnosisInsight["category"], LucideIcon> = {
  overall: TrendingDown,
  channel: TrendingDown,
  device: Smartphone,
  geo: Globe,
  landing_page: FileText,
};

// ── Sentiment → icon mapping ─────────────────────────────────

const SENTIMENT_ICONS: Record<TipSentiment, LucideIcon> = {
  positive: Trophy,
  neutral: Lightbulb,
  action: AlertTriangle,
};

const SENTIMENT_COLORS: Record<TipSentiment, string> = {
  positive: "#22c55e",
  neutral: "#3b82f6",
  action: "#f59e0b",
};

// ── Individual tip card ──────────────────────────────────────

interface InsightCardProps {
  tip: DashboardTip;
  onScheduleAction?: (tip: DashboardTip) => void;
}

function InsightCard({ tip, onScheduleAction }: InsightCardProps) {
  const [, navigate] = useLocation();

  // Check if this is a diagnosis insight
  const isDiagnosis = tip.id.startsWith("diagnosis-");
  const diagnosisCategory = (tip as any)._diagnosisCategory as DiagnosisInsight["category"] | undefined;

  // Use "Why?" badge for diagnosis insights, otherwise use the standard category badge
  const badge = isDiagnosis ? CATEGORY_STYLES.diagnosis : CATEGORY_STYLES[tip.category];

  // Use diagnosis-specific icon or standard sentiment icon
  const Icon = isDiagnosis && diagnosisCategory
    ? DIAGNOSIS_ICONS[diagnosisCategory]
    : SENTIMENT_ICONS[tip.sentiment];
  const iconColor = isDiagnosis ? "#f97316" : SENTIMENT_COLORS[tip.sentiment];

  // Determine if this is an actionable insight that can be scheduled
  const isSchedulable = tip.sentiment === "action" && tip.category !== "system" && !isDiagnosis;
  const isSetupAction = tip.category === "system";

  return (
    <GlassCard variant="marketing" hover className="flex-shrink-0 w-full">
      <GlassCardContent className="p-5 h-full flex flex-col">
        {/* Badge + icon row */}
        <div className="flex items-start justify-between mb-3">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: badge.color, background: badge.bg }}
          >
            {badge.label}
          </span>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${iconColor}14`, border: `1px solid ${iconColor}20` }}
          >
            <Icon className="w-4 h-4" style={{ color: iconColor }} />
          </div>
        </div>

        {/* Title + body */}
        <h4
          className="text-sm font-semibold mb-1"
          style={{ color: "#0F172A", letterSpacing: "-0.01em" }}
        >
          {tip.title}
        </h4>
        <p className="text-[13px] leading-relaxed flex-grow" style={{ color: "#64748B" }}>
          {tip.body}
        </p>

        {/* Action buttons */}
        <div className="mt-3 flex flex-wrap gap-2">
          {/* Schedule button for actionable insights */}
          {isSchedulable && onScheduleAction && (
            <button
              onClick={() => onScheduleAction(tip)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-green-50"
              style={{ color: "#22c55e", border: "1px solid rgba(34, 197, 94, 0.3)", background: "rgba(34, 197, 94, 0.05)" }}
            >
              <Calendar className="w-3 h-3" />
              Schedule Fix
            </button>
          )}

          {/* Navigation button for setup actions or if actionRoute is provided */}
          {tip.actionLabel && tip.actionRoute && (
            <button
              onClick={() => navigate(tip.actionRoute!)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-purple-50"
              style={{ color: "#7c3aed", border: "1px solid rgba(124, 58, 237, 0.2)" }}
            >
              {tip.actionLabel}
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}

// ── Section ──────────────────────────────────────────────────

interface InsightsSectionProps {
  siteId: string;
}

const STORAGE_KEY = "arclo-insights-collapsed";
const ITEMS_PER_PAGE = 4; // Show 4 items at a time on desktop

export function InsightsSection({ siteId }: InsightsSectionProps) {
  const { data, isLoading } = useInsights(siteId);
  const { data: diagnosisData, isLoading: diagnosisLoading } = useTrafficDiagnosis(siteId);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Convert diagnosis insights to DashboardTip format and merge with regular tips
  const allTips = useMemo(() => {
    const tips: DashboardTip[] = [];

    // Add diagnosis insights first (they explain the "why")
    if (diagnosisData?.hasDrop && diagnosisData.insights.length > 0) {
      for (const insight of diagnosisData.insights) {
        tips.push({
          id: `diagnosis-${insight.id}`,
          title: insight.title,
          body: insight.body,
          category: "traffic" as TipCategory, // Use traffic category for styling
          priority: insight.severity === "high" ? 100 : insight.severity === "medium" ? 95 : 90,
          sentiment: "action" as TipSentiment,
          // Store diagnosis category for custom rendering
          _diagnosisCategory: insight.category,
        } as DashboardTip & { _diagnosisCategory?: string });
      }
    }

    // Add regular insights
    if (data?.tips) {
      tips.push(...data.tips);
    }

    // Sort by priority
    tips.sort((a, b) => b.priority - a.priority);
    return tips;
  }, [data, diagnosisData]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  };

  // Handle scheduling an action
  const handleScheduleAction = (tip: DashboardTip) => {
    // TODO: Open scheduling modal or navigate to content queue
    console.log("Schedule action for:", tip.title);
    alert(`Scheduling fix for: "${tip.title}"\n\nThis will be added to your weekly update queue.`);
  };

  // Navigation
  const totalTips = allTips.length;
  const maxIndex = Math.max(0, totalTips - ITEMS_PER_PAGE);

  const goNext = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
  };

  const goPrev = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  // Scroll carousel when index changes
  useEffect(() => {
    if (carouselRef.current && totalTips > 0) {
      const scrollWidth = carouselRef.current.scrollWidth;
      const containerWidth = carouselRef.current.clientWidth;
      const itemWidth = (scrollWidth - (totalTips - 1) * 16) / totalTips; // 16px gap
      const scrollLeft = currentIndex * (itemWidth + 16);
      carouselRef.current.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, [currentIndex, totalTips]);

  // Still loading both data sources
  const stillLoading = isLoading && diagnosisLoading;
  if (stillLoading) return null;

  // No insights to show
  if (allTips.length === 0) return null;

  const showNavigation = totalTips > ITEMS_PER_PAGE;
  const hasDiagnosisInsights = diagnosisData?.hasDrop && diagnosisData.insights.length > 0;

  return (
    <div className="space-y-3">
      {/* Header with collapse toggle and navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={toggleCollapsed}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:opacity-80"
          style={{ color: "#94A3B8" }}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          {hasDiagnosisInsights ? "Traffic Analysis" : "Insights"}
          <span className="ml-1 normal-case font-normal">({allTips.length})</span>
        </button>

        {/* Carousel navigation */}
        {!collapsed && showNavigation && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "#94A3B8" }}>
              {currentIndex + 1}-{Math.min(currentIndex + ITEMS_PER_PAGE, totalTips)} of {totalTips}
            </span>
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
              style={{ border: "1px solid rgba(15, 23, 42, 0.1)" }}
            >
              <ChevronLeft className="w-4 h-4" style={{ color: "#64748B" }} />
            </button>
            <button
              onClick={goNext}
              disabled={currentIndex >= maxIndex}
              className="p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
              style={{ border: "1px solid rgba(15, 23, 42, 0.1)" }}
            >
              <ChevronRight className="w-4 h-4" style={{ color: "#64748B" }} />
            </button>
          </div>
        )}
      </div>

      {/* Carousel container */}
      {!collapsed && (
        <div
          ref={carouselRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide"
          style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {allTips.map((tip) => (
            <div
              key={tip.id}
              className="flex-shrink-0 w-[calc(100%-16px)] sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)]"
              style={{ scrollSnapAlign: "start" }}
            >
              <InsightCard tip={tip} onScheduleAction={handleScheduleAction} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
