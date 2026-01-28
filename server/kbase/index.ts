/**
 * kbase/index.ts
 *
 * Main entry point for Hermes Knowledge Base operations.
 * Orchestrates reading, reasoning, and writing.
 */

import { KBaseClient } from '@arclo/kbase-client';
import { readRunEvents, ReadRunEventsInput } from './readRunEvents.js';
import { writeRunSummary } from './writeRunSummary.js';
import { synthesizeRun } from '../reasoning/synthesizeRun.js';
import { Diagnosis } from '../reasoning/types.js';

export interface SynthesizeAndWriteInput {
  website_id: string;
  run_id: string;
}

export interface SynthesizeAndWriteResult {
  diagnosis: Diagnosis;
  event_id: string;
}

/**
 * Complete Hermes analysis flow:
 * 1. Read all worker results for a run
 * 2. Synthesize into a diagnosis
 * 3. Write summary back to KBase
 */
export async function synthesizeAndWriteDiagnosis(
  kbase: KBaseClient,
  input: SynthesizeAndWriteInput
): Promise<SynthesizeAndWriteResult> {
  const { website_id, run_id } = input;

  // Step 1: Read events
  const { events, services_present, services_missing } = await readRunEvents(kbase, {
    website_id,
    run_id,
  });

  console.log(`[hermes] Read ${events.length} events for run ${run_id}`);
  console.log(`[hermes] Services present: ${services_present.join(', ')}`);
  if (services_missing && services_missing.length > 0) {
    console.log(`[hermes] Services missing: ${services_missing.join(', ')}`);
  }

  // Step 2: Synthesize diagnosis
  const diagnosis = await synthesizeRun(
    website_id,
    run_id,
    events,
    services_present,
    services_missing
  );

  console.log(`[hermes] Diagnosis: ${diagnosis.primary_cause || 'No primary cause'}`);
  console.log(`[hermes] Confidence: ${diagnosis.confidence}`);

  // Step 3: Write summary
  const summaryEvent = await writeRunSummary(kbase, diagnosis);

  console.log(`[hermes] Wrote summary event: ${summaryEvent.id}`);

  return {
    diagnosis,
    event_id: summaryEvent.id,
  };
}

// Re-export for convenience
export { readRunEvents } from './readRunEvents.js';
export { writeRunSummary } from './writeRunSummary.js';
export type { Diagnosis } from '../reasoning/types.js';
