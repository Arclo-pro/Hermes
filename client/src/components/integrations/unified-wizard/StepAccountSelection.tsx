/**
 * Step 2: Account Selection - Choose which Google account to use for GA4
 */
import { useEffect } from "react";
import {
  Users,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  allowSkip = true,
}: StepAccountSelectionProps) {
  // Auto-select if only one account
  useEffect(() => {
    if (accounts.length === 1 && !selectedAccountId) {
      onSelectAccount(accounts[0].accountId);
    }
  }, [accounts, selectedAccountId, onSelectAccount]);

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

    return (
      <div className="space-y-5">
        <div className="text-center py-4">
          <AlertCircle className={`w-10 h-10 mx-auto mb-3 ${isApiError ? "text-amber-500" : "text-muted-foreground"}`} />
          <h3 className="text-lg font-semibold text-foreground">
            {isApiError ? "API Configuration Required" : "No GA4 Accounts Found"}
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            {isApiError
              ? "We connected to Google but couldn't list your Analytics accounts."
              : `We couldn't find any Google Analytics 4 accounts connected to ${googleEmail || "your Google account"}.`
            }
          </p>
        </div>

        {isApiError ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm space-y-3">
            <p className="font-medium text-amber-900">
              {isAdminApiError ? "Enable the Google Analytics Admin API" : "Error Details"}
            </p>
            <p className="text-amber-800 text-xs">{apiError}</p>
            {isAdminApiError && (
              <a
                href="https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Google Cloud Console to enable it
              </a>
            )}
            <p className="text-amber-700 text-xs mt-2">
              After enabling the API, click "Back" and try connecting again.
            </p>
          </div>
        ) : (
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
          {allowSkip && (
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

      {/* Account list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {accounts.map((account) => {
          const isSelected = selectedAccountId === account.accountId;

          return (
            <button
              key={account.accountId}
              onClick={() => onSelectAccount(account.accountId)}
              className={`w-full text-left p-3 rounded-xl border transition-colors ${
                isSelected
                  ? "border-[#7c3aed] bg-[#7c3aed]/5"
                  : "border-border hover:border-[#7c3aed]/30 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{account.displayName}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    ID: {account.accountId}
                  </p>
                </div>
                {isSelected ? (
                  <CheckCircle2 className="w-5 h-5 text-[#7c3aed] shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
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
