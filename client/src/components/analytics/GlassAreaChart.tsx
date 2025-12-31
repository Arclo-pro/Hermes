import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { GlassChartContainer } from "./GlassChartContainer";

type SemanticColor = "primary" | "success" | "warning" | "danger" | "info" | "purple";

interface AreaConfig {
  dataKey: string;
  label: string;
  color?: SemanticColor;
}

interface GlassAreaChartProps {
  data: Array<Record<string, unknown>>;
  areas: AreaConfig[];
  xAxisKey: string;
  title?: string;
  subtitle?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
}

const colorMap: Record<SemanticColor, string> = {
  primary: "var(--color-chart-1)",
  success: "var(--color-semantic-success)",
  warning: "var(--color-semantic-warning)",
  danger: "var(--color-semantic-danger)",
  info: "var(--color-semantic-info)",
  purple: "var(--color-chart-4)",
};

function GlassTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  formatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-background/95 backdrop-blur-sm px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-foreground mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted-foreground">{entry.name}</span>
            <span className="text-xs font-semibold text-foreground ml-auto tabular-nums">
              {formatter ? formatter(entry.value) : entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GlassLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload?.length) return null;

  return (
    <div className="flex items-center justify-center gap-4 pt-2">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function GlassAreaChart({
  data,
  areas,
  xAxisKey,
  title,
  subtitle,
  height = 200,
  showGrid = true,
  showLegend = true,
  stacked = false,
  valueFormatter,
  className,
}: GlassAreaChartProps) {
  return (
    <GlassChartContainer title={title} subtitle={subtitle} className={className}>
      <div style={{ height }} data-testid="glass-area-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.08)"
                vertical={false}
              />
            )}
            <XAxis
              dataKey={xAxisKey}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "rgba(203,213,225,0.6)", fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "rgba(203,213,225,0.6)", fontSize: 11 }}
            />
            <Tooltip content={<GlassTooltip formatter={valueFormatter} />} />
            {showLegend && <Legend content={<GlassLegend />} />}
            {areas.map((area) => (
              <Area
                key={area.dataKey}
                type="monotone"
                dataKey={area.dataKey}
                name={area.label}
                stroke={colorMap[area.color || "primary"]}
                strokeWidth={2}
                fill={colorMap[area.color || "primary"]}
                fillOpacity={0.15}
                stackId={stacked ? "stack" : undefined}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassChartContainer>
  );
}
