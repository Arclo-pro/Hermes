/**
 * Ranking tracker: position tracking, delta calculation, movers detection.
 * Replaces CSV-based historical tracking with in-memory comparison.
 */

export interface RankingSnapshot {
  keyword: string;
  position: number | null;  // null = not ranking in top 20
  url: string | null;
  volume?: number;
}

export interface RankingDelta {
  keyword: string;
  currentPosition: number | null;
  previousPosition: number | null;
  delta: number | null;  // positive = improved (moved toward #1)
  status: "improved" | "declined" | "new_ranking" | "lost_ranking" | "stable" | "unchanged";
  url: string | null;
  volume?: number;
}

export interface MoversResult {
  topGainers: RankingDelta[];
  topLosers: RankingDelta[];
  newRankings: RankingDelta[];
  lostRankings: RankingDelta[];
}

export interface RankingSummary {
  trackedKeywords: number;
  rankingKeywords: number;
  top3: number;
  top10: number;
  top20: number;
  notRanking: number;
  avgPosition: number | null;
  improved: number;
  declined: number;
  newRankings: number;
  lostRankings: number;
}

/**
 * Calculate deltas between current and previous ranking snapshots.
 */
export function calculateDeltas(
  current: RankingSnapshot[],
  previous: RankingSnapshot[],
): RankingDelta[] {
  const prevMap = new Map<string, RankingSnapshot>();
  for (const snap of previous) {
    prevMap.set(snap.keyword.toLowerCase(), snap);
  }

  return current.map(cur => {
    const prev = prevMap.get(cur.keyword.toLowerCase());
    const prevPos = prev?.position ?? null;
    const curPos = cur.position;

    let delta: number | null = null;
    let status: RankingDelta["status"] = "unchanged";

    if (curPos !== null && prevPos !== null) {
      delta = prevPos - curPos;  // positive = improved (rank # decreased)
      if (delta > 0) status = "improved";
      else if (delta < 0) status = "declined";
      else status = "stable";
    } else if (curPos !== null && prevPos === null) {
      status = "new_ranking";
      delta = null;
    } else if (curPos === null && prevPos !== null) {
      status = "lost_ranking";
      delta = null;
    }

    return {
      keyword: cur.keyword,
      currentPosition: curPos,
      previousPosition: prevPos,
      delta,
      status,
      url: cur.url,
      volume: cur.volume,
    };
  });
}

/**
 * Detect top movers (gainers and losers) from ranking deltas.
 */
export function detectMovers(deltas: RankingDelta[], limit: number = 25): MoversResult {
  const withDelta = deltas.filter(d => d.delta !== null);

  const topGainers = withDelta
    .filter(d => d.delta! > 0)
    .sort((a, b) => b.delta! - a.delta!)
    .slice(0, limit);

  const topLosers = withDelta
    .filter(d => d.delta! < 0)
    .sort((a, b) => a.delta! - b.delta!)
    .slice(0, limit);

  const newRankings = deltas
    .filter(d => d.status === "new_ranking")
    .slice(0, limit);

  const lostRankings = deltas
    .filter(d => d.status === "lost_ranking")
    .slice(0, limit);

  return { topGainers, topLosers, newRankings, lostRankings };
}

/**
 * Generate a summary of the current ranking state.
 */
export function generateRankingSummary(
  current: RankingSnapshot[],
  deltas: RankingDelta[],
): RankingSummary {
  const ranking = current.filter(s => s.position !== null);
  const positions = ranking.map(s => s.position!);

  return {
    trackedKeywords: current.length,
    rankingKeywords: ranking.length,
    top3: positions.filter(p => p <= 3).length,
    top10: positions.filter(p => p <= 10).length,
    top20: positions.filter(p => p <= 20).length,
    notRanking: current.length - ranking.length,
    avgPosition: positions.length > 0
      ? Math.round((positions.reduce((a, b) => a + b, 0) / positions.length) * 10) / 10
      : null,
    improved: deltas.filter(d => d.status === "improved").length,
    declined: deltas.filter(d => d.status === "declined").length,
    newRankings: deltas.filter(d => d.status === "new_ranking").length,
    lostRankings: deltas.filter(d => d.status === "lost_ranking").length,
  };
}
