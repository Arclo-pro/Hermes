/**
 * SEO finding rules for the technical crawler.
 * Matches Screaming Frog's issue detection capabilities.
 */

export type SeverityLevel = "critical" | "high" | "medium" | "low";

export interface CrawlFinding {
  url: string;
  category: string;
  ruleId: string;
  severity: SeverityLevel;
  summary: string;
  evidence: Record<string, any>;
  suggestedAction: {
    actionType: string;
    target: { url: string; selector?: string };
    proposedValue?: string;
    notes: string;
  };
}

export interface FindingContext {
  url: string;
  statusCode?: number;
  redirectChain?: string[];
  canonicalUrl?: string | null;
  robotsMeta?: string | null;
  indexability?: string;
  title?: string | null;
  titleLen?: number;
  metaDescription?: string | null;
  metaDescriptionLen?: number;
  h1Count?: number;
  h1Texts?: string[];
  h2Count?: number;
  h2Texts?: string[];
  h2Duplicates?: string[];
  wordCount?: number;
  visibleTextLen?: number;
  fleschReadingEase?: number | null;
  inlinksCount?: number;
  outlinksCount?: number;
  externalLinksCount?: number;
  externalLinksFollowed?: number;
  internalLinksNoAnchor?: number;
  imagesMissingAlt?: number;
  imagesMissingSize?: number;
  isInSitemap?: boolean;
  // Security headers
  referrerPolicy?: string | null;
  xContentTypeOptions?: string | null;
  contentSecurityPolicy?: string | null;
  xFrameOptions?: string | null;
  // Large images and broken external links
  largeImages?: Array<{ url: string; sizeBytes: number }>;
  brokenExternalLinks?: Array<{ url: string; statusCode: number }>;
}

interface FindingRule {
  id: string;
  category: string;
  check: (ctx: FindingContext) => CrawlFinding | null;
}

// ============================================================
// Response Code Rules
// ============================================================

const RULE_STATUS_4XX: FindingRule = {
  id: "RULE_STATUS_4XX",
  category: "response_codes",
  check: (ctx) => {
    if (ctx.statusCode && ctx.statusCode >= 400 && ctx.statusCode < 500) {
      return {
        url: ctx.url, category: "response_codes", ruleId: "RULE_STATUS_4XX",
        severity: ctx.statusCode === 404 ? "high" : "medium",
        summary: `Page returns ${ctx.statusCode} error`,
        evidence: { statusCode: ctx.statusCode },
        suggestedAction: {
          actionType: "fix_link", target: { url: ctx.url },
          notes: ctx.statusCode === 404 ? "Page not found - update or remove links" : `Fix ${ctx.statusCode} error`,
        },
      };
    }
    return null;
  },
};

const RULE_STATUS_5XX: FindingRule = {
  id: "RULE_STATUS_5XX",
  category: "response_codes",
  check: (ctx) => {
    if (ctx.statusCode && ctx.statusCode >= 500) {
      return {
        url: ctx.url, category: "response_codes", ruleId: "RULE_STATUS_5XX",
        severity: "critical",
        summary: `Server error ${ctx.statusCode}`,
        evidence: { statusCode: ctx.statusCode },
        suggestedAction: {
          actionType: "investigate_rendering", target: { url: ctx.url },
          notes: "Server error - investigate server logs",
        },
      };
    }
    return null;
  },
};

const RULE_REDIRECT_CHAIN: FindingRule = {
  id: "RULE_REDIRECT_CHAIN",
  category: "response_codes",
  check: (ctx) => {
    if (ctx.redirectChain && ctx.redirectChain.length > 1) {
      return {
        url: ctx.url, category: "response_codes", ruleId: "RULE_REDIRECT_CHAIN",
        severity: "low",
        summary: `Internal redirect chain (${ctx.redirectChain.length} hops)`,
        evidence: { redirectChain: ctx.redirectChain },
        suggestedAction: {
          actionType: "fix_link", target: { url: ctx.url },
          notes: "Update internal links to point directly to final URL",
        },
      };
    }
    return null;
  },
};

// ============================================================
// Canonical Rules
// ============================================================

