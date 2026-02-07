/**
 * RecommendationsSection - Actionable recommendations for the breakdown page
 */

import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Sparkles, ChevronRight, ExternalLink } from "lucide-react";
import type { Recommendation } from "../../../../../shared/types/metricExplanation";

interface RecommendationsSectionProps {
  recommendations: Recommendation[];
}

export function RecommendationsSection({ recommendations }: RecommendationsSectionProps) {
  if (recommendations.length === 0) {
    return (
      <GlassCard variant="marketing">
        <GlassCardHeader className="pb-3">
          <GlassCardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5" style={{ color: "#7c3aed" }} />
            Recommendations
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <p className="text-sm" style={{ color: "#64748B" }}>
            No specific recommendations at this time. Continue monitoring your metrics.
          </p>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="marketing">
      <GlassCardHeader className="pb-3">
        <GlassCardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-5 h-5" style={{ color: "#7c3aed" }} />
          Recommendations
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <div
              key={`rec-${index}`}
              className="p-4 rounded-xl border"
              style={{
                background: "rgba(124, 58, 237, 0.03)",
                borderColor: "rgba(124, 58, 237, 0.15)",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "rgba(124, 58, 237, 0.1)" }}
                >
                  <span className="text-sm font-bold" style={{ color: "#7c3aed" }}>
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium mb-1" style={{ color: "#0F172A" }}>
                    {rec.title}
                  </h4>
                  <p className="text-sm mb-3" style={{ color: "#64748B" }}>
                    {rec.why}
                  </p>

                  {rec.targetUrls && rec.targetUrls.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>
                        Target pages:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {rec.targetUrls.slice(0, 3).map((url, urlIndex) => (
                          <span
                            key={urlIndex}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                            style={{
                              background: "rgba(0, 0, 0, 0.03)",
                              color: "#475569",
                            }}
                          >
                            {url.length > 40 ? url.slice(0, 37) + "..." : url}
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        ))}
                        {rec.targetUrls.length > 3 && (
                          <span
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs"
                            style={{
                              background: "rgba(0, 0, 0, 0.03)",
                              color: "#94a3b8",
                            }}
                          >
                            +{rec.targetUrls.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {rec.suggestedActions && rec.suggestedActions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>
                        Suggested actions:
                      </p>
                      <ul className="space-y-1">
                        {rec.suggestedActions.map((action, actionIndex) => (
                          <li
                            key={actionIndex}
                            className="flex items-start gap-2 text-sm"
                            style={{ color: "#475569" }}
                          >
                            <ChevronRight
                              className="w-4 h-4 shrink-0 mt-0.5"
                              style={{ color: "#7c3aed" }}
                            />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}
