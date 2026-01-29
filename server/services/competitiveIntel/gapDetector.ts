/**
 * Stage 2: Content gap detection.
 *
 * Fetches our page and competitor pages, compares:
 * - Headings (H1, H2, H3)
 * - Schema types (JSON-LD)
 * - Word count / content depth
 * - Freshness signals (date mentions)
 */

import * as cheerio from "cheerio";
import { logger } from "../../utils/logger";

const FETCH_TIMEOUT = 10_000;
const USER_AGENT = "ArcloBot/1.0 (+https://arclo.com/bot)";

export interface PageMetadata {
  url: string;
  title: string | null;
  metaDescription: string | null;
  headings: string[];
  schemaTypes: string[];
  wordCount: number;
  lastModified: string | null;
  hasFreshnessSignals: boolean;
}

export interface ContentGap {
  keyword: string;
  ourPage: PageMetadata | null;
  competitorPage: PageMetadata | null;
  missingHeadings: string[];
  missingSchemaTypes: string[];
  contentDepthGap: number;  // competitor wordCount - our wordCount
  competitorHasFreshness: boolean;
}

/**
 * Fetch and parse page metadata using cheerio.
 */
export async function fetchPageMetadata(url: string): Promise<PageMetadata | null> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    if (!resp.ok) return null;

    const contentType = resp.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;

    const html = await resp.text();
    const $ = cheerio.load(html);

    // Title
    const title = $("title").first().text().trim() || null;
    const metaDescription = $('meta[name="description"]').attr("content")?.trim() || null;

    // Headings
    const headings: string[] = [];
    $("h1, h2, h3").each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 2) headings.push(text);
    });

    // Schema types from JSON-LD
    const schemaTypes: string[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || "");
        const extractTypes = (obj: any) => {
          if (obj?.["@type"]) {
            const types = Array.isArray(obj["@type"]) ? obj["@type"] : [obj["@type"]];
            schemaTypes.push(...types);
          }
          if (obj?.["@graph"] && Array.isArray(obj["@graph"])) {
            obj["@graph"].forEach(extractTypes);
          }
        };
        extractTypes(data);
      } catch {}
    });

    // Word count
    const $clone = cheerio.load(html);
    $clone("script, style, noscript, nav, footer").remove();
    const bodyText = $clone("body").text().replace(/\s+/g, " ").trim();
    const wordCount = bodyText.split(/\s+/).filter(w => w.length > 0).length;

    // Freshness signals
    const lastModified = resp.headers.get("last-modified") || null;
    const hasFreshnessSignals = headings.some(h => {
      const lower = h.toLowerCase();
      return /202\d/.test(lower) || lower.includes("updated") || lower.includes("latest") || lower.includes("new ");
    });

    return {
      url, title, metaDescription, headings, schemaTypes,
      wordCount, lastModified, hasFreshnessSignals,
    };
  } catch (err) {
    logger.info("CompetitiveIntel", `Failed to fetch ${url}: ${err}`);
    return null;
  }
}

/**
 * Detect content gaps between our page and a competitor page.
 */
export async function analyzeContentGaps(
  keyword: string,
  ourUrl: string | null,
  competitorUrl: string | null,
): Promise<ContentGap> {
  const ourPage = ourUrl ? await fetchPageMetadata(ourUrl) : null;
  const competitorPage = competitorUrl ? await fetchPageMetadata(competitorUrl) : null;

  // Find missing headings (competitor has, we don't)
  const missingHeadings: string[] = [];
  if (ourPage && competitorPage) {
    const ourHeadingsLower = new Set(ourPage.headings.map(h => h.toLowerCase().substring(0, 20)));
    for (const heading of competitorPage.headings) {
      const prefix = heading.toLowerCase().substring(0, 20);
      if (!ourHeadingsLower.has(prefix)) {
        missingHeadings.push(heading);
      }
    }
  }

  // Find missing schema types
  const missingSchemaTypes: string[] = [];
  if (ourPage && competitorPage) {
    const ourSchemas = new Set(ourPage.schemaTypes.map(s => s.toLowerCase()));
    for (const schema of competitorPage.schemaTypes) {
      if (!ourSchemas.has(schema.toLowerCase())) {
        missingSchemaTypes.push(schema);
      }
    }
  }

  // Content depth gap
  const contentDepthGap = (competitorPage?.wordCount || 0) - (ourPage?.wordCount || 0);

  return {
    keyword,
    ourPage,
    competitorPage,
    missingHeadings: missingHeadings.slice(0, 20),
    missingSchemaTypes: missingSchemaTypes.slice(0, 10),
    contentDepthGap,
    competitorHasFreshness: competitorPage?.hasFreshnessSignals || false,
  };
}
