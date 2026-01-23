import React from "react";
import { Button } from "@/components/ui/button";

type BannerProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "warning" | "info";
};

export function Banner({ title, description, actionLabel, onAction, tone = "info" }: BannerProps) {
  const shell =
    tone === "warning"
      ? "border-warning bg-warning-soft"
      : "border-primary/25 bg-brand-soft";

  return (
    <div className={`flex items-center justify-between gap-4 rounded-2xl border px-6 py-5 shadow-sm ${shell}`}>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {description ? <div className="mt-1 text-sm text-muted-foreground">{description}</div> : null}
      </div>
      {actionLabel && onAction ? (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
