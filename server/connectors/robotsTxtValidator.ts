import crypto from "crypto";
import { storage } from "../storage";
import { logger } from "../utils/logger";
import { type InsertRobotsTxtCheck } from "@shared/schema";
import type { SitemapInfo } from "./gsc";

const VALID_DIRECTIVES = new Set([
  'user-agent',
  'disallow',
  'allow',
  'sitemap',
  'crawl-delay',
  'host',
]);

// Paths that should generally not be blocked for SEO
const IMPORTANT_PATHS = ['/', '/sitemap.xml', '/robots.txt'];

interface ParsedDirective {
  line: number;
  directive: string;
  value: string;
  raw: string;
}

interface ValidationError {
  line: number;
  error: string;
}

interface GooglebotRules {
  disallow: string[];
  allow: string[];
}

export interface RobotsTxtValidationResult {
  exists: boolean;
  httpStatus: number | null;
  contentHash: string | null;
  content: string | null;
  disallowedPaths: string[];
  sitemapUrls: string[];
  isValid: boolean;
  validationErrors: ValidationError[];
  sitemapsMissing: string[];
  sitemapsExtra: string[];
  blocksImportantPaths: boolean;
  blockedImportantPaths: string[];
}

/**
 * Fetch and validate a site's robots.txt, cross-referencing with GSC sitemaps.
 */
export async function validateRobotsTxt(
  domain: string,
  siteId: string,
  gscSitemaps: SitemapInfo[],
): Promise<RobotsTxtValidationResult> {
  const url = `https://${domain}/robots.txt`;
  logger.info('RobotsTxt', `Fetching ${url}`);

  let content: string | null = null;
  let httpStatus: number | null = null;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Arclo-SEO-Bot/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    httpStatus = response.status;

    if (!response.ok) {
      logger.warn('RobotsTxt', `HTTP ${httpStatus} for ${url}`);
      const result: RobotsTxtValidationResult = {
        exists: false,
        httpStatus,
        contentHash: null,
        content: null,
        disallowedPaths: [],
        sitemapUrls: [],
        isValid: false,
        validationErrors: [{ line: 0, error: `robots.txt returned HTTP ${httpStatus}` }],
        sitemapsMissing: gscSitemaps.map(s => s.path),
        sitemapsExtra: [],
        blocksImportantPaths: false,
        blockedImportantPaths: [],
      };
      await persistResult(siteId, result);
      return result;
    }

    content = await response.text();
  } catch (error: any) {
    logger.error('RobotsTxt', `Failed to fetch ${url}`, { error: error.message });
    const result: RobotsTxtValidationResult = {
      exists: false,
      httpStatus: null,
      contentHash: null,
      content: null,
      disallowedPaths: [],
      sitemapUrls: [],
      isValid: false,
      validationErrors: [{ line: 0, error: `Failed to fetch robots.txt: ${error.message}` }],
      sitemapsMissing: gscSitemaps.map(s => s.path),
      sitemapsExtra: [],
      blocksImportantPaths: false,
      blockedImportantPaths: [],
    };
    await persistResult(siteId, result);
    return result;
  }

  const contentHash = crypto.createHash('sha256').update(content).digest('hex');

  // Parse robots.txt
  const lines = content.split('\n');
  const directives: ParsedDirective[] = [];
  const validationErrors: ValidationError[] = [];
  const sitemapUrls: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    const lineNum = i + 1;

    // Skip blank lines and comments
    if (!raw || raw.startsWith('#')) continue;

    // Strip inline comments
    const withoutComment = raw.split('#')[0].trim();
    if (!withoutComment) continue;

    const colonIdx = withoutComment.indexOf(':');
    if (colonIdx === -1) {
      validationErrors.push({ line: lineNum, error: `Invalid line (no colon): "${raw}"` });
      continue;
    }

    const directive = withoutComment.substring(0, colonIdx).trim().toLowerCase();
    const value = withoutComment.substring(colonIdx + 1).trim();

    if (!VALID_DIRECTIVES.has(directive)) {
      validationErrors.push({ line: lineNum, error: `Unknown directive: "${directive}"` });
      continue;
    }

    directives.push({ line: lineNum, directive, value, raw });

    if (directive === 'sitemap') {
      sitemapUrls.push(value);
    }
  }

  // Extract Googlebot-specific rules (or default * rules)
  const googlebotRules = extractGooglebotRules(directives);
  const disallowedPaths = googlebotRules.disallow;

  // Check if important paths are blocked
  const blockedImportantPaths: string[] = [];
  for (const importantPath of IMPORTANT_PATHS) {
    if (isPathBlocked(importantPath, googlebotRules)) {
      blockedImportantPaths.push(importantPath);
    }
  }

  // Check for blanket disallow without corresponding allow
  if (disallowedPaths.includes('/') && !googlebotRules.allow.some(a => a === '/')) {
    validationErrors.push({
      line: directives.find(d => d.directive === 'disallow' && d.value === '/')?.line || 0,
      error: 'Disallow: / blocks all crawling for Googlebot without a matching Allow rule',
    });
  }

  // Cross-reference sitemaps with GSC
  const gscSitemapPaths = new Set(gscSitemaps.map(s => s.path));
  const robotsSitemapSet = new Set(sitemapUrls);

  const sitemapsMissing = gscSitemaps
    .map(s => s.path)
    .filter(path => !robotsSitemapSet.has(path));

  const sitemapsExtra = sitemapUrls.filter(url => !gscSitemapPaths.has(url));

  const isValid = validationErrors.length === 0;
  const blocksImportantPaths = blockedImportantPaths.length > 0;

  const result: RobotsTxtValidationResult = {
    exists: true,
    httpStatus,
    contentHash,
    content,
    disallowedPaths,
    sitemapUrls,
    isValid,
    validationErrors,
    sitemapsMissing,
    sitemapsExtra,
    blocksImportantPaths,
    blockedImportantPaths,
  };

  await persistResult(siteId, result);
  logger.info('RobotsTxt', `Validation complete: valid=${isValid}, errors=${validationErrors.length}, sitemaps=${sitemapUrls.length}`);

  return result;
}

