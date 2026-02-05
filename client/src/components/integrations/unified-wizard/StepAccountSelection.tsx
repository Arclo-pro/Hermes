/**
 * Step 2: Account Selection - Choose which Google account to use for GA4
 */
import {
  Users,
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
import type { GA4Account } from "../useGoogleConnection";

interface StepAccountSelectionProps {
  accounts: GA4Account[];
  isLoading: boolean;
  selectedAccountId: string | null;
  googleEmail?: string;
  apiError?: string | null;
  onSelectAccount: (accountId: string) => void;
  onSkip: () => void;
  onNext: () => void;
  onBack: () => void;
  onRetry?: () => void;
  allowSkip?: boolean;
}

export function StepAccountSelection({
  accounts,
  isLoading,
  selectedAccountId,
  googleEmail,
  apiError,
  onSelectAccount,
  onSkip,
  onNext,
  onBack,
  onRetry,
  allowSkip = true,
}: StepAccountSelectionProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-5 text-center py-6">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Discovering Google Analytics accounts...</p>
      </div>
    );
  }

  // No accounts found (or API error)
  if (accounts.length === 0) {
    const isApiError = !!apiError;
    const isAdminApiError = apiError?.includes('Admin API') || apiError?.includes('not enabled');
    // Extract project-specific activation URL from the error message if present
    const urlMatch = apiError?.match(/https:\/\/\S+/);
    const activationUrl = urlMatch?.[0] || 'https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com';

    // API needs to be enabled — show as a setup step, not an error
    if (isAdminApiError) {
      return (
        <div className="space-y-5">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center mx-auto mb-3">
              <Settings className="w-6 h-6 text-[#7c3aed]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Enable Google APIs</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              One quick setup step — enable these APIs in your Google Cloud project so Arclo can read your analytics data.
            </p>
          </div>

          <div className="space-y-3">
            <a
              href={activationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full rounded-xl border border-input bg-background px-4 py-3 text-sm hover:bg-accent transition-colors"
            >
              <span className="font-medium">1. Analytics Admin API</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
            <a
              href="https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full rounded-xl border border-input bg-background px-4 py-3 text-sm hover:bg-accent transition-colors"
            >
              <span className="font-medium">2. Analytics Data API</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Click each link above, then click "Enable" on the Google page. Once done, come back and continue.
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
        </div>
      );
    }

    // Other API error or no accounts found
    return (
      <div className="space-y-5">
        <div className="text-center py-4">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">
            {isApiError ? "Something went wrong" : "No GA4 Accounts Found"}
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            {isApiError
              ? apiError
              : `We couldn't find any Google Analytics 4 accounts connected to ${googleEmail || "your Google account"}.`
            }
          </p>
        </div>

        {!isApiError && (
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">This can happen if:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>You don't have access to any GA4 properties</li>
              <li>You need to be added as a user on someone else's GA4 account</li>
              <li>You signed in with the wrong Google account</li>
            </ul>
            <p className="mt-3 text-xs">
              Ask the GA4 account owner to add {googleEmail || "your email"} as a user with at least "Viewer" access.
            </p>
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
              Skip GA4, continue to Search Console
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center mx-auto mb-3">
          <Users className="w-6 h-6 text-[#7c3aed]" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Select Google Analytics Account</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the account that contains your website's property.
        </p>
        {googleEmail && (
          <p className="text-xs text-muted-foreground mt-2">
            Signed in as <span className="font-medium">{googleEmail}</span>
          </p>
        )}
      </div>

      {/* Account dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Google Analytics Account</label>
        <Select value={selectedAccountId || undefined} onValueChange={onSelectAccount}>
          <SelectTrigger className="w-full h-11 rounded-xl">
            <SelectValue placeholder="Select an account..." />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.accountId} value={account.accountId}>
                <span className="flex flex-col">
                  <span>{account.displayName}</span>
                  <span className="text-xs text-muted-foreground font-mono">ID: {account.accountId}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
        <Button variant="primary" fullWidth onClick={onNext} disabled={!selectedAccountId}>
          Continue
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>

      {allowSkip && (
        <button
          onClick={onSkip}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip GA4, continue with just Search Console
        </button>
      )}
    </div>
  );
}
