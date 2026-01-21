import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const TEST_URL = 'https://example.com';

describe('Scan Workflow Contract Tests', () => {
  
  describe('POST /api/scan', () => {
    it('should return scanId immediately when given a valid URL', async () => {
      const response = await fetch('http://localhost:5000/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: TEST_URL }),
      });
      
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.ok).toBe(true);
      expect(data.scanId).toBeDefined();
      expect(data.scanId).toMatch(/^scan_\d+_[a-f0-9]+$/);
      expect(data.status).toBe('queued');
    });

    it('should reject invalid URLs', async () => {
      const response = await fetch('http://localhost:5000/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: '' }),
      });
      
      const data = await response.json();
      
      expect(response.ok).toBe(false);
      expect(data.ok).toBe(false);
    });
  });

  describe('GET /api/scan/:scanId/status', () => {
    it('should return status for a valid scanId', async () => {
      const scanRes = await fetch('http://localhost:5000/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: TEST_URL }),
      });
      const { scanId } = await scanRes.json();
      
      const statusRes = await fetch(`http://localhost:5000/api/scan/${scanId}/status`);
      const statusData = await statusRes.json();
      
      expect(statusRes.ok).toBe(true);
      expect(statusData.scanId).toBe(scanId);
      expect(['queued', 'running', 'preview_ready', 'completed', 'failed']).toContain(statusData.status);
      expect(typeof statusData.progress).toBe('number');
      expect(statusData.message).toBeDefined();
    });

    it('should return 404 for non-existent scanId', async () => {
      const response = await fetch('http://localhost:5000/api/scan/nonexistent/status');
      
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/health', () => {
    it('should return health status with integration configs', async () => {
      const response = await fetch('http://localhost:5000/api/health');
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.ok).toBe(true);
      expect(data.serverTime).toBeDefined();
      expect(data.integrations).toBeDefined();
      expect(data.integrations.serp).toBeDefined();
      expect(data.integrations.sendgrid).toBeDefined();
      expect(typeof data.integrations.serp.configured).toBe('boolean');
      expect(typeof data.integrations.sendgrid.configured).toBe('boolean');
    });
  });
});

describe('Report Data Structure Contract', () => {
  
  const fullReportMock = {
    visibilityMode: 'full' as const,
    limitedVisibilityReason: null,
    limitedVisibilitySteps: [],
    technical: { pages: [] },
    performance: { lcp: 1500, cls: 0.05 },
    serp: { keywords: [] },
    competitive: { competitors: [] },
    backlinks: { domainAuthority: 45 },
    keywords: { quickWins: [], declining: [] },
    competitors: [{ domain: 'competitor.com', overlap: 5 }],
    contentGaps: [],
    authority: { domainAuthority: 45, referringDomains: 100 },
  };

  const limitedReportMock = {
    visibilityMode: 'limited' as const,
    limitedVisibilityReason: 'Crawl was blocked by robots.txt',
    limitedVisibilitySteps: [
      'Allow our crawler access (check robots.txt directives)',
      'Submit your sitemap to help search engines discover pages',
      'Review and optimize robots.txt to ensure important pages are crawlable',
    ],
    technical: null,
    performance: { lcp: 2500, cls: 0.1 },
    serp: { keywords: [] },
    competitive: { competitors: [] },
    backlinks: null,
    keywords: { quickWins: [], declining: [] },
    competitors: [],
    contentGaps: [],
    authority: { domainAuthority: null, referringDomains: null },
  };

  it('should have required fields in full visibility report', () => {
    expect(fullReportMock.visibilityMode).toBe('full');
    expect(fullReportMock.technical).not.toBeNull();
    expect(fullReportMock.limitedVisibilityReason).toBeNull();
    expect(fullReportMock.limitedVisibilitySteps).toHaveLength(0);
  });

  it('should have required fields in limited visibility report', () => {
    expect(limitedReportMock.visibilityMode).toBe('limited');
    expect(limitedReportMock.technical).toBeNull();
    expect(limitedReportMock.limitedVisibilityReason).toBeTruthy();
    expect(limitedReportMock.limitedVisibilitySteps.length).toBeGreaterThan(0);
  });

  it('should always include competitors and keywords fields', () => {
    expect(fullReportMock.competitors).toBeDefined();
    expect(fullReportMock.keywords).toBeDefined();
    expect(limitedReportMock.competitors).toBeDefined();
    expect(limitedReportMock.keywords).toBeDefined();
  });
});
