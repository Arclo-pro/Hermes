import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { GlassChartContainer } from "./GlassChartContainer";

type SemanticColor = "primary" | "success" | "warning" | "danger" | "info" | "purple";

interface DonutSegment {
  name: string;
  value: number;
  color?: SemanticColor;
}

interface GlassDonutChartProps {
  data: DonutSegment[];
  title?: string;
  subtitle?: string;
  centerValue?: string | number;
  centerLabel?: string;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  showLegend?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
}

const colorPalette: SemanticColor[] = ["success", "warning", "danger", "primary", "info", "purple"];

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
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color?: SemanticColor } }>;
  formatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;

  const entry = payload[0];
  return (
    <div className="rounded-lg border border-border/50 bg-background/95 backdrop-blur-sm px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{entry.name}</span>
        <span className="text-xs font-semibold text-foreground tabular-nums">
          {formatter ? formatter(entry.value) : entry.value.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export function GlassDonutChart({
  data,
  title,
  subtitle,
  centerValue,
  centerLabel,
  height = 200,
  innerRadius = 50,
  outerRadius = 70,
  showLegend = true,
  valueFormatter,
  className,
}: GlassDonutChartProps) {
  const dataWithColors = data.map((segment, index) => ({
    ...segment,
    color: segment.color || colorPalette[index % colorPalette.length],
  }));

  return (
    <GlassChartContainer title={title} subtitle={subtitle} className={className}>
      <div className="flex items-center gap-4" data-testid="glass-donut-chart">
        <div style={{ height, width: height }} className="relative flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithColors}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {dataWithColors.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colorMap[entry.color]}
                    className="transition-opacity hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip content={<GlassTooltip formatter={valueFormatter} />} />
            </PieChart>
          </ResponsiveContainer>
          {(centerValue !== undefined || centerLabel) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {centerValue !== undefined && (
                <span className="text-2xl font-bold text-foreground leading-none">
                  {centerValue}
                </span>
              )}
              {centerLabel && (
                <span className="text-xs text-muted-foreground mt-1">{centerLabel}</span>
              )}
            </div>
          )}
        </div>

        {showLegend && (
          <div className="flex-1 space-y-2">
            {dataWithColors.map((segment, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: colorMap[segment.color] }}
                />
                <span className="text-sm text-foreground">{segment.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassChartContainer>
  );
}
