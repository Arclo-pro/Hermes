/**
 * Budget Sensitivity Driver
 *
 * Analyzes spend vs leads curve to detect diminishing returns
 * and identify optimal spending zones.
 */

import type {
  SpendDataPoint,
  SensitivityZone,
  BudgetSensitivityAnalysis,
} from "../../../../shared/types/acquisitionAnalysis";
import type { AdsRow, LeadRow } from "../types";
import { getWeekStart } from "../types";
import { classifyLeadChannel } from "../utils/attribution";

/**
 * Aggregate ads data by week
 */
function aggregateWeeklySpend(ads: AdsRow[]): Map<string, number> {
  const weeklySpend = new Map<string, number>();

  for (const row of ads) {
    if (!row.date) continue;
    const week = getWeekStart(new Date(row.date));
    const current = weeklySpend.get(week) || 0;
    weeklySpend.set(week, current + (row.spend || 0));
  }

  return weeklySpend;
}

/**
 * Aggregate paid leads by week
 */
function aggregateWeeklyLeads(leads: LeadRow[]): Map<string, number> {
  const weeklyLeads = new Map<string, number>();

  for (const lead of leads) {
    if (classifyLeadChannel(lead) !== "paid") continue;
    if (!lead.createdAt) continue;

    const week = getWeekStart(new Date(lead.createdAt));
    const current = weeklyLeads.get(week) || 0;
    weeklyLeads.set(week, current + 1);
  }

  return weeklyLeads;
}

/**
 * Build spend data points from weekly aggregates
 */
function buildSpendDataPoints(
  weeklySpend: Map<string, number>,
  weeklyLeads: Map<string, number>
): SpendDataPoint[] {
  const points: SpendDataPoint[] = [];

  for (const [week, spend] of weeklySpend) {
    if (spend <= 0) continue;

    const leads = weeklyLeads.get(week) || 0;
    const costPerLead = leads > 0 ? spend / leads : 0;

    points.push({
      week,
      spend: Math.round(spend * 100) / 100,
      leads,
      costPerLead: Math.round(costPerLead * 100) / 100,
    });
  }

  // Sort by week ascending
  return points.sort((a, b) => a.week.localeCompare(b.week));
}

/**
 * Calculate percentile value from sorted array
 */
function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.floor(sortedValues.length * p);
  return sortedValues[Math.min(index, sortedValues.length - 1)];
}

/**
 * Calculate average cost per lead in a spend range
 */
function avgCPLInRange(
  points: SpendDataPoint[],
  minSpend: number,
  maxSpend: number
): number {
  const inRange = points.filter(
    p => p.spend >= minSpend && p.spend <= maxSpend && p.costPerLead > 0
  );

  if (inRange.length === 0) return 0;

  const totalSpend = inRange.reduce((sum, p) => sum + p.spend, 0);
  const totalLeads = inRange.reduce((sum, p) => sum + p.leads, 0);

  return totalLeads > 0 ? Math.round((totalSpend / totalLeads) * 100) / 100 : 0;
}

/**
 * Detect diminishing returns threshold
 *
 * Uses marginal cost per lead to find where efficiency drops significantly.
 */
function detectDiminishingReturns(points: SpendDataPoint[]): number | null {
  if (points.length < 4) return null;

  // Sort by spend ascending for curve analysis
  const sortedBySpend = [...points].sort((a, b) => a.spend - b.spend);

  // Calculate marginal CPL between adjacent spend levels
  const marginalCPLs: Array<{ spend: number; marginalCPL: number }> = [];

  for (let i = 1; i < sortedBySpend.length; i++) {
    const deltaSpend = sortedBySpend[i].spend - sortedBySpend[i - 1].spend;
    const deltaLeads = sortedBySpend[i].leads - sortedBySpend[i - 1].leads;

    if (deltaSpend > 0 && deltaLeads > 0) {
      marginalCPLs.push({
        spend: sortedBySpend[i].spend,
        marginalCPL: deltaSpend / deltaLeads,
      });
    }
  }

  if (marginalCPLs.length < 2) return null;

  // Calculate average marginal CPL
  const avgMarginalCPL =
    marginalCPLs.reduce((sum, m) => sum + m.marginalCPL, 0) / marginalCPLs.length;

  // Find first point where marginal CPL exceeds 1.5x average
  for (const m of marginalCPLs) {
    if (m.marginalCPL > avgMarginalCPL * 1.5) {
      return m.spend;
    }
  }

  return null;
}