const RULE_CANONICAL_MISSING: FindingRule = {
  id: "RULE_CANONICAL_MISSING",
  category: "canonicals",
  check: (ctx) => {
    if (ctx.indexability === "indexable" && !ctx.canonicalUrl) {
      return {
        url: ctx.url, category: "canonicals", ruleId: "RULE_CANONICAL_MISSING",
        severity: "medium",
        summary: "Missing canonical tag",
        evidence: {},
        suggestedAction: {
          actionType: "add_canonical", target: { url: ctx.url },
          proposedValue: ctx.url, notes: "Add self-referencing canonical",
        },
      };
    }
    return null;
  },
};

const RULE_CANONICALIZED: FindingRule = {
  id: "RULE_CANONICALIZED",
  category: "canonicals",
  check: (ctx) => {
    if (ctx.indexability === "canonicalized_away" && ctx.canonicalUrl) {
      return {
        url: ctx.url, category: "canonicals", ruleId: "RULE_CANONICALIZED",
        severity: "high",
        summary: "Page canonicalized to different URL",
        evidence: { canonicalUrl: ctx.canonicalUrl },
        suggestedAction: {
          actionType: "review_canonical", target: { url: ctx.url },
          notes: "Review canonical to ensure indexing signals are consolidated correctly. Update internal links to canonical versions where possible.",
        },
      };
    }
    return null;
  },
};

const RULE_META_NOINDEX: FindingRule = {
  id: "RULE_META_NOINDEX",
  category: "canonicals",
  check: (ctx) => {
    if (ctx.robotsMeta?.toLowerCase().includes("noindex") && ctx.isInSitemap) {
      return {
        url: ctx.url, category: "canonicals", ruleId: "RULE_META_NOINDEX",
        severity: "high",
        summary: "Page has noindex but is in sitemap",
        evidence: { robotsMeta: ctx.robotsMeta },
        suggestedAction: {
          actionType: "remove_noindex", target: { url: ctx.url },
          notes: "Remove noindex or remove from sitemap",
        },
      };
    }
    return null;
  },
};

// ============================================================
// Title Rules
// ============================================================

const RULE_TITLE_MISSING: FindingRule = {
  id: "RULE_TITLE_MISSING",
  category: "titles",
  check: (ctx) => {
    if (ctx.indexability === "indexable" && (!ctx.title || ctx.title.trim() === "")) {
      return {
        url: ctx.url, category: "titles", ruleId: "RULE_TITLE_MISSING",
        severity: "high",
        summary: "Missing title tag",
        evidence: {},
        suggestedAction: {
          actionType: "set_title", target: { url: ctx.url, selector: "title" },
          notes: "Add a descriptive title tag",
        },
      };
    }
    return null;
  },
};

const RULE_TITLE_TOO_LONG: FindingRule = {
  id: "RULE_TITLE_TOO_LONG",
  category: "titles",
  check: (ctx) => {
    if (ctx.titleLen && ctx.titleLen > 60) {
      return {
        url: ctx.url, category: "titles", ruleId: "RULE_TITLE_TOO_LONG",
        severity: "low",
        summary: `Title too long (${ctx.titleLen} chars)`,
        evidence: { titleLen: ctx.titleLen, title: ctx.title },
        suggestedAction: {
          actionType: "set_title", target: { url: ctx.url },
          notes: "Shorten title to under 60 characters",
        },
      };
    }
    return null;
  },
};

const RULE_TITLE_TOO_SHORT: FindingRule = {
  id: "RULE_TITLE_TOO_SHORT",
  category: "titles",
  check: (ctx) => {
    if (ctx.title && ctx.titleLen && ctx.titleLen < 30) {
      return {
        url: ctx.url, category: "titles", ruleId: "RULE_TITLE_TOO_SHORT",
        severity: "low",
        summary: `Title too short (${ctx.titleLen} chars)`,
        evidence: { titleLen: ctx.titleLen, title: ctx.title },
        suggestedAction: {
          actionType: "set_title", target: { url: ctx.url },
          notes: "Expand title to be more descriptive",
        },
      };
    }
    return null;
  },
};

