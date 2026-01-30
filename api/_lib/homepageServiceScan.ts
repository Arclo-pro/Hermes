/**
 * Homepage Service Scan
 *
 * Extracts business name, primary services, and location cues from
 * homepage HTML using heading, nav, meta, and CTA signals.
 * No external dependencies — uses regex-based extraction.
 */

export interface HomepageScanResult {
  siteUrl: string;
  businessName: string | null;
  services: string[];
  serviceCategories: string[];
  locationCues: string[];
  confidence: number;
  evidence: {
    headings: string[];
    nav: string[];
    meta: { title: string | null; description: string | null };
    cta: string[];
  };
}

// Words that are too generic to be useful as service phrases
const STOP_PHRASES = new Set([
  "home", "about", "about us", "contact", "contact us", "blog", "news",
  "careers", "jobs", "login", "sign in", "sign up", "register", "faq",
  "privacy", "privacy policy", "terms", "terms of service", "sitemap",
  "menu", "close", "open", "search", "more", "learn more", "read more",
  "get started", "view all", "see all", "back to top", "skip to content",
  "copyright", "all rights reserved", "follow us", "subscribe",
  "toggle navigation", "main menu", "footer", "header",
]);

// Minimum length for a service phrase to be meaningful
const MIN_SERVICE_LENGTH = 4;
const MAX_SERVICE_LENGTH = 80;
const TARGET_SERVICE_COUNT = 12;

/**
 * Extract text content from between HTML tags, stripping inner tags.
 */
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ").replace(/&\w+;/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Extract all matches for a given tag pattern from HTML.
 */
function extractTagContents(html: string, tagPattern: RegExp): string[] {
  const results: string[] = [];
  let match;
  while ((match = tagPattern.exec(html)) !== null) {
    const text = stripTags(match[1] || match[2] || "").trim();
    if (text && text.length >= MIN_SERVICE_LENGTH && text.length <= MAX_SERVICE_LENGTH) {
      results.push(text);
    }
  }
  return results;
}

/**
 * Check if a phrase looks like a real service/offering vs. generic navigation.
 */
