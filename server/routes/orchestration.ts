/**
 * Orchestration Routes
 *
 * API endpoints for triggering and monitoring orchestrated runs
 */

import { Router } from 'express';
import { executeRun } from '../runOrchestrator.js';
import { getAllRunPlans, getRunPlan } from '../runPlan.js';
import { z } from 'zod';

const router = Router();

/**
 * POST /api/orchestration/run
 *
 * Trigger a new orchestrated run for a website
 *
 * Body:
 * {
 *   "website_id": "string",
 *   "domain": "string",
 *   "plan_id": "standard-v1" | "quick-v1" (optional, defaults to standard-v1)
 * }
 */
router.post('/run', async (req, res) => {
  try {
    const schema = z.object({
      website_id: z.string().min(1),
      domain: z.string().min(1),
      plan_id: z.string().optional().default('standard-v1'),
    });

    const { website_id, domain, plan_id } = schema.parse(req.body);

    // Validate plan exists
    const plan = getRunPlan(plan_id);
    if (!plan) {
      return res.status(400).json({
        error: 'Invalid plan_id',
        message: `Unknown run plan: ${plan_id}`,
        available_plans: getAllRunPlans().map((p) => p.planId),
      });
    }

    console.log(`[API] Starting orchestrated run for ${domain} with plan ${plan_id}`);

    // Execute the run (this will take time)
    const summary = await executeRun(website_id, domain, plan_id);

    return res.json({
      success: true,
      run_id: summary.runId,
      status: summary.status,
      summary,
    });
  } catch (error: any) {
    console.error('[API] Orchestration run error:', error);
    return res.status(500).json({
      success: false,
      error: 'Orchestration failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/orchestration/plans
 *
 * Get all available run plans
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = getAllRunPlans();
    return res.json({
      success: true,
      plans: plans.map((plan) => ({
        plan_id: plan.planId,
        name: plan.name,
        description: plan.description,
        max_duration_ms: plan.maxRunDurationMs,
        services: plan.services.map((s) => ({
          service: s.service,
          display_name: s.displayName,
          worker_key: s.workerKey,
          required: s.required,
          depends_on: s.dependsOn,
          timeout_ms: s.timeoutMs,
        })),
      })),
    });
  } catch (error: any) {
    console.error('[API] Get plans error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get plans',
      message: error.message,
    });
  }
});

/**
 * GET /api/orchestration/plans/:planId
 *
 * Get details for a specific run plan
 */
router.get('/plans/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = getRunPlan(planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found',
        message: `Unknown run plan: ${planId}`,
        available_plans: getAllRunPlans().map((p) => p.planId),
      });
    }

    return res.json({
      success: true,
      plan: {
        plan_id: plan.planId,
        name: plan.name,
        description: plan.description,
        max_duration_ms: plan.maxRunDurationMs,
        services: plan.services.map((s) => ({
          service: s.service,
          display_name: s.displayName,
          worker_key: s.workerKey,
          required: s.required,
          depends_on: s.dependsOn,
          timeout_ms: s.timeoutMs,
        })),
      },
    });
  } catch (error: any) {
    console.error('[API] Get plan error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get plan',
      message: error.message,
    });
  }
});

/**
 * GET /api/orchestration/health
 *
 * Health check for orchestration service
 */
router.get('/health', async (req, res) => {
  return res.json({
    success: true,
    service: 'orchestration',
    status: 'healthy',
    available_plans: getAllRunPlans().map((p) => p.planId),
  });
});

export default router;
