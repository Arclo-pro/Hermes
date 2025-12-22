/**
 * Canonical mapping of Bitwarden secrets to services.
 * This is the single source of truth for service configuration.
 * 
 * IMPORTANT: Never use fuzzy matching or string inference.
 * All mappings must be explicit.
 */

export type ServiceType = 
  | "infrastructure"  // Internal Hermes modules (no base_url needed)
  | "connector"       // Data connectors (Google, etc.)
  | "worker"          // Remote worker services (need base_url + api_key)
  | "planned";        // Not yet built

export interface ServiceSecretMapping {
  serviceSlug: string;
  displayName: string;
  bitwardenSecret: string | null;  // null = no secret needed or planned
  type: ServiceType;
  requiresBaseUrl: boolean;        // Workers need base_url, infrastructure does not
  category: "google" | "analysis" | "content" | "infrastructure" | "execution";
}

export const SERVICE_SECRET_MAP: ServiceSecretMapping[] = [
  // Infrastructure Services (internal to Hermes, no base_url needed)
  {
    serviceSlug: "audit_log_observability",
    displayName: "Audit Log & Observability",
    bitwardenSecret: "SEO_Audit_Log",
    type: "infrastructure",
    requiresBaseUrl: false,
    category: "infrastructure"
  },
  {
    serviceSlug: "scheduler_job_runner",
    displayName: "Orchestrator / Job Runner",
    bitwardenSecret: "SEO_SCHEDULER_API_KEY",
    type: "infrastructure",
    requiresBaseUrl: false,
    category: "infrastructure"
  },
  {
    serviceSlug: "notifications_service",
    displayName: "Notifications Service",
    bitwardenSecret: "SEO_Notifications",
    type: "worker",
    requiresBaseUrl: true,
    category: "infrastructure"
  },

  // Google Connectors (special handling - OAuth based)
  {
    serviceSlug: "google_data_connector",
    displayName: "Google Data Connector (GSC + GA4)",
    bitwardenSecret: "SEO_Google_Connector",
    type: "connector",
    requiresBaseUrl: false,
    category: "google"
  },

  // Analysis Workers (need base_url + api_key)
  {
    serviceSlug: "serp_keyword_intel",
    displayName: "Worker: SERP & Keyword Intelligence Service",
    bitwardenSecret: "SEO_SERP_&_Keyword",
    type: "worker",
    requiresBaseUrl: true,
    category: "analysis"
  },
  {
    serviceSlug: "technical_crawler",
    displayName: "Crawl & Render Service",
    bitwardenSecret: "SEO_TECHNICAL_CRAWLER_API_KEY",
    type: "worker",
    requiresBaseUrl: true,
    category: "analysis"
  },
  {
    serviceSlug: "core_web_vitals_monitor",
    displayName: "Core Web Vitals Monitor",
    bitwardenSecret: "SEO_Vital_Monitor",
    type: "worker",
    requiresBaseUrl: true,
    category: "analysis"
  },
  {
    serviceSlug: "backlinks_authority",
    displayName: "Backlink & Authority Signals",
    bitwardenSecret: "SEO_Backlinks",
    type: "worker",
    requiresBaseUrl: true,
    category: "analysis"
  },
  {
    serviceSlug: "competitive_intel",
    displayName: "Competitive Intelligence",
    bitwardenSecret: "SEO_Competitive_Intel",
    type: "worker",
    requiresBaseUrl: true,
    category: "analysis"
  },

  // Content Workers
  {
    serviceSlug: "content_generator",
    displayName: "Content Generator",
    bitwardenSecret: "SEO_Blog_Writer",
    type: "worker",
    requiresBaseUrl: true,
    category: "content"
  },
  {
    serviceSlug: "content_decay_monitor",
    displayName: "Content Decay Monitor",
    bitwardenSecret: "SEO_CONTENT_DECAY_MONITOR_API_KEY",
    type: "worker",
    requiresBaseUrl: true,
    category: "content"
  },
  {
    serviceSlug: "content_qa_policy_validator",
    displayName: "Content QA / Policy Validator",
    bitwardenSecret: "SEO_Content_QA",
    type: "worker",
    requiresBaseUrl: true,
    category: "content"
  },
  {
    serviceSlug: "content_validator",
    displayName: "Content Validator",
    bitwardenSecret: "SEO_Content_Validator",
    type: "worker",
    requiresBaseUrl: true,
    category: "content"
  },

  // Planned / Not Built Yet
  {
    serviceSlug: "google_ads",
    displayName: "Google Ads",
    bitwardenSecret: null,
    type: "planned",
    requiresBaseUrl: false,
    category: "google"
  },
  {
    serviceSlug: "site_change_executor",
    displayName: "Site Change Executor",
    bitwardenSecret: null,
    type: "planned",
    requiresBaseUrl: false,
    category: "execution"
  }
];