const RULE_META_DESC_MISSING: FindingRule = {
  id: "RULE_META_DESC_MISSING",
  category: "titles",
  check: (ctx) => {
    if (ctx.indexability === "indexable" && (!ctx.metaDescription || ctx.metaDescription.trim() === "")) {
      return {
        url: ctx.url, category: "titles", ruleId: "RULE_META_DESC_MISSING",
        severity: "medium",
        summary: "Missing meta description",
        evidence: {},
        suggestedAction: {
          actionType: "set_meta_description", target: { url: ctx.url },
          notes: "Add a compelling meta description",
        },
      };
    }
    return null;
  },
};

const RULE_META_DESC_TOO_LONG: FindingRule = {
  id: "RULE_META_DESC_TOO_LONG",
  category: "titles",
  check: (ctx) => {
    if (ctx.metaDescriptionLen && ctx.metaDescriptionLen > 160) {
      return {
        url: ctx.url, category: "titles", ruleId: "RULE_META_DESC_TOO_LONG",
        severity: "low",
        summary: `Meta description too long (${ctx.metaDescriptionLen} chars)`,
        evidence: { metaDescriptionLen: ctx.metaDescriptionLen },
        suggestedAction: {
          actionType: "set_meta_description", target: { url: ctx.url },
          notes: "Shorten to under 160 characters",
        },
      };
    }
    return null;
  },
};

// ============================================================
// Heading Rules
// ============================================================

const RULE_H1_MISSING: FindingRule = {
  id: "RULE_H1_MISSING",
  category: "headings",
  check: (ctx) => {
    if (ctx.indexability === "indexable" && ctx.h1Count === 0) {
      return {
        url: ctx.url, category: "headings", ruleId: "RULE_H1_MISSING",
        severity: "high",
        summary: "Missing H1 heading",
        evidence: {},
        suggestedAction: {
          actionType: "set_title", target: { url: ctx.url, selector: "h1" },
          notes: "Add a single H1 heading",
        },
      };
    }
    return null;
  },
};

const RULE_H1_MULTIPLE: FindingRule = {
  id: "RULE_H1_MULTIPLE",
  category: "headings",
  check: (ctx) => {
    if (ctx.h1Count && ctx.h1Count > 1) {
      return {
        url: ctx.url, category: "headings", ruleId: "RULE_H1_MULTIPLE",
        severity: "medium",
        summary: `Multiple H1 headings (${ctx.h1Count})`,
        evidence: { h1Count: ctx.h1Count, h1Texts: ctx.h1Texts },
        suggestedAction: {
          actionType: "set_title", target: { url: ctx.url, selector: "h1" },
          notes: "Use only one H1 heading per page",
        },
      };
    }
    return null;
  },
};

const RULE_H2_MULTIPLE: FindingRule = {
  id: "RULE_H2_MULTIPLE",
  category: "headings",
  check: (ctx) => {
    // Having multiple H2s is usually fine, but we flag it for review (low severity)
    if (ctx.h2Count && ctx.h2Count > 10) {
      return {
        url: ctx.url, category: "headings", ruleId: "RULE_H2_MULTIPLE",
        severity: "low",
        summary: `Many H2 headings (${ctx.h2Count})`,
        evidence: { h2Count: ctx.h2Count, h2Texts: ctx.h2Texts?.slice(0, 5) },
        suggestedAction: {
          actionType: "review_headings", target: { url: ctx.url },
          notes: "Ensure H2s are used in a logical hierarchical heading structure",
        },
      };
    }
    return null;
  },
};

const RULE_H2_DUPLICATE: FindingRule = {
  id: "RULE_H2_DUPLICATE",
  category: "headings",
  check: (ctx) => {
    if (ctx.h2Duplicates && ctx.h2Duplicates.length > 0) {
      return {
        url: ctx.url, category: "headings", ruleId: "RULE_H2_DUPLICATE",
        severity: "low",
        summary: `Duplicate H2 headings (${ctx.h2Duplicates.length})`,
        evidence: { h2Duplicates: ctx.h2Duplicates },
        suggestedAction: {
          actionType: "review_headings", target: { url: ctx.url },
          notes: "Update duplicate H2s to be unique and descriptive",
        },
      };
    }
    return null;
  },
};

// ============================================================
// Content Rules
// ============================================================

