/**
 * types.ts
 *
 * Shared types for Hermes reasoning and diagnosis
 */

export type SignalType = 'technical' | 'rankings' | 'authority' | 'content' | 'analytics' | 'vitals';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type Confidence = 'low' | 'medium' | 'high';

/**
 * A normalized signal extracted from worker payloads
 */
export interface Signal {
  service: string;
  type: SignalType;
  severity: Severity;
  headline: string;
  evidence: Record<string, any>;
  created_at: Date;
}

/**
 * The main diagnosis object Hermes produces
 */
export interface Diagnosis {
  // Core analysis
  primary_cause: string | null;
  supporting_causes: string[];

  // Human-readable summaries
  what_changed: string[];
  what_to_do_next: string[];

  // Metadata
  confidence: Confidence;
  missing_services?: string[];

  // References
  run_id: string;
  website_id: string;
  services_analyzed: string[];

  // Timestamp
  synthesized_at: Date;
}
