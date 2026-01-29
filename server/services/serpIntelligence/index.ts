/**
 * SERP Intelligence — consolidated into Hermes.
 *
 * Calls SERPAPI.com for real Google rankings, tracks keyword positions,
 * calculates Cost of Inaction metrics, and generates actionable reports.
 *
 * Replaces the external Python SERP worker with a TypeScript implementation
 * that reads keywords from the Hermes DB (serp_keywords table).
 */

import { logger } from "../../utils/logger";
import { fetchBulkRankings } from "./serpApiClient";
import {
  calculateDeltas,
  detectMovers,
  generateRankingSummary,
  type RankingSnapshot,
} from "./rankingTracker";
import { buildReport } from "./reportGenerator";

export { ctrForRank, generateFingerprint, calculateCostOfInaction } from "./reportGenerator";
export type { SerpReport, CostOfInactionMetrics, ReportAssumptions } from "./reportGenerator";
export type { KeywordRankingResult } from "./serpApiClient";
export type { RankingSnapshot, RankingDelta, RankingSummary, MoversResult } from "./rankingTracker";

interface SerpKeywordInput {
  keyword: string;
  volume?: number;
  targetUrl?: string;
}

/**
 * Run a full SERP analysis for a domain.
 *
 * 1. Fetches live rankings from SERPAPI for each keyword
 * 2. Calculates deltas vs previous rankings (if provided)
 * 3. Detects movers (gainers/losers)
 * 4. Generates Cost of Inaction report
 *
 * Returns data in the shape infrastructureDispatch expects.
 */
export async function runSerpAnalysis(
  domain: string,
  keywords: SerpKeywordInput[],
  previousRankings?: RankingSnapshot[],
  location?: string,
): Promise<Record<string, any>> {
  const startTime = Date.now();
  const baseDomain = domain.replace(/^www\./, "");

  if (!process.env.SERPAPI_API_KEY) {
    logger.error("SerpIntelligence", "SERPAPI_API_KEY not configured — returning empty results");
    return {
      ok: false,
      service: "serp_intel",
      error: "SERPAPI_API_KEY not configured",
      keywords_tracked: keywords.length,
    };
  }

  if (keywords.length === 0) {
    logger.info("SerpIntelligence", `No keywords to track for ${domain}`);
    return {
      ok: true,
      service: "serp_intel",
      keywords_tracked: 0,
      message: "No keywords configured for this domain",
    };
  }

  logger.info("SerpIntelligence", `Starting SERP analysis for ${domain} (${keywords.length} keywords)`);

  // Step 1: Fetch live rankings from SERPAPI
  const keywordStrings = keywords.map(k => k.keyword);
  const apiResults = await fetchBulkRankings(keywordStrings, baseDomain, location);

  // Step 2: Build current ranking snapshots
  const current: RankingSnapshot[] = apiResults.map((r, i) => ({
    keyword: r.keyword,
    position: r.position,
    url: r.url,
    volume: keywords[i]?.volume,
  }));

  // Step 3: Calculate deltas (use previous rankings if provided, else empty)
  const prev = previousRankings || [];
  const deltas = calculateDeltas(current, prev);
  const movers = detectMovers(deltas);
  const summary = generateRankingSummary(current, deltas);

  // Step 4: Build report
  const report = buildReport(domain, current, summary, deltas);

  const durationMs = Date.now() - startTime;
  logger.info("SerpIntelligence", `SERP analysis complete for ${domain}: ${summary.rankingKeywords}/${summary.trackedKeywords} ranking, ${durationMs}ms`);

  return {
    ok: true,
    service: "serp_intel",
    domain,
    duration_ms: durationMs,

    // Summary metrics
    keywords_tracked: summary.trackedKeywords,
    keywords_ranking: summary.rankingKeywords,
    keywords_top3: summary.top3,
    keywords_top10: summary.top10,
    keywords_top20: summary.top20,
    avg_position: summary.avgPosition,

    // Movement
    improved: summary.improved,
    declined: summary.declined,
    new_rankings: summary.newRankings,
    lost_rankings: summary.lostRankings,

    // Movers
    top_gainers: movers.topGainers.slice(0, 10),
    top_losers: movers.topLosers.slice(0, 10),

    // Cost of Inaction
    impressions_available: report.metrics.impressionsAvailable,
    clicks_available: report.metrics.clicksAvailable,
    leads_available: report.metrics.leadsAvailable,
    page_one_opportunities: report.metrics.pageOneOpportunities,

    // Report sections
    current_wins: report.currentWins.slice(0, 20),
    big_gaps: report.bigGaps.slice(0, 20),
    what_to_do_next: report.whatToDoNext.slice(0, 15),

    // Full rankings for storage
    rankings: current.map(r => ({
      keyword: r.keyword,
      position: r.position,
      url: r.url,
      volume: r.volume,
    })),
  };
}
