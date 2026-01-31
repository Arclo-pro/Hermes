/**
 * synthesis.ts
 *
 * API routes for Hermes synthesis and diagnosis
 */

import { Router } from 'express';
import { KBaseClient } from '@arclo/kbase-client';
import { synthesizeAndWriteDiagnosis } from '../kbase/index.js';
import { z } from 'zod';

export const synthesisRouter = Router();

// Initialize KBase client (shared across routes)
let kbase: KBaseClient | null = null;

function getKBaseClient(): KBaseClient {
  if (!kbase) {
    kbase = KBaseClient.fromEnv();
  }
  return kbase;
}

// Request schema
const SynthesizeRunSchema = z.object({
  website_id: z.string().uuid(),
  run_id: z.string().uuid(),
});

/**
 * POST /api/synthesis/run
 *
 * Trigger Hermes to read worker results, synthesize a diagnosis,
 * and write summary back to KBase.
 *
 * Body:
 * {
 *   "website_id": "uuid",
 *   "run_id": "uuid"
 * }
 */
synthesisRouter.post('/run', async (req, res, next) => {
  try {
    // Validate request
    const parseResult = SynthesizeRunSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'invalid_input',
          message: 'Invalid request body',
          details: parseResult.error.errors,
        },
      });
    }

    const { website_id, run_id } = parseResult.data;

    console.log(`[synthesis] Starting synthesis for run ${run_id}`);

    // Execute synthesis
    const kbaseClient = getKBaseClient();
    const result = await synthesizeAndWriteDiagnosis(kbaseClient, {
      website_id,
      run_id,
    });

    console.log(`[synthesis] Completed synthesis for run ${run_id}`);

    return res.json({
      ok: true,
      data: {
        diagnosis: result.diagnosis,
        summary_event_id: result.event_id,
      },
    });
  } catch (error: any) {
    console.error('[synthesis] Error:', error);
    next(error);
  }
});

/**
 * GET /api/synthesis/health
 *
 * Health check for synthesis service
 */
synthesisRouter.get('/health', async (req, res) => {
  try {
    const kbaseClient = getKBaseClient();
    const isHealthy = await (kbaseClient as any).ping();

    return res.json({
      ok: true,
      service: 'hermes-synthesis',
      kbase_connected: isHealthy,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      service: 'hermes-synthesis',
      error: {
        code: 'health_check_failed',
        message: error.message,
      },
    });
  }
});