const RULE_THIN_CONTENT: FindingRule = {
  id: "RULE_THIN_CONTENT",
  category: "content",
  check: (ctx) => {
    if (ctx.indexability === "indexable" && ctx.wordCount !== undefined && ctx.wordCount < 200) {
      return {
        url: ctx.url, category: "content", ruleId: "RULE_THIN_CONTENT",
        severity: "medium",
        summary: `Thin content (${ctx.wordCount} words)`,
        evidence: { wordCount: ctx.wordCount },
        suggestedAction: {
          actionType: "investigate_rendering", target: { url: ctx.url },
          notes: "Add more valuable content",
        },
      };
    }
    return null;
  },
};

const RULE_READABILITY_DIFFICULT: FindingRule = {
  id: "RULE_READABILITY_DIFFICULT",
  category: "content",
  check: (ctx) => {
    // Flesch Reading Ease: 0-30 is very difficult (college graduate level)
    if (ctx.fleschReadingEase != null && ctx.fleschReadingEase <= 30 && ctx.wordCount && ctx.wordCount > 100) {
      return {
        url: ctx.url, category: "content", ruleId: "RULE_READABILITY_DIFFICULT",
        severity: "low",
        summary: `Readability difficult (Flesch score: ${ctx.fleschReadingEase})`,
        evidence: { fleschReadingEase: ctx.fleschReadingEase, wordCount: ctx.wordCount },
        suggestedAction: {
          actionType: "improve_content", target: { url: ctx.url },
          notes: "Consider using shorter sentences and simpler words to improve readability",
        },
      };
    }
    return null;
  },
};

// ============================================================
// Link Rules
// ============================================================

const RULE_ORPHAN_PAGE: FindingRule = {
  id: "RULE_ORPHAN_PAGE",
  category: "links",
  check: (ctx) => {
    if (ctx.isInSitemap && ctx.inlinksCount === 0) {
      return {
        url: ctx.url, category: "links", ruleId: "RULE_ORPHAN_PAGE",
        severity: "medium",
        summary: "Orphan page - in sitemap but no internal links",
        evidence: { inlinksCount: 0, isInSitemap: true },
        suggestedAction: {
          actionType: "add_internal_link", target: { url: ctx.url },
          notes: "Add internal links to this page",
        },
      };
    }
    return null;
  },
};

const RULE_NO_OUTLINKS: FindingRule = {
  id: "RULE_NO_OUTLINKS",
  category: "links",
  check: (ctx) => {
    if (ctx.indexability === "indexable" && ctx.outlinksCount === 0) {
      return {
        url: ctx.url, category: "links", ruleId: "RULE_NO_OUTLINKS",
        severity: "low",
        summary: "Page has no outgoing links",
        evidence: { outlinksCount: 0 },
        suggestedAction: {
          actionType: "add_internal_link", target: { url: ctx.url },
          notes: "Add relevant internal links",
        },
      };
    }
    return null;
  },
};

const RULE_HIGH_EXTERNAL_OUTLINKS: FindingRule = {
  id: "RULE_HIGH_EXTERNAL_OUTLINKS",
  category: "links",
  check: (ctx) => {
    // Flag pages with high number of followed external links (threshold: 25)
    if (ctx.externalLinksFollowed && ctx.externalLinksFollowed > 25) {
      return {
        url: ctx.url, category: "links", ruleId: "RULE_HIGH_EXTERNAL_OUTLINKS",
        severity: "low",
        summary: `High external outlinks (${ctx.externalLinksFollowed} followed)`,
        evidence: { externalLinksCount: ctx.externalLinksCount, externalLinksFollowed: ctx.externalLinksFollowed },
        suggestedAction: {
          actionType: "review_links", target: { url: ctx.url },
          notes: "Review external outlinks to ensure they are to credible, trusted and relevant websites",
        },
      };
    }
    return null;
  },
};

const RULE_LINKS_NO_ANCHOR_TEXT: FindingRule = {
  id: "RULE_LINKS_NO_ANCHOR_TEXT",
  category: "links",
  check: (ctx) => {
    if (ctx.internalLinksNoAnchor && ctx.internalLinksNoAnchor > 0) {
      return {
        url: ctx.url, category: "links", ruleId: "RULE_LINKS_NO_ANCHOR_TEXT",
        severity: "low",
        summary: `${ctx.internalLinksNoAnchor} internal links without anchor text`,
        evidence: { internalLinksNoAnchor: ctx.internalLinksNoAnchor },
        suggestedAction: {
          actionType: "add_anchor_text", target: { url: ctx.url },
          notes: "Add useful and descriptive anchor text to help users and search engines",
        },
      };
    }
    return null;
  },
};

