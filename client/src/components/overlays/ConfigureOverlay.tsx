import * as React from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfigureOverlayProps {
  integration: string;
  onConfigure: () => void;
  className?: string;
}

const INTEGRATION_DESCRIPTIONS: Record<string, string> = {
  "GA4": "Connect Google Analytics 4 to view traffic, sessions, and conversion data.",
  "Search Console": "Connect Google Search Console to view keyword rankings and search performance.",
  "Google Analytics": "Connect Google Analytics to view traffic and user behavior data.",
  "GSC": "Connect Google Search Console to view keyword rankings and click data.",
};

export function ConfigureOverlay({
  integration,
  onConfigure,
  className,
}: ConfigureOverlayProps) {
  const description = INTEGRATION_DESCRIPTIONS[integration] || 
    `Connect ${integration} to view this data.`;

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center",
        "bg-slate-900/90 backdrop-blur-sm rounded-xl",
        className
      )}
      data-testid={`configure-overlay-${integration.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="text-center px-6 py-4 max-w-xs">
        <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
          <Settings className="w-6 h-6 text-slate-300" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Configure {integration}
        </h3>
        <p className="text-sm text-slate-300 mb-4">
          {description}
        </p>
        <Button
          onClick={onConfigure}
          variant="outline"
          size="sm"
          className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
          data-testid={`configure-button-${integration.toLowerCase().replace(/\s+/g, '-')}`}
        >
          Configure
        </Button>
      </div>
    </div>
  );
}
