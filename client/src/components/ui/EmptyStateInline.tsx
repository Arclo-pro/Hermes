import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface EmptyStateInlineProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  ctaText?: string;
  onCtaClick?: () => void;
  className?: string;
}

export function EmptyStateInline({
  icon,
  title,
  description,
  ctaText,
  onCtaClick,
  className,
}: EmptyStateInlineProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-200 p-6 shadow-sm",
        className
      )}
      data-testid="empty-state-inline"
    >
      <div className="flex flex-col items-center text-center">
        {icon && (
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <span className="text-gray-500">{icon}</span>
          </div>
        )}
        <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-4 max-w-sm">{description}</p>
        {ctaText && onCtaClick && (
          <Button
            onClick={onCtaClick}
            variant="outline"
            size="sm"
            className="text-violet-600 border-violet-200 hover:bg-violet-50"
            data-testid="empty-state-cta"
          >
            {ctaText}
          </Button>
        )}
      </div>
    </div>
  );
}
