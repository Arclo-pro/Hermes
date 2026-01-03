// Status codes for API responses indicating data availability
export type DataStatus = 
  | "ok"                  // Data loaded successfully
  | "empty"               // No data but that's expected/valid
  | "needs_setup"         // Integration not configured
  | "needs_config"        // Missing configuration values
  | "needs_permissions"   // Missing permissions/scopes
  | "integration_down"    // External service unavailable
  | "not_implemented"     // Feature not yet built
  | "error";              // Generic error

// Action types that CTAs can trigger
export type ActionKind = 
  | "route"           // Navigate to internal route
  | "href"            // Open external URL
  | "modal"           // Open configuration modal
  | "retry"           // Retry the failed request
  | "test_connection" // Test integration connection
  | "run_scan"        // Trigger a scan/job
  | "view_logs"       // Open logs panel
  | "create_task";    // Log a dev task

// Remediation action for CTAs
export interface RemediationAction {
  id: string;
  label: string;
  kind: ActionKind;
  href?: string;           // For kind: "href"
  route?: string;          // For kind: "route"
  modal?: string;          // Modal identifier for kind: "modal"
  payload?: Record<string, unknown>; // Additional data
  priority: number;        // Lower = more important, 1 = primary CTA
  icon?: string;           // Lucide icon name
}

// Meta status included in API responses
export interface MetaStatus {
  status: DataStatus;
  reasonCode: string;           // Stable enum-like code (e.g., "GA4_NOT_CONNECTED")
  userMessage: string;          // Friendly message for users
  developerMessage?: string;    // Detailed message for debugging
  missingFields?: string[];     // Config fields that need to be set
  requiredIntegrations?: string[]; // Integrations needed
  actions: RemediationAction[]; // Available remediation actions
  lastSuccessAt?: string;       // ISO timestamp of last successful data load
  lastAttemptAt?: string;       // ISO timestamp of last attempt
}

// Standard API response envelope
export interface ApiResponseEnvelope<T> {
  data: T | null;
  meta: MetaStatus;
}

// Helper to create success meta
export function okMeta(message?: string): MetaStatus {
  return {
    status: "ok",
    reasonCode: "SUCCESS",
    userMessage: message || "Data loaded successfully",
    actions: [],
  };
}

// Helper to create empty but valid meta
export function emptyMeta(userMessage: string, runScanAction?: boolean): MetaStatus {
  const actions: RemediationAction[] = [];
  if (runScanAction) {
    actions.push({
      id: "run_scan",
      label: "Run Scan",
      kind: "run_scan",
      priority: 1,
    });
  }
  return {
    status: "empty",
    reasonCode: "NO_DATA_YET",
    userMessage,
    actions,
  };
}

// Helper to create needs_setup meta
export function needsSetupMeta(
  integration: string,
  settingsRoute?: string
): MetaStatus {
  return {
    status: "needs_setup",
    reasonCode: `${integration.toUpperCase()}_NOT_CONNECTED`,
    userMessage: `Connect ${integration} to see this data`,
    requiredIntegrations: [integration],
    actions: [
      {
        id: "connect",
        label: `Connect ${integration}`,
        kind: "route",
        route: settingsRoute || "/settings/integrations",
        priority: 1,
      },
    ],
  };
}

// Helper to create needs_config meta
export function needsConfigMeta(
  missingFields: string[],
  settingsRoute?: string
): MetaStatus {
  return {
    status: "needs_config",
    reasonCode: "MISSING_CONFIG",
    userMessage: `Missing configuration: ${missingFields.join(", ")}`,
    missingFields,
    actions: [
      {
        id: "configure",
        label: "Open Settings",
        kind: "route",
        route: settingsRoute || "/settings",
        priority: 1,
      },
    ],
  };
}

// Helper to create not_implemented meta
export function notImplementedMeta(feature: string): MetaStatus {
  return {
    status: "not_implemented",
    reasonCode: "NOT_IMPLEMENTED",
    userMessage: `${feature} is coming soon`,
    developerMessage: `Feature "${feature}" has not been implemented yet`,
    actions: [
      {
        id: "create_task",
        label: "Request Feature",
        kind: "create_task",
        payload: { feature },
        priority: 1,
      },
    ],
  };
}

// Helper to create error meta
export function errorMeta(
  userMessage: string,
  developerMessage?: string,
  retryable = true
): MetaStatus {
  const actions: RemediationAction[] = [];
  if (retryable) {
    actions.push({
      id: "retry",
      label: "Retry",
      kind: "retry",
      priority: 1,
    });
  }
  actions.push({
    id: "view_logs",
    label: "View Logs",
    kind: "view_logs",
    priority: 2,
  });
  return {
    status: "error",
    reasonCode: "ERROR",
    userMessage,
    developerMessage,
    actions,
  };
}

// Crew capabilities map
export interface CrewCapabilities {
  kpis: boolean;
  findings: boolean;
  trends: boolean;
  actions: boolean;
  missions: boolean;
}

// Default capabilities (all false - must be explicitly enabled)
export const defaultCrewCapabilities: CrewCapabilities = {
  kpis: false,
  findings: false,
  trends: false,
  actions: false,
  missions: false,
};