/**
 * Define sensitivity zones based on percentiles and inflection
 */
function defineZones(
  points: SpendDataPoint[],
  diminishingThreshold: number | null
): SensitivityZone[] {
  if (points.length === 0) return [];

  const spends = points.map(p => p.spend).sort((a, b) => a - b);

  const p25 = percentile(spends, 0.25);
  const p50 = percentile(spends, 0.50);
  const p75 = percentile(spends, 0.75);
  const maxSpend = Math.max(...spends) * 1.1;

  // Use diminishing threshold if found, otherwise use p75
  const diminishStart = diminishingThreshold ?? p75;
  const optimalEnd = Math.min(diminishStart, p75);

  const zones: SensitivityZone[] = [
    {
      name: "efficient",
      minSpend: 0,
      maxSpend: p25,
      avgCostPerLead: avgCPLInRange(points, 0, p25),
      description: "Low spend with good cost efficiency. Room to scale.",
    },
    {
      name: "optimal",
      minSpend: p25,
      maxSpend: optimalEnd,
      avgCostPerLead: avgCPLInRange(points, p25, optimalEnd),
      description: "Best balance of volume and cost per lead.",
    },
    {
      name: "diminishing",
      minSpend: optimalEnd,
      maxSpend: p75,
      avgCostPerLead: avgCPLInRange(points, optimalEnd, p75),
      description: "Each additional dollar yields fewer leads.",
    },
    {
      name: "wasteful",
      minSpend: p75,
      maxSpend: maxSpend,
      avgCostPerLead: avgCPLInRange(points, p75, maxSpend),
      description: "High spend with poor return on investment.",
    },
  ];

  return zones;
}

/**
 * Find which zone a spend level falls into
 */
export function findZone(
  spend: number,
  zones: SensitivityZone[]
): SensitivityZone {
  for (const zone of zones) {
    if (spend >= zone.minSpend && spend <= zone.maxSpend) {
      return zone;
    }
  }
  // Default to last zone if spend exceeds all
  return zones[zones.length - 1] || {
    name: "wasteful",
    minSpend: 0,
    maxSpend: spend,
    avgCostPerLead: 0,
    description: "Unable to classify",
  };
}

/**
 * Main driver: Analyze budget sensitivity
 */
export function analyzeBudgetSensitivity(
  ads: AdsRow[],
  leads: LeadRow[]
): BudgetSensitivityAnalysis | null {
  // Aggregate by week
  const weeklySpend = aggregateWeeklySpend(ads);
  const weeklyLeads = aggregateWeeklyLeads(leads);

  // Build data points
  const dataPoints = buildSpendDataPoints(weeklySpend, weeklyLeads);

  // Need at least 4 weeks of data for meaningful analysis
  if (dataPoints.length < 4) {
    return null;
  }

  // Detect diminishing returns
  const diminishingReturnsThreshold = detectDiminishingReturns(dataPoints);

  // Define zones
  const zones = defineZones(dataPoints, diminishingReturnsThreshold);

  // Get current spend level (most recent week)
  const mostRecentPoint = dataPoints[dataPoints.length - 1];
  const currentSpendLevel = mostRecentPoint.spend;

  // Determine current zone
  const currentZone = findZone(currentSpendLevel, zones);

  // Define optimal range
  const optimalZone = zones.find(z => z.name === "optimal");
  const optimalRange = optimalZone
    ? {
        min: optimalZone.minSpend,
        max: optimalZone.maxSpend,
        expectedCostPerLead: optimalZone.avgCostPerLead,
      }
    : {
        min: currentSpendLevel * 0.8,
        max: currentSpendLevel * 1.2,
        expectedCostPerLead: mostRecentPoint.costPerLead,
      };

  return {
    dataPoints,
    zones,
    currentSpendLevel,
    currentZone: currentZone.name,
    optimalRange,
    diminishingReturnsThreshold,
  };
}
