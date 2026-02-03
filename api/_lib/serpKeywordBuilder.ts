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

const FREE_SCAN_KEYWORD_CAP = 15;

// Light variant suffixes — appended to service phrases
const VARIANT_SUFFIXES = ["company", "services", "cost", "reviews", "pricing"];

// Business type to service keywords mapping for fast keyword generation
const BUSINESS_TYPE_KEYWORDS: Record<string, string[]> = {
  "Restaurant / Food Service": ["restaurant", "food delivery", "catering", "takeout", "dining", "breakfast", "lunch", "dinner"],
  "Healthcare / Medical": ["doctor", "medical clinic", "healthcare", "physician", "urgent care", "family medicine", "primary care"],
  "Legal Services": ["lawyer", "attorney", "law firm", "legal services", "legal advice", "legal consultation"],
  "Home Services (Plumbing, HVAC, etc.)": ["plumber", "plumbing", "HVAC", "heating", "air conditioning", "electrician", "handyman", "home repair"],
  "Real Estate": ["real estate agent", "realtor", "homes for sale", "property management", "real estate", "house listings"],
  "Retail / E-commerce": ["store", "shop", "retail", "online store", "shopping", "buy online"],
  "Professional Services": ["consulting", "business services", "professional services", "consultant", "advisor"],
  "Fitness / Wellness": ["gym", "fitness", "personal trainer", "yoga", "wellness", "workout", "fitness classes"],
  "Beauty / Salon": ["salon", "hair salon", "beauty salon", "spa", "nail salon", "barber", "hair stylist"],
  "Automotive": ["auto repair", "car mechanic", "auto shop", "car dealership", "oil change", "tire shop", "auto service"],
  "Education / Tutoring": ["tutor", "tutoring", "education", "learning center", "test prep", "private lessons"],
  "Technology / IT": ["IT services", "tech support", "computer repair", "IT consulting", "software development", "managed IT"],
  "Construction / Contractors": ["contractor", "construction", "general contractor", "home builder", "remodeling", "renovation"],
  "Financial Services": ["financial advisor", "accountant", "tax services", "bookkeeping", "financial planning", "CPA"],
  "Insurance": ["insurance agent", "insurance", "auto insurance", "home insurance", "life insurance", "health insurance"],
  "Marketing / Advertising": ["marketing agency", "digital marketing", "SEO services", "advertising", "social media marketing"],
  "Photography / Videography": ["photographer", "photography", "videographer", "wedding photographer", "portrait photographer"],
  "Event Planning": ["event planner", "wedding planner", "party planner", "event planning", "catering", "event coordinator"],
  "Pet Services": ["pet grooming", "dog groomer", "pet sitting", "dog walker", "veterinarian", "pet boarding"],
  "Cleaning Services": ["cleaning service", "house cleaning", "maid service", "commercial cleaning", "janitorial services"],
  "Landscaping / Lawn Care": ["landscaping", "lawn care", "lawn service", "tree service", "garden maintenance"],
  "Moving / Storage": ["moving company", "movers", "storage", "moving services", "relocation"],
  "Travel / Tourism": ["travel agency", "tour guide", "vacation packages", "travel planning"],
  "Hospitality / Hotels": ["hotel", "lodging", "accommodation", "resort", "bed and breakfast"],
  "Manufacturing": ["manufacturer", "manufacturing", "custom fabrication", "industrial"],
  "Wholesale / Distribution": ["wholesale", "distributor", "supplier", "bulk supplier"],
  "Agriculture / Farming": ["farm", "agriculture", "farmers market", "organic produce"],
  "Non-Profit / Charity": ["non-profit", "charity", "foundation", "volunteer", "donations"],
  "Religious Organization": ["church", "religious services", "worship", "congregation"],
  "Entertainment / Media": ["entertainment", "media production", "video production", "music", "DJ"],
  "Other": [],
};

/**
 * Build a SERP keyword set from business type + location.
 * This is faster than homepage scanning as it doesn't require crawling the site.
 *
 * @param businessType - The user-selected business type category
 * @param location     - City/region string (e.g. "Sacramento, CA") or null
 * @param domain       - The target domain (used for branded fallback only)
 * @returns Deduplicated, capped keyword list
 */
export function buildKeywordsFromBusinessType(
  businessType: string,
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

  // Get service keywords for this business type
  const serviceKeywords = BUSINESS_TYPE_KEYWORDS[businessType] || [];

  // If no specific keywords for this business type, extract from the type name itself
  const fallbackKeywords = serviceKeywords.length > 0
    ? serviceKeywords
    : businessType
        .replace(/[()\/]/g, " ")
        .split(/\s+/)
        .filter(word => word.length > 2 && !["etc", "and", "the", "for"].includes(word.toLowerCase()));

  // Extract city name from location string
  const city = location ? location.split(",")[0]?.trim() : null;

  for (const service of fallbackKeywords) {
    const svc = service.trim();
    if (!svc) continue;

    // {service} + {city} — strongest local intent
    if (city) {
      add(`${svc} ${city}`, "local", businessType);
    }

    // {service} + "near me" — high local intent
    add(`${svc} near me`, "local", businessType);

    // {service} + light variants
    for (const suffix of VARIANT_SUFFIXES) {
      if (svc.toLowerCase().endsWith(suffix)) continue;
      add(`${svc} ${suffix}`, "high_intent", businessType);
    }

    // bare service (informational)
    add(svc, "informational", businessType);
  }

  // Add "best" variants for top keywords
  if (fallbackKeywords.length > 0) {
    const topService = fallbackKeywords[0];
    if (city) {
      add(`best ${topService} ${city}`, "high_intent", businessType);
    }
    add(`best ${topService} near me`, "high_intent", businessType);
  }

  // Cap for free scans
  return keywords.slice(0, FREE_SCAN_KEYWORD_CAP);
}

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
