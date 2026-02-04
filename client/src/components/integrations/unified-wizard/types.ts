/**
 * Types for the Unified Google Connection Wizard
 */

export type WizardStep =
  | "explain"
  | "connecting"
  | "account-selection"
  | "ga4-selection"
  | "gsc-selection"
  | "saving"
  | "verify-confirm";

export interface WizardState {
  step: WizardStep;
  // Account selection (GA4)
  ga4AccountId: string | null;
  // GA4 selections
  ga4PropertyId: string | null;
  ga4StreamId: string | null;
  ga4Skipped: boolean;
  // GSC selections
  gscSiteUrl: string | null;
  gscSkipped: boolean;
  // Error state
  error: string | null;
}

export interface WizardActions {
  setStep: (step: WizardStep) => void;
  setGA4Property: (propertyId: string) => void;
  setGA4Stream: (streamId: string) => void;
  skipGA4: () => void;
  setGSCSite: (siteUrl: string) => void;
  skipGSC: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const INITIAL_STATE: WizardState = {
  step: "explain",
  ga4AccountId: null,
  ga4PropertyId: null,
  ga4StreamId: null,
  ga4Skipped: false,
  gscSiteUrl: null,
  gscSkipped: false,
  error: null,
};
