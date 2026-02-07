/**
 * Confidence Scoring
 *
 * Calculates analysis confidence based on data quality and volume.
 */

import type {
  AnalysisConfidence,
  AcquisitionDataStatus,
  LeadQualityComparison,
  BudgetSensitivityAnalysis,
} from "../../../../shared/types/acquisitionAnalysis";

interface ConfidenceFactors {
  dataStatus: AcquisitionDataStatus;
  leadQuality: LeadQualityComparison | null;
  budgetSensitivity: BudgetSensitivityAnalysis | null;
}

/**
 * Calculate overall confidence score (0-100)
 */
function calculateConfidenceScore(factors: ConfidenceFactors): number {
  let score = 0;

  const { dataStatus, leadQuality, budgetSensitivity } = factors;

  // Data completeness (max 40 points)
  if (dataStatus.hasGA4) score += 10;
  if (dataStatus.hasLeads) score += 10;
  if (dataStatus.hasAds) score += 10;
  if (dataStatus.daysWithSpendData >= 60) score += 10;
  else if (dataStatus.daysWithSpendData >= 30) score += 5;

  // Lead volume (max 30 points)
  if (dataStatus.leadCount >= 50) score += 15;
  else if (dataStatus.leadCount >= 20) score += 10;
  else if (dataStatus.leadCount >= 10) score += 5;

  if (dataStatus.paidLeadCount >= 20 && dataStatus.organicLeadCount >= 20) {
    score += 15;
  } else if (dataStatus.paidLeadCount >= 10 && dataStatus.organicLeadCount >= 10) {
    score += 10;
  } else if (dataStatus.paidLeadCount >= 5 && dataStatus.organicLeadCount >= 5) {
    score += 5;
  }

  // Statistical significance (max 30 points)
  if (budgetSensitivity && budgetSensitivity.dataPoints.length >= 8) {
    score += 15;
  } else if (budgetSensitivity && budgetSensitivity.dataPoints.length >= 4) {
    score += 8;
  }

  if (leadQuality) {
    if (leadQuality.confidence === "high") score += 15;
    else if (leadQuality.confidence === "med") score += 8;
  }

  return score;
}

/**
 * Map score to confidence level
 */
export function calculateOverallConfidence(
  factors: ConfidenceFactors
): AnalysisConfidence {
  const score = calculateConfidenceScore(factors);

  if (score >= 70) return "high";
  if (score >= 40) return "med";
  return "low";
}

/**
 * Generate data quality warnings
 */
export function generateWarnings(dataStatus: AcquisitionDataStatus): string[] {
  const warnings: string[] = [];

  if (!dataStatus.hasGA4) {
    warnings.push("Connect Google Analytics to see traffic channel breakdown.");
  }

  if (!dataStatus.hasLeads) {
    warnings.push("No leads recorded yet. Add leads to see quality comparison.");
  }

  if (!dataStatus.hasAds) {
    warnings.push("Connect Google Ads to see budget sensitivity analysis.");
  }

  if (dataStatus.leadCount > 0 && dataStatus.paidLeadCount < 10) {
    warnings.push("Limited paid lead data. Quality comparison may not be reliable.");
  }

  if (dataStatus.leadCount > 0 && dataStatus.organicLeadCount < 10) {
    warnings.push("Limited organic lead data. Quality comparison may not be reliable.");
  }

  if (dataStatus.hasAds && dataStatus.daysWithSpendData < 28) {
    warnings.push("Less than 4 weeks of spend data. Budget recommendations may be less reliable.");
  }

  return warnings;
}
