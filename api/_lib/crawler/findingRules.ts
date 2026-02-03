/**
 * SEO finding rules for the technical crawler.
 * 17 HTTP-based rules (2 Playwright-only render rules excluded).
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
  wordCount?: number;
  visibleTextLen?: number;
  inlinksCount?: number;
  outlinksCount?: number;
  imagesMissingAlt?: number;
  imagesMissingSize?: number;
  isInSitemap?: boolean;
}

interface FindingRule {
  id: string;
  category: string;
  check: (ctx: FindingContext) => CrawlFinding | null;
}

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

const RULE_REDIRECT_CHAIN_LONG: FindingRule = {
  id: "RULE_REDIRECT_CHAIN_LONG",
  category: "response_codes",
  check: (ctx) => {
    if (ctx.redirectChain && ctx.redirectChain.length > 1) {
      return {
        url: ctx.url, category: "response_codes", ruleId: "RULE_REDIRECT_CHAIN_LONG",
        severity: "medium",
        summary: `Redirect chain has ${ctx.redirectChain.length} hops`,
        evidence: { redirectChain: ctx.redirectChain },
        suggestedAction: {
          actionType: "fix_link", target: { url: ctx.url },
          notes: "Reduce redirect chain to single hop",
        },
      };
    }
    return null;
  },
};

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

const FINDING_RULES: FindingRule[] = [
  RULE_STATUS_4XX,
  RULE_STATUS_5XX,
  RULE_REDIRECT_CHAIN_LONG,
  RULE_CANONICAL_MISSING,
  RULE_META_NOINDEX,
  RULE_TITLE_MISSING,
  RULE_TITLE_TOO_LONG,
  RULE_TITLE_TOO_SHORT,
  RULE_META_DESC_MISSING,
  RULE_META_DESC_TOO_LONG,
  RULE_H1_MISSING,
  RULE_H1_MULTIPLE,
  RULE_THIN_CONTENT,
  RULE_ORPHAN_PAGE,
  RULE_NO_OUTLINKS,
  RULE_IMG_MISSING_ALT,
  RULE_IMG_MISSING_SIZE,
];

export function runFindingRules(ctx: FindingContext): CrawlFinding[] {
  const findings: CrawlFinding[] = [];
  for (const rule of FINDING_RULES) {
    const finding = rule.check(ctx);
    if (finding) findings.push(finding);
  }
  return findings;
}
