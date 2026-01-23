import * as React from "react";
import { Lock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface DataCardProps {
  title: string;
  value: string | number;
  status: "active" | "setup_required" | "locked";
  statusLabel?: string;
  ctaText?: string;
  onClick?: () => void;
  description?: string;
  icon?: React.ReactNode;
  delta?: string;
  deltaType?: "positive" | "negative" | "neutral";
  tint?: "amber" | "purple" | "blue" | "green" | "red";
}

export function DataCard({
  title,
  value,
  status,
  statusLabel,
  ctaText,
  onClick,
  description,
  icon,
  delta,
  deltaType,
  tint = "blue",
}: DataCardProps) {
  const isClickable = !!onClick;
  const showPlaceholder = status !== "active";

  const tintStyles = {
    amber: { accent: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    purple: { accent: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
    blue: { accent: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-200" },
    green: { accent: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    red: { accent: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  };

  const style = tintStyles[tint];

  const getStatusBadge = () => {
    if (status === "setup_required") {
      return (
        <Badge variant="warning" className="text-xs">
          {statusLabel || "Requires setup"}
        </Badge>
      );
    }
    if (status === "locked") {
      return (
        <Badge variant="neutral" className="text-xs flex items-center gap-1">
          <Lock className="w-3 h-3" />
          {statusLabel || "Locked"}
        </Badge>
      );
    }
    return null;
  };

  const content = (
    <div
      className={cn(
        "bg-card rounded-xl p-5 border shadow-sm relative overflow-hidden transition-all",
        isClickable && "cursor-pointer hover:shadow-md hover:border-border",
        status === "active" ? "border-border" : "border-border"
      )}
      onClick={onClick}
      data-testid={`datacard-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon && <span className={cn("w-5 h-5", style.accent)}>{icon}</span>}
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
        </div>
        {getStatusBadge()}
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <p className={cn(
          "text-4xl font-bold",
          showPlaceholder ? "text-muted-foreground/60" : "text-foreground"
        )}>
          {showPlaceholder ? "—" : value}
        </p>
        {!showPlaceholder && delta && (
          <span
            className={cn(
              "text-sm font-bold",
              deltaType === "positive" && "text-success",
              deltaType === "negative" && "text-danger",
              deltaType === "neutral" && "text-muted-foreground"
            )}
          >
            {delta}
          </span>
        )}
      </div>

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {showPlaceholder && ctaText && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "mt-3 gap-1 text-xs p-0 h-auto font-medium",
            status === "setup_required" ? "text-amber-600 hover:text-amber-700" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {ctaText}
          <ArrowRight className="w-3 h-3" />
        </Button>
      )}

      {status === "active" && isClickable && (
        <div className="absolute bottom-3 right-3">
          <ArrowRight className="w-4 h-4 text-muted-foreground/60" />
        </div>
      )}
    </div>
  );

  return content;
}
