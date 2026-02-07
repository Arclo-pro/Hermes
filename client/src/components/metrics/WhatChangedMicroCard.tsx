/**
 * WhatChangedMicroCard - "What changed?" micro-card for KPI metrics
 *
 * Displays a compact summary of what changed for a metric,
 * with a link to the detailed breakdown page.
 */

import { Link } from "wouter";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import type {
  MetricExplanation,
  ExplanationStatus,
} from "../../../../shared/types/metricExplanation";
import { cn } from "@/lib/utils";

interface StatusConfig {
  icon: typeof TrendingUp;
  color: string;
  bg: string;
  borderColor: string;
  label: string;
}

const STATUS_CONFIG: Record<ExplanationStatus, StatusConfig> = {
  improving: {
    icon: TrendingUp,
    color: "#22c55e", // green-500
    bg: "rgba(34, 197, 94, 0.08)",
    borderColor: "rgba(34, 197, 94, 0.2)",
    label: "Improving",
  },
  stable: {
    icon: Minus,
    color: "#64748b", // slate-500
    bg: "rgba(100, 116, 139, 0.08)",
    borderColor: "rgba(100, 116, 139, 0.2)",
    label: "Stable",
  },
  needs_attention: {
    icon: TrendingDown,
    color: "#ef4444", // red-500
    bg: "rgba(239, 68, 68, 0.08)",
    borderColor: "rgba(239, 68, 68, 0.2)",
    label: "Needs Attention",
  },
  no_data: {
    icon: AlertCircle,
    color: "#94a3b8", // slate-400
    bg: "rgba(148, 163, 184, 0.08)",
    borderColor: "rgba(148, 163, 184, 0.2)",
    label: "No Data",
  },
  error: {
    icon: AlertCircle,
    color: "#f59e0b", // amber-500
    bg: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.2)",
    label: "Error",
  },
};

interface WhatChangedMicroCardProps {
  explanation: MetricExplanation;
  className?: string;
}

export function WhatChangedMicroCard({
  explanation,
  className,
}: WhatChangedMicroCardProps) {
  const config = STATUS_CONFIG[explanation.status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "mt-3 p-3 rounded-xl border transition-all group",
        className
      )}
      style={{
        background: config.bg,
        borderColor: config.borderColor,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <Icon
            className="w-4 h-4 mt-0.5 shrink-0"
            style={{ color: config.color }}
          />
          <p
            className="text-xs leading-relaxed line-clamp-2"
            style={{ color: "#475569" }}
          >
            {explanation.summary}
          </p>
        </div>
        <Link href={`/app/insights/metrics/${explanation.metricKey}`}>
          <span
            className="shrink-0 text-xs font-medium flex items-center gap-1 hover:underline cursor-pointer whitespace-nowrap"
            style={{ color: config.color }}
          >
            Investigate
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </Link>
      </div>
    </div>
  );
}

interface WhatChangedMicroCardSkeletonProps {
  className?: string;
}

export function WhatChangedMicroCardSkeleton({
  className,
}: WhatChangedMicroCardSkeletonProps) {
  return (
    <div
      className={cn(
        "mt-3 p-3 rounded-xl border animate-pulse",
        className
      )}
      style={{
        background: "rgba(100, 116, 139, 0.05)",
        borderColor: "rgba(100, 116, 139, 0.1)",
      }}
    >
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        <div className="h-3 bg-slate-200 rounded flex-1 max-w-[200px]" />
      </div>
    </div>
  );
}
