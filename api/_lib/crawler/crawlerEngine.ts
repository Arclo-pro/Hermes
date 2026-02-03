/**
 * HTTP-based crawler engine for technical SEO audits.
 * Uses Node's built-in fetch + cheerio for HTML parsing.
 * No Playwright dependency — pure HTTP crawling.
 *
 * Ported from server/services/technicalCrawler/crawlerEngine.ts
 * for use in Vercel serverless functions.
 */

import { XMLParser } from "fast-xml-parser";
import { normalizeUrl, isInternalUrl } from "./urlUtils.js";
import { parseHtml, determineIndexability } from "./htmlParser.js";
import { runFindingRules, type CrawlFinding, type FindingContext } from "./findingRules.js";

const USER_AGENT = "ArcloBot/1.0 (+https://arclo.com/bot)";
const FETCH_TIMEOUT = 10_000;

export interface CrawlConfig {
  maxPages: number;
  maxDepth: number;
  concurrency: number;
  respectRobots: boolean;
}

const DEFAULT_CONFIG: CrawlConfig = {
  maxPages: 50,
  maxDepth: 3,
  concurrency: 5,
  respectRobots: true,
};

interface CrawledPage {
  url: string;
  statusCode: number;
  title: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  indexability: string;
  h1Count: number;
  wordCount: number;
  internalLinksOut: number;
  imagesMissingAlt: number;
  imagesMissingSize: number;
  html?: string; // Only stored for homepage (depth 0, seed)
}

interface QueueItem {
  url: string;
  normalizedUrl: string;
  depth: number;
  source: "sitemap" | "link" | "seed";
}

// ─── Robots.txt ──────────────────────────────────────────────────────────────

interface RobotsRule {
  userAgent: string;
  disallow: string[];
  allow: string[];
  sitemaps: string[];
}

function parseRobotsTxt(content: string): RobotsRule[] {
  const rules: RobotsRule[] = [];
  const sitemaps: string[] = [];
  let currentRule: RobotsRule | null = null;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const directive = line.substring(0, colonIndex).trim().toLowerCase();
    const value = line.substring(colonIndex + 1).trim();

    if (directive === "user-agent") {
      if (currentRule) rules.push(currentRule);
      currentRule = { userAgent: value.toLowerCase(), disallow: [], allow: [], sitemaps: [] };
    } else if (directive === "disallow" && currentRule && value) {
      currentRule.disallow.push(value);
    } else if (directive === "allow" && currentRule && value) {
      currentRule.allow.push(value);
    } else if (directive === "sitemap") {
      sitemaps.push(value);
    }
  }

  if (currentRule) rules.push(currentRule);
  for (const rule of rules) rule.sitemaps = sitemaps;
  return rules;
}

function isUrlAllowed(url: string, rules: RobotsRule[]): boolean {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname + urlObj.search;

    let matchingRule = rules.find(r => r.userAgent === "arclobot");
    if (!matchingRule) matchingRule = rules.find(r => r.userAgent === "*");
    if (!matchingRule) return true;

    for (const allow of matchingRule.allow) {
      if (path.startsWith(allow)) return true;
    }
    for (const disallow of matchingRule.disallow) {
      if (path.startsWith(disallow)) return false;
    }
    return true;
  } catch {
    return true;
  }
}

// ─── Sitemap parsing ─────────────────────────────────────────────────────────

async function fetchSitemapUrls(
  sitemapUrls: string[],
  maxUrls: number
): Promise<string[]> {
  const allUrls: string[] = [];
  const processed = new Set<string>();
  const queue = [...sitemapUrls];
  const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

  while (queue.length > 0 && allUrls.length < maxUrls) {
    const sitemapUrl = queue.shift()!;
    if (processed.has(sitemapUrl)) continue;
    processed.add(sitemapUrl);

    try {
      const resp = await fetch(sitemapUrl, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });
      if (!resp.ok) continue;

      const xml = await resp.text();
      const parsed = xmlParser.parse(xml);

      // Sitemap index
      if (parsed.sitemapindex) {
        const sitemaps = parsed.sitemapindex.sitemap;
        const arr = Array.isArray(sitemaps) ? sitemaps : [sitemaps];
        for (const s of arr) {
          if (s?.loc && !processed.has(s.loc)) queue.push(s.loc);
        }
        continue;
      }

      // Regular urlset
      if (parsed.urlset) {
        const urls = parsed.urlset.url;
        const arr = Array.isArray(urls) ? urls : [urls];
        for (const u of arr) {
          if (u?.loc && allUrls.length < maxUrls) allUrls.push(u.loc);
        }
      }
    } catch (err) {
      console.log(`[TechnicalCrawler] Failed to fetch sitemap ${sitemapUrl}`);
    }
  }

  return allUrls;
}

// ─── Concurrency limiter ─────────────────────────────────────────────────────

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let index = 0;
  async function next(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      await fn(items[i]);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => next());
  await Promise.all(workers);
}

