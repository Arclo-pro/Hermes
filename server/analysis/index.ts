import { storage } from "../storage";
import { type InsertReport, type InsertTicket } from "@shared/schema";
import { logger } from "../utils/logger";
import { ga4Connector } from "../connectors/ga4";
import { gscConnector } from "../connectors/gsc";
import { adsConnector } from "../connectors/ads";
import { clarityConnector } from "../connectors/clarity";

interface DropDetection {
  date: string;
  metric: string;
  value: number;
  previousAvg: number;
  dropPercentage: number;
  zScore: number;
  source: 'GA4' | 'GSC' | 'Ads';
}

interface RootCause {
  hypothesis: string;
  confidence: 'High' | 'Medium' | 'Low';
  evidence: string[];
  owner: 'SEO' | 'Dev' | 'Ads';
  priority: 'High' | 'Medium' | 'Low';
  category: string;
}

interface DiagnosticContext {
  ga4TagHealthy: boolean;
  sitemapExists: boolean;
  robotsBlocking: boolean;
  policyIssues: number;
  pageErrors: number;
  channelDrop?: string;
  landingPageDrop?: string;
}

export class AnalysisEngine {
  async detectDrops(startDate: string, endDate: string): Promise<DropDetection[]> {
    const ga4Data = await storage.getGA4DataByDateRange(startDate, endDate);
    const gscData = await storage.getGSCDataByDateRange(startDate, endDate);
    const adsData = await storage.getAdsDataByDateRange(startDate, endDate);

    const drops: DropDetection[] = [];

    const ga4ByDate = new Map<string, number>();
    ga4Data.forEach(d => {
      const current = ga4ByDate.get(d.date) || 0;
      ga4ByDate.set(d.date, current + d.sessions);
    });

    const gscByDate = new Map<string, number>();
    gscData.forEach(d => {
      const current = gscByDate.get(d.date) || 0;
      gscByDate.set(d.date, current + d.clicks);
    });

    const adsByDate = new Map<string, number>();
    adsData.forEach(d => {
      const current = adsByDate.get(d.date) || 0;
      adsByDate.set(d.date, current + d.spend);
    });

    this.detectDropsInSeries(drops, ga4ByDate, 'Organic Traffic (Sessions)', 'GA4');
    this.detectDropsInSeries(drops, gscByDate, 'Search Clicks', 'GSC');
    this.detectDropsInSeries(drops, adsByDate, 'Ad Spend', 'Ads');

    logger.info('Analysis', `Detected ${drops.length} significant drops`);
    return drops;
  }

  private detectDropsInSeries(
    drops: DropDetection[], 
    dataByDate: Map<string, number>, 
    metric: string, 
    source: 'GA4' | 'GSC' | 'Ads'
  ) {
    const dates = Array.from(dataByDate.keys()).sort();
    
    for (let i = 7; i < dates.length; i++) {
      const currentDate = dates[i];
      const currentValue = dataByDate.get(currentDate) || 0;
      
      const previousValues = dates.slice(i - 7, i).map(d => dataByDate.get(d) || 0);
      const avg = previousValues.reduce((a, b) => a + b, 0) / previousValues.length;
      
      if (avg === 0) continue;
      
      const stdDev = Math.sqrt(
        previousValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / previousValues.length
      );

      const zScore = stdDev > 0 ? (currentValue - avg) / stdDev : 0;
      const dropPercentage = ((currentValue - avg) / avg) * 100;

      if (zScore < -2 && dropPercentage < -15) {
        drops.push({
          date: currentDate,
          metric,
          value: currentValue,
          previousAvg: Math.round(avg),
          dropPercentage: Math.round(dropPercentage * 10) / 10,
          zScore: Math.round(zScore * 100) / 100,
          source,
        });
      }
    }
  }

