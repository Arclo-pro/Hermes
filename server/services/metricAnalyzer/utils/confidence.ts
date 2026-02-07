/**
 * Confidence calculator for metric explanations.
 */

import type { ConfidenceLevel, TopDriver } from "../../../../shared/types/metricExplanation";

export interface ConfidenceInput {
  currentDataPoints: number;
  previousDataPoints: number;
  topDrivers: TopDriver[];
  totalChange: number;
}

export function calculateConfidence(input: ConfidenceInput): ConfidenceLevel {
  let score = 0;

  // Data completeness (max 40 points)
  // Ideal: 7 data points per period
  const currentCompleteness = Math.min(input.currentDataPoints / 7, 1);
  const previousCompleteness = Math.min(input.previousDataPoints / 7, 1);
  score += (currentCompleteness + previousCompleteness) * 20;

  // Driver explanatory power (max 30 points)
  // Sum of absolute contributions from top drivers
  const totalExplained = input.topDrivers.reduce(
    (sum, d) => sum + Math.abs(d.contribution),
    0
  );
  // If drivers explain > 70% of the change, high confidence
  const explanatoryRatio = Math.min(totalExplained / 100, 1);
  score += explanatoryRatio * 30;

  // Change significance (max 30 points)
  // Very small changes are harder to explain confidently
  const absChange = Math.abs(input.totalChange);
  if (absChange >= 20) {
    score += 30; // Large change, easier to attribute
  } else if (absChange >= 10) {
    score += 20;
  } else if (absChange >= 5) {
    score += 10;
  } else {
    score += 5; // Small change, low confidence in explanation
  }

  // Convert score to confidence level
  if (score >= 70) {
    return "high";
  } else if (score >= 45) {
    return "med";
  } else {
    return "low";
  }
}