const RULE_EXTERNAL_LINK_BROKEN: FindingRule = {
  id: "RULE_EXTERNAL_LINK_BROKEN",
  category: "links",
  check: (ctx) => {
    if (ctx.brokenExternalLinks && ctx.brokenExternalLinks.length > 0) {
      return {
        url: ctx.url, category: "links", ruleId: "RULE_EXTERNAL_LINK_BROKEN",
        severity: "medium",
        summary: `${ctx.brokenExternalLinks.length} broken external link(s)`,
        evidence: {
          brokenLinks: ctx.brokenExternalLinks.map(link => ({
            url: link.url,
            statusCode: link.statusCode,
          })),
        },
        suggestedAction: {
          actionType: "fix_link", target: { url: ctx.url },
          notes: "Update or remove broken external links to improve user experience and avoid sending users to dead pages",
        },
      };
    }
    return null;
  },
};

// ============================================================
// Image Rules
// ============================================================

const RULE_IMG_MISSING_ALT: FindingRule = {
  id: "RULE_IMG_MISSING_ALT",
  category: "images",
  check: (ctx) => {
    if (ctx.imagesMissingAlt && ctx.imagesMissingAlt > 0) {
      return {
        url: ctx.url, category: "images", ruleId: "RULE_IMG_MISSING_ALT",
        severity: "medium",
        summary: `${ctx.imagesMissingAlt} images missing alt text`,
        evidence: { imagesMissingAlt: ctx.imagesMissingAlt },
        suggestedAction: {
          actionType: "add_alt_text", target: { url: ctx.url },
          notes: "Add descriptive alt text to images",
        },
      };
    }
    return null;
  },
};

const RULE_IMG_MISSING_SIZE: FindingRule = {
  id: "RULE_IMG_MISSING_SIZE",
  category: "images",
  check: (ctx) => {
    if (ctx.imagesMissingSize && ctx.imagesMissingSize > 0) {
      return {
        url: ctx.url, category: "images", ruleId: "RULE_IMG_MISSING_SIZE",
        severity: "low",
        summary: `${ctx.imagesMissingSize} images missing width/height`,
        evidence: { imagesMissingSize: ctx.imagesMissingSize },
        suggestedAction: {
          actionType: "investigate_rendering", target: { url: ctx.url },
          notes: "Add width/height to prevent layout shifts",
        },
      };
    }
    return null;
  },
};

const RULE_IMG_OVER_100KB: FindingRule = {
  id: "RULE_IMG_OVER_100KB",
  category: "images",
  check: (ctx) => {
    if (ctx.largeImages && ctx.largeImages.length > 0) {
      const totalSize = ctx.largeImages.reduce((sum, img) => sum + img.sizeBytes, 0);
      const formatSize = (bytes: number) => {
        if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
        return `${Math.round(bytes / 1024)}KB`;
      };
      return {
        url: ctx.url, category: "images", ruleId: "RULE_IMG_OVER_100KB",
        severity: "medium",
        summary: `${ctx.largeImages.length} images over 100KB (total: ${formatSize(totalSize)})`,
        evidence: {
          largeImages: ctx.largeImages.map(img => ({
            url: img.url,
            size: formatSize(img.sizeBytes),
          })),
        },
        suggestedAction: {
          actionType: "optimize_images", target: { url: ctx.url },
          notes: "Compress images or use modern formats (WebP, AVIF) to reduce page weight and improve load times",
        },
      };
    }
    return null;
  },
};

// ============================================================
// Security Header Rules
// ============================================================

const RULE_MISSING_REFERRER_POLICY: FindingRule = {
  id: "RULE_MISSING_REFERRER_POLICY",
  category: "security",
  check: (ctx) => {
    if (ctx.indexability === "indexable" && !ctx.referrerPolicy) {
      return {
        url: ctx.url, category: "security", ruleId: "RULE_MISSING_REFERRER_POLICY",
        severity: "low",
        summary: "Missing Referrer-Policy header",
        evidence: {},
        suggestedAction: {
          actionType: "add_security_header", target: { url: ctx.url },
          proposedValue: "strict-origin-when-cross-origin",
          notes: "Set a referrer policy to mitigate risk of leaking data cross-origins",
        },
      };
    }
    return null;
  },
};

