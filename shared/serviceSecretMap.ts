/**
 * Canonical mapping of services and their configuration.
 * This is the single source of truth for service configuration.
 *
 * Services are either:
 * - "infrastructure": Internal Hermes modules (consolidated, no external config needed)
 * - "worker": Remote HTTP services (need BASE_URL + API_KEY env vars in Vercel)
 * - "planned": Not yet built
 *
 * Zero external workers remain.
 * All services (including competitive_snapshot, serp_intel, crawl_render, core_web_vitals and backlink_authority) are consolidated into Hermes.
 *
 * IMPORTANT: Never use fuzzy matching or string inference.
 * All mappings must be explicit.
 */

export type ServiceType =
  | "infrastructure"  // Internal Hermes modules (no base_url needed)
  | "worker"          // Remote worker services (need base_url + api_key)
  | "planned";        // Not yet built

export interface ServiceSecretMapping {
  serviceSlug: string;
  displayName: string;
  type: ServiceType;
  requiresBaseUrl: boolean;        // Workers need base_url, infrastructure does not
  category: "google" | "analysis" | "content" | "infrastructure" | "execution";
  envVar?: string;                 // Env var for API key
  baseUrlEnvVar?: string;          // Env var for base URL
  workerEndpoints?: Record<string, string>;  // Worker API endpoints
  requiresBearer?: boolean;        // Optional: if true, send Authorization: Bearer header in addition to x-api-key
}

/**
 * Canonical mapping table.
 *
 * IMPORTANT: serviceSlug MUST match the slug in servicesCatalog.ts
 * Use the exact catalog slugs, not custom names.
 */
export const SERVICE_SECRET_MAP: ServiceSecretMapping[] = [
  // Infrastructure Services (consolidated into Hermes — no external base_url needed)
  {
    serviceSlug: "audit_log",  // Matches catalog
    displayName: "Audit Log & Observability",
    type: "infrastructure",
    requiresBaseUrl: false,
    category: "infrastructure",
  },
  {
    serviceSlug: "orchestrator",  // Matches catalog
    displayName: "Orchestrator / Job Runner",
    type: "infrastructure",
    requiresBaseUrl: false,
    category: "infrastructure",
  },
  {
    serviceSlug: "notifications",  // Matches catalog
    displayName: "Notifications Service",
    type: "infrastructure",
    requiresBaseUrl: false,
    category: "infrastructure",
  },

  // Google Connectors (consolidated — uses per-client OAuth tokens from DB)
  {
    serviceSlug: "google_data_connector",  // Matches catalog
    displayName: "Google Data Connector (GSC + GA4)",
    type: "infrastructure",
    requiresBaseUrl: false,
    category: "google",
  },

  // Analysis Workers (need base_url + api_key)
  {
    serviceSlug: "serp_intel",  // Matches catalog
    displayName: "SERP & Keyword Intelligence",
    type: "infrastructure",  // Consolidated — calls SERPAPI.com directly from Hermes
    requiresBaseUrl: false,
    category: "analysis",
  },
  {
    serviceSlug: "crawl_render",  // Matches catalog
    displayName: "Technical SEO",
    type: "infrastructure",  // Consolidated — HTTP crawler runs directly in Hermes (cheerio-based, no Playwright)
    requiresBaseUrl: false,
    category: "analysis",
  },
  {
    serviceSlug: "core_web_vitals",  // Matches catalog
    displayName: "Core Web Vitals Monitor",
    type: "infrastructure",  // Consolidated — calls Google PSI API directly from Hermes
    requiresBaseUrl: false,
    category: "analysis",
  },
  {
    serviceSlug: "backlink_authority",  // Matches catalog
    displayName: "Backlink & Authority Signals",
    type: "infrastructure",  // Consolidated — runs AAI scoring directly in Hermes
    requiresBaseUrl: false,
    category: "analysis",
  },
  {
    serviceSlug: "competitive_snapshot",  // Matches catalog
    displayName: "Competitive Intelligence",
    type: "infrastructure",  // Consolidated — 5-stage gap detection pipeline runs directly in Hermes
    requiresBaseUrl: false,
    category: "analysis",
  },

  // Content Workers (consolidated into Hermes)
  {
    serviceSlug: "content_generator",  // Matches catalog
    displayName: "Content Generator",
    type: "infrastructure",
    requiresBaseUrl: false,
    category: "content",
  },
  {
    serviceSlug: "content_decay",  // Matches catalog
    displayName: "Content Decay Monitor",
    type: "infrastructure",
    requiresBaseUrl: false,
    category: "content",
  },
  {
    serviceSlug: "content_qa",  // Matches catalog
    displayName: "Content QA / Policy Validator",
    type: "infrastructure",
    requiresBaseUrl: false,
    category: "content",
  },
  {
    serviceSlug: "seo_kbase",  // Matches catalog
    displayName: "SEO Knowledge Base",
    type: "infrastructure",
    requiresBaseUrl: false,
    category: "analysis",
  },
  {
    serviceSlug: "technical_seo",
    displayName: "Technical SEO (Unified)",
    type: "infrastructure",  // Internal orchestration service
    requiresBaseUrl: false,  // Calls crawl_render, core_web_vitals, content_decay internally
    category: "analysis",
    workerEndpoints: {
      health: "/api/health",
      run: "/api/agents/technical-seo/run"
    }
  },

  // Planned / Not Built Yet
  {
    serviceSlug: "google_ads_connector",  // Matches catalog
    displayName: "Google Ads",
    type: "planned",
    requiresBaseUrl: false,
    category: "google"
  },
  {
    serviceSlug: "site_executor",  // Matches catalog
    displayName: "Site Change Executor",
    type: "infrastructure",
    requiresBaseUrl: false,
    category: "execution",
  }
];

