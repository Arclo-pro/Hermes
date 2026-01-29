/**
 * Stage 1: Analyze SERP data to identify dropped keywords.
 *
 * A keyword is considered "dropped" if:
 * - It fell 3+ positions, OR
 * - It was in top 10 and fell out of top 10
 */

import { logger } from "../../utils/logger";

export interface DroppedKeyword {
  keyword: string;
  currentRank: number | null;
  previousRank: number | null;
  delta: number;
  competitorWinning?: string;
}

export interface RankingHistoryEntry {
  keyword: string;
  currentPosition: number | null;
  previousPosition: number | null;
  url: string | null;
}

/**
 * Identify keywords that have significantly dropped in rankings.
 */
export function identifyDroppedKeywords(
  rankings: RankingHistoryEntry[],
): DroppedKeyword[] {
  const dropped: DroppedKeyword[] = [];

  for (const r of rankings) {
    const cur = r.currentPosition;
    const prev = r.previousPosition;

    if (cur === null || prev === null) continue;

    const delta = cur - prev;  // positive = declined (rank number went up)

    const droppedSignificantly = delta >= 3;
    const fellOffPageOne = prev <= 10 && cur > 10;

    if (droppedSignificantly || fellOffPageOne) {
      dropped.push({
        keyword: r.keyword,
        currentRank: cur,
        previousRank: prev,
        delta,
        competitorWinning: undefined,  // Will be filled by gap detection
      });
    }
  }

  logger.info("CompetitiveIntel", `Found ${dropped.length} dropped keywords out of ${rankings.length} tracked`);
  return dropped.sort((a, b) => b.delta - a.delta);  // Worst drops first
}
