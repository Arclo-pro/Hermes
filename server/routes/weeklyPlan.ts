/**
 * Weekly Plan API Routes
 *
 * Endpoints for viewing and managing the weekly update pipeline.
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  getCurrentWeeklyPlan,
  getUpdatePipeline,
  getAgentUpdatePipeline,
  moveSuggestionInPipeline,
  runWeeklyPublish,
} from '../services/weeklyPublisher';
import { storage } from '../storage';
import { logger } from '../utils/logger';

const router = Router();

// Helper: get session user id
function getUserId(req: any): number | null {
  return req.session?.userId || null;
}

// ============================================================
// GET /api/weekly-plan/:siteId
// Current week's published plan with full suggestion data
// ============================================================
router.get('/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await getCurrentWeeklyPlan(siteId);
    res.json(result);
  } catch (error) {
    logger.error('[WeeklyPlan] Get current plan error', error as string);
    res.status(500).json({ error: 'Failed to get weekly plan' });
  }
});

// ============================================================
// GET /api/weekly-plan/:siteId/history
// Past weekly plans (last 12 weeks)
// ============================================================
router.get('/:siteId/history', async (req, res) => {
  try {
    const { siteId } = req.params;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const limit = parseInt(req.query.limit as string) || 12;
    const plans = await storage.getWeeklyPlanHistory(siteId, limit);
    res.json({ plans });
  } catch (error) {
    logger.error('[WeeklyPlan] Get history error', error as string);
    res.status(500).json({ error: 'Failed to get plan history' });
  }
});

// ============================================================
// POST /api/weekly-plan/:siteId/publish
// Manually trigger weekly publish for a site
// ============================================================
router.post('/:siteId/publish', async (req, res) => {
  try {
    const { siteId } = req.params;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await runWeeklyPublish(siteId);
    if (!result) {
      return res.json({ success: false, message: 'No suggestions to publish' });
    }
    res.json({ success: true, plan: result.plan, updatedCount: result.updatedSuggestions.length });
  } catch (error) {
    logger.error('[WeeklyPlan] Manual publish error', error as string);
    res.status(500).json({ error: 'Failed to publish weekly plan' });
  }
});

// ============================================================
// GET /api/update-pipeline/:siteId
// Full pipeline view (all suggestions grouped by status)
// ============================================================
router.get('/pipeline/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const pipeline = await getUpdatePipeline(siteId);
    res.json(pipeline);
  } catch (error) {
    logger.error('[WeeklyPlan] Get pipeline error', error as string);
    res.status(500).json({ error: 'Failed to get pipeline' });
  }
});

// ============================================================
// GET /api/update-pipeline/:siteId/agent/:agentId
// Per-agent pipeline view
// ============================================================
router.get('/pipeline/:siteId/agent/:agentId', async (req, res) => {
  try {
    const { siteId, agentId } = req.params;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const pipeline = await getAgentUpdatePipeline(siteId, agentId);
    res.json(pipeline);
  } catch (error) {
    logger.error('[WeeklyPlan] Get agent pipeline error', error as string);
    res.status(500).json({ error: 'Failed to get agent pipeline' });
  }
});

// ============================================================
// PATCH /api/suggestions/:suggestionId/pipeline
// Move a suggestion to a different pipeline status
// ============================================================
const pipelineUpdateSchema = z.object({
  newStatus: z.enum(['backlog', 'proposed', 'selected', 'published', 'skipped']),
  reason: z.string().optional(),
});

router.patch('/suggestions/:suggestionId/pipeline', async (req, res) => {
  try {
    const { suggestionId } = req.params;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = pipelineUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.error.errors });
    }

    const { newStatus, reason } = parsed.data;
    await moveSuggestionInPipeline(suggestionId, newStatus, reason);
    res.json({ success: true });
  } catch (error) {
    logger.error('[WeeklyPlan] Move suggestion error', error as string);
    res.status(500).json({ error: 'Failed to update suggestion' });
  }
});

export default router;
