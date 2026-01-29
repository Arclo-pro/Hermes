/**
 * Content Decay Analysis Service
 *
 * Simplified decay detection that runs against Hermes's existing
 * GSC data. Identifies pages with declining impressions, clicks,
 * or rankings over the last 28 days vs prior 28-day baseline.
 *
 * Uses `gsc_daily` (which has siteId + page columns) rather than
 * the per-run `gsc_page_daily` table.
 *
 * This replaces the external Decay-Monitor worker for orchestration runs.
 * For the full 9-rule detection engine, see the Decay-Monitor repo.
 */

import { db } from "../db";
import { gscDaily } from "@shared/schema";
import { eq, and, gte, lte, sql, isNotNull } from "drizzle-orm";
import { logger } from "../utils/logger";

interface DecayPage {
  url: string;
  isDecaying: boolean;
  decayScore: number;
  impressionsDelta: number;
  clicksDelta: number;
  positionDelta: number;
  currentImpressions: number;
  baselineImpressions: number;
  currentClicks: number;
  baselineClicks: number;
}

interface DecayAnalysisResult {
  pages: DecayPage[];
  summary: {
    totalAnalyzed: number;
    decayingCount: number;
    healthyCount: number;
    avgDecayScore: number;
  };
}

/**
 * Run content decay analysis for a site using existing GSC daily data.
 * Returns data in the shape the orchestrator's extractMetrics() expects.
 */
export async function runContentDecayAnalysis(
  siteId: string,
  _domain: string
): Promise<DecayAnalysisResult> {
  const now = new Date();
  const currentEnd = now.toISOString().split("T")[0];

  const d28ago = new Date(now);
  d28ago.setDate(d28ago.getDate() - 28);
  const currentStart = d28ago.toISOString().split("T")[0];

  const d56ago = new Date(now);
  d56ago.setDate(d56ago.getDate() - 56);
  const baselineStart = d56ago.toISOString().split("T")[0];
  const baselineEnd = currentStart;

  try {
    // Fetch current period page-level GSC data (last 28 days)
    const currentData = await db
      .select({
        page: gscDaily.page,
        totalImpressions: sql<number>`sum(${gscDaily.impressions})`.as("total_impressions"),
        totalClicks: sql<number>`sum(${gscDaily.clicks})`.as("total_clicks"),
        avgPosition: sql<number>`avg(${gscDaily.position})`.as("avg_position"),
      })
      .from(gscDaily)
      .where(
        and(
          eq(gscDaily.siteId, siteId),
          isNotNull(gscDaily.page),
          gte(gscDaily.date, currentStart),
          lte(gscDaily.date, currentEnd)
        )
      )
      .groupBy(gscDaily.page);

    // Fetch baseline period (28-56 days ago)
    const baselineData = await db
      .select({
        page: gscDaily.page,
        totalImpressions: sql<number>`sum(${gscDaily.impressions})`.as("total_impressions"),
        totalClicks: sql<number>`sum(${gscDaily.clicks})`.as("total_clicks"),
        avgPosition: sql<number>`avg(${gscDaily.position})`.as("avg_position"),
      })
      .from(gscDaily)
      .where(
        and(
          eq(gscDaily.siteId, siteId),
          isNotNull(gscDaily.page),
          gte(gscDaily.date, baselineStart),
          lte(gscDaily.date, baselineEnd)
        )
      )
      .groupBy(gscDaily.page);

    // Build baseline lookup
    const baselineMap = new Map(
      baselineData.map((b) => [b.page, b])
    );

    // Compare current vs baseline for each page
    const pages: DecayPage[] = [];

    for (const current of currentData) {
      const baseline = baselineMap.get(current.page);
      if (!baseline) continue; // No baseline data, skip

      const bImpressions = Number(baseline.totalImpressions) || 0;
      const cImpressions = Number(current.totalImpressions) || 0;
      const bClicks = Number(baseline.totalClicks) || 0;
      const cClicks = Number(current.totalClicks) || 0;
      const bPosition = Number(baseline.avgPosition) || 0;
      const cPosition = Number(current.avgPosition) || 0;

      // Skip pages with negligible baseline traffic
      if (bImpressions < 10 && bClicks < 5) continue;

      const impressionsDelta = bImpressions > 0
        ? ((cImpressions - bImpressions) / bImpressions) * 100
        : 0;
      const clicksDelta = bClicks > 0
        ? ((cClicks - bClicks) / bClicks) * 100
        : 0;
      const positionDelta = cPosition - bPosition; // positive = worsened

      // Decay score: weighted combination (0-1 scale)
      const impScore = Math.max(0, -impressionsDelta / 100); // 0 if improving
      const clickScore = Math.max(0, -clicksDelta / 100);
      const posScore = Math.max(0, positionDelta / 10); // 10-position drop = 1.0
      const decayScore = Math.min(1, impScore * 0.4 + clickScore * 0.4 + posScore * 0.2);

      const isDecaying = decayScore > 0.3;

      pages.push({
        url: current.page || "",
        isDecaying,
        decayScore: Math.round(decayScore * 100) / 100,
        impressionsDelta: Math.round(impressionsDelta * 10) / 10,
        clicksDelta: Math.round(clicksDelta * 10) / 10,
        positionDelta: Math.round(positionDelta * 10) / 10,
        currentImpressions: cImpressions,
        baselineImpressions: bImpressions,
        currentClicks: cClicks,
        baselineClicks: bClicks,
      });
    }

    // Sort by decay score descending
    pages.sort((a, b) => b.decayScore - a.decayScore);

    const decayingCount = pages.filter((p) => p.isDecaying).length;
    const avgDecayScore = pages.length > 0
      ? pages.reduce((sum, p) => sum + p.decayScore, 0) / pages.length
      : 0;

    logger.info("ContentDecay", `Site ${siteId}: ${decayingCount}/${pages.length} pages decaying`);

    return {
      pages,
      summary: {
        totalAnalyzed: pages.length,
        decayingCount,
        healthyCount: pages.length - decayingCount,
        avgDecayScore: Math.round(avgDecayScore * 100) / 100,
      },
    };
  } catch (error: any) {
    logger.error("ContentDecay", `Analysis failed for site ${siteId}`, { error: error.message });

    // Return empty result on error (don't crash the orchestrator)
    return {
      pages: [],
      summary: {
        totalAnalyzed: 0,
        decayingCount: 0,
        healthyCount: 0,
        avgDecayScore: 0,
      },
    };
  }
}
