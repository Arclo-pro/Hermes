import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import { GlassChartContainer } from "./GlassChartContainer";

type SemanticColor = "primary" | "success" | "warning" | "danger" | "info" | "purple";

interface DataPoint {
  name: string;
  value: number;
  color?: SemanticColor;
}

interface GlassBarChartProps {
  data: DataPoint[];
  title?: string;
  subtitle?: string;
  height?: number;
  showGrid?: boolean;
  showTrendLine?: boolean;
  trendLineValue?: number;
  valueFormatter?: (value: number) => string;
  className?: string;
  barColor?: SemanticColor;
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
  payload?: Array<{ value: number; color?: string }>;
  label?: string;
  formatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-background/95 backdrop-blur-sm px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold text-foreground tabular-nums">
        {formatter ? formatter(payload[0].value) : payload[0].value.toLocaleString()}
      </p>
    </div>
  );
}

export function GlassBarChart({
  data,
  title,
  subtitle,
  height = 200,
  showGrid = true,
  showTrendLine = false,
  trendLineValue,
  valueFormatter,
  className,
  barColor = "primary",
}: GlassBarChartProps) {
  return (
    <GlassChartContainer title={title} subtitle={subtitle} className={className}>
      <div style={{ height }} data-testid="glass-bar-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.08)"
                vertical={false}
              />
            )}
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "rgba(203,213,225,0.6)", fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "rgba(203,213,225,0.6)", fontSize: 11 }}
            />
            <Tooltip
              content={<GlassTooltip formatter={valueFormatter} />}
              cursor={{ fill: "rgba(148,163,184,0.08)" }}
            />
            {showTrendLine && trendLineValue !== undefined && (
              <ReferenceLine
                y={trendLineValue}
                stroke="rgba(203,213,225,0.4)"
                strokeDasharray="4 4"
              />
            )}
            <Bar
              dataKey="value"
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colorMap[entry.color || barColor]}
                  className="transition-opacity hover:opacity-80"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassChartContainer>
  );
}
