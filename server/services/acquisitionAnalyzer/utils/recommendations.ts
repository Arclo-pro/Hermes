/**
 * Recommendations Generator
 *
 * Generates plain-English spend recommendations and scenario previews.
 */

import type {
  SpendRecommendation,
  ScenarioPreview,
  BudgetSensitivityAnalysis,
  LeadQualityComparison,
  AnalysisConfidence,
} from "../../../../shared/types/acquisitionAnalysis";
import { findZone } from "../drivers/budgetSensitivityDriver";

/**
 * Determine confidence based on data quality
 */
function determineRecommendationConfidence(
  sensitivity: BudgetSensitivityAnalysis,
  quality: LeadQualityComparison
): AnalysisConfidence {
  // Need good data for high confidence
  if (
    sensitivity.dataPoints.length >= 8 &&
    quality.confidence === "high"
  ) {
    return "high";
  }

  if (
    sensitivity.dataPoints.length >= 4 &&
    quality.confidence !== "low"
  ) {
    return "med";
  }

  return "low";
}

/**
 * Estimate lead change for a given spend change
 *
 * Uses the spend curve data to project impact.
 */
function estimateLeadChange(
  currentSpend: number,
  newSpend: number,
  dataPoints: Array<{ spend: number; leads: number }>
): number {
  if (dataPoints.length < 2) return 0;

  // Find closest data points to current and new spend
  const sortedBySpend = [...dataPoints].sort((a, b) => a.spend - b.spend);

  const findClosestLeads = (targetSpend: number): number => {
    let closest = sortedBySpend[0];
    let minDiff = Math.abs(closest.spend - targetSpend);

    for (const point of sortedBySpend) {
      const diff = Math.abs(point.spend - targetSpend);
      if (diff < minDiff) {
        minDiff = diff;
        closest = point;
      }
    }
    return closest.leads;
  };

  const currentLeads = findClosestLeads(currentSpend);
  const projectedLeads = findClosestLeads(newSpend);

  if (currentLeads === 0) return 0;

  return Math.round(((projectedLeads - currentLeads) / currentLeads) * 100);
}

/**
 * Generate plain-English rationale
 */
function generateRationale(
  action: SpendRecommendation["action"],
  currentSpend: number,
  currentZone: string,
  quality: LeadQualityComparison
): string {
  let rationale = "";

  if (action === "decrease") {
    rationale = `Your current spend of $${currentSpend.toFixed(0)}/week is in the ${currentZone} zone where each additional dollar returns fewer leads. `;

    if (quality.winner === "organic") {
      rationale += `Organic leads convert at ${quality.organic.conversionRate.toFixed(1)}% compared to paid at ${quality.paid.conversionRate.toFixed(1)}%, suggesting your organic efforts are delivering better quality.`;
    } else {
      rationale += `Consider redirecting budget to higher-performing campaigns or testing reduced spend for 2 weeks.`;
    }
  } else if (action === "increase") {
    rationale = `Your current spend of $${currentSpend.toFixed(0)}/week is in the ${currentZone} zone. There's room to scale paid acquisition while maintaining efficiency.`;

    if (quality.paid.conversionRate > quality.organic.conversionRate) {
      rationale += ` Paid leads are converting well at ${quality.paid.conversionRate.toFixed(1)}%.`;
    }
  } else {
    rationale = `Your current spend of $${currentSpend.toFixed(0)}/week is in the optimal zone. Maintain current levels and focus on improving conversion rates.`;
  }

  return rationale;
}

/**
 * Generate caveats for the recommendation
 */
function generateCaveats(
  sensitivity: BudgetSensitivityAnalysis,
  quality: LeadQualityComparison
): string[] {
  const caveats: string[] = [];

  caveats.push(`Based on ${sensitivity.dataPoints.length} weeks of spend data.`);

  if (quality.confidence === "low") {
    caveats.push("Lead quality comparison has limited confidence due to sample size.");
  }

  if (sensitivity.diminishingReturnsThreshold === null) {
    caveats.push("Could not detect clear diminishing returns threshold in current data.");
  }

  caveats.push("Seasonal factors and market conditions may affect results.");

  return caveats;
}

