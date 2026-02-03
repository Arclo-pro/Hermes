/**
 * HTML parser for technical SEO crawling.
 * Uses cheerio to extract SEO-relevant elements from HTML pages.
 */

import * as cheerio from "cheerio";
import { resolveUrl, isInternalUrl } from "./urlUtils.js";

export interface ParsedPage {
  title: string | null;
  titleLen: number;
  metaDescription: string | null;
  metaDescriptionLen: number;
  canonicalUrl: string | null;
  robotsMeta: string | null;
  h1Texts: string[];
  h1Count: number;
  h2Texts: string[];
  h2Count: number;
  visibleTextLen: number;
  wordCount: number;
  links: Array<{
    href: string;
    text: string | null;
    isInternal: boolean;
  }>;
  images: Array<{
    src: string | null;
    alt: string | null;
    hasWidth: boolean;
    hasHeight: boolean;
    isBroken: boolean;
  }>;
}

export function parseHtml(html: string, pageUrl: string, baseDomain: string): ParsedPage {
  const $ = cheerio.load(html);

  // Title
  const title = $("title").first().text().trim() || null;
  const titleLen = title?.length || 0;

  // Meta description
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() || null;
  const metaDescriptionLen = metaDescription?.length || 0;

  // Canonical URL
  const canonicalHref = $('link[rel="canonical"]').attr("href");
  const canonicalUrl = canonicalHref ? resolveUrl(canonicalHref, pageUrl) : null;

  // Robots meta
  const robotsMeta = $('meta[name="robots"]').attr("content") || null;

  // H1 headings
  const h1Texts: string[] = [];
  $("h1").each((_, el) => {
    const text = $(el).text().trim();
    if (text) h1Texts.push(text);
  });

  // H2 headings (first 20)
  const h2Texts: string[] = [];
  $("h2").each((i, el) => {
    if (i < 20) {
      const text = $(el).text().trim();
      if (text) h2Texts.push(text);
    }
  });

  // Visible text (strip nav, footer, script, style)
  const $clone = cheerio.load(html);
  $clone("script, style, noscript, nav, footer, header, aside").remove();
  const visibleText = $clone("body").text().replace(/\s+/g, " ").trim();
  const visibleTextLen = visibleText.length;
  const wordCount = visibleText.split(/\s+/).filter(w => w.length > 0).length;

  // Extract links
  const links: ParsedPage["links"] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const resolvedUrl = resolveUrl(href, pageUrl);
    if (!resolvedUrl) return;

    if (resolvedUrl.startsWith("javascript:") ||
        resolvedUrl.startsWith("mailto:") ||
        resolvedUrl.startsWith("tel:")) {
      return;
    }

    links.push({
      href: resolvedUrl,
      text: $(el).text().trim() || null,
      isInternal: isInternalUrl(resolvedUrl, baseDomain),
    });
  });

  // Extract images
  const images: ParsedPage["images"] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src");
    const alt = $(el).attr("alt") || null;
    const hasWidth = !!$(el).attr("width");
    const hasHeight = !!$(el).attr("height");
    const isBroken = !src || src.trim() === "" || src.startsWith("data:image/gif;base64,R0lGOD");

    images.push({ src: src || null, alt, hasWidth, hasHeight, isBroken });
  });

  return {
    title,
    titleLen,
    metaDescription,
    metaDescriptionLen,
    canonicalUrl,
    robotsMeta,
    h1Texts,
    h1Count: h1Texts.length,
    h2Texts,
    h2Count: $("h2").length,
    visibleTextLen,
    wordCount,
    links,
    images,
  };
}

export function determineIndexability(
  statusCode: number,
  robotsMeta: string | null,
  xRobotsTag: string | null,
  contentType: string | null,
  canonicalUrl: string | null,
  pageUrl: string,
  isBlockedByRobots: boolean
): string {
  if (statusCode < 200 || statusCode >= 300) return "non_html";
  if (contentType && !contentType.includes("text/html")) return "non_html";
  if (isBlockedByRobots) return "blocked_by_robots";

  if (robotsMeta) {
    if (robotsMeta.toLowerCase().includes("noindex")) return "noindex";
  }

  if (xRobotsTag) {
    if (xRobotsTag.toLowerCase().includes("noindex")) return "noindex";
  }

  if (canonicalUrl && canonicalUrl !== pageUrl) {
    try {
      const nc = new URL(canonicalUrl);
      const np = new URL(pageUrl);
      nc.hash = ""; np.hash = "";
      if (nc.toString() !== np.toString()) return "canonicalized_away";
    } catch {}
  }

  return "indexable";
}