const RULE_MISSING_X_CONTENT_TYPE_OPTIONS: FindingRule = {
  id: "RULE_MISSING_X_CONTENT_TYPE_OPTIONS",
  category: "security",
  check: (ctx) => {
    if (ctx.indexability === "indexable" && !ctx.xContentTypeOptions) {
      return {
        url: ctx.url, category: "security", ruleId: "RULE_MISSING_X_CONTENT_TYPE_OPTIONS",
        severity: "low",
        summary: "Missing X-Content-Type-Options header",
        evidence: {},
        suggestedAction: {
          actionType: "add_security_header", target: { url: ctx.url },
          proposedValue: "nosniff",
          notes: "Set X-Content-Type-Options to 'nosniff' to prevent MIME type sniffing",
        },
      };
    }
    return null;
  },
};

const RULE_MISSING_CSP: FindingRule = {
  id: "RULE_MISSING_CSP",
  category: "security",
  check: (ctx) => {
    if (ctx.indexability === "indexable" && !ctx.contentSecurityPolicy) {
      return {
        url: ctx.url, category: "security", ruleId: "RULE_MISSING_CSP",
        severity: "low",
        summary: "Missing Content-Security-Policy header",
        evidence: {},
        suggestedAction: {
          actionType: "add_security_header", target: { url: ctx.url },
          notes: "Set a strict Content-Security-Policy to help guard against XSS attacks",
        },
      };
    }
    return null;
  },
};

const RULE_MISSING_X_FRAME_OPTIONS: FindingRule = {
  id: "RULE_MISSING_X_FRAME_OPTIONS",
  category: "security",
  check: (ctx) => {
    if (ctx.indexability === "indexable" && !ctx.xFrameOptions) {
      return {
        url: ctx.url, category: "security", ruleId: "RULE_MISSING_X_FRAME_OPTIONS",
        severity: "low",
        summary: "Missing X-Frame-Options header",
        evidence: {},
        suggestedAction: {
          actionType: "add_security_header", target: { url: ctx.url },
          proposedValue: "SAMEORIGIN",
          notes: "Set X-Frame-Options to 'DENY' or 'SAMEORIGIN' to prevent clickjacking",
        },
      };
    }
    return null;
  },
};

// ============================================================
// All Rules
// ============================================================

const FINDING_RULES: FindingRule[] = [
  // Response codes
  RULE_STATUS_4XX,
  RULE_STATUS_5XX,
  RULE_REDIRECT_CHAIN,
  // Canonicals
  RULE_CANONICAL_MISSING,
  RULE_CANONICALIZED,
  RULE_META_NOINDEX,
  // Titles
  RULE_TITLE_MISSING,
  RULE_TITLE_TOO_LONG,
  RULE_TITLE_TOO_SHORT,
  RULE_META_DESC_MISSING,
  RULE_META_DESC_TOO_LONG,
  // Headings
  RULE_H1_MISSING,
  RULE_H1_MULTIPLE,
  RULE_H2_MULTIPLE,
  RULE_H2_DUPLICATE,
  // Content
  RULE_THIN_CONTENT,
  RULE_READABILITY_DIFFICULT,
  // Links
  RULE_ORPHAN_PAGE,
  RULE_NO_OUTLINKS,
  RULE_HIGH_EXTERNAL_OUTLINKS,
  RULE_LINKS_NO_ANCHOR_TEXT,
  RULE_EXTERNAL_LINK_BROKEN,
  // Images
  RULE_IMG_MISSING_ALT,
  RULE_IMG_MISSING_SIZE,
  RULE_IMG_OVER_100KB,
  // Security
  RULE_MISSING_REFERRER_POLICY,
  RULE_MISSING_X_CONTENT_TYPE_OPTIONS,
  RULE_MISSING_CSP,
  RULE_MISSING_X_FRAME_OPTIONS,
];

export function runFindingRules(ctx: FindingContext): CrawlFinding[] {
  const findings: CrawlFinding[] = [];
  for (const rule of FINDING_RULES) {
    const finding = rule.check(ctx);
    if (finding) findings.push(finding);
  }
  return findings;
}
