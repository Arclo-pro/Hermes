/**
 * Job Locking Service - Step 10.2: Horizontal Worker Scaling
 *
 * Provides distributed job locking to prevent duplicate execution:
 * - Optimistic locking with version numbers
 * - Lock expiry for stuck jobs
 * - Worker heartbeat tracking
 * - Automatic lock recovery
 */

import { db } from '../db';
import { jobQueue, JobQueueStatuses } from '@shared/schema';
import { eq, and, lt, isNull, or } from 'drizzle-orm';
import { logger } from '../utils/logger';

export interface ClaimJobOptions {
  workerId: string;
  websiteId?: string; // Step 7.1: Optional website filter for tenant isolation
  lockDurationMs?: number; // How long to hold the lock (default: 5 minutes)
  maxAttempts?: number; // Max retry attempts before giving up (default: 3)
}

export interface ClaimJobResult {
  success: boolean;
  jobId?: string;
  job?: any;
  error?: string;
}

export interface HeartbeatResult {
  success: boolean;
  lockExtended: boolean;
  error?: string;
}

/**
 * Claim the next available job from the queue
 *
 * Uses optimistic locking to prevent duplicate claims:
 * 1. Find a queued job (or expired claimed job)
 * 2. Attempt to claim it with lock_version increment
 * 3. If successful, return the job; if failed (race condition), retry
 */