/**
 * Generate spend recommendation
 */
export function generateSpendRecommendation(
  sensitivity: BudgetSensitivityAnalysis,
  quality: LeadQualityComparison
): SpendRecommendation {
  const { currentSpendLevel, currentZone, optimalRange, dataPoints } = sensitivity;
  const zone = findZone(currentSpendLevel, sensitivity.zones);

  let action: SpendRecommendation["action"];
  let suggestedSpend: { min: number; max: number };

  if (currentZone === "wasteful" || currentZone === "diminishing") {
    action = "decrease";
    suggestedSpend = {
      min: Math.round(optimalRange.min),
      max: Math.round(optimalRange.max),
    };
  } else if (currentZone === "efficient") {
    action = "increase";
    suggestedSpend = {
      min: Math.round(optimalRange.min),
      max: Math.round(optimalRange.max),
    };
  } else {
    action = "maintain";
    suggestedSpend = {
      min: Math.round(currentSpendLevel * 0.95),
      max: Math.round(currentSpendLevel * 1.05),
    };
  }

  // Calculate expected impact
  const targetSpend = (suggestedSpend.min + suggestedSpend.max) / 2;
  const expectedLeadChange = estimateLeadChange(currentSpendLevel, targetSpend, dataPoints);

  const currentCPL = zone.avgCostPerLead;
  const targetCPL = optimalRange.expectedCostPerLead;
  const expectedCPLChange = currentCPL > 0
    ? Math.round(((targetCPL - currentCPL) / currentCPL) * 100)
    : 0;

  // Quality impact statement
  let qualityImpact = "Monitor lead quality during adjustment.";
  if (quality.winner === "organic" && action === "decrease") {
    qualityImpact = "Organic leads show better quality, so reduced paid volume may not hurt overall conversions.";
  } else if (quality.winner === "paid" && action === "decrease") {
    qualityImpact = "Paid leads show better quality. Consider focusing cuts on lowest-performing campaigns.";
  }

  return {
    action,
    currentSpend: Math.round(currentSpendLevel),
    suggestedSpend,
    expectedImpact: {
      leadChange: expectedLeadChange,
      costPerLeadChange: expectedCPLChange,
      qualityImpact,
    },
    confidence: determineRecommendationConfidence(sensitivity, quality),
    rationale: generateRationale(action, currentSpendLevel, currentZone, quality),
    caveats: generateCaveats(sensitivity, quality),
  };
}

/**
 * Generate scenario previews for common adjustments
 */
export function generateScenarios(
  sensitivity: BudgetSensitivityAnalysis
): ScenarioPreview[] {
  const { currentSpendLevel, dataPoints, zones } = sensitivity;

  const scenarios: ScenarioPreview[] = [];

  // Cut 20% scenario
  const cutSpend = currentSpendLevel * 0.8;
  const cutZone = findZone(cutSpend, zones);
  scenarios.push({
    label: "Reduce 20%",
    spendChange: -20,
    newMonthlySpend: Math.round(cutSpend * 4.33), // weekly to monthly
    expectedLeadChange: estimateLeadChange(currentSpendLevel, cutSpend, dataPoints),
    expectedCostPerLeadChange: cutZone.avgCostPerLead > 0
      ? Math.round(((cutZone.avgCostPerLead - sensitivity.zones.find(z => z.name === sensitivity.currentZone)!.avgCostPerLead) / sensitivity.zones.find(z => z.name === sensitivity.currentZone)!.avgCostPerLead) * 100)
      : 0,
    risk: cutZone.name === "efficient" ? "low" : "medium",
  });

  // Maintain scenario
  const maintainZone = findZone(currentSpendLevel, zones);
  scenarios.push({
    label: "Maintain",
    spendChange: 0,
    newMonthlySpend: Math.round(currentSpendLevel * 4.33),
    expectedLeadChange: 0,
    expectedCostPerLeadChange: 0,
    risk: "low",
  });

  // Increase 20% scenario
  const increaseSpend = currentSpendLevel * 1.2;
  const increaseZone = findZone(increaseSpend, zones);
  scenarios.push({
    label: "Increase 20%",
    spendChange: 20,
    newMonthlySpend: Math.round(increaseSpend * 4.33),
    expectedLeadChange: estimateLeadChange(currentSpendLevel, increaseSpend, dataPoints),
    expectedCostPerLeadChange: 0,
    risk: increaseZone.name === "diminishing" || increaseZone.name === "wasteful"
      ? "high"
      : increaseZone.name === "optimal"
        ? "low"
        : "medium",
  });

  return scenarios;
}

