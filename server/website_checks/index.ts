import { storage } from "../storage";
import { type InsertWebChecksDaily } from "@shared/schema";
import { logger } from "../utils/logger";
import { withRetry } from "../utils/retry";

export interface RobotsTxtResult {
  exists: boolean;
  content?: string;
  disallowedPaths?: string[];
  sitemapUrls?: string[];
  error?: string;
}

export interface SitemapResult {
  exists: boolean;
  urls?: string[];
  lastModified?: string;
  error?: string;
}

export interface PageCheckResult extends InsertWebChecksDaily {
  headers: {
    xRobotsTag?: string;
    cacheControl?: string;
    contentType?: string;
    server?: string;
  };
  redirectChain?: string[];
  loadTimeMs?: number;
}

export interface UptimeResult {
  isUp: boolean;
  statusCode: number;
  responseTimeMs: number;
  timestamp: string;
}

export class WebsiteChecker {
  private domain: string;

  constructor() {
    this.domain = process.env.DOMAIN || 'empathyhealthclinic.com';
  }

  async checkRobotsTxt(): Promise<RobotsTxtResult> {
    try {
      const url = `https://${this.domain}/robots.txt`;
      const startTime = Date.now();
      const response = await fetch(url);
      
      if (response.ok) {
        const content = await response.text();
        
        const disallowedPaths = content
          .split('\n')
          .filter(line => line.toLowerCase().startsWith('disallow:'))
          .map(line => line.split(':')[1]?.trim())
          .filter(Boolean);

        const sitemapUrls = content
          .split('\n')
          .filter(line => line.toLowerCase().startsWith('sitemap:'))
          .map(line => line.split(':').slice(1).join(':').trim())
          .filter(Boolean);

        logger.info('WebCheck', `robots.txt check passed`, { 
          disallowedPaths: disallowedPaths.length,
          sitemaps: sitemapUrls.length,
        });

        return { 
          exists: true, 
          content, 
          disallowedPaths, 
          sitemapUrls,
        };
      }
      
      return { exists: false, error: `Status ${response.status}` };
    } catch (error: any) {
      logger.error('WebCheck', 'Failed to fetch robots.txt', { error: error.message });
      return { exists: false, error: error.message };
    }
  }

  async checkSitemap(sitemapUrl?: string): Promise<SitemapResult> {
    try {
      const url = sitemapUrl || `https://${this.domain}/sitemap.xml`;
      const response = await fetch(url);
      
      if (response.ok) {
        const content = await response.text();
        const urlMatches = content.match(/<loc>(.*?)<\/loc>/g) || [];
        const urls = urlMatches.map(match => match.replace(/<\/?loc>/g, '')).slice(0, 100);
        
        const lastModMatch = content.match(/<lastmod>(.*?)<\/lastmod>/);
        const lastModified = lastModMatch ? lastModMatch[1] : undefined;

        logger.info('WebCheck', `Sitemap check passed`, { urlCount: urls.length });
        
        return { exists: true, urls, lastModified };
      }
      
      return { exists: false, error: `Status ${response.status}` };
    } catch (error: any) {
      logger.error('WebCheck', 'Failed to fetch sitemap', { error: error.message });
      return { exists: false, error: error.message };
    }
  }

  async checkPage(url: string): Promise<PageCheckResult> {
    const date = new Date().toISOString().split('T')[0];
    const startTime = Date.now();
    const redirectChain: string[] = [];

    try {
      let currentUrl = url;
      let response: Response | null = null;
      let redirectCount = 0;
      const maxRedirects = 10;

      while (redirectCount < maxRedirects) {
        response = await fetch(currentUrl, {
          redirect: 'manual',
          headers: {
            'User-Agent': 'TrafficSpendDoctor/1.0 (SEO Monitoring Bot)',
          },
        });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (location) {
            redirectChain.push(`${currentUrl} -> ${location}`);
            currentUrl = new URL(location, currentUrl).href;
            redirectCount++;
            continue;
          }
        }
        break;
      }

      if (!response) {
        throw new Error('No response received');
      }

      const loadTimeMs = Date.now() - startTime;
      const html = await response.text();
      
      const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
      const canonical = canonicalMatch ? canonicalMatch[1] : null;

      const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/i);
      const metaRobots = robotsMatch ? robotsMatch[1] : null;

      const hasContent = html.length > 500 && 
        !html.includes('404') && 
        !html.includes('Not Found') &&
        !html.includes('Error');

      const headers = {
        xRobotsTag: response.headers.get('x-robots-tag') || undefined,
        cacheControl: response.headers.get('cache-control') || undefined,
        contentType: response.headers.get('content-type') || undefined,
        server: response.headers.get('server') || undefined,
      };

      logger.info('WebCheck', `Page check: ${url}`, { 
        status: response.status, 
        loadTimeMs,
        hasCanonical: !!canonical,
        xRobotsTag: headers.xRobotsTag,
      });

      return {
        date,
        url,
        statusCode: response.status,
        redirectUrl: redirectChain.length > 0 ? redirectChain[redirectChain.length - 1].split(' -> ')[1] : null,
        canonical,
        metaRobots,
        hasContent,
        errorMessage: null,
        rawData: {
          headers: Object.fromEntries(response.headers.entries()),
          contentLength: html.length,
          redirectChain,
        },
        headers,
        redirectChain: redirectChain.length > 0 ? redirectChain : undefined,
        loadTimeMs,
      };
    } catch (error: any) {
      logger.error('WebCheck', `Failed to check ${url}`, { error: error.message });
      
      return {
        date,
        url,
        statusCode: 0,
        redirectUrl: null,
        canonical: null,
        metaRobots: null,
        hasContent: false,
        errorMessage: error.message,
        rawData: null,
        headers: {},
        loadTimeMs: Date.now() - startTime,
      };
    }
  }

  async checkUptime(): Promise<UptimeResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`https://${this.domain}/`, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'TrafficSpendDoctor/1.0 (Uptime Monitor)',
        },
      });

      return {
        isUp: response.ok,
        statusCode: response.status,
        responseTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        isUp: false,
        statusCode: 0,
        responseTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async runDailyChecks(topPages: string[] = []): Promise<InsertWebChecksDaily[]> {
    logger.info('WebCheck', `Running daily checks for ${this.domain}`);

    const robotsCheck = await this.checkRobotsTxt();
    const sitemapCheck = await this.checkSitemap();
    const uptimeCheck = await this.checkUptime();

    logger.info('WebCheck', 'Infrastructure checks', { 
      robotsExists: robotsCheck.exists,
      sitemapExists: sitemapCheck.exists,
      sitemapUrls: sitemapCheck.urls?.length,
      isUp: uptimeCheck.isUp,
      responseTimeMs: uptimeCheck.responseTimeMs,
    });

    const pagesToCheck = topPages.length > 0 
      ? topPages 
      : sitemapCheck.urls?.slice(0, 10) || [`https://${this.domain}/`];

    const checks: InsertWebChecksDaily[] = [];

    for (const pageUrl of pagesToCheck) {
      const check = await withRetry(
        () => this.checkPage(pageUrl),
        { maxAttempts: 2, delayMs: 1000 },
        `WebCheck ${pageUrl}`
      );
      checks.push(check);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    await storage.saveWebChecks(checks);
    logger.info('WebCheck', `Completed ${checks.length} page checks`);

    return checks;
  }
}

export const websiteChecker = new WebsiteChecker();
