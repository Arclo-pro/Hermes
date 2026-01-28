/**
 * writeRunSummary.ts
 *
 * Writes Hermes diagnosis back to the Knowledge Base.
 * This makes the system self-documenting and enables future learning.
 */

import { KBaseClient, KBaseEvent } from '@arclo/kbase-client';
import { Diagnosis } from '../reasoning/types.js';

/**
 * Write a Hermes diagnosis as a summary event in kbase_events
 */
export async function writeRunSummary(
  kbase: KBaseClient,
  diagnosis: Diagnosis
): Promise<KBaseEvent> {
  // Create human-readable summary
  const summary = formatDiagnosisSummary(diagnosis);

  // Write to kbase_events with type='summary' and service='hermes'
  const event = await kbase.writeResult({
    website_id: diagnosis.website_id,
    run_id: diagnosis.run_id,
    job_id: diagnosis.run_id, // Use run_id as job_id for Hermes summaries
    service: 'hermes',
    summary,
    payload: {
      type: 'summary',
      diagnosis: {
        primary_cause: diagnosis.primary_cause,
        supporting_causes: diagnosis.supporting_causes,
        what_changed: diagnosis.what_changed,
        what_to_do_next: diagnosis.what_to_do_next,
        confidence: diagnosis.confidence,
        missing_services: diagnosis.missing_services,
        services_analyzed: diagnosis.services_analyzed,
        synthesized_at: diagnosis.synthesized_at.toISOString(),
      },
    },
  });

  return event;
}

/**
 * Format diagnosis into a concise plain-English summary
 */
function formatDiagnosisSummary(diagnosis: Diagnosis): string {
  const parts: string[] = [];

  // Primary cause
  if (diagnosis.primary_cause) {
    parts.push(`Primary finding: ${diagnosis.primary_cause}`);
  } else {
    parts.push('No critical issues detected');
  }

  // Confidence
  parts.push(`(Confidence: ${diagnosis.confidence})`);

  // Services
  if (diagnosis.missing_services && diagnosis.missing_services.length > 0) {
    parts.push(`Note: ${diagnosis.missing_services.length} service(s) did not report.`);
  }

  return parts.join(' ');
}
