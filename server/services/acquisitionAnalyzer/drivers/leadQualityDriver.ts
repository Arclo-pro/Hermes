/**
 * Lead Quality Driver
 *
 * Compares lead quality between paid and organic channels.
 */

import type {
  LeadQualityMetrics,
  LeadQualityComparison,
  AcquisitionChannel,
  AnalysisConfidence,
} from "../../../../shared/types/acquisitionAnalysis";
import type { LeadRow } from "../types";
import { classifyLeadChannel } from "../utils/attribution";

interface ChannelMetrics {
  totalLeads: number;
  signedUp: number;
  totalContactAttempts: number;
  conversionTimes: number[]; // days to conversion
}

/**
 * Calculate metrics for leads in a channel
 */
function calculateChannelMetrics(
  leads: LeadRow[],
  channel: AcquisitionChannel
): ChannelMetrics {
  const channelLeads = leads.filter(l => classifyLeadChannel(l) === channel);

  const metrics: ChannelMetrics = {
    totalLeads: channelLeads.length,
    signedUp: 0,
    totalContactAttempts: 0,
    conversionTimes: [],
  };

  for (const lead of channelLeads) {
    metrics.totalContactAttempts += lead.contactAttemptsCount || 0;

    if (lead.outcome === "signed_up") {
      metrics.signedUp++;

      // Calculate time to conversion if we have outcomeDate
      if (lead.outcomeDate && lead.createdAt) {
        const created = new Date(lead.createdAt);
        const outcome = new Date(lead.outcomeDate);
        const days = Math.ceil((outcome.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 0 && days < 365) {
          metrics.conversionTimes.push(days);
        }
      }
    }
  }

  return metrics;
}

/**
 * Calculate average with null handling
 */
function safeAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

/**
 * Build quality metrics for a channel
 */
function buildQualityMetrics(
  channel: AcquisitionChannel,
  raw: ChannelMetrics
): LeadQualityMetrics {
  const conversionRate = raw.totalLeads > 0
    ? Math.round((raw.signedUp / raw.totalLeads) * 1000) / 10
    : 0;

  const avgTimeToConversion = safeAverage(raw.conversionTimes);
  const avgContactAttempts = raw.totalLeads > 0
    ? Math.round((raw.totalContactAttempts / raw.totalLeads) * 10) / 10
    : 0;

  // Quality score: weighted combination of metrics
  // Higher conversion rate = better
  // Lower time to conversion = better
  // Lower contact attempts = better (easier to close)
  let qualityScore = 50; // base score

  // Conversion rate contribution (0-40 points)
  qualityScore += Math.min(conversionRate * 0.8, 40);

  // Time to conversion contribution (0-10 points, bonus for fast conversions)
  if (avgTimeToConversion !== null && avgTimeToConversion > 0) {
    qualityScore += Math.max(10 - avgTimeToConversion / 3, 0);
  }

  // Contact attempts contribution (0-10 points, bonus for easy closes)
  if (avgContactAttempts > 0) {
    qualityScore += Math.max(10 - avgContactAttempts * 2, 0);
  }

  return {
    channel,
    totalLeads: raw.totalLeads,
    conversionRate,
    avgTimeToConversion,
    avgContactAttempts,
    qualityScore: Math.round(Math.min(qualityScore, 100)),
  };
}

/**
 * Determine confidence based on sample size
 */
function determineConfidence(
  paidLeads: number,
  organicLeads: number
): AnalysisConfidence {
  const minLeads = Math.min(paidLeads, organicLeads);

  if (minLeads >= 20) return "high";
  if (minLeads >= 10) return "med";
  return "low";
}

/**
 * Generate winner reason explanation
 */
function generateWinnerReason(
  winner: LeadQualityMetrics,
  loser: LeadQualityMetrics
): string {
  const differences: string[] = [];

  const convDiff = winner.conversionRate - loser.conversionRate;
  if (Math.abs(convDiff) >= 5) {
    differences.push(
      `${Math.abs(convDiff).toFixed(1)}% ${convDiff > 0 ? "higher" : "lower"} conversion rate`
    );
  }

  if (winner.avgTimeToConversion !== null && loser.avgTimeToConversion !== null) {
    const timeDiff = loser.avgTimeToConversion - winner.avgTimeToConversion;
    if (Math.abs(timeDiff) >= 1) {
      differences.push(
        `${Math.abs(timeDiff).toFixed(1)} days ${timeDiff > 0 ? "faster" : "slower"} to close`
      );
    }
  }

  if (differences.length === 0) {
    return "Marginally higher overall quality score";
  }

  return differences.join(", ");
}

/**
 * Main driver: Compare lead quality between channels
 */
export function analyzeLeadQuality(leads: LeadRow[]): LeadQualityComparison {
  const paidRaw = calculateChannelMetrics(leads, "paid");
  const organicRaw = calculateChannelMetrics(leads, "organic");

  const paid = buildQualityMetrics("paid", paidRaw);
  const organic = buildQualityMetrics("organic", organicRaw);

  // Determine winner
  let winner: AcquisitionChannel;
  let winnerMetrics: LeadQualityMetrics;
  let loserMetrics: LeadQualityMetrics;

  if (paid.qualityScore > organic.qualityScore) {
    winner = "paid";
    winnerMetrics = paid;
    loserMetrics = organic;
  } else if (organic.qualityScore > paid.qualityScore) {
    winner = "organic";
    winnerMetrics = organic;
    loserMetrics = paid;
  } else {
    // Tie - default to organic as it's "free"
    winner = "organic";
    winnerMetrics = organic;
    loserMetrics = paid;
  }

  const winnerReason = generateWinnerReason(winnerMetrics, loserMetrics);

  return {
    paid,
    organic,
    winner,
    winnerReason,
    confidence: determineConfidence(paid.totalLeads, organic.totalLeads),
  };
}

/**
 * Create insufficient data quality comparison
 */
export function insufficientDataQuality(): LeadQualityComparison {
  const emptyMetrics: LeadQualityMetrics = {
    channel: "organic",
    totalLeads: 0,
    conversionRate: 0,
    avgTimeToConversion: null,
    avgContactAttempts: 0,
    qualityScore: 0,
  };

  return {
    paid: { ...emptyMetrics, channel: "paid" },
    organic: emptyMetrics,
    winner: "unknown",
    winnerReason: "Insufficient data to compare lead quality",
    confidence: "low",
  };
}