/**
 * Extract Disallow/Allow rules that apply to Googlebot.
 * Falls back to wildcard (*) rules if no Googlebot-specific block exists.
 */
function extractGooglebotRules(directives: ParsedDirective[]): GooglebotRules {
  const blocks: { agent: string; disallow: string[]; allow: string[] }[] = [];
  let currentBlock: { agent: string; disallow: string[]; allow: string[] } | null = null;

  for (const d of directives) {
    if (d.directive === 'user-agent') {
      currentBlock = { agent: d.value.toLowerCase(), disallow: [], allow: [] };
      blocks.push(currentBlock);
    } else if (currentBlock) {
      if (d.directive === 'disallow' && d.value) {
        currentBlock.disallow.push(d.value);
      } else if (d.directive === 'allow' && d.value) {
        currentBlock.allow.push(d.value);
      }
    }
  }

  // Prefer Googlebot-specific block, fall back to wildcard
  const googlebotBlock = blocks.find(b => b.agent === 'googlebot');
  const wildcardBlock = blocks.find(b => b.agent === '*');
  const effective = googlebotBlock || wildcardBlock;

  return {
    disallow: effective?.disallow || [],
    allow: effective?.allow || [],
  };
}

/**
 * Check if a path would be blocked by the given rules.
 * Allow rules take precedence over Disallow for same-length matches (Google behavior).
 */
function isPathBlocked(path: string, rules: GooglebotRules): boolean {
  let longestDisallow = '';
  let longestAllow = '';

  for (const rule of rules.disallow) {
    if (path.startsWith(rule) && rule.length > longestDisallow.length) {
      longestDisallow = rule;
    }
  }

  for (const rule of rules.allow) {
    if (path.startsWith(rule) && rule.length > longestAllow.length) {
      longestAllow = rule;
    }
  }

  if (!longestDisallow) return false;
  // Allow wins on tie or longer match
  return longestAllow.length <= longestDisallow.length;
}

async function persistResult(siteId: string, result: RobotsTxtValidationResult): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const data: InsertRobotsTxtCheck = {
    siteId,
    date: today,
    exists: result.exists,
    httpStatus: result.httpStatus,
    contentHash: result.contentHash,
    content: result.content,
    disallowedPaths: result.disallowedPaths,
    sitemapUrls: result.sitemapUrls,
    isValid: result.isValid,
    validationErrors: result.validationErrors as any,
    sitemapsMissing: result.sitemapsMissing,
    sitemapsExtra: result.sitemapsExtra,
    blocksImportantPaths: result.blocksImportantPaths,
    blockedImportantPaths: result.blockedImportantPaths,
    rawData: { httpStatus: result.httpStatus },
  };

  await storage.saveRobotsTxtCheck(data);
}
