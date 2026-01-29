/**
 * Technical SEO Crawler — consolidated into Hermes.
 *
 * HTTP-based crawler that fetches pages, parses HTML with cheerio,
 * and runs 17 SEO finding rules. No Playwright dependency.
 *
 * Entry point: runTechnicalCrawl(domain) → returns crawl summary + findings.
 */

export { runTechnicalCrawl } from "./crawlerEngine";
export type { CrawlConfig } from "./crawlerEngine";
export type { CrawlFinding, FindingContext } from "./findingRules";
export type { ParsedPage } from "./htmlParser";