export async function claimNextJob(options: ClaimJobOptions): Promise<ClaimJobResult> {
  const { workerId, websiteId, lockDurationMs = 5 * 60 * 1000, maxAttempts = 3 } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Find next available job (queued OR expired lock)
      // Step 7.1: Filter by websiteId if provided for tenant isolation
      const now = new Date();
      const lockExpiresAt = new Date(now.getTime() + lockDurationMs);

      // Build base status conditions
      const statusConditions = or(
        // Queued jobs
        eq(jobQueue.status, JobQueueStatuses.QUEUED),
        // Jobs with expired locks
        and(
          eq(jobQueue.status, JobQueueStatuses.CLAIMED),
          lt(jobQueue.lockExpiresAt, now)
        ),
        and(
          eq(jobQueue.status, JobQueueStatuses.RUNNING),
          lt(jobQueue.lockExpiresAt, now)
        )
      );

      // Add websiteId filter if provided
      const whereCondition = websiteId
        ? and(statusConditions, eq(jobQueue.websiteId, websiteId))
        : statusConditions;

      const [job] = await db
        .select()
        .from(jobQueue)
        .where(whereCondition)
        .orderBy(jobQueue.priority, jobQueue.createdAt)
        .limit(1);

      if (!job) {
        return { success: false, error: 'No jobs available' };
      }

      // Attempt to claim with optimistic locking
      const currentLockVersion = job.lockVersion ?? 0;
      const newLockVersion = currentLockVersion + 1;

      const result = await db
        .update(jobQueue)
        .set({
          status: JobQueueStatuses.CLAIMED,
          claimedBy: workerId,
          claimedAt: now,
          lockExpiresAt,
          lockVersion: newLockVersion,
          // lastHeartbeatAt not in schema
        })
        .where(
          and(
            eq(jobQueue.jobId, job.jobId),
            eq(jobQueue.lockVersion, currentLockVersion) // Optimistic lock check
          )
        )
        .returning();

      if (result.length === 0) {
        // Lock version mismatch - another worker claimed it
        logger.warn(
          'JobLockingService',
          `Failed to claim job ${job.jobId} (attempt ${attempt}/${maxAttempts}) - race condition`
        );
        continue; // Retry
      }

      logger.info('JobLockingService', `Job ${job.jobId} claimed by worker ${workerId}`);

      return {
        success: true,
        jobId: job.jobId,
        job: result[0],
      };
    } catch (error) {
      logger.error(
        'JobLockingService',
        `Error claiming job (attempt ${attempt}/${maxAttempts}): ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return { success: false, error: 'Max attempts exceeded' };
}

/**
 * Send heartbeat to keep job lock alive
 *
 * Workers should call this periodically to prevent lock expiry
 */
export async function sendHeartbeat(
  jobId: string,
  workerId: string,
  extendLockByMs: number = 5 * 60 * 1000
): Promise<HeartbeatResult> {
  try {
    const now = new Date();
    const newLockExpiresAt = new Date(now.getTime() + extendLockByMs);

    const result = await db
      .update(jobQueue)
      .set({
        // lastHeartbeatAt not in schema
        lockExpiresAt: newLockExpiresAt,
      })
      .where(
        and(
          eq(jobQueue.jobId, jobId),
          eq(jobQueue.claimedBy, workerId),
          or(
            eq(jobQueue.status, JobQueueStatuses.CLAIMED),
            eq(jobQueue.status, JobQueueStatuses.RUNNING)
          )
        )
      )
      .returning();

    if (result.length === 0) {
      return { success: false, lockExtended: false, error: 'Job not found or not owned by this worker' };
    }

    return { success: true, lockExtended: true };
  } catch (error) {
    return {
      success: false,
      lockExtended: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mark job as running (after successfully claimed)
 */
export async function markJobRunning(jobId: string, workerId: string): Promise<boolean> {
  try {
    const result = await db
      .update(jobQueue)
      .set({
        status: JobQueueStatuses.RUNNING,
        startedAt: new Date(),
      })
      .where(
        and(
          eq(jobQueue.jobId, jobId),
          eq(jobQueue.claimedBy, workerId),
          eq(jobQueue.status, JobQueueStatuses.CLAIMED)
        )
      )
      .returning();

    return result.length > 0;
  } catch (error) {
    logger.error('JobLockingService', `Failed to mark job ${jobId} as running: ${error instanceof Error ? error.message : 'Unknown'}`);
    return false;
  }
}

/**
 * Release job lock (on completion or failure)
 */
export async function releaseJobLock(
  jobId: string,
  workerId: string,
  finalStatus: typeof JobQueueStatuses.COMPLETED | typeof JobQueueStatuses.FAILED,
  result?: any,
  errorMessage?: string
): Promise<boolean> {
  try {
    const updates: any = {
      status: finalStatus,
      completedAt: new Date(),
      lockExpiresAt: null,
    };

    if (result) updates.result = result;
    if (errorMessage) updates.errorMessage = errorMessage;

    const updateResult = await db
      .update(jobQueue)
      .set(updates)
      .where(
        and(
          eq(jobQueue.jobId, jobId),
          eq(jobQueue.claimedBy, workerId)
        )
      )
      .returning();

    return updateResult.length > 0;
  } catch (error) {
    logger.error('JobLockingService', `Failed to release lock for job ${jobId}: ${error instanceof Error ? error.message : 'Unknown'}`);
    return false;
  }
}

/**
 * Recover expired locks (cleanup job for stuck jobs)
 *
 * Should be run periodically by a maintenance worker
 */
export async function recoverExpiredLocks(): Promise<{
  recovered: number;
  jobIds: string[];
}> {
  try {
    const now = new Date();

    const expiredJobs = await db
      .select()
      .from(jobQueue)
      .where(
        and(
          or(
            eq(jobQueue.status, JobQueueStatuses.CLAIMED),
            eq(jobQueue.status, JobQueueStatuses.RUNNING)
          ),
          lt(jobQueue.lockExpiresAt, now)
        )
      );

    if (expiredJobs.length === 0) {
      return { recovered: 0, jobIds: [] };
    }

    // Reset expired jobs back to queued (if attempts remain)
    const jobIds: string[] = [];

    for (const job of expiredJobs) {
      const newAttempts = (job.attempts ?? 0) + 1;

      if (newAttempts >= (job.maxAttempts ?? 3)) {
        // Max attempts reached - mark as failed
        await db
          .update(jobQueue)
          .set({
            status: JobQueueStatuses.FAILED,
            completedAt: new Date(),
            errorMessage: 'Max attempts exceeded - job lock expired',
            attempts: newAttempts,
          })
          .where(eq(jobQueue.jobId, job.jobId));

        logger.warn('JobLockingService', `Job ${job.jobId} failed after ${newAttempts} attempts`);
      } else {
        // Retry - reset to queued
        await db
          .update(jobQueue)
          .set({
            status: JobQueueStatuses.QUEUED,
            claimedBy: null,
            claimedAt: null,
            lockExpiresAt: null,
            // lastHeartbeatAt not in schema
            attempts: newAttempts,
          })
          .where(eq(jobQueue.jobId, job.jobId));

        logger.info('JobLockingService', `Job ${job.jobId} lock recovered (attempt ${newAttempts}/${job.maxAttempts})`);
      }

      jobIds.push(job.jobId);
    }

    return { recovered: expiredJobs.length, jobIds };
  } catch (error) {
    logger.error('JobLockingService', `Error recovering expired locks: ${error instanceof Error ? error.message : 'Unknown'}`);
    return { recovered: 0, jobIds: [] };
  }
}

/**
 * Get job lock status
 */
export async function getJobLockStatus(jobId: string): Promise<{
  locked: boolean;
  workerId?: string;
  expiresAt?: Date;
  lastHeartbeat?: Date;
  status?: string;
}> {
  const [job] = await db
    .select()
    .from(jobQueue)
    .where(eq(jobQueue.jobId, jobId))
    .limit(1);

  if (!job) {
    return { locked: false };
  }

  const isLocked = job.status === JobQueueStatuses.CLAIMED || job.status === JobQueueStatuses.RUNNING;

  return {
    locked: isLocked,
    workerId: job.claimedBy ?? undefined,
    expiresAt: job.lockExpiresAt ?? undefined,
    lastHeartbeat: job.claimedAt ?? undefined,
    status: job.status,
  };
}
