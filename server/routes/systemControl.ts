/**
 * System Control API Routes - Step 10.6: Governance & Kill Switches
 *
 * API endpoints for managing:
 * - Global kill switch
 * - System operation modes
 * - Service-level controls
 * - Website-level controls
 * - System status monitoring
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  isGlobalKillSwitchActive,
  activateGlobalKillSwitch,
  deactivateGlobalKillSwitch,
  getGlobalKillSwitchState,
  getSystemMode,
  setSystemMode,
  isServiceDisabled,
  disableService,
  enableService,
  isWebsitePaused,
  pauseWebsite,
  resumeWebsite,
  performSafetyCheck,
} from '../services/killSwitchService';
import { SystemModes } from '@shared/schema';
import { recoverExpiredLocks, getJobLockStatus } from '../services/jobLockingService';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL KILL SWITCH
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/system/kill-switch
 * Get global kill switch status
 */
router.get('/kill-switch', async (req, res) => {
  try {
    const state = await getGlobalKillSwitchState();
    res.json(state);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get kill switch state',
    });
  }
});

/**
 * POST /api/system/kill-switch/activate
 * Activate global kill switch (EMERGENCY STOP)
 */
router.post('/kill-switch/activate', async (req, res) => {
  try {
    const schema = z.object({
      reason: z.string().min(10, 'Reason must be at least 10 characters'),
      triggeredBy: z.string().email('Valid email required'),
    });

    const { reason, triggeredBy } = schema.parse(req.body);

    await activateGlobalKillSwitch({ reason, triggeredBy });

    res.json({
      success: true,
      message: 'Global kill switch activated - all processing stopped',
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to activate kill switch',
    });
  }
});

/**
 * POST /api/system/kill-switch/deactivate
 * Deactivate global kill switch (RESUME)
 */
router.post('/kill-switch/deactivate', async (req, res) => {
  try {
    const schema = z.object({
      reason: z.string().optional(),
      triggeredBy: z.string().email('Valid email required'),
    });

    const { reason, triggeredBy } = schema.parse(req.body);

    await deactivateGlobalKillSwitch({ reason, triggeredBy });

    res.json({
      success: true,
      message: 'Global kill switch deactivated - processing resumed',
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to deactivate kill switch',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM MODE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/system/mode
 * Get current system operation mode
 */
router.get('/mode', async (req, res) => {
  try {
    const mode = await getSystemMode();
    res.json({
      mode,
      modes: Object.values(SystemModes),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get system mode',
    });
  }
});

/**
 * POST /api/system/mode
 * Set system operation mode
 */
router.post('/mode', async (req, res) => {
  try {
    const schema = z.object({
      mode: z.enum([SystemModes.NORMAL, SystemModes.MAINTENANCE, SystemModes.EMERGENCY]),
      reason: z.string().optional(),
      triggeredBy: z.string().email('Valid email required'),
    });

    const { mode, reason, triggeredBy } = schema.parse(req.body);

    await setSystemMode(mode, { reason, triggeredBy });

    res.json({
      success: true,
      mode,
      message: `System mode changed to ${mode}`,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to set system mode',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE CONTROLS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/system/services/:serviceName/status
 * Check if a service is disabled
 */
router.get('/services/:serviceName/status', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const disabled = await isServiceDisabled(serviceName);

    res.json({
      serviceName,
      disabled,
      status: disabled ? 'disabled' : 'enabled',
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to check service status',
    });
  }
});

/**
 * POST /api/system/services/:serviceName/disable
 * Disable a specific service
 */
router.post('/services/:serviceName/disable', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const schema = z.object({
      reason: z.string().min(10, 'Reason must be at least 10 characters'),
      triggeredBy: z.string().email('Valid email required'),
    });

    const { reason, triggeredBy } = schema.parse(req.body);

    await disableService(serviceName, { reason, triggeredBy });

    res.json({
      success: true,
      serviceName,
      message: `Service ${serviceName} disabled`,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to disable service',
    });
  }
});

/**
 * POST /api/system/services/:serviceName/enable
 * Enable a specific service
 */
router.post('/services/:serviceName/enable', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const schema = z.object({
      reason: z.string().optional(),
      triggeredBy: z.string().email('Valid email required'),
    });

    const { reason, triggeredBy } = schema.parse(req.body);

    await enableService(serviceName, { reason, triggeredBy });

    res.json({
      success: true,
      serviceName,
      message: `Service ${serviceName} enabled`,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to enable service',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// WEBSITE CONTROLS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/system/websites/:websiteId/status
 * Check if a website is paused
 */
router.get('/websites/:websiteId/status', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const paused = await isWebsitePaused(websiteId);

    res.json({
      websiteId,
      paused,
      status: paused ? 'paused' : 'active',
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to check website status',
    });
  }
});

/**
 * POST /api/system/websites/:websiteId/pause
 * Pause processing for a website
 */
router.post('/websites/:websiteId/pause', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const schema = z.object({
      reason: z.string().min(10, 'Reason must be at least 10 characters'),
      triggeredBy: z.string().email('Valid email required'),
    });

    const { reason, triggeredBy } = schema.parse(req.body);

    await pauseWebsite(websiteId, { reason, triggeredBy });

    res.json({
      success: true,
      websiteId,
      message: `Website ${websiteId} paused`,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to pause website',
    });
  }
});

/**
 * POST /api/system/websites/:websiteId/resume
 * Resume processing for a website
 */
router.post('/websites/:websiteId/resume', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const schema = z.object({
      reason: z.string().optional(),
      triggeredBy: z.string().email('Valid email required'),
    });

    const { reason, triggeredBy } = schema.parse(req.body);

    await resumeWebsite(websiteId, { reason, triggeredBy });

    res.json({
      success: true,
      websiteId,
      message: `Website ${websiteId} resumed`,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to resume website',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SAFETY CHECKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/system/safety-check
 * Perform comprehensive safety check
 */
router.post('/safety-check', async (req, res) => {
  try {
    const schema = z.object({
      serviceName: z.string().optional(),
      websiteId: z.string().optional(),
      requiresChanges: z.boolean().optional(),
    });

    const params = schema.parse(req.body);
    const result = await performSafetyCheck(params);

    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to perform safety check',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// JOB LOCK STATUS & MAINTENANCE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/system/jobs/:jobId/lock
 * Get job lock status
 */
router.get('/jobs/:jobId/lock', async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = await getJobLockStatus(jobId);

    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get job lock status',
    });
  }
});

/**
 * POST /api/system/jobs/recover-expired-locks
 * Recover expired job locks (admin endpoint)
 */
router.post('/jobs/recover-expired-locks', async (req, res) => {
  try {
    const result = await recoverExpiredLocks();

    res.json({
      success: true,
      ...result,
      message: `Recovered ${result.recovered} expired locks`,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to recover expired locks',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM STATUS (Overall Health)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/system/status
 * Get overall system status
 */
router.get('/status', async (req, res) => {
  try {
    const [killSwitchActive, systemMode, killSwitchState] = await Promise.all([
      isGlobalKillSwitchActive(),
      getSystemMode(),
      getGlobalKillSwitchState(),
    ]);

    res.json({
      healthy: !killSwitchActive,
      killSwitch: {
        active: killSwitchActive,
        ...killSwitchState,
      },
      mode: systemMode,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get system status',
    });
  }
});

export default router;
