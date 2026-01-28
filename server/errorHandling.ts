/**
 * Step 9.6: Error Handling & Supportability
 *
 * Provides:
 * - Automatic retry logic with exponential backoff
 * - Error logging and tracking
 * - User-friendly error messages
 * - Support context capture
 * - Escalation workflows
 */

import { db } from './db';
import {
  runErrors,
  type InsertRunError,
  type RunError,
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from './utils/logger';
import { sendEmail } from './services/email';

// ═══════════════════════════════════════════════════════════════════════════
// ERROR CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════

export enum ErrorType {
  TIMEOUT = 'timeout',
  AUTH_FAILED = 'auth_failed',
  RATE_LIMIT = 'rate_limit',
  NETWORK_ERROR = 'network_error',
  INVALID_RESPONSE = 'invalid_response',
  WORKER_ERROR = 'worker_error',
  CONFIG_ERROR = 'config_error',
  UNKNOWN = 'unknown',
}

export enum ErrorSeverity {
  LOW = 'low',           // Can continue, minor issue
  MEDIUM = 'medium',     // Should retry, not critical
  HIGH = 'high',         // Serious, needs attention
  CRITICAL = 'critical', // System-wide, immediate escalation
}

// ═══════════════════════════════════════════════════════════════════════════
// USER-FRIENDLY ERROR MESSAGES
// ═══════════════════════════════════════════════════════════════════════════

const USER_FRIENDLY_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.TIMEOUT]: "We're running into slower response times than usual. We'll try again automatically.",
  [ErrorType.AUTH_FAILED]: "There's an issue with your authentication. Please reconnect your account.",
  [ErrorType.RATE_LIMIT]: "We've hit a temporary rate limit. We'll retry in a few moments.",
  [ErrorType.NETWORK_ERROR]: "We had trouble connecting. We'll try again shortly.",
  [ErrorType.INVALID_RESPONSE]: "We received unexpected data. Our team has been notified.",
  [ErrorType.WORKER_ERROR]: "A service encountered an issue. We're automatically retrying.",
  [ErrorType.CONFIG_ERROR]: "There's a configuration issue. Please check your settings.",
  [ErrorType.UNKNOWN]: "Something unexpected happened. We're looking into it.",
};

// ═══════════════════════════════════════════════════════════════════════════
// RETRY CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export interface RetryConfig {
  maxRetries: number;
  strategy: 'exponential_backoff' | 'linear' | 'none';
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  strategy: 'exponential_backoff',
  baseDelayMs: 5000, // 5 seconds
  maxDelayMs: 60000, // 60 seconds max
};

// Error types that should retry
const RETRYABLE_ERRORS = new Set([
  ErrorType.TIMEOUT,
  ErrorType.RATE_LIMIT,
  ErrorType.NETWORK_ERROR,
  ErrorType.WORKER_ERROR,
]);

// Error types that should NOT retry
const NON_RETRYABLE_ERRORS = new Set([
  ErrorType.AUTH_FAILED,
  ErrorType.CONFIG_ERROR,
]);

// ═══════════════════════════════════════════════════════════════════════════
// ERROR TRACKING & LOGGING
// ═══════════════════════════════════════════════════════════════════════════

export interface ErrorContext {
  websiteId: string;
  runId: string;
  service: string;
  errorType: ErrorType;
  errorMessage: string;
  errorStack?: string;
  context?: Record<string, any>;
  severity?: ErrorSeverity;
}

/**
 * Track an error in the database
 */
export async function trackError(error: ErrorContext): Promise<RunError> {
  const errorType = error.errorType;
  const isRetryable = RETRYABLE_ERRORS.has(errorType);
  const retryConfig = isRetryable ? DEFAULT_RETRY_CONFIG : { ...DEFAULT_RETRY_CONFIG, maxRetries: 0, strategy: 'none' as const };

  const nextRetryAt = isRetryable
    ? new Date(Date.now() + retryConfig.baseDelayMs)
    : null;

  const [tracked] = await db.insert(runErrors).values({
    websiteId: error.websiteId,
    runId: error.runId,
    service: error.service,
    errorType,
    errorMessage: error.errorMessage,
    errorStack: error.errorStack,
    retryCount: 0,
    maxRetries: retryConfig.maxRetries,
    nextRetryAt,
    retryStrategy: retryConfig.strategy,
    resolved: false,
    userNotified: false,
    escalated: false,
    context: error.context,
  } as InsertRunError).returning();

  logger.error("ErrorTracking", "Error tracked", {
    errorId: tracked.id,
    websiteId: error.websiteId,
    runId: error.runId,
    service: error.service,
    errorType,
    isRetryable,
  });

  return tracked;
}

