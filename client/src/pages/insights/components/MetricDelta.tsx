/**
 * MetricDelta - "What changed" section for the breakdown page
 */

import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MetricDelta as MetricDeltaType, ExplanationStatus, ConfidenceLevel } from "../../../../../shared/types/metricExplanation";

const STATUS_CONFIG: Record<ExplanationStatus, {
  icon: typeof TrendingUp;
  color: string;
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
}> = {
  improving: {
    icon: TrendingUp,
    color: "#22c55e",
    label: "Improving",
    variant: "default",
  },
  stable: {
    icon: Minus,
    color: "#64748b",
    label: "Stable",
    variant: "secondary",
  },
  needs_attention: {
    icon: TrendingDown,
    color: "#ef4444",
    label: "Needs Attention",
    variant: "destructive",
  },
  no_data: {
    icon: Minus,
    color: "#94a3b8",
    label: "No Data",
    variant: "outline",
  },
  error: {
    icon: Minus,
    color: "#f59e0b",
    label: "Error",
    variant: "outline",
  },
};

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { label: string; color: string }> = {
  high: { label: "High confidence", color: "#22c55e" },
  med: { label: "Medium confidence", color: "#f59e0b" },
  low: { label: "Low confidence", color: "#94a3b8" },
};

interface MetricDeltaProps {
  delta: MetricDeltaType;
  status: ExplanationStatus;
  confidence: ConfidenceLevel;
}

export function MetricDelta({ delta, status, confidence }: MetricDeltaProps) {
  const statusConfig = STATUS_CONFIG[status];
  const confidenceConfig = CONFIDENCE_CONFIG[confidence];
  const Icon = statusConfig.icon;

  return (
    <GlassCard variant="marketing">
      <GlassCardHeader className="pb-3">
        <GlassCardTitle className="flex items-center gap-2 text-base">
          <Activity className="w-5 h-5" style={{ color: "#7c3aed" }} />
          What changed
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: `${statusConfig.color}15` }}
            >
              <Icon className="w-8 h-8" style={{ color: statusConfig.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-3xl font-bold" style={{ color: "#0F172A" }}>
                  {delta.percent > 0 ? "+" : ""}
                  {delta.percent.toFixed(1)}%
                </span>
                <Badge variant={statusConfig.variant}>
                  {statusConfig.label}
                </Badge>
              </div>
              <p className="text-sm" style={{ color: "#64748B" }}>
                {delta.absolute > 0 ? "+" : ""}{delta.absolute.toLocaleString()} over the past {delta.timeWindow}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium" style={{ color: confidenceConfig.color }}>
              {confidenceConfig.label}
            </p>
            <div className="flex gap-1 mt-1 justify-end">
              {["low", "med", "high"].map((level) => (
                <div
                  key={level}
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: confidence === level ||
                      (confidence === "high" && level !== "high") ||
                      (confidence === "med" && level === "low")
                      ? confidenceConfig.color
                      : "#e2e8f0",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}
