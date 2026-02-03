/**
 * Technical SEO Crawler for Vercel serverless functions.
 *
 * HTTP-based crawler that fetches pages, parses HTML with cheerio,
 * and runs 17 SEO finding rules. No Playwright dependency.
 *
 * Entry point: runTechnicalCrawl(domain) → returns crawl summary + findings.
 */

export { runTechnicalCrawl } from "./crawlerEngine.js";
export type { CrawlConfig } from "./crawlerEngine.js";
export type { CrawlFinding, FindingContext } from "./findingRules.js";
export type { ParsedPage } from "./htmlParser.js";
