import { storage } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import type { InsertOutcomeEventLog } from '@shared/schema';
import { detectBreakages, type BreakageThresholds, DEFAULT_THRESHOLDS } from './ralphBreakageDetector';

/**
 * Ralph Wiggum Outcome Snapshots
 *
 * Scheduled job that captures outcome snapshots from GA4, GSC, rankings, CWV
 * and calculates deltas to detect changes.
 */

export interface OutcomeSnapshot {
  siteId: string;
  window: '7d' | '28d' | 'custom';
  timestamp: Date;
  metrics: {
    // GA4 metrics
    sessions?: number;
    users?: number;
    events?: number;
    conversions?: number;
    bounceRate?: number;
    avgSessionDuration?: number;

    // GSC metrics
    clicks?: number;
    impressions?: number;
    ctr?: number;
    avgPosition?: number;

    // Rankings
    keywordsInTop10?: number;
    keywordsInTop3?: number;
    avgKeywordPosition?: number;

    // Core Web Vitals
    lcp?: number;
    cls?: number;
    inp?: number;
    cwvPassRate?: number;

    // Technical SEO
    crawlHealth?: number;
    indexingCoverage?: number;
    domainAuthority?: number;
    backlinks?: number;

    // Errors
    errorRate4xx?: number;
    errorRate5xx?: number;
    pagesLosingTraffic?: number;
  };
}

/**
 * Calculate snapshot from GA4, GSC, and other data sources
 */
export async function calculateOutcomeSnapshot(
  siteId: string,
  window: '7d' | '28d' = '7d',
  endDate: Date = new Date()
): Promise<OutcomeSnapshot> {
  const windowDays = window === '7d' ? 7 : 28;
  const startDate = new Date(endDate.getTime() - windowDays * 24 * 60 * 60 * 1000);

  // Fetch GA4 data
  const ga4Data = await storage.getGA4DataByDateRange(startDate, endDate);
  const ga4Totals = ga4Data.reduce(
    (acc, row) => ({
      sessions: acc.sessions + (row.sessions || 0),
      users: acc.users + (row.users || 0),
      events: acc.events + (row.events || 0),
      conversions: acc.conversions + (row.conversions || 0),
      bounceRate: row.bounceRate || acc.bounceRate,
      avgSessionDuration: row.avgSessionDuration || acc.avgSessionDuration,
    }),
    { sessions: 0, users: 0, events: 0, conversions: 0, bounceRate: 0, avgSessionDuration: 0 }
  );

  // Fetch GSC data
  const gscData = await storage.getGSCDataByDateRange(startDate, endDate);
  const gscTotals = gscData.reduce(
    (acc, row) => ({
      clicks: acc.clicks + (row.clicks || 0),
      impressions: acc.impressions + (row.impressions || 0),
    }),
    { clicks: 0, impressions: 0 }
  );
  const gscCtr = gscTotals.impressions > 0 ? (gscTotals.clicks / gscTotals.impressions) * 100 : 0;

  // Fetch SERP rankings (if available)
  const latestRankings = await storage.getLatestSerpRankingsBySite(siteId);
  const rankingMetrics = {
    keywordsInTop10: latestRankings.filter(r => r.position && r.position <= 10).length,
    keywordsInTop3: latestRankings.filter(r => r.position && r.position <= 3).length,
    avgKeywordPosition:
      latestRankings.reduce((sum, r) => sum + (r.position || 0), 0) / (latestRankings.length || 1),
  };

  // Fetch CWV data (if available)
  const cwvData = await storage.getLatestCoreWebVitals(siteId);
  const cwvMetrics = {
    lcp: cwvData?.lcp,
    cls: cwvData?.cls,
    inp: cwvData?.inp,
    cwvPassRate: cwvData?.passRate,
  };

  // Fetch crawl health
  const crawlData = await storage.getLatestWorkerResultByKey(siteId, 'crawl_render');
  const crawlMetrics = {
    crawlHealth: crawlData?.metricsJson?.health_score,
    errorRate4xx: crawlData?.metricsJson?.error_rate_4xx,
    errorRate5xx: crawlData?.metricsJson?.error_rate_5xx,
  };

  // Fetch domain authority
  const daData = await storage.getLatestWorkerResultByKey(siteId, 'backlink_authority');
  const daMetrics = {
    domainAuthority: daData?.metricsJson?.domain_authority,
    backlinks: daData?.metricsJson?.total_backlinks,
  };

  // Fetch indexing coverage (if available)
  const techSeoData = await storage.getLatestWorkerResultByKey(siteId, 'competitive_snapshot');
  const indexingMetrics = {
    indexingCoverage: techSeoData?.metricsJson?.indexing_coverage,
  };

  // Fetch content decay data
  const decayData = await storage.getLatestWorkerResultByKey(siteId, 'content_decay');
  const decayMetrics = {
    pagesLosingTraffic: decayData?.metricsJson?.pages_losing_traffic_count,
  };

  return {
    siteId,
    window,
    timestamp: endDate,
    metrics: {
      // GA4
      sessions: ga4Totals.sessions,
      users: ga4Totals.users,
      events: ga4Totals.events,
      conversions: ga4Totals.conversions,
      bounceRate: ga4Totals.bounceRate,
      avgSessionDuration: ga4Totals.avgSessionDuration,
      // GSC
      clicks: gscTotals.clicks,
      impressions: gscTotals.impressions,
      ctr: gscCtr,
      // Rankings
      ...rankingMetrics,
      // CWV
      ...cwvMetrics,
      // Technical
      ...crawlMetrics,
      ...daMetrics,
      ...indexingMetrics,
      ...decayMetrics,
    },
  };
}