// Helper functions for lookups
export function getServiceBySlug(slug: string): ServiceSecretMapping | undefined {
  return SERVICE_SECRET_MAP.find(s => s.serviceSlug === slug);
}

export function getServiceBySecret(secretName: string): ServiceSecretMapping | undefined {
  return SERVICE_SECRET_MAP.find(s => s.bitwardenSecret === secretName);
}

export function getServicesRequiringSecrets(): ServiceSecretMapping[] {
  return SERVICE_SECRET_MAP.filter(s => s.bitwardenSecret !== null);
}

export function getWorkerServices(): ServiceSecretMapping[] {
  return SERVICE_SECRET_MAP.filter(s => s.type === "worker");
}

export function getPlannedServices(): ServiceSecretMapping[] {
  return SERVICE_SECRET_MAP.filter(s => s.type === "planned");
}

// Config state types
export type ConfigState = "ready" | "needs_config" | "blocked";

export interface ServiceConfigStatus {
  serviceSlug: string;
  displayName: string;
  configState: ConfigState;
  secretPresent: boolean;
  connectionConfigPresent: boolean;  // base_url + api_key for workers
  blockingReason: string | null;
  type: ServiceType;
  category: string;
}

/**
 * Determine the configuration state for a service based on Bitwarden secret status.
 * 
 * Rules:
 * 1. If service is planned/not built: configState = blocked
 * 2. If secret is missing: configState = needs_config
 * 3. If worker secret exists but base_url is missing: configState = needs_config
 * 4. Otherwise: configState = ready
 * 
 * IMPORTANT: "Ready" means the service CAN be connected, not that it HAS returned outputs.
 */
export function determineConfigState(
  mapping: ServiceSecretMapping,
  secretExists: boolean,
  hasBaseUrl: boolean
): ServiceConfigStatus {
  // Planned services are blocked
  if (mapping.type === "planned") {
    return {
      serviceSlug: mapping.serviceSlug,
      displayName: mapping.displayName,
      configState: "blocked",
      secretPresent: false,
      connectionConfigPresent: false,
      blockingReason: "Not built yet",
      type: mapping.type,
      category: mapping.category
    };
  }

  // Secret missing
  if (!secretExists) {
    return {
      serviceSlug: mapping.serviceSlug,
      displayName: mapping.displayName,
      configState: "needs_config",
      secretPresent: false,
      connectionConfigPresent: false,
      blockingReason: `Bitwarden secret not found: ${mapping.bitwardenSecret}`,
      type: mapping.type,
      category: mapping.category
    };
  }

  // For workers that require base_url, check if it's present
  if (mapping.requiresBaseUrl && !hasBaseUrl) {
    return {
      serviceSlug: mapping.serviceSlug,
      displayName: mapping.displayName,
      configState: "needs_config",
      secretPresent: true,
      connectionConfigPresent: false,
      blockingReason: "Worker base_url missing in Bitwarden secret",
      type: mapping.type,
      category: mapping.category
    };
  }

  // Ready - secret exists and has required config
  return {
    serviceSlug: mapping.serviceSlug,
    displayName: mapping.displayName,
    configState: "ready",
    secretPresent: true,
    connectionConfigPresent: true,
    blockingReason: null,
    type: mapping.type,
    category: mapping.category
  };
}
