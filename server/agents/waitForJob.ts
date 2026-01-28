/**
 * waitForJob - Poll job_queue until job reaches terminal state
 *
 * Provides blocking awareness of job completion without webhooks or callbacks.
 * All coordination happens via Postgres - no worker coupling.
 */

import { db } from '../db';
import { jobQueue, JobQueueStatus, JobQueueStatuses } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════════════════
// Error Classes
// ═══════════════════════════════════════════════════════════════════════════

export class JobTimeoutError extends Error {
  constructor(
    public jobId: string,
    public timeoutMs: number,
    public lastStatus: string
  ) {
    super(`Job ${jobId} did not complete within ${timeoutMs}ms (last status: ${lastStatus})`);
    this.name = 'JobTimeoutError';
  }
}

export class JobNotFoundError extends Error {
  constructor(public jobId: string) {
    super(`Job ${jobId} not found in queue`);
    this.name = 'JobNotFoundError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TypeScript Interfaces
// ═══════════════════════════════════════════════════════════════════════════

export interface WaitForJobOptions {
  /** Job ID to wait for */
  jobId: string;

  /** Polling interval in milliseconds (default: 2000) */
  pollIntervalMs?: number;

  /** Maximum wait time in milliseconds (default: 300000 = 5min) */
  timeoutMs?: number;

  /** Optional callback for status updates */
  onStatusChange?: (status: JobQueueStatus) => void;
}

export interface WaitForJobResult {
  /** Final job status */
  status: 'completed' | 'failed';

  /** Number of attempts made by worker */
  attempts: number;

  /** Result data from successful job (null if failed) */
  result: Record<string, any> | null;

  /** Error message if failed (null if completed) */
  errorMessage: string | null;

  /** Total time spent waiting in milliseconds */
  waitDurationMs: number;

  /** When the job completed */
  completedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// Core Polling Logic
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wait for a job to reach terminal state (completed or failed)
 *
 * Polls the job_queue table at regular intervals until the job finishes or timeout is reached.
 * Terminal states: 'completed' (success) or 'failed' (failure)
 * Non-terminal states: 'queued', 'claimed', 'running' (keep polling)
 *
 * @param options - Wait configuration
 * @returns Promise<WaitForJobResult> - Job completion details
 * @throws JobTimeoutError if timeout is exceeded
 * @throws JobNotFoundError if job doesn't exist
 */
export async function waitForJob(
  options: WaitForJobOptions
): Promise<WaitForJobResult> {
  const {
    jobId,
    pollIntervalMs = 2000,
    timeoutMs = 300000, // 5 minutes default
    onStatusChange,
  } = options;

  const startTime = Date.now();
  let lastStatus: string | null = null;

  logger.info("waitForJob", `Waiting for job completion: jobId=${jobId}, timeout=${timeoutMs}ms, pollInterval=${pollIntervalMs}ms`);

  while (true) {
    const elapsed = Date.now() - startTime;

    // Check timeout
    if (elapsed >= timeoutMs) {
      logger.error("waitForJob", `Job timeout exceeded: jobId=${jobId}`, {
        timeoutMs,
        elapsed,
        lastStatus,
      });
      throw new JobTimeoutError(jobId, timeoutMs, lastStatus || 'unknown');
    }

    // Query job status
    const [job] = await db
      .select({
        status: jobQueue.status,
        attempts: jobQueue.attempts,
        result: jobQueue.result,
        errorMessage: jobQueue.errorMessage,
        completedAt: jobQueue.completedAt,
      })
      .from(jobQueue)
      .where(eq(jobQueue.jobId, jobId))
      .limit(1);

    // Job not found
    if (!job) {
      logger.error("waitForJob", `Job not found: jobId=${jobId}`);
      throw new JobNotFoundError(jobId);
    }

    // Status change callback
    if (job.status !== lastStatus) {
      if (lastStatus !== null) {
        logger.info("waitForJob", `Job status changed: jobId=${jobId}, ${lastStatus} → ${job.status}`);
      }
      if (onStatusChange) {
        onStatusChange(job.status as JobQueueStatus);
      }
    }
    lastStatus = job.status;

    // Terminal states
    if (job.status === JobQueueStatuses.COMPLETED || job.status === JobQueueStatuses.FAILED) {
      const waitDurationMs = Date.now() - startTime;

      logger.info("waitForJob", `Job reached terminal state: jobId=${jobId}, status=${job.status}, duration=${waitDurationMs}ms`);

      return {
        status: job.status as 'completed' | 'failed',
        attempts: job.attempts ?? 0,
        result: job.status === JobQueueStatuses.COMPLETED ? (job.result as Record<string, any> | null) : null,
        errorMessage: job.errorMessage,
        waitDurationMs,
        completedAt: job.completedAt!,
      };
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
}
