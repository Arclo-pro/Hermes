import { storage } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import type { AttributionRecord, OutcomeEventLog, AgentActionLog, InsertSocratesKbEntry } from '@shared/schema';

/**
 * Ralph Wiggum KB Promotion Service
 *
 * Promotes high-confidence attribution records into Socrates KB entries
 * that agents can consult before taking actions.
 */

export interface KbPromotionConfig {
  minConfidence: number; // Minimum confidence to promote (default 0.8)
  minOccurrences: number; // Minimum times pattern seen (default 1)
  requireEvidence: boolean; // Require outcome evidence (default true)
}

const DEFAULT_CONFIG: KbPromotionConfig = {
  minConfidence: 0.8,
  minOccurrences: 1,
  requireEvidence: true,
};

/**
 * Promote a single attribution record to KB entry
 */
export async function promoteAttributionToKb(
  attributionId: string,
  config: KbPromotionConfig = DEFAULT_CONFIG
): Promise<string | null> {
  // Fetch attribution record
  const attribution = await storage.getAttributionRecordById(attributionId);
  if (!attribution) {
    throw new Error(`Attribution ${attributionId} not found`);
  }

  // Check confidence threshold
  if (attribution.confidence < config.minConfidence) {
    return null; // Not confident enough
  }

  // Fetch outcome event
  const outcome = await storage.getOutcomeEventLogByEventId(attribution.eventId);
  if (!outcome && config.requireEvidence) {
    return null; // No evidence
  }

  // Fetch candidate actions
  const actionIds = (attribution.candidateActionIds as string[]) || [];
  const actions = await storage.getAgentActionLogsByActionIds(actionIds);

  if (actions.length === 0) {
    return null; // No actions to learn from
  }

  // Build KB entry
  const kbId = uuidv4();
  const kbEntry = buildKbEntry(kbId, attribution, outcome!, actions);

  // Create KB entry
  await storage.createSocratesKbEntry(kbEntry);

  return kbId;
}

/**
 * Build a KB entry from attribution + outcome + actions
 */
function buildKbEntry(
  kbId: string,
  attribution: AttributionRecord,
  outcome: OutcomeEventLog,
  actions: AgentActionLog[]
): any {
  const actionTypes = [...new Set(actions.map(a => a.actionType))];
  const tags = [
    outcome.metricKey,
    outcome.eventType,
    ...actionTypes,
    ...extractChangeTags(actions),
  ];

  // Determine problem statement
  const deltaDirection = (outcome.delta || 0) > 0 ? 'increased' : 'decreased';
  const problemStatement = `${outcome.metricKey} ${deltaDirection} by ${Math.abs(outcome.delta || 0).toFixed(2)} ` +
    `(${((outcome.delta || 0) / (outcome.oldValue || 1) * 100).toFixed(1)}%) ` +
    `after ${actionTypes.join(', ')} action(s)`;

  // Build context scope
  const contextScope = {
    metricKeys: [outcome.metricKey],
    siteId: outcome.siteId,
    env: outcome.env,
    actionTypes,
  };

  // Determine recommended and avoided actions
  const isRegression = outcome.eventType === 'regression' || outcome.eventType === 'breakage';
  const isImprovement = outcome.eventType === 'improvement';

  let recommendedAction: string | null = null;
  let avoidAction: string | null = null;
  let guardrail: string | null = null;

  if (isRegression) {
    // Learn what NOT to do
    avoidAction = `Avoid ${actionTypes.join(' + ')} when targeting ${outcome.metricKey}`;
    guardrail = `Monitor ${outcome.metricKey} closely for ${getMonitorWindow(outcome.metricKey)} after ${actionTypes[0]} actions`;
  } else if (isImprovement) {
    // Learn what TO do
    recommendedAction = `Apply ${actionTypes.join(' + ')} to improve ${outcome.metricKey}`;
  }

  // Build trigger pattern
  const triggerPattern = `${outcome.eventType} on ${outcome.metricKey} following ${actionTypes.join(', ')}`;

  // Build root cause hypothesis
  const rootCauseHypothesis = attribution.explanation ||
    `${actionTypes.join(' + ')} likely caused ${outcome.metricKey} to ${deltaDirection}`;

  // Build evidence
  const evidence = {
    eventIds: [outcome.eventId],
    actionIds: actions.map(a => a.actionId),
    attributionIds: [attribution.attributionId],
    beforeAfter: {
      before: outcome.oldValue,
      after: outcome.newValue,
      delta: outcome.delta,
    },
    timeProximityScore: attribution.timeProximityScore,
    changeSurfaceScore: attribution.changeSurfaceScore,
  };

  // Determine status based on confidence
  const status = attribution.confidence >= 0.9 ? 'active' : 'draft';

  return {
    kbId,
    title: buildKbTitle(outcome, actionTypes),
    problemStatement,
    contextScope,
    triggerPattern,
    rootCauseHypothesis,
    evidence,
    recommendedAction,
    avoidAction,
    guardrail,
    confidence: attribution.confidence,
    status,
    tags,
  };
}

