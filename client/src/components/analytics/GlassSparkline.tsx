import * as React from "react";
import { LineChart, Line, ResponsiveContainer, Area, AreaChart } from "recharts";
import { cn } from "@/lib/utils";

type SemanticColor = "primary" | "success" | "warning" | "danger" | "info" | "purple";

interface GlassSparklineProps {
  data: number[];
  color?: SemanticColor;
  showFill?: boolean;
  height?: number;
  width?: number | string;
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

export function GlassSparkline({
  data,
  color = "primary",
  showFill = false,
  height = 32,
  width = "100%",
  className,
}: GlassSparklineProps) {
  const chartData = data.map((value, index) => ({ value, index }));

  if (showFill) {
    return (
      <div
        style={{ height, width }}
        className={cn("overflow-hidden", className)}
        data-testid="glass-sparkline"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <Area
              type="monotone"
              dataKey="value"
              stroke={colorMap[color]}
              strokeWidth={1.5}
              fill={colorMap[color]}
              fillOpacity={0.15}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div
      style={{ height, width }}
      className={cn("overflow-hidden", className)}
      data-testid="glass-sparkline"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={colorMap[color]}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
