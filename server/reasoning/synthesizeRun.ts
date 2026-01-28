/**
 * synthesizeRun.ts
 *
 * Hermes core reasoning: convert raw worker events into a single diagnosis.
 *
 * This is v1 rule-based logic. Future versions will use:
 * - Ralph Wiggum learning patterns
 * - Socrates correlation analysis
 * - More sophisticated cause-effect modeling
 */

import { KBaseEvent } from '@arclo/kbase-client';
import { Diagnosis, Signal, SignalType, Severity, Confidence } from './types.js';

/**
 * Main synthesis function - converts raw events into a diagnosis
 */
export async function synthesizeRun(
  website_id: string,
  run_id: string,
  events: KBaseEvent[],
  services_present: string[],
  services_missing?: string[]
): Promise<Diagnosis> {
  // Step 1: Extract signals from raw events
  const signals = extractSignals(events);

  // Step 2: Apply reasoning rules to determine primary cause
  const primary_cause = determinePrimaryCause(signals);

  // Step 3: Identify supporting causes
  const supporting_causes = identifySupportingCauses(signals, primary_cause);

  // Step 4: Generate what changed
  const what_changed = generateWhatChanged(signals);

  // Step 5: Generate recommendations
  const what_to_do_next = generateRecommendations(signals, primary_cause);

  // Step 6: Calculate confidence
  const confidence = calculateConfidence(signals, services_missing);

  return {
    primary_cause,
    supporting_causes,
    what_changed,
    what_to_do_next,
    confidence,
    missing_services: services_missing,
    run_id,
    website_id,
    services_analyzed: services_present,
    synthesized_at: new Date(),
  };
}

/**
 * Extract normalized signals from raw kbase events
 */
function extractSignals(events: KBaseEvent[]): Signal[] {
  const signals: Signal[] = [];

  for (const event of events) {
    if (event.type !== 'result') continue;

    const payload = event.payload;
    const service = event.service;

    // Technical SEO signals
    if (service === 'technical-seo') {
      const findings = payload.findings as any[] || [];
      for (const finding of findings) {
        signals.push({
          service,
          type: 'technical',
          severity: mapSeverity(finding.severity),
          headline: finding.message || finding.code || 'Technical issue detected',
          evidence: finding,
          created_at: event.created_at,
        });
      }
    }

    // SERP/Rankings signals
    else if (service === 'serp-intelligence') {
      if (payload.rankings_dropped) {
        signals.push({
          service,
          type: 'rankings',
          severity: 'high',
          headline: 'Keyword rankings have dropped',
          evidence: payload,
          created_at: event.created_at,
        });
      }
    }

    // Domain Authority signals
    else if (service === 'domain-authority') {
      if (payload.authority_delta && Math.abs(payload.authority_delta) > 5) {
        signals.push({
          service,
          type: 'authority',
          severity: payload.authority_delta < 0 ? 'medium' : 'info',
          headline: `Domain authority ${payload.authority_delta < 0 ? 'decreased' : 'increased'} by ${Math.abs(payload.authority_delta)}`,
          evidence: payload,
          created_at: event.created_at,
        });
      }
    }

    // Core Web Vitals signals
    else if (service === 'vitals-monitor') {
      if (payload.vitals_failing) {
        signals.push({
          service,
          type: 'vitals',
          severity: 'high',
          headline: 'Core Web Vitals degraded',
          evidence: payload,
          created_at: event.created_at,
        });
      }
    }

    // Generic fallback for any service with findings
    else if (payload.findings && Array.isArray(payload.findings)) {
      for (const finding of payload.findings) {
        signals.push({
          service,
          type: 'technical', // default
          severity: mapSeverity(finding.severity),
          headline: finding.message || event.summary || 'Issue detected',
          evidence: finding,
          created_at: event.created_at,
        });
      }
    }
  }

  return signals;
}

/**
 * Determine the primary cause using rule-based logic
 */