/**
 * Generate topline recommendation summary
 */
export function generateToplineRecommendation(
  hasAds: boolean,
  hasLeads: boolean,
  quality: LeadQualityComparison | null,
  recommendation: SpendRecommendation | null
): string {
  if (!hasAds && !hasLeads) {
    return "Connect Google Analytics and track leads to see acquisition insights.";
  }

  if (!hasAds) {
    if (quality && quality.winner !== "unknown") {
      return `${quality.winner === "organic" ? "Organic" : "Paid"} leads are converting ${quality.winner === "organic" ? quality.organic.conversionRate : quality.paid.conversionRate}% better. Connect Google Ads to analyze budget efficiency.`;
    }
    return "Connect Google Ads to see budget sensitivity analysis.";
  }

  if (!recommendation) {
    return "Collecting more data for budget recommendations.";
  }

  if (recommendation.action === "decrease") {
    const savings = recommendation.currentSpend - recommendation.suggestedSpend.max;
    return `Consider reducing weekly spend by $${savings.toFixed(0)} to improve cost efficiency.`;
  }

  if (recommendation.action === "increase") {
    return `Room to scale: increasing spend to $${recommendation.suggestedSpend.max}/week could grow leads while maintaining efficiency.`;
  }

  return `Current spend is optimal. Focus on improving lead quality and conversion rates.`;
}

/**
 * Generate quick insights bullets
 */
export function generateQuickInsights(
  quality: LeadQualityComparison,
  recommendation: SpendRecommendation | null,
  paidShare: number,
  organicShare: number
): string[] {
  const insights: string[] = [];

  // Channel mix insight
  if (Math.abs(paidShare - organicShare) > 20) {
    const dominant = paidShare > organicShare ? "paid" : "organic";
    insights.push(
      `${dominant.charAt(0).toUpperCase() + dominant.slice(1)} traffic dominates at ${Math.max(paidShare, organicShare).toFixed(0)}% of total sessions.`
    );
  } else {
    insights.push("Traffic is relatively balanced between paid and organic sources.");
  }

  // Quality insight
  if (quality.winner !== "unknown") {
    const convDiff = Math.abs(quality.paid.conversionRate - quality.organic.conversionRate);
    if (convDiff >= 5) {
      insights.push(
        `${quality.winner === "organic" ? "Organic" : "Paid"} leads convert ${convDiff.toFixed(1)}% better than ${quality.winner === "organic" ? "paid" : "organic"}.`
      );
    } else {
      insights.push("Lead quality is similar between paid and organic channels.");
    }
  }

  // Spend insight
  if (recommendation) {
    if (recommendation.action === "decrease") {
      insights.push(
        `Reducing spend could save ~$${(recommendation.currentSpend - recommendation.suggestedSpend.min).toFixed(0)}/week with minimal lead loss.`
      );
    } else if (recommendation.action === "increase") {
      insights.push("Current efficiency suggests opportunity to scale paid acquisition.");
    }
  }

  return insights.slice(0, 3); // Max 3 insights
}