/**
 * Build a concise title for the KB entry
 */
function buildKbTitle(outcome: OutcomeEventLog, actionTypes: string[]): string {
  const action = actionTypes[0] || 'action';
  const metric = outcome.metricKey;
  const effect = outcome.eventType === 'regression' ? 'degrades' : 'improves';

  return `${capitalize(action)} ${effect} ${metric}`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

/**
 * Extract change tags from actions
 */
function extractChangeTags(actions: AgentActionLog[]): string[] {
  const tags = new Set<string>();

  for (const action of actions) {
    if ((action as any).tags && Array.isArray((action as any).tags)) {
      for (const tag of (action as any).tags) {
        tags.add(tag as string);
      }
    }

    // Extract from diffSummary if available
    if (action.diffSummary) {
      if (action.diffSummary.includes('canonical')) tags.add('canonical');
      if (action.diffSummary.includes('title')) tags.add('title');
      if (action.diffSummary.includes('meta')) tags.add('meta');
      if (action.diffSummary.includes('schema')) tags.add('schema');
      if (action.diffSummary.includes('internal link')) tags.add('internal_links');
      if (action.diffSummary.includes('image')) tags.add('images');
    }
  }

  return Array.from(tags);
}

/**
 * Get recommended monitoring window for a metric
 */
function getMonitorWindow(metricKey: string): string {
  const fastMetrics = ['LCP', 'CLS', 'INP', 'error_rate_4xx', 'error_rate_5xx'];
  const slowMetrics = ['domain_authority', 'indexing_coverage'];

  if (fastMetrics.includes(metricKey)) return '24 hours';
  if (slowMetrics.includes(metricKey)) return '14 days';
  return '7 days';
}

/**
 * Scan for promotable attributions
 */
export async function scanForPromotableAttributions(
  siteId: string,
  config: KbPromotionConfig = DEFAULT_CONFIG
): Promise<{ promoted: number; kbIds: string[] }> {
  // Get all attributions for site with confidence >= threshold
  const attributions = await storage.getHighConfidenceAttributions(siteId, config.minConfidence);

  const kbIds: string[] = [];

  for (const attribution of attributions) {
    // Check if already promoted
    const existing = await storage.getSocratesKbEntryByKbId(attribution.eventId);
    if (existing) continue; // Already promoted

    // Promote to KB
    const kbId = await promoteAttributionToKb(attribution.attributionId, config);
    if (kbId) {
      kbIds.push(kbId);
    }
  }

  return { promoted: kbIds.length, kbIds };
}

/**
 * Run KB promotion for all sites
 */
export async function runKbPromotionForAllSites(
  config: KbPromotionConfig = DEFAULT_CONFIG
): Promise<{ processed: number; promoted: number }> {
  const sites = await storage.getSites();
  let totalPromoted = 0;

  for (const site of sites) {
    try {
      const { promoted } = await scanForPromotableAttributions(site.siteId, config);
      totalPromoted += promoted;
    } catch (error) {
      console.error(`Failed to run KB promotion for site ${site.siteId}:`, error);
    }
  }

  return { processed: sites.length, promoted: totalPromoted };
}

/**
 * Update KB entry confidence based on new evidence
 */
export async function updateKbConfidence(
  kbId: string,
  newAttribution: AttributionRecord
): Promise<void> {
  const kbEntry = await storage.getSocratesKbEntryByKbId(kbId);
  if (!kbEntry) return;

  // Calculate updated confidence (weighted average)
  const currentConfidence = kbEntry.confidence;
  const newConfidence = newAttribution.confidence;
  const updatedConfidence = (currentConfidence * 0.7) + (newConfidence * 0.3);

  // Update evidence
  const evidence = kbEntry.evidence as any;
  evidence.attributionIds = evidence.attributionIds || [];
  evidence.attributionIds.push(newAttribution.attributionId);

  // Update status if confidence increased
  let status = kbEntry.status;
  if (updatedConfidence >= 0.9 && status === 'draft') {
    status = 'active';
  }

  await storage.updateSocratesKbEntry(kbId, {
    confidence: updatedConfidence,
    evidence,
    status,
  });
}
