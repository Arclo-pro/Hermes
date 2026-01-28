/**
 * Run Plan Definition
 *
 * Defines which services run in a "standard run" and their dependencies.
 * This is the single source of truth for orchestrated multi-service workflows.
 */

export interface ServiceDefinition {
  /** Unique service identifier (matches KBase service field) */
  service: string;

  /** Human-readable display name */
  displayName: string;

  /** Worker key used in workerOrchestrator (e.g., 'serp_intel', 'core_web_vitals') */
  workerKey: string;

  /** Services that must complete before this one can start */
  dependsOn: string[];

  /** Whether this service is required for a complete run */
  required: boolean;

  /** Expected timeout in milliseconds */
  timeoutMs: number;
}

export interface RunPlan {
  /** Unique identifier for this run plan */
  planId: string;

  /** Human-readable plan name */
  name: string;

  /** Plan description */
  description: string;

  /** Services included in this plan */
  services: ServiceDefinition[];

  /** Maximum time to wait for all services (milliseconds) */
  maxRunDurationMs: number;
}

/**
 * Standard Run Plan v1
 *
 * This is the baseline orchestrated run that includes:
 * 1. Google Data (GSC/GA4) - handled by existing connectors
 * 2. SERP & Keyword Intelligence (Lookout)
 * 3. Technical SEO (Scotty)
 * 4. Domain Authority (Beacon)
 * 5. Competitive Intelligence (Natasha) - depends on SERP
 * 6. Core Web Vitals (Speedster)
 */
export const STANDARD_RUN_PLAN: RunPlan = {
  planId: 'standard-v1',
  name: 'Standard Diagnostic Run',
  description: 'Complete SEO diagnostic across all services',
  maxRunDurationMs: 5 * 60 * 1000, // 5 minutes max for entire run
  services: [
    {
      service: 'serp-intelligence',
      displayName: 'SERP & Keyword Intelligence',
      workerKey: 'serp_intel',
      dependsOn: [],
      required: true,
      timeoutMs: 60 * 1000, // 60 seconds
    },
    {
      service: 'technical-seo',
      displayName: 'Technical SEO',
      workerKey: 'crawl_render',
      dependsOn: [],
      required: true,
      timeoutMs: 90 * 1000, // 90 seconds (crawling can be slow)
    },
    {
      service: 'domain-authority',
      displayName: 'Domain Authority',
      workerKey: 'backlink_authority',
      dependsOn: [],
      required: false, // Nice to have, but not critical
      timeoutMs: 60 * 1000,
    },
    {
      service: 'competitive-intelligence',
      displayName: 'Competitive Intelligence',
      workerKey: 'competitive_snapshot',
      dependsOn: ['serp-intelligence'], // Needs SERP data first
      required: false,
      timeoutMs: 60 * 1000,
    },
    {
      service: 'vitals-monitor',
      displayName: 'Core Web Vitals',
      workerKey: 'core_web_vitals',
      dependsOn: [],
      required: true,
      timeoutMs: 60 * 1000,
    },
  ],
};

/**
 * Quick Run Plan
 *
 * Faster diagnostic with only critical services.
 * Use when speed matters more than completeness.
 */
export const QUICK_RUN_PLAN: RunPlan = {
  planId: 'quick-v1',
  name: 'Quick Diagnostic Run',
  description: 'Fast diagnostic with critical services only',
  maxRunDurationMs: 2 * 60 * 1000, // 2 minutes
  services: [
    {
      service: 'serp-intelligence',
      displayName: 'SERP & Keyword Intelligence',
      workerKey: 'serp_intel',
      dependsOn: [],
      required: true,
      timeoutMs: 45 * 1000,
    },
    {
      service: 'technical-seo',
      displayName: 'Technical SEO',
      workerKey: 'crawl_render',
      dependsOn: [],
      required: true,
      timeoutMs: 60 * 1000,
    },
    {
      service: 'vitals-monitor',
      displayName: 'Core Web Vitals',
      workerKey: 'core_web_vitals',
      dependsOn: [],
      required: true,
      timeoutMs: 45 * 1000,
    },
  ],
};

/**
 * Step 9.2: Onboarding Run Plan - "First Fix" Trust Moment
 *
 * This is a safe-only diagnostic run designed for onboarding.
 * - Only runs services that gather data (no modifications)
 * - Fast execution (<90 seconds)
 * - Identifies low-risk improvements that build trust
 */
export const ONBOARDING_RUN_PLAN: RunPlan = {
  planId: 'onboarding-v1',
  name: 'First Fix Onboarding Run',
  description: 'Safe diagnostic run for new websites - identifies quick wins',
  maxRunDurationMs: 90 * 1000, // 90 seconds max
  services: [
    {
      service: 'technical-seo',
      displayName: 'Technical SEO Quick Scan',
      workerKey: 'crawl_render',
      dependsOn: [],
      required: true,
      timeoutMs: 60 * 1000,
    },
    {
      service: 'vitals-monitor',
      displayName: 'Core Web Vitals Check',
      workerKey: 'core_web_vitals',
      dependsOn: [],
      required: true,
      timeoutMs: 30 * 1000,
    },
  ],
};

/**
 * Get a run plan by ID
 */
export function getRunPlan(planId: string): RunPlan | null {
  switch (planId) {
    case 'standard-v1':
      return STANDARD_RUN_PLAN;
    case 'quick-v1':
      return QUICK_RUN_PLAN;
    case 'onboarding-v1':
      return ONBOARDING_RUN_PLAN;
    default:
      return null;
  }
}

/**
 * Get all available run plans
 */
export function getAllRunPlans(): RunPlan[] {
  return [STANDARD_RUN_PLAN, QUICK_RUN_PLAN, ONBOARDING_RUN_PLAN];
}

/**
 * Get services that can run immediately (no unsatisfied dependencies)
 */
export function getReadyServices(
  plan: RunPlan,
  completedServices: Set<string>
): ServiceDefinition[] {
  return plan.services.filter((service) => {
    // Check if all dependencies are satisfied
    return service.dependsOn.every((dep) => completedServices.has(dep));
  });
}

/**
 * Validate that a run plan has no circular dependencies
 */
export function validateRunPlan(plan: RunPlan): { valid: boolean; error?: string } {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(serviceId: string): boolean {
    visited.add(serviceId);
    recursionStack.add(serviceId);

    const service = plan.services.find((s) => s.service === serviceId);
    if (!service) return false;

    for (const dep of service.dependsOn) {
      if (!visited.has(dep)) {
        if (hasCycle(dep)) return true;
      } else if (recursionStack.has(dep)) {
        return true; // Cycle detected
      }
    }

    recursionStack.delete(serviceId);
    return false;
  }

  for (const service of plan.services) {
    if (!visited.has(service.service)) {
      if (hasCycle(service.service)) {
        return {
          valid: false,
          error: `Circular dependency detected in plan ${plan.planId}`,
        };
      }
    }
  }

  return { valid: true };
}