function isServicePhrase(phrase: string): boolean {
  const lower = phrase.toLowerCase().trim();
  if (lower.length < MIN_SERVICE_LENGTH || lower.length > MAX_SERVICE_LENGTH) return false;
  if (STOP_PHRASES.has(lower)) return false;
  // Filter out pure numbers, single words that are generic
  if (/^\d+$/.test(lower)) return false;
  // Filter out phrases that are just URLs
  if (/^https?:\/\//i.test(lower)) return false;
  // Filter out phrases that are mostly special characters
  if (lower.replace(/[^a-z]/g, "").length < 3) return false;
  return true;
}

/**
 * Normalize a service phrase for deduplication.
 */
function normalizePhrase(phrase: string): string {
  return phrase.toLowerCase().replace(/[^a-z0-9\s&-]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Deduplicate service phrases, preferring the original casing of the first occurrence.
 */
function deduplicateServices(phrases: string[]): string[] {
  const seen = new Map<string, string>();
  for (const phrase of phrases) {
    const key = normalizePhrase(phrase);
    if (key && !seen.has(key)) {
      seen.set(key, phrase);
    }
  }
  return Array.from(seen.values());
}

/**
 * Try to extract the business name from HTML signals.
 */
function extractBusinessName(html: string): string | null {
  // Try OG site_name first
  const ogSiteName = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i);
  if (ogSiteName?.[1]) return stripTags(ogSiteName[1]);

  // Try title tag — take the first segment before | or - or :
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch?.[1]) {
    const titleText = stripTags(titleMatch[1]);
    const segment = titleText.split(/\s*[|–—\-:]\s*/)[0]?.trim();
    if (segment && segment.length >= 2 && segment.length <= 60) return segment;
  }

  return null;
}

/**
 * Extract location cues from the HTML.
 */
function extractLocationCues(html: string): string[] {
  const cues: string[] = [];

  // geo.region meta tag
  const geoRegion = html.match(/<meta[^>]*name=["']geo\.region["'][^>]*content=["']([^"']+)["']/i);
  if (geoRegion?.[1]) cues.push(geoRegion[1]);

  // geo.placename meta tag
  const geoPlace = html.match(/<meta[^>]*name=["']geo\.placename["'][^>]*content=["']([^"']+)["']/i);
  if (geoPlace?.[1]) cues.push(geoPlace[1]);

  // Schema.org address in JSON-LD
  const jsonLdBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of jsonLdBlocks) {
    const jsonContent = block.replace(/<\/?script[^>]*>/gi, "");
    try {
      const data = JSON.parse(jsonContent);
      const address = data?.address || data?.location?.address;
      if (address) {
        if (address.addressLocality) cues.push(address.addressLocality);
        if (address.addressRegion) cues.push(address.addressRegion);
      }
    } catch {
      // malformed JSON-LD — skip
    }
  }

  // Look for common address patterns: "City, ST" or "City, State"
  const addressPattern = /(?:in|serving|located in|based in)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),?\s*([A-Z]{2})\b/g;
  let addrMatch;
  while ((addrMatch = addressPattern.exec(html)) !== null) {
    if (addrMatch[1]) cues.push(addrMatch[1]);
    if (addrMatch[2]) cues.push(addrMatch[2]);
  }

  return Array.from(new Set(cues.filter(c => c.length >= 2)));
}

/**
 * Scan homepage HTML and extract services, business name, and metadata.
 */
export function scanHomepageServices(html: string, siteUrl: string): HomepageScanResult {
  const evidence: HomepageScanResult["evidence"] = {
    headings: [],
    nav: [],
    meta: { title: null, description: null },
    cta: [],
  };

  let signalSources = 0;
  const allServiceCandidates: string[] = [];

  // --- Signal 1: Meta title & description ---
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaTitle = titleMatch ? stripTags(titleMatch[1]) : null;
  evidence.meta.title = metaTitle;

  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  const metaDesc = descMatch ? stripTags(descMatch[1]) : null;
  evidence.meta.description = metaDesc;

  // Extract service-like phrases from meta description (split on commas, periods, |)
  if (metaDesc) {
    const metaPhrases = metaDesc.split(/[,.|;]/).map(s => s.trim()).filter(isServicePhrase);
    if (metaPhrases.length > 0) {
      signalSources++;
      allServiceCandidates.push(...metaPhrases);
    }
  }

  // --- Signal 2: H1/H2/H3 headings ---
  const h1s = extractTagContents(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi);
  const h2s = extractTagContents(html, /<h2[^>]*>([\s\S]*?)<\/h2>/gi);
  const h3s = extractTagContents(html, /<h3[^>]*>([\s\S]*?)<\/h3>/gi);
  const allHeadings = [...h1s, ...h2s, ...h3s].filter(isServicePhrase);
  evidence.headings = allHeadings.slice(0, 20);

  if (allHeadings.length > 0) {
    signalSources++;
    allServiceCandidates.push(...allHeadings);
  }

  // --- Signal 3: Nav/menu items ---
  // Look for <nav> contents or common menu patterns
  const navSections = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/gi) || [];
  const navTexts: string[] = [];
  for (const navHtml of navSections) {
    // Extract link text within nav
    const linkTexts = extractTagContents(navHtml, /<a[^>]*>([\s\S]*?)<\/a>/gi);
    navTexts.push(...linkTexts.filter(isServicePhrase));
  }
  evidence.nav = navTexts.slice(0, 15);

  if (navTexts.length > 0) {
    signalSources++;
    allServiceCandidates.push(...navTexts);
  }

  // --- Signal 4: CTA / prominent button text ---
  // Look for buttons and link elements with action-oriented text
  const ctaPattern = /<(?:button|a)[^>]*class=["'][^"']*(?:cta|btn|button|primary|action|hero)[^"']*["'][^>]*>([\s\S]*?)<\/(?:button|a)>/gi;
  const ctaTexts = extractTagContents(html, ctaPattern).filter(isServicePhrase);
  evidence.cta = ctaTexts.slice(0, 10);

  if (ctaTexts.length > 0) {
    signalSources++;
    allServiceCandidates.push(...ctaTexts);
  }

  // --- Signal 5: "Services" section content ---
  // Look for sections/divs with id or class containing "service"
  const serviceSectionPattern = /<(?:section|div)[^>]*(?:id|class)=["'][^"']*service[^"']*["'][^>]*>([\s\S]*?)<\/(?:section|div)>/gi;
  let svcMatch;
  while ((svcMatch = serviceSectionPattern.exec(html)) !== null) {
    const sectionHtml = svcMatch[1] || "";
    const svcHeadings = extractTagContents(sectionHtml, /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi);
    const svcLinks = extractTagContents(sectionHtml, /<a[^>]*>([\s\S]*?)<\/a>/gi);
    const svcPhrases = [...svcHeadings, ...svcLinks].filter(isServicePhrase);
    if (svcPhrases.length > 0) {
      signalSources++;
      allServiceCandidates.push(...svcPhrases);
    }
  }

  // --- Deduplicate and rank ---
  const deduplicated = deduplicateServices(allServiceCandidates);

  // Score: prefer shorter, more specific phrases; penalize very long ones
  const scored = deduplicated.map(phrase => {
    let score = 0;
    const lower = normalizePhrase(phrase);
    // Bonus: appears in headings
    if (evidence.headings.some(h => normalizePhrase(h) === lower)) score += 3;
    // Bonus: appears in nav
    if (evidence.nav.some(n => normalizePhrase(n) === lower)) score += 2;
    // Bonus: appears in meta
    if (metaDesc && metaDesc.toLowerCase().includes(lower)) score += 2;
    if (metaTitle && metaTitle.toLowerCase().includes(lower)) score += 1;
    // Penalty: very long phrases
    if (phrase.length > 40) score -= 1;
    // Bonus: moderate length (2-4 words)
    const wordCount = phrase.split(/\s+/).length;
    if (wordCount >= 2 && wordCount <= 4) score += 1;
    return { phrase, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const services = scored.slice(0, TARGET_SERVICE_COUNT).map(s => s.phrase);

  // --- Business name ---
  const businessName = extractBusinessName(html);

  // --- Location cues ---
  const locationCues = extractLocationCues(html);

  // --- Confidence ---
  // Based on number of distinct signal sources that yielded services
  const maxSources = 5;
  const confidence = Math.min(1, Math.max(0, signalSources / maxSources + (services.length >= 5 ? 0.2 : 0)));

  // --- Service categories (simple heuristic) ---
  const serviceCategories: string[] = [];
  const allLower = services.map(s => s.toLowerCase()).join(" ");
  const categoryKeywords: Record<string, string[]> = {
    plumbing: ["plumb", "drain", "pipe", "sewer", "water heater", "faucet"],
    hvac: ["hvac", "air condition", "heating", "cooling", "furnace", "duct"],
    electrical: ["electric", "wiring", "panel", "outlet", "lighting"],
    roofing: ["roof", "shingle", "gutter"],
    landscaping: ["landscap", "lawn", "garden", "tree", "irrigation"],
    dental: ["dental", "dentist", "orthodont", "teeth", "oral"],
    legal: ["law", "attorney", "legal", "lawyer", "litigation"],
    medical: ["medical", "doctor", "clinic", "health", "patient"],
    automotive: ["auto", "car", "vehicle", "mechanic", "repair shop"],
    remodeling: ["remodel", "renovation", "kitchen", "bathroom", "flooring"],
    cleaning: ["clean", "janitorial", "maid", "pressure wash"],
    pest: ["pest", "termite", "exterminator", "rodent"],
    marketing: ["marketing", "seo", "digital", "advertising", "branding"],
    construction: ["construct", "build", "contractor", "framing"],
    insurance: ["insurance", "coverage", "policy", "claim"],
    realestate: ["real estate", "realtor", "property", "home sale"],
    restaurant: ["restaurant", "catering", "food", "dining", "menu"],
    fitness: ["fitness", "gym", "personal train", "yoga", "workout"],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => allLower.includes(kw))) {
      serviceCategories.push(category);
    }
  }

  return {
    siteUrl,
    businessName,
    services,
    serviceCategories,
    locationCues,
    confidence,
    evidence,
  };
}
