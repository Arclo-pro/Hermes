/**
 * DriversSection - "Likely causes" section for the breakdown page
 */

import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Lightbulb, Globe, Smartphone, Monitor, FileText, Clock } from "lucide-react";
import type { TopDriver, DriverType } from "../../../../../shared/types/metricExplanation";

const DRIVER_ICONS: Record<DriverType, typeof Globe> = {
  channel: Globe,
  device: Smartphone,
  geo: Globe,
  landing_page: FileText,
  time_pattern: Clock,
};

const DRIVER_LABELS: Record<DriverType, string> = {
  channel: "Traffic Channel",
  device: "Device Type",
  geo: "Geography",
  landing_page: "Landing Page",
  time_pattern: "Time Pattern",
};

interface DriversSectionProps {
  drivers: TopDriver[];
}

export function DriversSection({ drivers }: DriversSectionProps) {
  if (drivers.length === 0) {
    return (
      <GlassCard variant="marketing">
        <GlassCardHeader className="pb-3">
          <GlassCardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="w-5 h-5" style={{ color: "#7c3aed" }} />
            Likely causes
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <p className="text-sm" style={{ color: "#64748B" }}>
            No significant drivers identified. The change may be due to natural variation.
          </p>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="marketing">
      <GlassCardHeader className="pb-3">
        <GlassCardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="w-5 h-5" style={{ color: "#7c3aed" }} />
          Likely causes
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="space-y-3">
          {drivers.map((driver, index) => {
            const Icon = DRIVER_ICONS[driver.type] || Globe;
            const isPositive = driver.contribution > 0;

            return (
              <div
                key={`${driver.type}-${driver.label}-${index}`}
                className="flex items-center gap-3 p-3 rounded-xl border"
                style={{
                  background: isPositive ? "rgba(34, 197, 94, 0.05)" : "rgba(239, 68, 68, 0.05)",
                  borderColor: isPositive ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: isPositive ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{ color: isPositive ? "#22c55e" : "#ef4444" }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium" style={{ color: "#94a3b8" }}>
                      {DRIVER_LABELS[driver.type]}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate" style={{ color: "#0F172A" }}>
                    {driver.label}
                  </p>
                  {driver.details && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: "#64748B" }}>
                      {driver.details}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p
                    className="text-lg font-bold"
                    style={{ color: isPositive ? "#22c55e" : "#ef4444" }}
                  >
                    {isPositive ? "+" : ""}{driver.contribution.toFixed(1)}%
                  </p>
                  <p className="text-xs" style={{ color: "#94a3b8" }}>
                    contribution
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}
