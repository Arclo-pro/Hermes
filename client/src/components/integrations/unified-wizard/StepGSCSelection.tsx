/**
 * Step 4: GSC Selection - Site picker with domain matching
 */
import { useEffect } from "react";
import {
  Search,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Globe,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GSCProperty } from "../useGoogleConnection";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPropertyType(siteUrl: string): "domain" | "url-prefix" {
  return siteUrl.startsWith("sc-domain:") ? "domain" : "url-prefix";
}

function getPropertyDisplay(siteUrl: string): string {
  return siteUrl.replace("sc-domain:", "").replace(/\/$/, "");
}

function domainMatch(siteUrl: string, siteDomain?: string): boolean {
  if (!siteDomain) return false;
  const propDomain = getPropertyDisplay(siteUrl).replace(/^https?:\/\//, "").replace(/\/$/, "");
  const cleaned = siteDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return propDomain.includes(cleaned) || cleaned.includes(propDomain);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface StepGSCSelectionProps {
  properties: GSCProperty[];
  isLoading: boolean;
  selectedSiteUrl: string | null;
  siteDomain?: string;
  onSelect: (siteUrl: string) => void;
  onSkip: () => void;
  onNext: () => void;
  onBack: () => void;
  allowSkip?: boolean;
}

export function StepGSCSelection({
  properties,
  isLoading,
  selectedSiteUrl,
  siteDomain,
  onSelect,
  onSkip,
  onNext,
  onBack,
  allowSkip = true,
}: StepGSCSelectionProps) {
  // Auto-select if only one property
  useEffect(() => {
    if (properties.length === 1 && !selectedSiteUrl) {
      onSelect(properties[0].siteUrl);
    }
  }, [properties, selectedSiteUrl, onSelect]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-5 text-center py-6">
        <Loader2 className="w-8 h-8 text-[#ec4899] animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Discovering Search Console properties...</p>
      </div>
    );
  }

  // No properties found
  if (properties.length === 0) {
    return (
      <div className="space-y-5">
        <div className="text-center py-4">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No Search Console Properties Found</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            You may need to verify your site with Google first.
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">How to add your site:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to search.google.com/search-console</li>
            <li>Click "Add Property"</li>
            <li>Complete verification</li>
          </ol>
          <a
            href="https://support.google.com/webmasters/answer/9008080"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
          >
            Google's verification guide
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </Button>
          {allowSkip && (
            <Button variant="outline" fullWidth onClick={onSkip}>
              Skip Search Console
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Sort: matching domains first, then domain properties, then rest
  const sorted = [...properties].sort((a, b) => {
    const aMatch = domainMatch(a.siteUrl, siteDomain) ? -2 : 0;
    const bMatch = domainMatch(b.siteUrl, siteDomain) ? -2 : 0;
    const aDomain = getPropertyType(a.siteUrl) === "domain" ? -1 : 0;
    const bDomain = getPropertyType(b.siteUrl) === "domain" ? -1 : 0;
    return (aMatch + aDomain) - (bMatch + bDomain);
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-[#ec4899]/10 flex items-center justify-center mx-auto mb-3">
          <Search className="w-6 h-6 text-[#ec4899]" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Select Search Console Property</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the property that matches {siteDomain || "your website"}.
        </p>
      </div>

      {/* Property list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sorted.map((prop) => {
          const isSelected = selectedSiteUrl === prop.siteUrl;
          const type = getPropertyType(prop.siteUrl);
          const isMatch = domainMatch(prop.siteUrl, siteDomain);

          return (
            <button
              key={prop.siteUrl}
              onClick={() => onSelect(prop.siteUrl)}
              className={`w-full text-left p-3 rounded-xl border transition-colors ${
                isSelected
                  ? "border-[#ec4899] bg-[#ec4899]/5"
                  : "border-border hover:border-[#ec4899]/30 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <p className="text-sm font-medium text-foreground truncate">
                      {getPropertyDisplay(prop.siteUrl)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant={type === "domain" ? "default" : "secondary"}
                      className="text-[10px] py-0"
                    >
                      {type === "domain" ? "Domain" : "URL Prefix"}
                    </Badge>
                    {isMatch && (
                      <span className="text-[10px] text-semantic-success font-medium">
                        Matches your site
                      </span>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-[#ec4899] shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
        <Button variant="primary" fullWidth onClick={onNext} disabled={!selectedSiteUrl}>
          Continue
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>

      {allowSkip && (
        <button
          onClick={onSkip}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip Search Console, continue with just Analytics
        </button>
      )}
    </div>
  );
}
