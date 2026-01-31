/**
 * readRunEvents.ts
 *
 * Fetches all kbase_events for a given website_id and run_id.
 * This gives Hermes the raw data from all workers to synthesize a diagnosis.
 */

import { KBaseClient, KBaseEvent } from '@arclo/kbase-client';

export interface ReadRunEventsInput {
  website_id: string;
  run_id: string;
}

export interface ReadRunEventsResult {
  events: KBaseEvent[];
  services_present: string[];
  services_missing?: string[];
}

/**
 * Expected services that should report for a complete run
 */
const EXPECTED_SERVICES = [
  'technical-seo',
  'serp-intelligence',
  'domain-authority',
  'vitals-monitor',
  // Add more as they come online
];

/**
 * Read all events for a specific run
 */
export async function readRunEvents(
  kbase: KBaseClient,
  input: ReadRunEventsInput
): Promise<ReadRunEventsResult> {
  const { website_id, run_id } = input;

  // Fetch all events for this run
  const events = await kbase.readByRunId({
    website_id,
    run_id,
  });

  // Identify which services actually reported
  const servicesPresent = new Set<string>();
  for (const event of events) {
    if (event.type === 'result') {
      servicesPresent.add(event.service || 'unknown');
    }
  }

  const servicesPresentArray = Array.from(servicesPresent);

  // Identify missing services
  const servicesMissing = EXPECTED_SERVICES.filter(
    s => !servicesPresent.has(s)
  );

  return {
    events,
    services_present: servicesPresentArray,
    services_missing: servicesMissing.length > 0 ? servicesMissing : undefined,
  };
}