function determinePrimaryCause(signals: Signal[]): string | null {
  if (signals.length === 0) {
    return null;
  }

  // Rule 1: Critical technical issues take precedence
  const criticalTechnical = signals.find(s =>
    s.type === 'technical' && (s.severity === 'critical' || s.severity === 'high')
  );
  if (criticalTechnical) {
    return `Technical SEO issue: ${criticalTechnical.headline}`;
  }

  // Rule 2: Core Web Vitals failures
  const vitalIssues = signals.filter(s => s.type === 'vitals' && s.severity === 'high');
  if (vitalIssues.length > 0) {
    return 'Core Web Vitals performance degraded';
  }

  // Rule 3: Ranking drops combined with competitor changes
  const rankingDrops = signals.filter(s => s.type === 'rankings');
  if (rankingDrops.length > 0) {
    return 'Keyword rankings declined';
  }

  // Rule 4: Authority changes
  const authorityChanges = signals.filter(s => s.type === 'authority' && s.severity !== 'info');
  if (authorityChanges.length > 0) {
    return authorityChanges[0].headline;
  }

  // Default: general monitoring
  return 'Routine monitoring completed - no critical issues detected';
}

/**
 * Identify supporting causes
 */
function identifySupportingCauses(signals: Signal[], primary_cause: string | null): string[] {
  const causes: string[] = [];

  // Group signals by type
  const byType = new Map<SignalType, Signal[]>();
  for (const signal of signals) {
    if (!byType.has(signal.type)) {
      byType.set(signal.type, []);
    }
    byType.get(signal.type)!.push(signal);
  }

  // Add non-primary causes
  for (const [type, typeSignals] of byType.entries()) {
    const highSeverity = typeSignals.filter(s => s.severity === 'high' || s.severity === 'critical');
    if (highSeverity.length > 0 && !primary_cause?.toLowerCase().includes(type)) {
      causes.push(`${type} issues detected (${highSeverity.length})`);
    }
  }

  return causes;
}

/**
 * Generate what changed list
 */
function generateWhatChanged(signals: Signal[]): string[] {
  const changes: string[] = [];

  for (const signal of signals) {
    if (signal.severity === 'high' || signal.severity === 'critical') {
      changes.push(signal.headline);
    }
  }

  if (changes.length === 0) {
    changes.push('No significant changes detected');
  }

  return changes.slice(0, 5); // Top 5
}

/**
 * Generate prioritized recommendations
 */
function generateRecommendations(signals: Signal[], primary_cause: string | null): string[] {
  const recommendations: string[] = [];

  // Technical issues
  const technical = signals.filter(s => s.type === 'technical' && s.severity === 'high');
  if (technical.length > 0) {
    recommendations.push('Fix critical technical SEO issues immediately');
  }

  // Vitals
  const vitals = signals.filter(s => s.type === 'vitals');
  if (vitals.length > 0) {
    recommendations.push('Improve Core Web Vitals performance');
  }

  // Rankings
  const rankings = signals.filter(s => s.type === 'rankings');
  if (rankings.length > 0) {
    recommendations.push('Investigate keyword ranking changes and competitor movements');
  }

  // Default
  if (recommendations.length === 0) {
    recommendations.push('Continue routine monitoring');
    recommendations.push('Review upcoming content calendar');
  }

  return recommendations.slice(0, 5);
}

/**
 * Calculate confidence based on data completeness
 */
function calculateConfidence(signals: Signal[], services_missing?: string[]): Confidence {
  const missingCount = services_missing?.length || 0;

  if (missingCount === 0 && signals.length >= 3) {
    return 'high';
  } else if (missingCount <= 1 && signals.length >= 1) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Map string severity to enum
 */
function mapSeverity(sev: string | undefined): Severity {
  const normalized = (sev || 'info').toLowerCase();
  if (normalized === 'critical') return 'critical';
  if (normalized === 'high') return 'high';
  if (normalized === 'medium') return 'medium';
  if (normalized === 'low') return 'low';
  return 'info';
}