// Helper functions for lookups
export function getServiceBySlug(slug: string): ServiceSecretMapping | undefined {
  return SERVICE_SECRET_MAP.find(s => s.serviceSlug === slug);
}

export function getWorkerServices(): ServiceSecretMapping[] {
  return SERVICE_SECRET_MAP.filter(s => s.type === "worker");
}

export function getPlannedServices(): ServiceSecretMapping[] {
  return SERVICE_SECRET_MAP.filter(s => s.type === "planned");
}

export function getConfiguredServices(): ServiceSecretMapping[] {
  return SERVICE_SECRET_MAP.filter(s => s.envVar || s.baseUrlEnvVar);
}

// Config state types
export type ConfigState = "ready" | "needs_config" | "blocked";

export interface ServiceConfigStatus {
  serviceSlug: string;
  displayName: string;
  configState: ConfigState;
  envVarPresent: boolean;
  connectionConfigPresent: boolean;  // base_url + api_key for workers
  blockingReason: string | null;
  type: ServiceType;
  category: string;
}

/**
 * Determine the configuration state for a service based on environment variables.
 *
 * Rules:
 * 1. If service is planned/not built: configState = blocked
 * 2. If env var is missing: configState = needs_config
 * 3. If worker env var exists but base_url is missing: configState = needs_config
 * 4. Otherwise: configState = ready
 *
 * IMPORTANT: "Ready" means the service CAN be connected, not that it HAS returned outputs.
 */
export function determineConfigState(
  mapping: ServiceSecretMapping,
  hasApiKey: boolean,
  hasBaseUrl: boolean
): ServiceConfigStatus {
  // Planned services are blocked
  if (mapping.type === "planned") {
    return {
      serviceSlug: mapping.serviceSlug,
      displayName: mapping.displayName,
      configState: "blocked",
      envVarPresent: false,
      connectionConfigPresent: false,
      blockingReason: "Not built yet",
      type: mapping.type,
      category: mapping.category
    };
  }

  // Infrastructure services that don't need external config
  if (!mapping.requiresBaseUrl && !mapping.envVar) {
    return {
      serviceSlug: mapping.serviceSlug,
      displayName: mapping.displayName,
      configState: "ready",
      envVarPresent: true,
      connectionConfigPresent: true,
      blockingReason: null,
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
      envVarPresent: hasApiKey,
      connectionConfigPresent: false,
      blockingReason: `Set ${mapping.baseUrlEnvVar} in environment`,
      type: mapping.type,
      category: mapping.category
    };
  }

  // API key missing but base URL present
  if (!hasApiKey && mapping.envVar) {
    return {
      serviceSlug: mapping.serviceSlug,
      displayName: mapping.displayName,
      configState: "needs_config",
      envVarPresent: false,
      connectionConfigPresent: false,
      blockingReason: `Set ${mapping.envVar} in environment`,
      type: mapping.type,
      category: mapping.category
    };
  }

  // Ready
  return {
    serviceSlug: mapping.serviceSlug,
    displayName: mapping.displayName,
    configState: "ready",
    envVarPresent: hasApiKey,
    connectionConfigPresent: true,
    blockingReason: null,
    type: mapping.type,
    category: mapping.category
  };
}