  async gatherDiagnosticContext(startDate: string, endDate: string): Promise<DiagnosticContext> {
    const context: DiagnosticContext = {
      ga4TagHealthy: true,
      sitemapExists: true,
      robotsBlocking: false,
      policyIssues: 0,
      pageErrors: 0,
    };

    try {
      const realtimeData = await ga4Connector.checkRealtimeHealth();
      context.ga4TagHealthy = realtimeData.isHealthy;
    } catch (e) {
      logger.warn('Analysis', 'Could not check GA4 tag health');
    }

    const webChecks = await storage.getWebChecksByDate(endDate);
    context.pageErrors = webChecks.filter(c => c.statusCode !== 200 && c.statusCode !== 0).length;

    try {
      const channelPerf = await ga4Connector.getChannelPerformance(startDate, endDate);
      const orgChannel = channelPerf.find(c => c.channel.toLowerCase().includes('organic'));
      if (orgChannel && orgChannel.sessions < 10) {
        context.channelDrop = 'Organic Search';
      }
    } catch (e) {
      logger.warn('Analysis', 'Could not check channel performance');
    }

    return context;
  }

  async classifyRootCauses(drops: DropDetection[], context?: DiagnosticContext): Promise<RootCause[]> {
    if (drops.length === 0) {
      return [];
    }

    const webChecks = await storage.getWebChecksByDate(drops[0].date);
    const causes: RootCause[] = [];

    if (context && !context.ga4TagHealthy) {
      causes.push({
        hypothesis: 'GA4 tracking tag may not be firing - no realtime events detected',
        confidence: 'High',
        evidence: [
          'Realtime report shows 0 active users',
          'Compare with Clarity sessions to verify',
          ...clarityConnector.generateEvidenceLinks().map(l => `${l.label}: ${l.url}`),
        ],
        owner: 'Dev',
        priority: 'High',
        category: 'Tracking',
      });
    }

    const failedChecks = webChecks.filter(c => c.statusCode !== 200 && c.statusCode !== 0);
    if (failedChecks.length > 0) {
      const serverErrors = failedChecks.filter(c => c.statusCode >= 500);
      const notFound = failedChecks.filter(c => c.statusCode === 404);
      const redirects = failedChecks.filter(c => c.statusCode >= 300 && c.statusCode < 400);

      if (serverErrors.length > 0) {
        causes.push({
          hypothesis: `${serverErrors.length} pages returning server errors (5xx)`,
          confidence: 'High',
          evidence: serverErrors.slice(0, 5).map(c => `${c.url}: ${c.statusCode}`),
          owner: 'Dev',
          priority: 'High',
          category: 'Server Errors',
        });
      }

      if (notFound.length > 0) {
        causes.push({
          hypothesis: `${notFound.length} pages returning 404 Not Found`,
          confidence: 'High',
          evidence: notFound.slice(0, 5).map(c => c.url),
          owner: 'Dev',
          priority: 'High',
          category: 'Missing Pages',
        });
      }

      if (redirects.length > 2) {
        causes.push({
          hypothesis: `${redirects.length} pages with redirect issues`,
          confidence: 'Medium',
          evidence: redirects.slice(0, 5).map(c => `${c.url} -> ${c.redirectUrl || 'unknown'}`),
          owner: 'Dev',
          priority: 'Medium',
          category: 'Redirects',
        });
      }
    }

    const noindexPages = webChecks.filter(c => c.metaRobots?.includes('noindex'));
    if (noindexPages.length > 0) {
      causes.push({
        hypothesis: `${noindexPages.length} pages with noindex directive`,
        confidence: 'High',
        evidence: noindexPages.map(c => `${c.url}: meta robots="${c.metaRobots}"`),
        owner: 'SEO',
        priority: 'High',
        category: 'Indexing',
      });
    }

    const xRobotsNoindex = webChecks.filter(c => {
      const rawData = c.rawData as any;
      const xRobots = rawData?.headers?.['x-robots-tag'];
      return xRobots && xRobots.includes('noindex');
    });
    if (xRobotsNoindex.length > 0) {
      causes.push({
        hypothesis: `${xRobotsNoindex.length} pages with X-Robots-Tag: noindex header`,
        confidence: 'High',
        evidence: xRobotsNoindex.map(c => c.url),
        owner: 'Dev',
        priority: 'High',
        category: 'Indexing',
      });
    }

    const canonicalIssues = webChecks.filter(c => c.canonical === null && c.statusCode === 200);
    if (canonicalIssues.length > 2) {
      causes.push({
        hypothesis: `${canonicalIssues.length} pages missing canonical tags`,
        confidence: 'Medium',
        evidence: canonicalIssues.slice(0, 5).map(c => c.url),
        owner: 'SEO',
        priority: 'Medium',
        category: 'Canonicalization',
      });
    }

    const adDrops = drops.filter(d => d.source === 'Ads');
    if (adDrops.length > 0) {
      causes.push({
        hypothesis: 'Google Ads spend dropped significantly',
        confidence: 'High',
        evidence: [
          ...adDrops.map(d => `${d.date}: ${d.dropPercentage}% drop (${d.value} vs avg ${d.previousAvg})`),
          'Check campaign status, budget limits, and policy issues',
          'Review billing/payment status',
          'Check for disapproved ads or account issues',
        ],
        owner: 'Ads',
        priority: 'High',
        category: 'Paid Traffic',
      });
    }

    if (causes.length === 0 && drops.length > 0) {
      causes.push({
        hypothesis: 'Possible algorithm update or seasonal traffic variation',
        confidence: 'Low',
        evidence: [
          'No technical issues detected on the site',
          'Check Google Search Central blog for algorithm updates',
          'Compare with industry trends and seasonality',
          'Review GSC manual actions if any',
        ],
        owner: 'SEO',
        priority: 'Medium',
        category: 'Algorithm/Seasonal',
      });
    }

    return causes.sort((a, b) => {
      const priorityOrder = { High: 3, Medium: 2, Low: 1 };
      const confidenceOrder = { High: 3, Medium: 2, Low: 1 };
      
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    });
  }

