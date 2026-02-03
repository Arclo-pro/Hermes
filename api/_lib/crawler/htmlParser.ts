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
  h2Duplicates: string[];
  visibleTextLen: number;
  wordCount: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
  fleschReadingEase: number | null;
  links: Array<{
    href: string;
    text: string | null;
    isInternal: boolean;
    isFollowed: boolean;
  }>;
  internalLinksNoAnchor: number;
  externalLinksCount: number;
  externalLinksFollowed: number;
  images: Array<{
    src: string | null;
    resolvedSrc: string | null;
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

  // H2 headings (first 20) + detect duplicates
  const h2Texts: string[] = [];
  const h2Seen = new Set<string>();
  const h2Duplicates: string[] = [];
  $("h2").each((i, el) => {
    if (i < 20) {
      const text = $(el).text().trim();
      if (text) {
        h2Texts.push(text);
        const normalized = text.toLowerCase();
        if (h2Seen.has(normalized)) {
          h2Duplicates.push(text);
        }
        h2Seen.add(normalized);
      }
    }
  });

  // Visible text (strip nav, footer, script, style)
  const $clone = cheerio.load(html);
  $clone("script, style, noscript, nav, footer, header, aside").remove();
  const visibleText = $clone("body").text().replace(/\s+/g, " ").trim();
  const visibleTextLen = visibleText.length;
  const words = visibleText.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  // Readability calculation (Flesch-Kincaid)
  const sentences = visibleText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = Math.max(sentences.length, 1);
  const avgWordsPerSentence = wordCount / sentenceCount;

  // Syllable counting (simplified)
  const countSyllables = (word: string): number => {
    word = word.toLowerCase().replace(/[^a-z]/g, "");
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
    word = word.replace(/^y/, "");
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  };

  let totalSyllables = 0;
  for (const word of words) {
    totalSyllables += countSyllables(word);
  }
  const avgSyllablesPerWord = wordCount > 0 ? totalSyllables / wordCount : 0;

  // Flesch Reading Ease: 206.835 - 1.015*(words/sentences) - 84.6*(syllables/words)
  // Score 0-30: Very difficult (college graduate), 30-60: Difficult, 60-70: Standard, 70-80: Fairly easy, 80-100: Easy
  const fleschReadingEase = wordCount > 0
    ? Math.round(206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord))
    : null;

  // Extract links
  const links: ParsedPage["links"] = [];
  let internalLinksNoAnchor = 0;
  let externalLinksCount = 0;
  let externalLinksFollowed = 0;

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

    const rel = $(el).attr("rel") || "";
    const isNofollow = rel.toLowerCase().includes("nofollow");
    const isFollowed = !isNofollow;
    const anchorText = $(el).text().trim();
    const imgAlt = $(el).find("img").attr("alt")?.trim() || "";
    const hasAnchor = !!(anchorText || imgAlt);
    const isInternal = isInternalUrl(resolvedUrl, baseDomain);

    if (isInternal && !hasAnchor) {
      internalLinksNoAnchor++;
    }

    if (!isInternal) {
      externalLinksCount++;
      if (isFollowed) externalLinksFollowed++;
    }

    links.push({
      href: resolvedUrl,
      text: anchorText || null,
      isInternal,
      isFollowed,
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

    // Resolve the image URL for size checking
    const resolvedSrc = src && !src.startsWith("data:") ? resolveUrl(src, pageUrl) : null;

    images.push({ src: src || null, resolvedSrc, alt, hasWidth, hasHeight, isBroken });
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
    h2Duplicates,
    visibleTextLen,
    wordCount,
    avgWordsPerSentence,
    avgSyllablesPerWord,
    fleschReadingEase,
    links,
    internalLinksNoAnchor,
    externalLinksCount,
    externalLinksFollowed,
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
