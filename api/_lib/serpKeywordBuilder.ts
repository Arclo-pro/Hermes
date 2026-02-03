/**
 * SERP Keyword Builder
 *
 * Generates a targeted keyword set from extracted services + location.
 * Produces {service} + {city}, {service} + "near me", and light variants.
 * Caps output for free scans.
 */

export interface SerpKeyword {
  keyword: string;
  intent: "high_intent" | "informational" | "local";
  source: string; // which service or signal generated this keyword
}

const FREE_SCAN_KEYWORD_CAP = 25;

// Light variant suffixes — appended to service phrases
const VARIANT_SUFFIXES = ["company", "services", "cost", "reviews", "pricing"];

/**
 * Build a SERP keyword set from extracted services and location.
 *
 * @param services  - List of service phrases from homepage scan
 * @param location  - City/region string (e.g. "Sacramento, CA") or null
 * @param domain    - The target domain (used for branded fallback only)
 * @returns Deduplicated, capped keyword list
 */
export function buildSerpKeywords(
  services: string[],
  location: string | null,
  domain: string,
): SerpKeyword[] {
  const keywords: SerpKeyword[] = [];
  const seen = new Set<string>();

  const add = (keyword: string, intent: SerpKeyword["intent"], source: string) => {
    const key = keyword.toLowerCase().trim();
    if (!key || key.length < 3 || seen.has(key)) return;
    seen.add(key);
    keywords.push({ keyword: key, intent, source });
  };

  // Extract city name from location string (e.g. "Sacramento, CA" → "Sacramento")
  const city = location ? location.split(",")[0]?.trim() : null;

  for (const service of services) {
    const svc = service.trim();
    if (!svc) continue;

    // {service} + {city} — strongest local intent
    if (city) {
      add(`${svc} ${city}`, "local", svc);
    }

    // {service} + "near me" — high local intent
    add(`${svc} near me`, "local", svc);

    // {service} + light variants
    for (const suffix of VARIANT_SUFFIXES) {
      // Avoid redundancy: "plumbing services services"
      if (svc.toLowerCase().endsWith(suffix)) continue;
      add(`${svc} ${suffix}`, "high_intent", svc);
    }

    // bare service (informational)
    add(svc, "informational", svc);
  }

  // If we have very few keywords, add branded variants
  if (keywords.length < 5) {
    const baseName = domain.replace(/^www\./, "").split(".")[0];
    if (city) {
      add(`${baseName} ${city}`, "local", "domain_fallback");
    }
    add(`${baseName} near me`, "local", "domain_fallback");
    add(`${baseName} services`, "high_intent", "domain_fallback");
    add(`best ${baseName}`, "informational", "domain_fallback");
  }

  // Cap for free scans
  return keywords.slice(0, FREE_SCAN_KEYWORD_CAP);
}

/**
 * Build a minimal fallback keyword set when service detection fails.
 * Uses meta title/description fragments + domain name.
 */
export function buildFallbackKeywords(
  metaTitle: string | null,
  metaDescription: string | null,
  location: string | null,
  domain: string,
  bodyText?: string | null,
): SerpKeyword[] {
  const phrases: string[] = [];

  // Extract meaningful phrases from meta title
  if (metaTitle) {
    const segments = metaTitle.split(/\s*[|–—\-:]\s*/).map(s => s.trim()).filter(s => s.length >= 4 && s.length <= 60);
    phrases.push(...segments);
  }

  // Extract phrases from meta description
  if (metaDescription) {
    const segments = metaDescription.split(/[,.|;]/).map(s => s.trim()).filter(s => s.length >= 4 && s.length <= 60);
    phrases.push(...segments.slice(0, 5));
  }

  // Extract noun phrases from body text (first 500 words) if we still need more
  if (phrases.length < 3 && bodyText) {
    const words = bodyText.replace(/\s+/g, " ").trim().split(/\s+/).slice(0, 500);
    const text = words.join(" ");
    // Look for capitalized multi-word phrases (likely proper nouns / service names)
    const capitalizedPhrases = text.match(/(?:[A-Z][a-z]+(?:\s+(?:&|and)\s+)?){2,4}/g) || [];
    for (const cp of capitalizedPhrases.slice(0, 5)) {
      const trimmed = cp.trim();
      if (trimmed.length >= 6 && trimmed.length <= 50) {
        phrases.push(trimmed);
      }
    }
  }

  // If we still have nothing, use the domain name
  if (phrases.length === 0) {
    const baseName = domain.replace(/^www\./, "").split(".")[0];
    phrases.push(baseName);
  }

  return buildSerpKeywords(phrases, location, domain);
}
