// Stub: website connectivity checker
import { logger } from "../utils/logger";

export interface WebsiteCheckResult {
  url: string;
  reachable: boolean;
  statusCode?: number;
  responseTimeMs?: number;
  error?: string;
  source?: string;
}

class WebsiteChecker {
  async check(url: string): Promise<WebsiteCheckResult> {
    try {
      const start = Date.now();
      const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(10000) });
      return {
        url,
        reachable: response.ok,
        statusCode: response.status,
        responseTimeMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        url,
        reachable: false,
        error: err.message,
      };
    }
  }
}

export const websiteChecker = new WebsiteChecker();