// ─── Main crawl function ─────────────────────────────────────────────────────

export async function runTechnicalCrawl(
  domain: string,
  config: Partial<CrawlConfig> = {}
): Promise<Record<string, any>> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const baseDomain = domain.replace(/^www\./, "");
  const baseUrl = `https://${domain}`;
  const startTime = Date.now();

  console.log(`[TechnicalCrawler] Starting crawl of ${domain} (max ${cfg.maxPages} pages)`);

  const crawledUrls = new Set<string>();
  const sitemapUrlSet = new Set<string>();
  const pages: CrawledPage[] = [];
  const allFindings: CrawlFinding[] = [];
  const inlinkCounts = new Map<string, number>();
  let robotsRules: RobotsRule[] = [];

  // Step 1: Fetch robots.txt
  try {
    const resp = await fetch(`${baseUrl}/robots.txt`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    if (resp.ok) {
      robotsRules = parseRobotsTxt(await resp.text());
    }
  } catch {
    console.log("[TechnicalCrawler] No robots.txt found");
  }

  // Step 2: Discover sitemap URLs
  const sitemapSources = robotsRules.flatMap(r => r.sitemaps);
  if (sitemapSources.length === 0) sitemapSources.push(`${baseUrl}/sitemap.xml`);

  const sitemapLocs = await fetchSitemapUrls(sitemapSources, cfg.maxPages);
  for (const loc of sitemapLocs) {
    const norm = normalizeUrl(loc, baseDomain);
    if (norm && isInternalUrl(loc, baseDomain)) sitemapUrlSet.add(norm);
  }
  console.log(`[TechnicalCrawler] Found ${sitemapUrlSet.size} sitemap URLs`);

  // Step 3: Build initial queue
  const urlQueue: QueueItem[] = [];
  const enqueue = (url: string, source: QueueItem["source"], depth: number) => {
    const norm = normalizeUrl(url, baseDomain);
    if (norm && !crawledUrls.has(norm) && isInternalUrl(url, baseDomain)) {
      urlQueue.push({ url, normalizedUrl: norm, depth, source });
    }
  };

  // Homepage first
  enqueue(baseUrl, "seed", 0);

  // Sitemap URLs
  for (const loc of sitemapLocs) enqueue(loc, "sitemap", 0);

  // Step 4: Crawl pages in batches
  let processedCount = 0;

  while (urlQueue.length > 0 && processedCount < cfg.maxPages) {
    const batchSize = Math.min(cfg.concurrency * 2, cfg.maxPages - processedCount, urlQueue.length);
    const batch = urlQueue.splice(0, batchSize);

    await runWithConcurrency(batch, cfg.concurrency, async (item) => {
      if (crawledUrls.has(item.normalizedUrl) || processedCount >= cfg.maxPages) return;
      crawledUrls.add(item.normalizedUrl);
      processedCount++;

      const isBlocked = cfg.respectRobots && !isUrlAllowed(item.url, robotsRules);

      try {
        let statusCode = 0;
        let contentType = "";
        let xRobotsTag: string | null = null;
        let html = "";
        const redirectChain: string[] = [];

        if (!isBlocked) {
          const resp = await fetch(item.url, {
            headers: { "User-Agent": USER_AGENT },
            redirect: "follow",
            signal: AbortSignal.timeout(FETCH_TIMEOUT),
          });

          statusCode = resp.status;
          contentType = resp.headers.get("content-type") || "";
          xRobotsTag = resp.headers.get("x-robots-tag") || null;

          // Detect redirect (final URL differs from requested)
          if (resp.url !== item.url) {
            redirectChain.push(item.url, resp.url);
          }

          if (contentType.includes("text/html") && statusCode >= 200 && statusCode < 300) {
            html = await resp.text();
          }
        }

        // Parse HTML
        const parsedPage = html ? parseHtml(html, item.url, baseDomain) : null;

        const indexability = determineIndexability(
          statusCode,
          parsedPage?.robotsMeta || null,
          xRobotsTag,
          contentType,
          parsedPage?.canonicalUrl || null,
          item.url,
          isBlocked
        );

        const internalLinksOut = parsedPage?.links.filter(l => l.isInternal).length || 0;
        const missingAlt = parsedPage?.images.filter(i => !i.alt).length || 0;
        const missingSize = parsedPage?.images.filter(i => !i.hasWidth || !i.hasHeight).length || 0;

        const page: CrawledPage = {
          url: item.url,
          statusCode,
          title: parsedPage?.title || null,
          metaDescription: parsedPage?.metaDescription || null,
          canonicalUrl: parsedPage?.canonicalUrl || null,
          indexability,
          h1Count: parsedPage?.h1Count || 0,
          wordCount: parsedPage?.wordCount || 0,
          internalLinksOut,
          imagesMissingAlt: missingAlt,
          imagesMissingSize: missingSize,
        };

        // Store HTML for homepage (seed page at depth 0) for downstream agents
        if (item.source === "seed" && item.depth === 0 && html) {
          page.html = html;
        }

        pages.push(page);

        // Track inlinks for orphan detection
        if (parsedPage) {
          for (const link of parsedPage.links) {
            if (link.isInternal) {
              const linkNorm = normalizeUrl(link.href, baseDomain);
              if (linkNorm) {
                inlinkCounts.set(linkNorm, (inlinkCounts.get(linkNorm) || 0) + 1);
              }

              // Discover new URLs
              if (item.depth < cfg.maxDepth) {
                enqueue(link.href, "link", item.depth + 1);
              }
            }
          }
        }

        // Generate findings
        const ctx: FindingContext = {
          url: item.url,
          statusCode,
          redirectChain,
          canonicalUrl: parsedPage?.canonicalUrl,
          robotsMeta: parsedPage?.robotsMeta,
          indexability,
          title: parsedPage?.title,
          titleLen: parsedPage?.titleLen,
          metaDescription: parsedPage?.metaDescription,
          metaDescriptionLen: parsedPage?.metaDescriptionLen,
          h1Count: parsedPage?.h1Count,
          h1Texts: parsedPage?.h1Texts,
          wordCount: parsedPage?.wordCount,
          visibleTextLen: parsedPage?.visibleTextLen,
          outlinksCount: internalLinksOut,
          imagesMissingAlt: missingAlt,
          imagesMissingSize: missingSize,
          isInSitemap: sitemapUrlSet.has(item.normalizedUrl),
        };

        allFindings.push(...runFindingRules(ctx));
      } catch (err) {
        pages.push({
          url: item.url, statusCode: 0, title: null, metaDescription: null,
          canonicalUrl: null, indexability: "error", h1Count: 0, wordCount: 0,
          internalLinksOut: 0, imagesMissingAlt: 0, imagesMissingSize: 0,
        });
      }
    });

    if (processedCount % 10 === 0) {
      console.log(`[TechnicalCrawler] Crawled ${processedCount} / ${cfg.maxPages} pages`);
    }
  }

  // Step 5: Post-crawl orphan page detection
  for (const page of pages) {
    const norm = normalizeUrl(page.url, baseDomain);
    if (norm && sitemapUrlSet.has(norm) && !inlinkCounts.has(norm)) {
      const alreadyFlagged = allFindings.some(f => f.url === page.url && f.ruleId === "RULE_ORPHAN_PAGE");
      if (!alreadyFlagged) {
        allFindings.push({
          url: page.url,
          category: "links",
          ruleId: "RULE_ORPHAN_PAGE",
          severity: "medium",
          summary: "Orphan page - in sitemap but no internal links",
          evidence: { inlinksCount: 0, isInSitemap: true },
          suggestedAction: {
            actionType: "add_internal_link",
            target: { url: page.url },
            notes: "Add internal links to this page",
          },
        });
      }
    }
  }

  // Step 6: Build summary
  const durationMs = Date.now() - startTime;
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of allFindings) bySeverity[f.severity]++;

  const byCategory: Record<string, number> = {};
  for (const f of allFindings) byCategory[f.category] = (byCategory[f.category] || 0) + 1;

  const indexablePages = pages.filter(p => p.indexability === "indexable").length;
  const errorPages = pages.filter(p => p.statusCode >= 400 || p.statusCode === 0).length;

  console.log(`[TechnicalCrawler] Crawl complete: ${pages.length} pages, ${allFindings.length} findings in ${durationMs}ms`);

  return {
    ok: true,
    service: "crawl_render",
    pages_crawled: pages.length,
    indexable_pages: indexablePages,
    error_pages: errorPages,
    sitemap_urls_found: sitemapUrlSet.size,
    duration_ms: durationMs,
    findings_count: allFindings.length,
    findings_by_severity: bySeverity,
    findings_by_category: byCategory,
    findings: allFindings.slice(0, 200),  // Cap at 200 for response size
    pages_summary: pages.map(p => ({
      url: p.url,
      status: p.statusCode,
      indexability: p.indexability,
      title: p.title,
      word_count: p.wordCount,
    })),
    // Include homepage HTML for downstream agents (service detection, atlas)
    homepage_html: pages.find(p => p.html)?.html || "",
    summary: {
      health_score: calculateHealthScore(pages, allFindings),
      pages_crawled: pages.length,
      indexable: indexablePages,
      errors: errorPages,
      findings: allFindings.length,
      critical: bySeverity.critical,
      high: bySeverity.high,
      medium: bySeverity.medium,
      low: bySeverity.low,
    },
  };
}

/**
 * Simple health score: start at 100, deduct per finding severity.
 */
function calculateHealthScore(pages: CrawledPage[], findings: CrawlFinding[]): number {
  if (pages.length === 0) return 0;

  let score = 100;
  const deductions = { critical: 10, high: 5, medium: 2, low: 1 };

  for (const f of findings) {
    score -= deductions[f.severity] || 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
