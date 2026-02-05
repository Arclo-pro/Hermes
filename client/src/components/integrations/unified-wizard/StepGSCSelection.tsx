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

    return (
      <div className="space-y-5">
        <div className="text-center py-4">
          <AlertCircle className={`w-10 h-10 mx-auto mb-3 ${isApiError ? "text-amber-500" : "text-muted-foreground"}`} />
          <h3 className="text-lg font-semibold text-foreground">
            {isApiError ? "API Configuration Required" : "No Search Console Properties Found"}
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            {isApiError
              ? "We connected to Google but couldn't list your Search Console properties."
              : "We couldn't find any Search Console properties for your Google account."}
          </p>
        </div>

        {isApiError ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm space-y-3">
            <p className="font-medium text-amber-900">
              {isApiDisabled ? "Enable the Google Search Console API" : "Error Details"}
            </p>
            {isApiDisabled ? (
              <div className="space-y-2">
                <p className="text-amber-800 text-xs">
                  The Google Search Console API needs to be enabled in your Google Cloud project.
                </p>
                <a
                  href={activationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  Enable Search Console API
                </a>
              </div>
            ) : (
              <p className="text-amber-800 text-xs">{apiError}</p>
            )}
            <p className="text-amber-700 text-xs mt-2">
              After enabling the API, wait a minute then click "Retry" below.
            </p>
          </div>
        ) : (
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
          <SelectTrigger className="w-full h-11 rounded-xl">
            <SelectValue placeholder="Select a property..." />
          </SelectTrigger>
          <SelectContent>
            {sorted.map((prop) => {
              const type = getPropertyType(prop.siteUrl);
              const isMatch = domainMatch(prop.siteUrl, siteDomain);
              return (
                <SelectItem key={prop.siteUrl} value={prop.siteUrl}>
                  {getPropertyDisplay(prop.siteUrl)}
                  {" "}
                  <span className="text-muted-foreground">
                    ({type === "domain" ? "Domain" : "URL Prefix"})
                  </span>
                  {isMatch && (
                    <span className="text-semantic-success ml-1">
                      — Matches your site
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
