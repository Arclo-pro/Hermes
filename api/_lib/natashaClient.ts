/**
 * Natasha Competitive Intelligence — HTTP client for Hermes scan pipeline.
 *
 * Env vars:
 *   NATASHA_BASE_URL          — e.g. http://localhost:5000
 *   COMPETITIVE_INTEL_WRITE_KEY — API key for creating jobs
 *   COMPETITIVE_INTEL_READ_KEY  — API key for reading jobs/findings
 */

export interface NatashaFinding {
  id: string;
  type: "content_gap" | "ranking_opportunity" | "freshness_issue" | "intent_mismatch";
  severity: "critical" | "high" | "medium" | "low" | "info";
  keyword: string;
  title: string;
  description: string;
  recommendation: string | null;
  target_url: string | null;
  competitor_url: string | null;
  evidence: unknown;
  current_rank: number | null;
  competitor_rank: number | null;
  rank_delta: number | null;
  created_at: string;
}

export interface NatashaResult {
  job_id: string;
  findings: NatashaFinding[];
  findings_count: number;
}

/**
 * Returns true if Natasha env vars are configured and the service is reachable.
 */
export function isNatashaConfigured(): boolean {
  return !!(process.env.NATASHA_BASE_URL && process.env.COMPETITIVE_INTEL_WRITE_KEY);
}

/**
 * Submits a competitive intelligence job to Natasha, polls until completion,
 * and returns findings. Returns null on timeout or error.
 */
export async function runNatashaCompetitors(params: {
  targetDomain: string;
  focusKeywords: string[];
  websiteId: string;
  runId: string;
}): Promise<NatashaResult | null> {
  const baseUrl = process.env.NATASHA_BASE_URL;
  const writeKey = process.env.COMPETITIVE_INTEL_WRITE_KEY;
  const readKey = process.env.COMPETITIVE_INTEL_READ_KEY || writeKey;

  if (!baseUrl || !writeKey) {
    console.log("[Natasha] Not configured — NATASHA_BASE_URL or COMPETITIVE_INTEL_WRITE_KEY missing");
    return null;
  }

  // 1. Create job
  const createRes = await fetch(`${baseUrl}/api/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": writeKey,
    },
    body: JSON.stringify({
      website_id: params.websiteId,
      run_id: params.runId,
      target_domain: params.targetDomain,
      base_url: `https://${params.targetDomain}`,
      focus_keywords: params.focusKeywords,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!createRes.ok) {
    const err = await createRes.text().catch(() => "unknown");
    console.error(`[Natasha] Job creation failed: ${createRes.status} ${err}`);
    return null;
  }

  const createData = await createRes.json();
  const jobId = createData.job_id as string;
  console.log(`[Natasha] job_created { jobId: "${jobId}", domain: "${params.targetDomain}" }`);

  // 2. Poll for completion (2s interval, 30s timeout)
  const POLL_INTERVAL_MS = 2000;
  const POLL_TIMEOUT_MS = 30_000;
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    const statusRes = await fetch(`${baseUrl}/api/jobs/${jobId}`, {
      headers: { "x-api-key": readKey! },
      signal: AbortSignal.timeout(5_000),
    });

    if (!statusRes.ok) continue;

    const statusData = await statusRes.json();
    const status = statusData.status as string;

    if (status === "succeeded") {
      console.log(`[Natasha] job_succeeded { jobId: "${jobId}", findingsCount: ${statusData.result?.findings_count ?? 0} }`);

      // 3. Fetch findings
      const findingsRes = await fetch(`${baseUrl}/api/findings?job_id=${jobId}`, {
        headers: { "x-api-key": readKey! },
        signal: AbortSignal.timeout(5_000),
      });

      if (findingsRes.ok) {
        const findingsData = await findingsRes.json();
        return {
          job_id: jobId,
          findings: findingsData.findings || [],
          findings_count: (findingsData.findings || []).length,
        };
      }

      // Findings fetch failed but job succeeded — return empty
      return { job_id: jobId, findings: [], findings_count: 0 };
    }

    if (status === "failed") {
      console.error(`[Natasha] job_failed { jobId: "${jobId}", error: "${statusData.error?.message}" }`);
      return null;
    }

    // Still running — continue polling
  }

  console.log(`[Natasha] job_timeout { jobId: "${jobId}", elapsed: ${POLL_TIMEOUT_MS}ms }`);
  return null;
}
