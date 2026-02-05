/**
 * Step 4: GSC Selection - Site picker as dropdown with domain matching
 */
import { useEffect } from "react";
import {
  Search,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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
  apiError?: string | null;
  onSelect: (siteUrl: string) => void;
  onSkip: () => void;
  onNext: () => void;
  onBack: () => void;
  onRetry?: () => void;
  allowSkip?: boolean;
}

export function StepGSCSelection({
  properties,
  isLoading,
  selectedSiteUrl,
  siteDomain,
  apiError,
  onSelect,
  onSkip,
  onNext,
  onBack,
  onRetry,
  allowSkip = true,
}: StepGSCSelectionProps) {
  // Auto-select best match
  useEffect(() => {
    if (properties.length > 0 && !selectedSiteUrl) {
      const match = properties.find((p) => domainMatch(p.siteUrl, siteDomain));
      if (match) {
        onSelect(match.siteUrl);
      } else if (properties.length === 1) {
        onSelect(properties[0].siteUrl);
      }
    }
  }, [properties, selectedSiteUrl, siteDomain, onSelect]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-5 text-center py-6">
        <Loader2 className="w-8 h-8 text-[#ec4899] animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Discovering Search Console properties...</p>
      </div>
    );
  }

  // No properties found (or API error)
  if (properties.length === 0) {
    const isApiError = !!apiError;
    const isApiDisabled = apiError?.includes("not enabled") || apiError?.includes("API");
    const urlMatch = apiError?.match(/https:\/\/\S+/);
    const activationUrl = urlMatch?.[0] || "https://console.cloud.google.com/apis/library/searchconsole.googleapis.com";

    // API needs to be enabled — show as a setup step
    if (isApiDisabled) {
      return (
        <div className="space-y-5">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-[#ec4899]/10 flex items-center justify-center mx-auto mb-3">
              <Settings className="w-6 h-6 text-[#ec4899]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Enable Search Console API</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              One quick step — enable this API so Arclo can read your Search Console data.
            </p>
          </div>

          <a
            href={activationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full rounded-xl border border-input bg-background px-4 py-3 text-sm hover:bg-accent transition-colors"
          >
            <span className="font-medium">Search Console API</span>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>

          <p className="text-xs text-muted-foreground text-center">
            Click the link above, then click "Enable" on the Google page. Once done, come back and continue.
          </p>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack} className="shrink-0">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
            {onRetry && (
              <Button variant="primary" fullWidth onClick={onRetry}>
                Continue
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            )}
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

    // Other API error or no properties found
    return (
      <div className="space-y-5">
        <div className="text-center py-4">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">
            {isApiError ? "Something went wrong" : "No Search Console Properties Found"}
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            {isApiError
              ? apiError
              : "We couldn't find any Search Console properties for your Google account."}
          </p>
        </div>

        {!isApiError && (
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">This can happen if:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Your site hasn't been verified in Search Console yet</li>
              <li>You signed in with the wrong Google account</li>
              <li>You need to be added as a user on someone else's property</li>
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </Button>
          {isApiError && onRetry && (
            <Button variant="primary" fullWidth onClick={onRetry}>
              Retry
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}
          {allowSkip && !isApiError && (
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

      {/* Property dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Search Console Property</label>
        <Select value={selectedSiteUrl || undefined} onValueChange={onSelect}>
          <SelectTrigger className="w-full h-11 rounded-xl overflow-hidden">
            <SelectValue placeholder="Select a property..." />
          </SelectTrigger>
          <SelectContent>
            {sorted.map((prop) => {
              const type = getPropertyType(prop.siteUrl);
              const isMatch = domainMatch(prop.siteUrl, siteDomain);
              return (
                <SelectItem key={prop.siteUrl} value={prop.siteUrl}>
                  <span className="truncate max-w-[280px] inline-block align-bottom">
                    {getPropertyDisplay(prop.siteUrl)}
                  </span>
                  {" "}
                  <span className="text-muted-foreground text-xs">
                    {type === "domain" ? "Domain" : "URL"}
                  </span>
                  {isMatch && (
                    <span className="text-semantic-success text-xs ml-1">
                      Match
                    </span>
                  )}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
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
