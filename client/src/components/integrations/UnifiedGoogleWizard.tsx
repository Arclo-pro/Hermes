/**
 * Unified Google Connection Wizard
 *
 * Connects both GA4 and Search Console in a single OAuth flow.
 * Consumer-friendly: one-click to start, auto-select when possible,
 * partial success allowed (can connect just one service).
 *
 * Flow: OAuth → Account Selection → Property Selection → Stream Selection → GSC Selection → Verify
 */
import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useGoogleConnection, type VerifyResult } from "./useGoogleConnection";
import { StepExplain } from "./unified-wizard/StepExplain";
import { StepAccountSelection } from "./unified-wizard/StepAccountSelection";
import { StepGA4Selection } from "./unified-wizard/StepGA4Selection";
import { StepGSCSelection } from "./unified-wizard/StepGSCSelection";
import { StepVerifyConfirm } from "./unified-wizard/StepVerifyConfirm";
import type { WizardStep } from "./unified-wizard/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UnifiedGoogleWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  siteDomain?: string;
  /** If 'ga4-only' or 'gsc-only', restricts to single service mode */
  mode?: "full" | "ga4-only" | "gsc-only";
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({ step, mode }: { step: WizardStep; mode: "full" | "ga4-only" | "gsc-only" }) {
  const steps = mode === "full"
    ? ["Connect", "Account", "Property", "Search Console", "Confirm"]
    : mode === "ga4-only"
      ? ["Connect", "Account", "Property", "Confirm"]
      : ["Connect", "Search Console", "Confirm"];

  const getStepIndex = () => {
    if (step === "explain" || step === "connecting") return 0;
    if (step === "account-selection") return 1;
    if (step === "ga4-selection") return mode === "gsc-only" ? 1 : 2;
    if (step === "gsc-selection") return mode === "full" ? 3 : (mode === "gsc-only" ? 1 : 2);
    // saving or verify-confirm
    return steps.length - 1;
  };

  const stepIndex = getStepIndex();

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((label, i) => {
        const isActive = i === stepIndex;
        const isComplete = i < stepIndex;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <div
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  isActive
                    ? "bg-primary"
                    : isComplete
                      ? "bg-semantic-success"
                      : "bg-muted"
                }`}
              />
              <span className={`text-[10px] mt-1 ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && <div className="w-6 h-px bg-border mb-4" />}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function UnifiedGoogleWizard({
  open,
  onOpenChange,
  siteId,
  siteDomain,
  mode = "full",
}: UnifiedGoogleWizardProps) {
  // Step state
  const [step, setStep] = useState<WizardStep>("explain");
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [ga4AccountId, setGA4AccountId] = useState<string | null>(null);
  const [ga4PropertyId, setGA4PropertyId] = useState<string | null>(null);
  const [ga4StreamId, setGA4StreamId] = useState<string | null>(null);
  const [ga4Skipped, setGA4Skipped] = useState(false);
  const [gscSiteUrl, setGscSiteUrl] = useState<string | null>(null);
  const [gscSkipped, setGscSkipped] = useState(false);

  // Verify state
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  // Hook
  const google = useGoogleConnection(siteId);

  // Reset state when wizard opens
  useEffect(() => {
    if (open) {
      setError(null);
      setVerifyError(null);
      setVerifyResult(null);

      // Check if already connected
      if (google.status?.connected) {
        // Pre-populate existing selections
        if (google.status.ga4?.propertyId) {
          setGA4PropertyId(google.status.ga4.propertyId);
          if (google.status.ga4.streamId) {
            setGA4StreamId(google.status.ga4.streamId);
          }
        }
        if (google.status.gsc?.siteUrl) {
          setGscSiteUrl(google.status.gsc.siteUrl);
        }

        // Skip to appropriate step based on what's already configured
        const needsGA4 = mode !== "gsc-only" && !google.status.ga4?.propertyId;
        const needsGSC = mode !== "ga4-only" && !google.status.gsc?.siteUrl;

        if (needsGA4) {
          // Start with account selection
          setStep("account-selection");
          google.fetchAccounts();
          google.fetchProperties(); // Also fetch GSC properties
        } else if (needsGSC) {
          setStep("gsc-selection");
          google.fetchProperties();
        } else {
          // Already fully configured
          setStep("verify-confirm");
        }
      } else {
        // Fresh start
        setStep("explain");
        setGA4AccountId(null);
        setGA4PropertyId(null);
        setGA4StreamId(null);
        setGA4Skipped(mode === "gsc-only");
        setGscSiteUrl(null);
        setGscSkipped(mode === "ga4-only");
      }
    }
  }, [open, google.status?.connected, google.status?.ga4?.propertyId, google.status?.ga4?.streamId, google.status?.gsc?.siteUrl, mode]);

  // Handle OAuth start
  const handleConnect = useCallback(async () => {
    setError(null);
    setStep("connecting");
    try {
      const success = await google.startOAuth();
      if (success) {
        // OAuth succeeded, fetch accounts and GSC properties
        await Promise.all([
          google.fetchAccounts(),
          google.fetchProperties(), // This fetches GSC properties too
        ]);

        // Go to appropriate selection step
        if (mode === "gsc-only") {
          setGA4Skipped(true);
          setStep("gsc-selection");
        } else {
          // Go to account selection first
          setStep("account-selection");
        }
      } else {
        setError("Authorization was cancelled or timed out. Please try again.");
        setStep("explain");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect. Please try again.");
      setStep("explain");
    }
  }, [google, mode]);

  // Handle account selection
  const handleSelectAccount = useCallback(async (accountId: string) => {
    setGA4AccountId(accountId);
    // Fetch properties for this account
    await google.fetchPropertiesForAccount(accountId);
  }, [google]);

  // Continue from account selection to property selection
  const handleAccountContinue = useCallback(() => {
    setStep("ga4-selection");
  }, []);

  // Skip account/GA4
  const handleSkipAccount = useCallback(() => {
    setGA4Skipped(true);
    setGA4AccountId(null);
    setGA4PropertyId(null);
    setGA4StreamId(null);
    if (mode === "ga4-only") {
      setStep("verify-confirm");
    } else {
      setStep("gsc-selection");
    }
  }, [mode]);

  // Handle GA4 property selection
  const handleSelectGA4Property = useCallback(async (propertyId: string) => {
    setGA4PropertyId(propertyId);
    setGA4StreamId(null);
    await google.fetchStreams(propertyId);
  }, [google]);

  // Handle GA4 stream selection
  const handleSelectGA4Stream = useCallback((streamId: string) => {
    setGA4StreamId(streamId);
  }, []);

  // Save and verify - defined first so other callbacks can reference it
  const handleSaveAndVerify = useCallback(async () => {
    setVerifyError(null);
    setVerifyResult(null);

    try {
      // Build save payload
      const payload: {
        ga4PropertyId?: string;
        ga4StreamId?: string;
        gscSiteUrl?: string;
      } = {};

      if (ga4PropertyId && ga4StreamId && !ga4Skipped) {
        payload.ga4PropertyId = ga4PropertyId;
        payload.ga4StreamId = ga4StreamId;
      }
      if (gscSiteUrl && !gscSkipped) {
        payload.gscSiteUrl = gscSiteUrl;
      }

      // Save if we have something to save
      if (Object.keys(payload).length > 0) {
        await google.saveProperties(payload);
      }

      // Verify GA4 connection if we have it
      if (payload.ga4PropertyId) {
        setStep("verify-confirm");
        const result = await google.verifyConnection();
        setVerifyResult(result);
      } else {
        // No GA4 to verify, just show success
        setStep("verify-confirm");
        setVerifyResult({ ok: true });
      }
    } catch (err: any) {
      setVerifyError(err.message || "Failed to save configuration");
      setStep("verify-confirm");
    }
  }, [ga4PropertyId, ga4StreamId, ga4Skipped, gscSiteUrl, gscSkipped, google]);

  // Skip GA4 (from property selection)
  const handleSkipGA4 = useCallback(() => {
    setGA4Skipped(true);
    setGA4PropertyId(null);
    setGA4StreamId(null);
    if (mode === "ga4-only") {
      setStep("verify-confirm");
    } else {
      setStep("gsc-selection");
    }
  }, [mode]);

  // Continue from GA4 to GSC
  const handleGA4Continue = useCallback(() => {
    if (mode === "ga4-only") {
      setStep("saving");
      handleSaveAndVerify();
    } else {
      setStep("gsc-selection");
    }
  }, [mode, handleSaveAndVerify]);

  // Handle GSC selection
  const handleSelectGSC = useCallback((siteUrl: string) => {
    setGscSiteUrl(siteUrl);
  }, []);

  // Skip GSC
  const handleSkipGSC = useCallback(() => {
    setGscSkipped(true);
    setGscSiteUrl(null);
    setStep("saving");
    handleSaveAndVerify();
  }, [handleSaveAndVerify]);

  // Continue from GSC to verify
  const handleGSCContinue = useCallback(() => {
    setStep("saving");
    handleSaveAndVerify();
  }, [handleSaveAndVerify]);

  // Retry verification
  const handleRetryVerify = useCallback(async () => {
    setVerifyError(null);
    setVerifyResult(null);
    setStep("saving");
    await handleSaveAndVerify();
  }, [handleSaveAndVerify]);

  // Go back handlers
  const handleBackToExplain = useCallback(() => {
    setStep("explain");
    setError(null);
  }, []);

  const handleBackToAccount = useCallback(() => {
    setStep("account-selection");
  }, []);

  const handleBackToGA4 = useCallback(() => {
    setStep("ga4-selection");
  }, []);

  const handleBackToGSC = useCallback(() => {
    if (mode === "gsc-only" || ga4Skipped) {
      setStep("explain");
    } else {
      setStep("gsc-selection");
    }
  }, [mode, ga4Skipped]);

  // Finish
  const handleFinish = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Determine if saving/verifying
  const isSaving = step === "saving" && google.isSaving;
  const isVerifying = step === "saving" && google.isVerifying;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Connect Google</DialogTitle>
          <DialogDescription>Connect Google Analytics and Search Console</DialogDescription>
        </DialogHeader>

        {step !== "verify-confirm" && step !== "saving" && (
          <StepIndicator step={step} mode={mode} />
        )}

        {/* Step: Explain */}
        {(step === "explain" || step === "connecting") && (
          <StepExplain
            isConnecting={step === "connecting"}
            error={error}
            onConnect={handleConnect}
            onRetry={handleConnect}
          />
        )}

        {/* Step: Account Selection */}
        {step === "account-selection" && (
          <StepAccountSelection
            accounts={google.accounts ?? []}
            isLoading={google.isLoadingAccounts}
            selectedAccountId={ga4AccountId}
            googleEmail={google.status?.googleEmail}
            apiError={google.accountsError}
            onSelectAccount={handleSelectAccount}
            onSkip={handleSkipAccount}
            onNext={handleAccountContinue}
            onBack={handleBackToExplain}
            onRetry={() => google.fetchAccounts()}
            allowSkip={mode === "full"}
          />
        )}

        {/* Step: GA4 Property Selection */}
        {step === "ga4-selection" && (
          <StepGA4Selection
            properties={google.properties?.ga4 ?? []}
            streams={google.streams ?? []}
            isLoadingProperties={google.isLoadingProperties}
            isLoadingStreams={google.isLoadingStreams}
            selectedPropertyId={ga4PropertyId}
            selectedStreamId={ga4StreamId}
            siteDomain={siteDomain}
            onSelectProperty={handleSelectGA4Property}
            onSelectStream={handleSelectGA4Stream}
            onSkip={handleSkipGA4}
            onNext={handleGA4Continue}
            onBack={handleBackToAccount}
            allowSkip={mode === "full"}
          />
        )}

        {/* Step: GSC Selection */}
        {step === "gsc-selection" && (
          <StepGSCSelection
            properties={google.properties?.gsc ?? []}
            isLoading={google.isLoadingProperties}
            selectedSiteUrl={gscSiteUrl}
            siteDomain={siteDomain}
            apiError={google.properties?.gscError}
            onSelect={handleSelectGSC}
            onSkip={handleSkipGSC}
            onNext={handleGSCContinue}
            onBack={mode === "gsc-only" ? handleBackToExplain : (ga4Skipped ? handleBackToAccount : handleBackToGA4)}
            onRetry={() => google.fetchProperties()}
            allowSkip={mode === "full"}
          />
        )}

        {/* Step: Saving / Verify Confirm */}
        {(step === "saving" || step === "verify-confirm") && (
          <StepVerifyConfirm
            ga4PropertyId={ga4PropertyId}
            ga4StreamId={ga4StreamId}
            ga4Skipped={ga4Skipped}
            gscSiteUrl={gscSiteUrl}
            gscSkipped={gscSkipped}
            isSaving={isSaving}
            isVerifying={isVerifying}
            verifyResult={verifyResult}
            verifyError={verifyError}
            onRetry={handleRetryVerify}
            onBack={handleBackToGSC}
            onFinish={handleFinish}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