/**
 * Compare two snapshots and generate outcome events
 */
export async function compareSnapshots(
  siteId: string,
  current: OutcomeSnapshot,
  baseline: OutcomeSnapshot,
  thresholds?: BreakageThresholds
): Promise<InsertOutcomeEventLog[]> {
  const metricDeltas: Array<{
    metricKey: string;
    oldValue: number;
    newValue: number;
  }> = [];

  // Compare all metrics
  for (const [key, currentValue] of Object.entries(current.metrics)) {
    const baselineValue = baseline.metrics[key as keyof typeof baseline.metrics];
    if (typeof currentValue === 'number' && typeof baselineValue === 'number') {
      metricDeltas.push({
        metricKey: key,
        oldValue: baselineValue,
        newValue: currentValue,
      });
    }
  }

  // Use breakage detector to identify regressions and improvements
  const metricSnapshots = metricDeltas.map(d => ({
    metricKey: d.metricKey,
    value: d.newValue,
    timestamp: current.timestamp,
  }));

  const baselineSnapshots = metricDeltas.map(d => ({
    metricKey: d.metricKey,
    value: d.oldValue,
    timestamp: baseline.timestamp,
  }));

  const { breakages, improvements } = await detectBreakages(
    siteId,
    metricSnapshots,
    baselineSnapshots,
    undefined,
    thresholds
  );

  return [...breakages, ...improvements];
}

/**
 * Run daily outcome snapshots for a site
 *
 * This is the scheduled job that should run once per day
 */
export async function runDailyOutcomeSnapshots(siteId: string): Promise<{
  current: OutcomeSnapshot;
  baseline: OutcomeSnapshot;
  events: InsertOutcomeEventLog[];
}> {
  const now = new Date();

  // Calculate current snapshot (last 7 days)
  const current = await calculateOutcomeSnapshot(siteId, '7d', now);

  // Calculate baseline snapshot (7-14 days ago)
  const baselineEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const baseline = await calculateOutcomeSnapshot(siteId, '7d', baselineEnd);

  // Compare and generate events
  const events = await compareSnapshots(siteId, current, baseline);

  // Save events to database
  for (const event of events) {
    await storage.createOutcomeEventLog(event);
  }

  return { current, baseline, events };
}

/**
 * Run weekly outcome snapshots for a site (28-day window)
 */
export async function runWeeklyOutcomeSnapshots(siteId: string): Promise<{
  current: OutcomeSnapshot;
  baseline: OutcomeSnapshot;
  events: InsertOutcomeEventLog[];
}> {
  const now = new Date();

  // Calculate current snapshot (last 28 days)
  const current = await calculateOutcomeSnapshot(siteId, '28d', now);

  // Calculate baseline snapshot (28-56 days ago)
  const baselineEnd = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const baseline = await calculateOutcomeSnapshot(siteId, '28d', baselineEnd);

  // Compare and generate events
  const events = await compareSnapshots(siteId, current, baseline);

  // Save events to database
  for (const event of events) {
    await storage.createOutcomeEventLog(event);
  }

  return { current, baseline, events };
}

/**
 * Run outcome snapshots for all active sites
 */
export async function runOutcomeSnapshotsForAllSites(): Promise<{
  processed: number;
  totalEvents: number;
}> {
  const sites = await storage.getSites();
  let totalEvents = 0;

  for (const site of sites) {
    try {
      const { events } = await runDailyOutcomeSnapshots(site.siteId);
      totalEvents += events.length;
    } catch (error) {
      console.error(`Failed to run outcome snapshots for site ${site.siteId}:`, error);
    }
  }

  return { processed: sites.length, totalEvents };
}