  async generateReport(startDate: string, endDate: string): Promise<InsertReport> {
    logger.info('Analysis', `Generating report for ${startDate} to ${endDate}`);

    const drops = await this.detectDrops(startDate, endDate);
    const context = await this.gatherDiagnosticContext(startDate, endDate);
    const rootCauses = await this.classifyRootCauses(drops, context);

    let summary: string;
    if (drops.length === 0) {
      summary = 'No significant traffic anomalies detected.';
    } else {
      const ga4Drops = drops.filter(d => d.source === 'GA4').length;
      const gscDrops = drops.filter(d => d.source === 'GSC').length;
      const adsDrops = drops.filter(d => d.source === 'Ads').length;
      
      const parts = [];
      if (ga4Drops > 0) parts.push(`${ga4Drops} GA4 traffic drop(s)`);
      if (gscDrops > 0) parts.push(`${gscDrops} Search Console drop(s)`);
      if (adsDrops > 0) parts.push(`${adsDrops} Ads spend drop(s)`);
      
      summary = `Detected: ${parts.join(', ')}. Primary concern: ${rootCauses[0]?.hypothesis || 'Under investigation'}`;
    }

    const markdownReport = this.buildMarkdownReport(drops, rootCauses, context, startDate, endDate);

    const report: InsertReport = {
      date: endDate,
      reportType: 'daily',
      summary,
      dropDates: drops.map(d => ({ 
        date: d.date, 
        metric: d.metric, 
        drop: d.dropPercentage,
        source: d.source,
      })),
      rootCauses: rootCauses.map(rc => ({
        hypothesis: rc.hypothesis,
        confidence: rc.confidence,
        owner: rc.owner,
        category: rc.category,
      })),
      markdownReport,
    };

    const savedReport = await storage.saveReport(report);
    logger.info('Analysis', `Report generated with ID ${savedReport.id}`);

    return savedReport;
  }

