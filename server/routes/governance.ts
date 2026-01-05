import { Router } from 'express';
import { z } from 'zod';
import { changeLogService, type ProposeChangeInput } from '../services/changeLog';
import { kbValidatorService } from '../services/kbValidator';
import { cadenceCheckerService } from '../services/cadenceChecker';
import { deployWindowService } from '../services/deployWindowService';
import { db } from '../db';
import { changes, deployWindows, kbRules } from '@shared/schema';
import { eq, desc, and, or } from 'drizzle-orm';

const router = Router();

const proposeChangeSchema = z.object({
  websiteId: z.string(),
  agentId: z.string(),
  changeType: z.enum(['content', 'technical', 'performance', 'config']),
  scope: z.enum(['single_page', 'template', 'sitewide']),
  description: z.string(),
  reason: z.string().optional(),
  trigger: z.enum(['scheduled_run', 'manual', 'alert']),
  affectedUrls: z.array(z.string()).optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
});

router.post('/changes/propose', async (req, res) => {
  try {
    const input = proposeChangeSchema.parse(req.body);
    const changeId = await changeLogService.logProposedChange(input as ProposeChangeInput);
    res.json({ changeId, status: 'proposed' });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

router.post('/changes/:changeId/validate', async (req, res) => {
  try {
    const { changeId } = req.params;
    const change = await changeLogService.getChange(changeId);
    
    if (!change) {
      return res.status(404).json({ error: 'Change not found' });
    }

    const kbResult = await kbValidatorService.validateChange(
      {
        changeType: change.changeType,
        scope: change.scope,
        affectedUrls: change.affectedUrls as string[],
        description: change.description,
      },
      { websiteId: change.websiteId }
    );

    const cadenceResult = await cadenceCheckerService.checkCadence(
      change.websiteId,
      {
        changeType: change.changeType,
        scope: change.scope,
        affectedUrls: change.affectedUrls as string[],
      }
    );

    const knowledgePass = kbResult.pass;
    const cadencePass = cadenceResult.pass;
    const policyPass = kbResult.outcome !== 'block';
    
    let skipReason: string | undefined;
    if (!knowledgePass) {
      skipReason = `KB validation failed: ${kbResult.reasons.join('; ')}`;
    } else if (!cadencePass) {
      skipReason = cadenceResult.reason;
    }

    await changeLogService.markValidated(changeId, {
      knowledgePass,
      policyPass,
      conflictsDetected: kbResult.ruleHits.length > 1,
      cadencePass,
      cadenceBlockReason: cadenceResult.reason,
      skipReason,
    });

    res.json({
      changeId,
      knowledgePass,
      policyPass,
      cadencePass,
      status: knowledgePass && cadencePass ? 'validated' : 'skipped',
      kbResult,
      cadenceResult,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Validation failed' });
  }
});

router.post('/changes/:changeId/queue', async (req, res) => {
  try {
    const { changeId } = req.params;
    const change = await changeLogService.getChange(changeId);
    
    if (!change) {
      return res.status(404).json({ error: 'Change not found' });
    }

    if (change.status === 'skipped') {
      return res.status(400).json({ error: 'Cannot queue a skipped change' });
    }

    if (!change.knowledgePass || !change.cadencePass) {
      return res.status(400).json({ error: 'Change has not passed validation' });
    }

    const deployWindowId = await deployWindowService.assignToDeployWindow(change.websiteId, changeId);
    
    res.json({
      changeId,
      deployWindowId,
      status: 'queued',
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Queue failed' });
  }
});

router.post('/deploy-windows/:deployWindowId/execute', async (req, res) => {
  try {
    const { deployWindowId } = req.params;
    await deployWindowService.executeWindow(deployWindowId);
    
    res.json({
      deployWindowId,
      status: 'executed',
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Execution failed' });
  }
});

router.get('/websites/:websiteId/changes', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { limit = '20', status } = req.query;
    
    let query = db.select()
      .from(changes)
      .where(eq(changes.websiteId, websiteId))
      .orderBy(desc(changes.createdAt))
      .limit(parseInt(limit as string, 10));

    const results = await query;
    
    const filtered = status
      ? results.filter(c => c.status === status)
      : results;
    
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch changes' });
  }
});

router.get('/websites/:websiteId/deploy-windows', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { status } = req.query;
    
    let results;
    if (status === 'scheduled') {
      results = await deployWindowService.getScheduledWindows(websiteId);
    } else {
      results = await deployWindowService.getRecentWindows(websiteId, 20);
    }
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch windows' });
  }
});

router.get('/websites/:websiteId/cadence-settings', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const settings = await cadenceCheckerService.getOrCreateSettings(websiteId);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch settings' });
  }
});

router.patch('/websites/:websiteId/cadence-settings', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const settings = await cadenceCheckerService.updateSettings(websiteId, req.body);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update settings' });
  }
});

router.get('/kb/rules', async (req, res) => {
  try {
    const rules = await kbValidatorService.getAllRules();
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch rules' });
  }
});

router.post('/kb/rules', async (req, res) => {
  try {
    const rule = await kbValidatorService.createRule(req.body);
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create rule' });
  }
});

export default router;
