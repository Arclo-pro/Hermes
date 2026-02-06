import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ReactNode } from "react";
import { useOptionalCrewTheme } from "@/components/crew/CrewPageLayout";
import { GlassSparkline } from "@/components/analytics";

interface KeyMetricCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  iconNode?: ReactNode;
  status?: "primary" | "good" | "warning" | "neutral" | "inactive" | string;
  accentColor?: string;
  className?: string;
  delta?: number | null;
  deltaLabel?: string;
  trendIsGood?: "up" | "down";
  sparklineData?: number[];
}

const statusStyles = {
  primary: {
    border: "border-purple-300",
    glow: "shadow-[0_0_20px_-5px_rgba(147,51,234,0.3)]",
    accent: "bg-purple-600",
    text: "text-purple-600",
    iconBg: "bg-purple-50",
  },
  good: {
    border: "border-green-300",
    glow: "shadow-[0_0_20px_-5px_rgba(34,197,94,0.3)]",
    accent: "bg-green-600",
    text: "text-green-600",
    iconBg: "bg-green-50",
  },
  warning: {
    border: "border-amber-300",
    glow: "shadow-[0_0_20px_-5px_rgba(234,179,8,0.3)]",
    accent: "bg-amber-500",
    text: "text-amber-600",
    iconBg: "bg-amber-50",
  },
  neutral: {
    border: "border-gray-200",
    glow: "",
    accent: "bg-gray-400",
    text: "text-gray-500",
    iconBg: "bg-gray-100",
  },
  inactive: {
    border: "border-gray-100",
    glow: "",
    accent: "bg-gray-300",
    text: "text-gray-400",
    iconBg: "bg-gray-50",
  },
};

export function KeyMetricCard({ 
  label, 
  value, 
  icon: Icon,
  iconNode,
  status = "primary",
  accentColor,
  className,
  delta,
  deltaLabel,
  trendIsGood = "up",
  sparklineData,
}: KeyMetricCardProps) {
  const crewTheme = useOptionalCrewTheme();
  const isZero = value === 0 || value === "0";
  const effectiveStatus = isZero ? "inactive" : status;
  const effectiveStyles = statusStyles[effectiveStatus as keyof typeof statusStyles] || statusStyles.neutral;

  const dynamicStyles = (crewTheme || accentColor) && !isZero ? {
    border: { borderColor: crewTheme ? "var(--crew-ring)" : `${accentColor}30` },
    glow: { boxShadow: crewTheme ? "0 0 20px -5px var(--crew-ring)" : `0 0 20px -5px ${accentColor}30` },
    accent: { backgroundColor: crewTheme ? "var(--crew-primary)" : accentColor },
    iconBg: { backgroundColor: crewTheme ? "var(--crew-bg)" : `${accentColor}15` },
    iconColor: { color: crewTheme ? "var(--crew-text)" : accentColor },
  } : null;

  const hasDelta = delta !== undefined && delta !== null;
  const isPositiveDelta = hasDelta && delta > 0;
  const isNegativeDelta = hasDelta && delta < 0;
  const isGoodTrend = (trendIsGood === "up" && isPositiveDelta) || (trendIsGood === "down" && isNegativeDelta);
  const isBadTrend = (trendIsGood === "up" && isNegativeDelta) || (trendIsGood === "down" && isPositiveDelta);

  const TrendIcon = isPositiveDelta ? TrendingUp : isNegativeDelta ? TrendingDown : Minus;
  const trendColor = isGoodTrend ? "text-green-600" : isBadTrend ? "text-red-600" : "text-gray-500";
  const sparklineColor = isGoodTrend ? "success" : isBadTrend ? "danger" : "primary";

  return (
    <div
      className={cn(
        "relative rounded-2xl bg-white p-5",
        "border",
        !dynamicStyles && effectiveStyles.border,
        !dynamicStyles && effectiveStyles.glow,
        "transition-all duration-300 hover:scale-[1.02]",
        className
      )}
      style={dynamicStyles ? { ...dynamicStyles.border, ...dynamicStyles.glow } : undefined}
      data-testid={`metric-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div
        className={cn(
          "absolute top-0 left-4 right-4 h-0.5 rounded-full",
          !dynamicStyles && effectiveStyles.accent
        )}
        style={dynamicStyles?.accent}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-3xl font-bold tracking-tight",
            isZero ? "text-gray-400" : "text-gray-900"
          )}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          <p className="text-sm text-gray-600 mt-1 truncate">
            {label}
          </p>
          {hasDelta && (
            <div className={cn("flex items-center gap-1 mt-2", trendColor)}>
              <TrendIcon className="w-3 h-3" />
              <span className="text-xs font-medium tabular-nums">
                {isPositiveDelta ? "+" : ""}{delta.toFixed(1)}%
              </span>
              {deltaLabel && (
                <span className="text-xs text-gray-500 ml-1">{deltaLabel}</span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {sparklineData && sparklineData.length > 1 && (
            <div className="w-16 h-8">
              <GlassSparkline
                data={sparklineData}
                color={sparklineColor}
                showFill
                height={32}
              />
            </div>
          )}
          
          {(Icon || iconNode) && !sparklineData && (
            <div 
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                !dynamicStyles && effectiveStyles.iconBg
              )}
              style={dynamicStyles?.iconBg}
            >
              {iconNode ? (
                iconNode
              ) : Icon ? (
                <Icon 
                  className={cn("w-5 h-5", !dynamicStyles && effectiveStyles.text)} 
                  style={dynamicStyles?.iconColor}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
