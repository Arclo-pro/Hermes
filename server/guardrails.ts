/**
 * Step 9.3: Defaults & Guardrails System
 *
 * Enforces policies, limits, and safe defaults to prevent:
 * - Excessive crawling
 * - Over-use of resources
 * - Running on blocked paths
 * - Exceeding plan limits
 */

import { db } from './db';
import {
  websites,
  websitePolicies,
  websiteSettings,
  users,
  type Website,
  type WebsitePolicy,
  type WebsiteSettings,
  type User,
} from '@shared/schema';
import { eq } from 'drizzle-orm';

// ═══════════════════════════════════════════════════════════════════════════
// PLAN LIMITS (Based on user plan tier)
// ═══════════════════════════════════════════════════════════════════════════

export const PLAN_LIMITS = {
  free: {
    maxWebsites: 1,
    maxRunsPerMonth: 30,
    maxCrawlDepth: 50,
    maxKeywordsTracked: 25,
    maxCompetitors: 3,
    runFrequencyHours: 24, // Max once per day
  },
  core: {
    maxWebsites: 5,
    maxRunsPerMonth: 300,
    maxCrawlDepth: 200,
    maxKeywordsTracked: 100,
    maxCompetitors: 10,
    runFrequencyHours: 6, // Max every 6 hours
  },
  pro: {
    maxWebsites: 20,
    maxRunsPerMonth: 1000,
    maxCrawlDepth: 1000,
    maxKeywordsTracked: 500,
    maxCompetitors: 25,
    runFrequencyHours: 1, // Max hourly
  },
  enterprise: {
    maxWebsites: 9999,
    maxRunsPerMonth: 99999,
    maxCrawlDepth: 10000,
    maxKeywordsTracked: 5000,
    maxCompetitors: 100,
    runFrequencyHours: 0.25, // Max every 15 minutes
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;

// ═══════════════════════════════════════════════════════════════════════════
// SAFE DEFAULT POLICIES
// ═══════════════════════════════════════════════════════════════════════════

export const SAFE_DEFAULTS = {
  // Conservative by default
  canAutoFixTechnical: false,
  canAutoPublishContent: false,
  canAutoUpdateContent: false,
  canAutoOptimizeImages: false,
  canAutoUpdateCode: false,
  maxAutoRiskLevel: 2, // Only very safe actions

  // Default blocklists
  blockedPaths: [
    '/checkout',
    '/cart',
    '/admin',
    '/login',
    '/wp-admin',
    '/api',
    '/webhook',
    '/payment',
    '/auth',
  ],
  blockedFileTypes: [
    '.env',
    '.key',
    '.pem',
    '.p12',
    '.pfx',
    '.config',
    '.secret',
    '.htaccess',
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// GUARDRAIL CHECKS
// ═══════════════════════════════════════════════════════════════════════════

export interface GuardrailContext {
  website: Website;
  policy: WebsitePolicy;
  settings: WebsiteSettings;
  user: User;
}

export interface GuardrailResult {
  allowed: boolean;
  reason?: string;
  suggestion?: string;
}

/**
 * Check if a run can be executed based on frequency limits
 */
export async function checkRunFrequencyLimit(
  websiteId: string
): Promise<GuardrailResult> {
  const [website] = await db
    .select()
    .from(websites)
    .where(eq(websites.id, websiteId))
    .limit(1);

  if (!website) {
    return { allowed: false, reason: "Website not found" };
  }

  if (!website.userId) {
    return { allowed: true }; // No user = internal/test website
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, website.userId))
    .limit(1);

  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  const planLimits = PLAN_LIMITS[user.plan as PlanTier] || PLAN_LIMITS.free;
  const minIntervalMs = planLimits.runFrequencyHours * 60 * 60 * 1000;

  if (website.lastAutoRunAt) {
    const timeSinceLastRun = Date.now() - website.lastAutoRunAt.getTime();

    if (timeSinceLastRun < minIntervalMs) {
      const waitMinutes = Math.ceil((minIntervalMs - timeSinceLastRun) / 60000);
      return {
        allowed: false,
        reason: `Run frequency limit exceeded. Please wait ${waitMinutes} more minutes.`,
        suggestion: `Your ${user.plan} plan allows runs every ${planLimits.runFrequencyHours} hours. Consider upgrading for more frequent runs.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Check if crawl depth is within plan limits
 */
export async function checkCrawlDepthLimit(
  websiteId: string,
  requestedDepth: number
): Promise<GuardrailResult> {
  const [website] = await db
    .select()
    .from(websites)
    .where(eq(websites.id, websiteId))
    .limit(1);

  if (!website || !website.userId) {
    return { allowed: true };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, website.userId))
    .limit(1);

  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  const planLimits = PLAN_LIMITS[user.plan as PlanTier] || PLAN_LIMITS.free;
  const maxAllowed = Math.min(website.maxCrawlDepth, planLimits.maxCrawlDepth);

  if (requestedDepth > maxAllowed) {
    return {
      allowed: false,
      reason: `Crawl depth ${requestedDepth} exceeds limit of ${maxAllowed}`,
      suggestion: `Your ${user.plan} plan allows up to ${planLimits.maxCrawlDepth} pages. Consider upgrading for deeper crawls.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if an action can be auto-executed based on policies
 */
export async function checkActionPolicy(
  websiteId: string,
  actionType: 'fix_technical' | 'publish_content' | 'update_content' | 'optimize_images' | 'update_code',
  riskLevel: number
): Promise<GuardrailResult> {
  const [policy] = await db
    .select()
    .from(websitePolicies)
    .where(eq(websitePolicies.websiteId, websiteId))
    .limit(1);

  if (!policy) {
    // No policy = conservative defaults
    return {
      allowed: false,
      reason: "No policy configured",
      suggestion: "Set up automation policies for this website",
    };
  }

  // Check if action type is allowed
  const allowed = (() => {
    switch (actionType) {
      case 'fix_technical':
        return policy.canAutoFixTechnical;
      case 'publish_content':
        return policy.canAutoPublishContent;
      case 'update_content':
        return policy.canAutoUpdateContent;
      case 'optimize_images':
        return policy.canAutoOptimizeImages;
      case 'update_code':
        return policy.canAutoUpdateCode;
      default:
        return false;
    }
  })();

  if (!allowed) {
    return {
      allowed: false,
      reason: `Action type '${actionType}' is not auto-approved for this website`,
      suggestion: "Enable this action type in website policies or request manual approval",
    };
  }

  // Check risk level
  if (riskLevel > policy.maxAutoRiskLevel) {
    return {
      allowed: false,
      reason: `Risk level ${riskLevel} exceeds max auto-approved level of ${policy.maxAutoRiskLevel}`,
      suggestion: "This action requires manual approval due to higher risk",
    };
  }

  return { allowed: true };
}

/**
 * Check if a path is blocked from modification
 */
export async function checkPathBlocked(
  websiteId: string,
  path: string
): Promise<GuardrailResult> {
  const [policy] = await db
    .select()
    .from(websitePolicies)
    .where(eq(websitePolicies.websiteId, websiteId))
    .limit(1);

  const blockedPaths = policy?.blockedPaths || SAFE_DEFAULTS.blockedPaths;

  for (const blockedPath of blockedPaths) {
    if (path.startsWith(blockedPath)) {
      return {
        allowed: false,
        reason: `Path '${path}' is blocked from modification`,
        suggestion: "Remove path from blocklist in policies if you want to allow changes",
      };
    }
  }

  return { allowed: true };
}

/**
 * Check if a file type is blocked from modification
 */
export async function checkFileTypeBlocked(
  websiteId: string,
  filePath: string
): Promise<GuardrailResult> {
  const [policy] = await db
    .select()
    .from(websitePolicies)
    .where(eq(websitePolicies.websiteId, websiteId))
    .limit(1);

  const blockedTypes = policy?.blockedFileTypes || SAFE_DEFAULTS.blockedFileTypes;

  for (const blockedType of blockedTypes) {
    if (filePath.endsWith(blockedType)) {
      return {
        allowed: false,
        reason: `File type '${blockedType}' is blocked from modification`,
        suggestion: "This file type is sensitive and cannot be auto-modified for security",
      };
    }
  }

  return { allowed: true };
}

/**
 * Comprehensive pre-run guardrail check
 */
export async function runPreflightChecks(
  websiteId: string,
  runType: 'auto' | 'manual' = 'auto'
): Promise<GuardrailResult[]> {
  const checks: GuardrailResult[] = [];

  // Check run frequency (only for auto runs)
  if (runType === 'auto') {
    checks.push(await checkRunFrequencyLimit(websiteId));
  }

  // Add more checks as needed

  return checks;
}

/**
 * Check if any guardrail failed
 */
export function hasFailedGuardrail(checks: GuardrailResult[]): boolean {
  return checks.some(check => !check.allowed);
}

/**
 * Get first failed guardrail
 */
export function getFirstFailure(checks: GuardrailResult[]): GuardrailResult | null {
  return checks.find(check => !check.allowed) || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════

const runCountCache = new Map<string, { count: number; resetAt: number }>();

/**
 * Check monthly run limit
 */
export async function checkMonthlyRunLimit(websiteId: string): Promise<GuardrailResult> {
  const [website] = await db
    .select()
    .from(websites)
    .where(eq(websites.id, websiteId))
    .limit(1);

  if (!website || !website.userId) {
    return { allowed: true };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, website.userId))
    .limit(1);

  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  const planLimits = PLAN_LIMITS[user.plan as PlanTier] || PLAN_LIMITS.free;

  // Check cache
  const now = Date.now();
  const cached = runCountCache.get(websiteId);

  if (cached && cached.resetAt > now) {
    if (cached.count >= planLimits.maxRunsPerMonth) {
      return {
        allowed: false,
        reason: `Monthly run limit of ${planLimits.maxRunsPerMonth} reached`,
        suggestion: `Limit resets on ${new Date(cached.resetAt).toLocaleDateString()}. Consider upgrading for more runs.`,
      };
    }
  } else {
    // TODO: Query actual run count from database
    // For now, reset cache monthly
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);
    resetDate.setDate(1);
    resetDate.setHours(0, 0, 0, 0);

    runCountCache.set(websiteId, {
      count: 0,
      resetAt: resetDate.getTime(),
    });
  }

  return { allowed: true };
}

/**
 * Increment run count (call after successful run)
 */
export function incrementRunCount(websiteId: string): void {
  const cached = runCountCache.get(websiteId);
  if (cached) {
    cached.count++;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS FOR MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

export const Guardrails = {
  checkRunFrequencyLimit,
  checkCrawlDepthLimit,
  checkActionPolicy,
  checkPathBlocked,
  checkFileTypeBlocked,
  runPreflightChecks,
  checkMonthlyRunLimit,
  hasFailedGuardrail,
  getFirstFailure,
  incrementRunCount,
};