/**
 * Calculate next retry delay based on retry count and strategy
 */
export function calculateRetryDelay(
  retryCount: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  if (config.strategy === 'none') {
    return 0;
  }

  let delay: number;

  if (config.strategy === 'exponential_backoff') {
    // 2^retryCount * baseDelay
    delay = Math.pow(2, retryCount) * config.baseDelayMs;
  } else {
    // Linear: retryCount * baseDelay
    delay = retryCount * config.baseDelayMs;
  }

  // Cap at maxDelayMs
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Check if an error should retry
 */
export function shouldRetry(errorRecord: RunError): boolean {
  if (errorRecord.resolved) return false;
  if (errorRecord.retryCount >= errorRecord.maxRetries) return false;

  const errorType = errorRecord.errorType as ErrorType;
  if (NON_RETRYABLE_ERRORS.has(errorType)) return false;

  return RETRYABLE_ERRORS.has(errorType);
}

/**
 * Increment retry count and schedule next retry
 */
export async function scheduleRetry(errorId: number): Promise<RunError | null> {
  const [errorRecord] = await db
    .select()
    .from(runErrors)
    .where(eq(runErrors.id, errorId))
    .limit(1);

  if (!errorRecord || !shouldRetry(errorRecord)) {
    return null;
  }

  const newRetryCount = errorRecord.retryCount + 1;
  const retryDelay = calculateRetryDelay(newRetryCount);
  const nextRetryAt = new Date(Date.now() + retryDelay);

  const [updated] = await db
    .update(runErrors)
    .set({
      retryCount: newRetryCount,
      nextRetryAt,
    })
    .where(eq(runErrors.id, errorId))
    .returning();

  logger.info("ErrorTracking", "Retry scheduled", {
    errorId,
    retryCount: newRetryCount,
    nextRetryAt,
    delayMs: retryDelay,
  });

  return updated;
}

/**
 * Mark error as resolved
 */
export async function resolveError(
  errorId: number,
  resolution: string
): Promise<void> {
  await db
    .update(runErrors)
    .set({
      resolved: true,
      resolvedAt: new Date(),
      resolution,
    })
    .where(eq(runErrors.id, errorId));

  logger.info("ErrorTracking", "Error resolved", { errorId, resolution });
}

/**
 * Get errors ready for retry
 */
export async function getErrorsReadyForRetry(): Promise<RunError[]> {
  // TODO: Add proper query with timestamp comparison
  // For now, return empty array - this would be called by a background job
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════
// USER NOTIFICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send calm error notification to user
 */
export async function notifyUserOfError(
  errorRecord: RunError,
  userEmail: string,
  websiteDomain: string
): Promise<boolean> {
  const errorType = errorRecord.errorType as ErrorType;
  const friendlyMessage = USER_FRIENDLY_MESSAGES[errorType] || USER_FRIENDLY_MESSAGES[ErrorType.UNKNOWN];

  const willRetry = shouldRetry(errorRecord);
  const retryMessage = willRetry
    ? `We're automatically retrying (attempt ${errorRecord.retryCount + 1}/${errorRecord.maxRetries}).`
    : "This requires your attention.";

  try {
    const sent = await sendEmail({
      to: userEmail,
      subject: `Arclo Notice: ${websiteDomain}`,
      text: `Hi,\n\n${friendlyMessage}\n\n${retryMessage}\n\nWebsite: ${websiteDomain}\nRun ID: ${errorRecord.runId}\nService: ${errorRecord.service}\n\nNo action needed from you - we'll keep you posted.\n\nBest,\nThe Arclo Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ We hit a small snag</h1>
          </div>
          <div style="padding: 40px 30px; background: #f9fafb;">
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              ${friendlyMessage}
            </p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              ${retryMessage}
            </p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Website:</strong> ${websiteDomain}</p>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Service:</strong> ${errorRecord.service}</p>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px; font-family: monospace;"><strong>Run ID:</strong> ${errorRecord.runId}</p>
            </div>
            <p style="color: #9ca3af; font-size: 14px; font-style: italic;">
              No action needed from you - we'll keep you posted.
            </p>
          </div>
          <div style="padding: 20px 30px; background: #111827; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} Arclo. All rights reserved.
            </p>
          </div>
        </div>
      `,
    });

    if (sent) {
      await db
        .update(runErrors)
        .set({ userNotified: true })
        .where(eq(runErrors.id, errorRecord.id));
    }

    return sent;
  } catch (error) {
    logger.error("ErrorTracking", "Failed to notify user", { errorId: errorRecord.id, error });
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ESCALATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Escalate error to support (after max retries)
 */
export async function escalateError(errorRecord: RunError): Promise<void> {
  if (errorRecord.escalated) return;

  // Send to support email
  const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@arclo.pro';

  await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `[ESCALATION] Error #${errorRecord.id} - ${errorRecord.service}`,
    text: `Error requires attention:\n\nError ID: ${errorRecord.id}\nWebsite ID: ${errorRecord.websiteId}\nRun ID: ${errorRecord.runId}\nService: ${errorRecord.service}\nError Type: ${errorRecord.errorType}\nMessage: ${errorRecord.errorMessage}\n\nRetries exhausted: ${errorRecord.retryCount}/${errorRecord.maxRetries}\n\nContext:\n${JSON.stringify(errorRecord.context, null, 2)}`,
    html: `
      <div style="font-family: monospace; max-width: 800px; margin: 0 auto; background: #1f2937; color: #f9fafb; padding: 20px;">
        <h2 style="color: #ef4444;">🚨 Error Escalation</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #374151;"><strong>Error ID:</strong></td><td style="padding: 8px; border-bottom: 1px solid #374151;">#${errorRecord.id}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #374151;"><strong>Website ID:</strong></td><td style="padding: 8px; border-bottom: 1px solid #374151;">${errorRecord.websiteId}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #374151;"><strong>Run ID:</strong></td><td style="padding: 8px; border-bottom: 1px solid #374151;">${errorRecord.runId}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #374151;"><strong>Service:</strong></td><td style="padding: 8px; border-bottom: 1px solid #374151;">${errorRecord.service}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #374151;"><strong>Error Type:</strong></td><td style="padding: 8px; border-bottom: 1px solid #374151;">${errorRecord.errorType}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #374151;"><strong>Retries:</strong></td><td style="padding: 8px; border-bottom: 1px solid #374151;">${errorRecord.retryCount}/${errorRecord.maxRetries}</td></tr>
        </table>
        <h3 style="color: #fbbf24;">Message:</h3>
        <pre style="background: #111827; padding: 15px; border-radius: 4px; overflow-x: auto;">${errorRecord.errorMessage}</pre>
        ${errorRecord.errorStack ? `
        <h3 style="color: #fbbf24;">Stack Trace:</h3>
        <pre style="background: #111827; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 11px;">${errorRecord.errorStack}</pre>
        ` : ''}
        <h3 style="color: #fbbf24;">Context:</h3>
        <pre style="background: #111827; padding: 15px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(errorRecord.context, null, 2)}</pre>
      </div>
    `,
  });

  await db
    .update(runErrors)
    .set({
      escalated: true,
      escalatedAt: new Date(),
    })
    .where(eq(runErrors.id, errorRecord.id));

  logger.warn("ErrorTracking", "Error escalated to support", { errorId: errorRecord.id });
}

/**
 * Check if error should be escalated (after max retries)
 */
export async function checkAndEscalate(errorId: number): Promise<void> {
  const [errorRecord] = await db
    .select()
    .from(runErrors)
    .where(eq(runErrors.id, errorId))
    .limit(1);

  if (!errorRecord) return;

  if (errorRecord.retryCount >= errorRecord.maxRetries && !errorRecord.resolved && !errorRecord.escalated) {
    await escalateError(errorRecord);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const ErrorHandling = {
  trackError,
  shouldRetry,
  scheduleRetry,
  resolveError,
  getErrorsReadyForRetry,
  notifyUserOfError,
  escalateError,
  checkAndEscalate,
  calculateRetryDelay,
};