  private buildMarkdownReport(
    drops: DropDetection[], 
    causes: RootCause[], 
    context: DiagnosticContext,
    startDate: string, 
    endDate: string
  ): string {
    let md = `# Traffic & Spend Diagnostic Report\n\n`;
    md += `**Period:** ${startDate} to ${endDate}\n`;
    md += `**Generated:** ${new Date().toISOString()}\n`;
    md += `**Domain:** ${process.env.DOMAIN || 'empathyhealthclinic.com'}\n\n`;

    md += `## Quick Health Check\n\n`;
    md += `| Check | Status |\n`;
    md += `|-------|--------|\n`;
    md += `| GA4 Tag Firing | ${context.ga4TagHealthy ? '✅ Healthy' : '⚠️ No Activity'} |\n`;
    md += `| Page Errors | ${context.pageErrors === 0 ? '✅ None' : `⚠️ ${context.pageErrors} errors`} |\n`;
    md += `| Total Drops Detected | ${drops.length} |\n\n`;

    md += `## Summary\n\n`;
    if (drops.length === 0) {
      md += `✅ No significant traffic drops detected.\n\n`;
    } else {
      md += `⚠️ Detected ${drops.length} significant drop(s):\n\n`;
      
      md += `| Date | Source | Metric | Drop % | Value | 7d Avg | Z-Score |\n`;
      md += `|------|--------|--------|--------|-------|--------|--------|\n`;
      drops.forEach(drop => {
        md += `| ${drop.date} | ${drop.source} | ${drop.metric} | ${drop.dropPercentage}% | ${drop.value} | ${drop.previousAvg} | ${drop.zScore} |\n`;
      });
      md += `\n`;
    }

    if (causes.length > 0) {
      md += `## Root Cause Analysis\n\n`;
      causes.forEach((cause, idx) => {
        const emoji = cause.priority === 'High' ? '🔴' : cause.priority === 'Medium' ? '🟡' : '🟢';
        md += `### ${emoji} ${idx + 1}. ${cause.hypothesis}\n\n`;
        md += `- **Category:** ${cause.category}\n`;
        md += `- **Confidence:** ${cause.confidence}\n`;
        md += `- **Owner:** ${cause.owner}\n`;
        md += `- **Priority:** ${cause.priority}\n`;
        md += `- **Evidence:**\n`;
        cause.evidence.forEach(e => {
          md += `  - ${e}\n`;
        });
        md += `\n`;
      });
    }

    md += `## Recommended Actions\n\n`;
    const highPriority = causes.filter(c => c.priority === 'High');
    const mediumPriority = causes.filter(c => c.priority === 'Medium');

    if (highPriority.length > 0) {
      md += `### Immediate (High Priority)\n\n`;
      highPriority.forEach(c => {
        md += `- [ ] **[${c.owner}]** ${c.hypothesis}\n`;
      });
      md += `\n`;
    }

    if (mediumPriority.length > 0) {
      md += `### Short-term (Medium Priority)\n\n`;
      mediumPriority.forEach(c => {
        md += `- [ ] **[${c.owner}]** ${c.hypothesis}\n`;
      });
      md += `\n`;
    }

    md += `---\n\n`;
    md += `*Report auto-generated by Traffic & Spend Doctor*\n`;

    return md;
  }

  async generateTickets(reportId: number, rootCauses: any[]): Promise<InsertTicket[]> {
    if (!rootCauses || rootCauses.length === 0) {
      logger.info('Analysis', 'No root causes to generate tickets for');
      return [];
    }

    const ticketCounter = await storage.getLatestTickets(1);
    let nextId = ticketCounter.length > 0 
      ? parseInt(ticketCounter[0].ticketId.split('-')[1]) + 1 
      : 1000;

    const tickets: InsertTicket[] = rootCauses
      .filter(cause => cause && cause.hypothesis)
      .map(cause => {
        const evidence = cause.evidence || [];
        return {
          ticketId: `TICK-${nextId++}`,
          title: cause.hypothesis,
          owner: cause.owner || 'SEO',
          priority: cause.priority || 'Medium',
          status: 'Open',
          steps: Array.isArray(evidence) 
            ? evidence.map((e: string, i: number) => ({ step: i + 1, action: e }))
            : [{ step: 1, action: 'Investigate issue' }],
          expectedImpact: `Resolve ${(cause.category || 'unknown').toLowerCase()} issue - ${(cause.priority || 'medium').toLowerCase()} priority`,
          evidence: { 
            sources: evidence, 
            confidence: cause.confidence || 'Medium',
            category: cause.category || 'Unknown',
          },
          reportId,
        };
      });

    if (tickets.length === 0) {
      logger.info('Analysis', 'No valid tickets to generate');
      return [];
    }

    const savedTickets = await storage.saveTickets(tickets);
    logger.info('Analysis', `Generated ${savedTickets.length} tickets`);

    return savedTickets;
  }
}

export const analysisEngine = new AnalysisEngine();
