import type { Pool } from "pg";

interface ScoreSummary {
  overall?: number;
  technical?: number;
  performance?: number;
  serp?: number;
  content?: number;
}

/**
 * After a scan completes, upsert scan_rollups for the domain.
 * Aggregates latest scores, increments scan_count, and appends to score_trend.
 */
export async function updateRollup(
  pool: Pool,
  domain: string,
  scanId: string,
  scanMode: "light" | "full",
  scores: ScoreSummary
): Promise<void> {
  const now = new Date().toISOString();
  const trendEntry = JSON.stringify([{ date: now.slice(0, 10), score: scores.overall ?? 0 }]);

  try {
    await pool.query(
      `INSERT INTO scan_rollups (domain, latest_scan_id, scan_mode, overall_score, technical_score, performance_score, serp_score, content_score, findings_count, scan_count, first_scan_at, latest_scan_at, score_trend, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 1, NOW(), NOW(), $9::jsonb, NOW())
       ON CONFLICT (domain) DO UPDATE SET
         latest_scan_id = EXCLUDED.latest_scan_id,
         scan_mode = EXCLUDED.scan_mode,
         overall_score = EXCLUDED.overall_score,
         technical_score = EXCLUDED.technical_score,
         performance_score = EXCLUDED.performance_score,
         serp_score = EXCLUDED.serp_score,
         content_score = EXCLUDED.content_score,
         scan_count = scan_rollups.scan_count + 1,
         latest_scan_at = NOW(),
         score_trend = COALESCE(scan_rollups.score_trend, '[]'::jsonb) || $9::jsonb,
         updated_at = NOW()`,
      [
        domain,
        scanId,
        scanMode,
        scores.overall ?? null,
        scores.technical ?? null,
        scores.performance ?? null,
        scores.serp ?? null,
        scores.content ?? null,
        trendEntry,
      ]
    );

    // Fetch updated scan_count for logging
    const res = await pool.query(
      `SELECT scan_count FROM scan_rollups WHERE domain = $1`,
      [domain]
    );
    const scanCount = res.rows[0]?.scan_count ?? 1;

    console.log(
      `[Rollup] domain_updated { domain: "${domain}", scanCount: ${scanCount}, latestScore: ${scores.overall ?? "null"} }`
    );
  } catch (err) {
    console.error(`[Rollup] upsert_failed { domain: "${domain}", error: "${(err as Error).message}" }`);
  }
}
