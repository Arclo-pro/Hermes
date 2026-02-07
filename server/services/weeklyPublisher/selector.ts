/**
 * Selection logic for picking top 1-3 updates with diversity constraints.
 */

import type { ScoredSuggestion, SelectionResult, AgentSpread } from "./types";

const MAX_SAME_AGENT = 2;
const MAX_SAME_CATEGORY = 2;

/**
 * Compute agent spread from selected suggestions.
 */
function computeAgentSpread(selected: ScoredSuggestion[]): AgentSpread {
  const spread: AgentSpread = {};
  for (const s of selected) {
    const agentId = s.sourceAgentId ?? "unknown";
    spread[agentId] = (spread[agentId] || 0) + 1;
  }
  return spread;
}

/**
 * Select top 1-3 suggestions with diversity constraints.
 *
 * Diversity rules:
 * - No more than 2 suggestions from the same agent
 * - No more than 2 suggestions from the same category
 * - If we can't be picky (not enough candidates), we allow exceptions
 */
export function selectTopUpdates(
  candidates: ScoredSuggestion[],
  maxCount: number = 3
): SelectionResult {
  if (candidates.length === 0) {
    return {
      selected: [],
      diversityApplied: false,
      agentSpread: {},
    };
  }

  // Already sorted by priority score from ranker
  const sorted = [...candidates];
  const selected: ScoredSuggestion[] = [];
  let diversityApplied = false;

  for (let i = 0; i < sorted.length && selected.length < maxCount; i++) {
    const candidate = sorted[i];

    // Count how many we already have from this agent and category
    const agentCount = selected.filter(
      (s) => s.sourceAgentId === candidate.sourceAgentId
    ).length;
    const categoryCount = selected.filter(
      (s) => s.category === candidate.category
    ).length;

    // Check if diversity limits exceeded
    const wouldExceedAgentLimit = agentCount >= MAX_SAME_AGENT;
    const wouldExceedCategoryLimit = categoryCount >= MAX_SAME_CATEGORY;

    if (wouldExceedAgentLimit || wouldExceedCategoryLimit) {
      // Calculate remaining slots and remaining candidates
      const remainingSlots = maxCount - selected.length;
      const remainingCandidates = sorted.length - i;

      // Only skip if we have enough alternatives
      if (remainingCandidates > remainingSlots) {
        diversityApplied = true;
        continue;
      }
    }

    selected.push(candidate);
  }

  return {
    selected,
    diversityApplied,
    agentSpread: computeAgentSpread(selected),
  };
}

/**
 * Select without diversity constraints (for testing or override).
 */
export function selectTopUpdatesSimple(
  candidates: ScoredSuggestion[],
  maxCount: number = 3
): SelectionResult {
  const selected = candidates.slice(0, maxCount);
  return {
    selected,
    diversityApplied: false,
    agentSpread: computeAgentSpread(selected),
  };
}
