/**
 * Step 5: Verify & Confirm - Save selections and show sample data
 */
import {
  BarChart3,
  Search,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Users,
  Globe,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { VerifyResult } from "../useGoogleConnection";

interface StepVerifyConfirmProps {
  // What's being connected
  ga4PropertyId: string | null;
  ga4StreamId: string | null;
  ga4Skipped: boolean;
  gscSiteUrl: string | null;
  gscSkipped: boolean;
  // Verification state
  isSaving: boolean;
  isVerifying: boolean;
  verifyResult: VerifyResult | null;
  verifyError: string | null;
  // Actions
  onRetry: () => void;
  onBack: () => void;
  onFinish: () => void;
}

export function StepVerifyConfirm({
  ga4PropertyId,
  ga4StreamId,
  ga4Skipped,
  gscSiteUrl,
  gscSkipped,
  isSaving,
  isVerifying,
  verifyResult,
  verifyError,
  onRetry,
  onBack,
  onFinish,
}: StepVerifyConfirmProps) {
  const hasGA4 = ga4PropertyId && ga4StreamId && !ga4Skipped;
  const hasGSC = gscSiteUrl && !gscSkipped;
  const bothSkipped = ga4Skipped && gscSkipped;

  // Loading state while saving or verifying
  if (isSaving || isVerifying) {
    return (
      <div className="space-y-5 text-center py-6">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {isSaving ? "Saving Configuration..." : "Verifying Connection..."}
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            {isVerifying ? "Fetching sample data from the last 28 days..." : "Please wait..."}
          </p>
        </div>
      </div>
    );
  }

  // Both skipped - warn user
  if (bothSkipped) {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No Data Sources Connected</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            You skipped both Google Analytics and Search Console. Without these connections,
            we won't be able to show traffic or search performance data.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Go Back
          </Button>
          <Button variant="primary" fullWidth onClick={onFinish}>
            Continue Anyway
          </Button>
        </div>
      </div>
    );
  }

  // Error state
  if (verifyError || (verifyResult && !verifyResult.ok)) {
    const errorMessage = verifyError || verifyResult?.error || "Could not verify connection.";
    return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-semantic-danger/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-semantic-danger" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Verification Failed</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">{errorMessage}</p>
        </div>

        {verifyResult?.troubleshooting && verifyResult.troubleshooting.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
            <p className="font-medium text-foreground">Troubleshooting:</p>
            <ul className="space-y-1 text-muted-foreground">
              {verifyResult.troubleshooting.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </Button>
          <Button variant="primary" fullWidth onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Success state
  const { sampleMetrics } = verifyResult || {};

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-semantic-success/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-semantic-success" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Connected!</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Your Google integrations are ready.
        </p>
      </div>

      {/* Connection status cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* GA4 status */}
        <Card className={`border ${hasGA4 ? "border-semantic-success/30 bg-semantic-success/5" : "border-border bg-muted/30"}`}>
          <CardContent className="py-3 px-3">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className={`w-4 h-4 ${hasGA4 ? "text-semantic-success" : "text-muted-foreground"}`} />
              <span className="text-xs font-semibold text-foreground">Analytics</span>
              {hasGA4 && <CheckCircle2 className="w-3.5 h-3.5 text-semantic-success ml-auto" />}
            </div>
            {hasGA4 ? (
              <p className="text-xs text-muted-foreground">
                Property {ga4PropertyId}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Skipped</p>
            )}
          </CardContent>
        </Card>

        {/* GSC status */}
        <Card className={`border ${hasGSC ? "border-semantic-success/30 bg-semantic-success/5" : "border-border bg-muted/30"}`}>
          <CardContent className="py-3 px-3">
            <div className="flex items-center gap-2 mb-2">
              <Search className={`w-4 h-4 ${hasGSC ? "text-semantic-success" : "text-muted-foreground"}`} />
              <span className="text-xs font-semibold text-foreground">Search Console</span>
              {hasGSC && <CheckCircle2 className="w-3.5 h-3.5 text-semantic-success ml-auto" />}
            </div>
            {hasGSC ? (
              <p className="text-xs text-muted-foreground truncate">
                {gscSiteUrl?.replace("sc-domain:", "").replace(/\/$/, "")}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Skipped</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sample metrics from GA4 */}
      {hasGA4 && sampleMetrics && (
        <Card className="bg-muted/30 border-border">
          <CardContent className="py-4 space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Sessions</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {sampleMetrics.sessions.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Users</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {sampleMetrics.users.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Top landing pages */}
            {sampleMetrics.landingPages.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Top Landing Pages</p>
                <div className="space-y-1.5">
                  {sampleMetrics.landingPages.slice(0, 3).map((page, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-foreground truncate flex-1 mr-2 flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                        {page.page}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {page.sessions.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground text-center">
              Last 28 days ({sampleMetrics.dateRange.start} to {sampleMetrics.dateRange.end})
            </p>
          </CardContent>
        </Card>
      )}

      {/* What's unlocked */}
      <Card className="bg-muted/30 border-border">
        <CardContent className="py-4">
          <p className="text-sm font-medium text-foreground mb-3">What's now unlocked:</p>
          <ul className="space-y-2">
            {hasGA4 && (
              <>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-semantic-success shrink-0" />
                  Traffic & conversion insights
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-semantic-success shrink-0" />
                  Better prioritization of fixes
                </li>
              </>
            )}
            {hasGSC && (
              <>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-semantic-success shrink-0" />
                  Real search query data
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-semantic-success shrink-0" />
                  Indexing & crawl status
                </li>
              </>
            )}
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-semantic-success shrink-0" />
              Weekly trend monitoring
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Finish button */}
      <Button variant="primary" fullWidth onClick={onFinish}>
        Finish
      </Button>
    </div>
  );
}
