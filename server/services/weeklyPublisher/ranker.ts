/**
 * Priority scoring logic for ranking suggestions.
 *
 * Formula: priorityScore = (impactScore * confidenceWeight) - (effortScore * 0.5) + freshnessBoost
 */

import type { SeoSuggestion } from "../../../shared/schema";
import { daysSince, type ScoredSuggestion } from "./types";

/**
 * Get confidence weight multiplier based on confidence score.
 * Low confidence (0-40) = 0.6x
 * Med confidence (41-70) = 0.8x
 * High confidence (71-100) = 1.0x
 */
function getConfidenceWeight(confidenceScore: number | null): number {
  const confidence = confidenceScore ?? 50; // Default to medium
  if (confidence >= 71) return 1.0;
  if (confidence >= 41) return 0.8;
  return 0.6;
}

/**
 * Get freshness boost based on how recently the suggestion was created.
 * < 7 days = +10
 * < 14 days = +5
 * < 30 days = 0
 * >= 30 days = -5
 */
function getFreshnessBoost(createdAt: Date): number {
  const age = daysSince(createdAt);
  if (age < 7) return 10;
  if (age < 14) return 5;
  if (age < 30) return 0;
  return -5;
}

/**
 * Infer impact score from estimatedImpact text if not set numerically.
 */
function inferImpactScore(suggestion: SeoSuggestion): number {
  if (suggestion.impactScore !== null && suggestion.impactScore !== undefined) {
    return suggestion.impactScore;
  }

  // Infer from text field
  const impact = suggestion.estimatedImpact?.toLowerCase();
  if (impact === "high") return 80;
  if (impact === "medium") return 50;
  if (impact === "low") return 30;

  // Infer from severity if no impact
  const severity = suggestion.severity?.toLowerCase();
  if (severity === "critical") return 90;
  if (severity === "high") return 70;
  if (severity === "medium") return 50;
  return 40;
}

/**
 * Infer effort score from estimatedEffort text if not set numerically.
 */
function inferEffortScore(suggestion: SeoSuggestion): number {
  if (suggestion.effortScore !== null && suggestion.effortScore !== undefined) {
    return suggestion.effortScore;
  }

  // Infer from text field
  const effort = suggestion.estimatedEffort?.toLowerCase();
  if (effort === "quick_win") return 20;
  if (effort === "moderate") return 50;
  if (effort === "significant") return 80;
  return 50; // Default to medium
}

/**
 * Compute priority score for a single suggestion.
 */
export function computePriorityScore(suggestion: SeoSuggestion): number {
  const impactScore = inferImpactScore(suggestion);
  const effortScore = inferEffortScore(suggestion);
  const confidenceWeight = getConfidenceWeight(suggestion.confidenceScore);
  const freshnessBoost = getFreshnessBoost(new Date(suggestion.createdAt));

  // Formula: impact weighted by confidence, minus effort penalty, plus freshness
  const score = (impactScore * confidenceWeight) - (effortScore * 0.5) + freshnessBoost;

  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Score all suggestions and return sorted by priority.
 */
export function rankSuggestions(suggestions: SeoSuggestion[]): ScoredSuggestion[] {
  const scored = suggestions.map((s) => ({
    ...s,
    priorityScore: computePriorityScore(s),
  }));

  // Sort by priority score descending
  return scored.sort((a, b) => b.priorityScore - a.priorityScore);
}
