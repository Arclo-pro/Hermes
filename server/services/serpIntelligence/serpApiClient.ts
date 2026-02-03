/**
 * SERPAPI.com client for fetching real Google SERP rankings.
 * Rate-limited to avoid quota exhaustion.
 */

import { logger } from "../../utils/logger";

const SERPAPI_BASE = "https://serpapi.com/search";
const FETCH_TIMEOUT = 30_000;
const DELAY_BETWEEN_REQUESTS_MS = 1500;

export interface SerpApiResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  domain: string;
}

export interface SerpApiResponse {
  organic_results: SerpApiResult[];
  search_parameters: Record<string, string>;
  search_information?: {
    total_results?: number;
    query_displayed?: string;
  };
}

export interface KeywordRankingResult {
  keyword: string;
  position: number | null;  // null = not in top 20
  url: string | null;
  competitors: Array<{
    domain: string;
    url: string;
    title: string;
    position: number;
  }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch SERP rankings for a single keyword from SERPAPI.com.
 */
export async function fetchKeywordRanking(
  keyword: string,
  targetDomain: string,
  location: string = "United States",
): Promise<KeywordRankingResult> {
  const apiKey = process.env.SERP_API_KEY;
  if (!apiKey) {
    logger.error("SerpApiClient", "SERP_API_KEY not configured");
    return { keyword, position: null, url: null, competitors: [] };
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    engine: "google",
    q: keyword,
    location,
    google_domain: "google.com",
    gl: "us",
    hl: "en",
    num: "20",
  });

  try {
    const resp = await fetch(`${SERPAPI_BASE}?${params}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    if (!resp.ok) {
      logger.error("SerpApiClient", `SERPAPI returned ${resp.status} for "${keyword}"`);
      return { keyword, position: null, url: null, competitors: [] };
    }

    const data: SerpApiResponse = await resp.json();
    const organicResults = data.organic_results || [];

    let position: number | null = null;
    let url: string | null = null;
    const competitors: KeywordRankingResult["competitors"] = [];

    const baseDomain = targetDomain.replace(/^www\./, "").toLowerCase();

    for (const result of organicResults) {
      const resultDomain = extractDomain(result.link);
      if (!resultDomain) continue;

      if (resultDomain === baseDomain || resultDomain === `www.${baseDomain}`) {
        if (position === null) {
          position = result.position;
          url = result.link;
        }
      } else {
        competitors.push({
          domain: resultDomain,
          url: result.link,
          title: result.title,
          position: result.position,
        });
      }
    }

    return { keyword, position, url, competitors };
  } catch (err) {
    logger.error("SerpApiClient", `Failed to fetch SERP for "${keyword}": ${err}`);
    return { keyword, position: null, url: null, competitors: [] };
  }
}

/**
 * Fetch rankings for multiple keywords with rate limiting.
 */
export async function fetchBulkRankings(
  keywords: string[],
  targetDomain: string,
  location?: string,
): Promise<KeywordRankingResult[]> {
  const results: KeywordRankingResult[] = [];

  for (let i = 0; i < keywords.length; i++) {
    const result = await fetchKeywordRanking(keywords[i], targetDomain, location);
    results.push(result);

    // Rate limit: wait between requests (except after the last one)
    if (i < keywords.length - 1) {
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }
  }

  return results;
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}
