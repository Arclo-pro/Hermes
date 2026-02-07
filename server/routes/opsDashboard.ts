import { Router } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import {
  ga4Daily,
  gscDaily,
  serpKeywords,
  serpRankings,
  contentDrafts,
  actionExecutionAudit,
  changeProposals,
  websiteTrustLevels,
  websitePolicies,
  websites,
  sites,
  users,
  seoSuggestions,
  leads,
  type GA4Daily,
  type GSCDaily,
  type SerpKeyword,
  type SerpRanking,
  type ContentDraft,
  type ActionExecutionAudit,
  type ChangeProposal,
  type WebsiteTrustLevel,
} from '@shared/schema';
import { generateInsights, type InsightsInput } from '../services/insightsTransformer';
import { analyzeMetric, analyzeAllMetrics } from '../services/metricAnalyzer';
import type { MetricKey } from '../../shared/types/metricExplanation';
import { analyzeAcquisitionOverview, analyzeAcquisitionBudget } from '../services/acquisitionAnalyzer';
import { eq, desc, and, gte, lte, sql, inArray, isNotNull, count } from 'drizzle-orm';
import { logger } from '../utils/logger';

const router = Router();

// Helper: resolve siteId (from sites table) to websiteId (from websites table)
async function resolveWebsiteId(siteId: string): Promise<string | null> {
  const [site] = await db.select().from(sites).where(eq(sites.siteId, siteId)).limit(1);
  if (!site) return null;

  const domain = site.baseUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const [website] = await db
    .select()
    .from(websites)
    .where(sql`REPLACE(REPLACE(${websites.domain}, 'https://', ''), 'http://', '') LIKE ${domain + '%'}`)
    .limit(1);

  return website?.id || null;
}

// Helper: date string N days ago
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Helper: get session user id
function getUserId(req: any): number | null {
  return req.session?.userId || null;
}

// ============================================================
// 1. GET /api/ops-dashboard/:siteId/metrics
// Configuration-aware metric cards (GA4 + Leads)
// ============================================================
router.get('/:siteId/metrics', async (req, res) => {
  try {
    const { siteId } = req.params;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const sevenDaysAgo = daysAgo(7);
    const fourteenDaysAgo = daysAgo(14);

    // Fetch GA4 data for last 14 days
    const ga4Data = await db
      .select()
      .from(ga4Daily)
      .where(and(eq(ga4Daily.siteId, siteId), gte(ga4Daily.date, fourteenDaysAgo)))
      .orderBy(ga4Daily.date);

    const ga4Connected = ga4Data.length > 0;

    // Compute GA4 metrics for current vs previous 7-day windows
    const ga4Current = ga4Data.filter(d => d.date >= sevenDaysAgo);
    const ga4Previous = ga4Data.filter(d => d.date < sevenDaysAgo);

    function sumField(rows: GA4Daily[], field: 'users' | 'events' | 'sessions'): number {
      return rows.reduce((sum, r) => sum + (r[field] || 0), 0);
    }

    function avgField(rows: GA4Daily[], field: 'bounceRate' | 'avgSessionDuration' | 'pagesPerSession'): number | null {
      const valid = rows.filter(r => r[field] != null);
      if (valid.length === 0) return null;
      return valid.reduce((sum, r) => sum + (r[field] as number), 0) / valid.length;
    }

    function computeDelta(current: number | null, previous: number | null): number | null {
      if (current == null || previous == null || previous === 0) return null;
      return ((current - previous) / Math.abs(previous)) * 100;
    }

    // GA4 metrics: activeUsers, eventCount, newUsers
    const activeUsersCurrent = sumField(ga4Current, 'users');
    const activeUsersPrevious = sumField(ga4Previous, 'users');
    const eventCountCurrent = sumField(ga4Current, 'events');
    const eventCountPrevious = sumField(ga4Previous, 'events');
    // Note: GA4 daily doesn't track newUsers separately, so we approximate as 70% of users
    const newUsersCurrent = Math.round(activeUsersCurrent * 0.7);
    const newUsersPrevious = Math.round(activeUsersPrevious * 0.7);

    // Fetch leads with timing data for the past 14 days
    const now = new Date();
    const sevenDaysAgoDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgoDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const leadsData = await db
      .select({
        createdAt: leads.createdAt,
        context: leads.context,
      })
      .from(leads)
      .where(and(
        eq(leads.siteId, siteId),
        gte(leads.createdAt, fourteenDaysAgoDate),
        isNotNull(leads.context)
      ));

    // Extract secondsToSubmit from leads context
    function extractSecondsToSubmit(lead: { context: any }): number | null {
      try {
        const ctx = lead.context;
        if (ctx?.session?.secondsToSubmit != null) {
          return ctx.session.secondsToSubmit;
        }
        // Fallback: compute from sessionStartAt and submittedAt
        if (ctx?.session?.sessionStartAt && ctx?.submittedAt) {
          const sessionStart = new Date(ctx.session.sessionStartAt).getTime();
          const submitted = new Date(ctx.submittedAt).getTime();
          if (!isNaN(sessionStart) && !isNaN(submitted) && submitted > sessionStart) {
            return (submitted - sessionStart) / 1000;
          }
        }
        return null;
      } catch {
        return null;
      }
    }

    const leadsCurrent = leadsData.filter(l => l.createdAt >= sevenDaysAgoDate);
    const leadsPrevious = leadsData.filter(l => l.createdAt < sevenDaysAgoDate);

    const currentTimes = leadsCurrent.map(extractSecondsToSubmit).filter((t): t is number => t !== null);
    const previousTimes = leadsPrevious.map(extractSecondsToSubmit).filter((t): t is number => t !== null);

    const avgTimeToLeadCurrent = currentTimes.length >= 3
      ? currentTimes.reduce((a, b) => a + b, 0) / currentTimes.length
      : null;
    const avgTimeToLeadPrevious = previousTimes.length >= 3
      ? previousTimes.reduce((a, b) => a + b, 0) / previousTimes.length
      : null;

    const hasLeadTimingData = currentTimes.length >= 3;

    function metricResult(value: number | null, change7d: number | null, available: boolean, reason?: string) {
      return { value, change7d, available, ...(reason ? { reason } : {}) };
    }

    res.json({
      ga4Connected,
      gscConnected: false, // Not used for these metrics
      metrics: {
        activeUsers: ga4Connected
          ? metricResult(activeUsersCurrent, computeDelta(activeUsersCurrent, activeUsersPrevious), true)
          : metricResult(null, null, false, 'Google Analytics not connected'),
        eventCount: ga4Connected
          ? metricResult(eventCountCurrent, computeDelta(eventCountCurrent, eventCountPrevious), true)
          : metricResult(null, null, false, 'Google Analytics not connected'),
        newUsers: ga4Connected
          ? metricResult(newUsersCurrent, computeDelta(newUsersCurrent, newUsersPrevious), true)
          : metricResult(null, null, false, 'Google Analytics not connected'),
        avgTimeToLeadSubmit: hasLeadTimingData
          ? metricResult(avgTimeToLeadCurrent, computeDelta(avgTimeToLeadCurrent, avgTimeToLeadPrevious), true)
          : metricResult(null, null, false, currentTimes.length > 0 ? 'Not enough leads yet (need 3+)' : 'No lead timing data'),
      },
    });
  } catch (error) {
    logger.error('[OpsDashboard] metrics error', error as string);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// ============================================================
// 2. GET /api/ops-dashboard/:siteId/serp-snapshot
// SERPA Snapshot (Core SEO Status)
// ============================================================
router.get('/:siteId/serp-snapshot', async (req, res) => {
  try {
    const { siteId } = req.params;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Get all active keywords
    const activeKeywords = await db
      .select()
      .from(serpKeywords)
      .where(eq(serpKeywords.active, true));

    const totalTracked = activeKeywords.length;
    if (totalTracked === 0) {
      return res.json({
        hasBaseline: false,
        totalTracked: 0,
        rankingCounts: { position1: 0, top3: 0, top10: 0, top100: 0 },
        weekOverWeek: { netChange: 0, gained: 0, lost: 0, improved: 0, declined: 0 },
        lastChecked: null,
      });
    }

    const keywordIds = activeKeywords.map(k => k.id);
    const today = daysAgo(0);
    const sevenDaysAgo = daysAgo(7);

    // Get latest ranking for each keyword
    const latestRankings = await db
      .select()
      .from(serpRankings)
      .where(and(
        inArray(serpRankings.keywordId, keywordIds),
        gte(serpRankings.date, daysAgo(3)) // rankings within last 3 days count as "latest"
      ))
      .orderBy(desc(serpRankings.date));

    // Deduplicate: one ranking per keyword (most recent)
    const latestByKeyword = new Map<number, typeof latestRankings[0]>();
    for (const r of latestRankings) {
      if (!latestByKeyword.has(r.keywordId)) {
        latestByKeyword.set(r.keywordId, r);
      }
    }

    // Get rankings from 7 days ago for comparison
    const previousRankings = await db
      .select()
      .from(serpRankings)
      .where(and(
        inArray(serpRankings.keywordId, keywordIds),
        gte(serpRankings.date, daysAgo(10)),
        lte(serpRankings.date, daysAgo(5))
      ))
      .orderBy(desc(serpRankings.date));

    const previousByKeyword = new Map<number, typeof previousRankings[0]>();
    for (const r of previousRankings) {
      if (!previousByKeyword.has(r.keywordId)) {
        previousByKeyword.set(r.keywordId, r);
      }
    }

    // Count ranking buckets
    let position1 = 0, top3 = 0, top10 = 0, top100 = 0;
    for (const [, r] of latestByKeyword) {
      if (r.position != null) {
        if (r.position === 1) position1++;
        if (r.position <= 3) top3++;
        if (r.position <= 10) top10++;
        if (r.position <= 100) top100++;
      }
    }

    // Week-over-week changes
    let gained = 0, lost = 0, improved = 0, declined = 0, netChange = 0;
    for (const kw of activeKeywords) {
      const current = latestByKeyword.get(kw.id);
      const previous = previousByKeyword.get(kw.id);

      if (current?.position != null && previous?.position == null) {
        gained++;
      } else if (current?.position == null && previous?.position != null) {
        lost++;
      } else if (current?.position != null && previous?.position != null) {
        const diff = previous.position - current.position; // positive = improved
        netChange += diff;
        if (diff > 0) improved++;
        if (diff < 0) declined++;
      }
    }

    // Determine if we have enough data for a baseline
    const distinctDates = await db
      .selectDistinct({ date: serpRankings.date })
      .from(serpRankings)
      .where(inArray(serpRankings.keywordId, keywordIds))
      .orderBy(desc(serpRankings.date))
      .limit(10);

    const hasBaseline = distinctDates.length >= 2;
    const lastChecked = distinctDates.length > 0 ? distinctDates[0].date : null;

    res.json({
      hasBaseline,
      totalTracked,
      rankingCounts: { position1, top3, top10, top100 },
      weekOverWeek: { netChange, gained, lost, improved, declined },
      lastChecked,
    });
  } catch (error) {
    logger.error('[OpsDashboard] serp-snapshot error', error as string);
    res.status(500).json({ error: 'Failed to fetch SERP snapshot' });
  }
});

// ============================================================
// 3. GET /api/ops-dashboard/:siteId/serp-keywords
// Top 25 keywords with position history for Recharts
// ============================================================
router.get('/:siteId/serp-keywords', async (req, res) => {
  try {
    const { siteId } = req.params;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Get top 25 active keywords ordered by priority and volume
    const topKeywords = await db
      .select()
      .from(serpKeywords)
      .where(eq(serpKeywords.active, true))
      .orderBy(desc(serpKeywords.priority), desc(serpKeywords.volume))
      .limit(25);

    if (topKeywords.length === 0) {
      return res.json({ keywords: [], hasData: false });
    }

    const keywordIds = topKeywords.map(k => k.id);
    const ninetyDaysAgo = daysAgo(90);

    // Get all rankings for these keywords in last 90 days
    const allRankings = await db
      .select()
      .from(serpRankings)
      .where(and(
        inArray(serpRankings.keywordId, keywordIds),
        gte(serpRankings.date, ninetyDaysAgo)
      ))
      .orderBy(serpRankings.date);

    // Group rankings by keyword
    const rankingsByKeyword = new Map<number, typeof allRankings>();
    for (const r of allRankings) {
      if (!rankingsByKeyword.has(r.keywordId)) {
        rankingsByKeyword.set(r.keywordId, []);
      }
      rankingsByKeyword.get(r.keywordId)!.push(r);
    }

    const sevenDaysAgo = daysAgo(7);
    const thirtyDaysAgo = daysAgo(30);

    const keywords = topKeywords.map(kw => {
      const rankings = rankingsByKeyword.get(kw.id) || [];
      const history = rankings.map(r => ({ date: r.date, position: r.position }));

      // Current = most recent ranking
      const current = rankings.length > 0 ? rankings[rankings.length - 1] : null;
      const currentPosition = current?.position ?? null;

      // Find position at various time intervals
      function positionAtDate(targetDate: string): number | null {
        // Find closest ranking on or before target date
        for (let i = rankings.length - 1; i >= 0; i--) {
          if (rankings[i].date <= targetDate) return rankings[i].position;
        }
        return null;
      }

      const pos7d = positionAtDate(sevenDaysAgo);
      const pos30d = positionAtDate(thirtyDaysAgo);
      const pos90d = positionAtDate(ninetyDaysAgo);

      const change7d = currentPosition != null && pos7d != null ? pos7d - currentPosition : null;
      const change30d = currentPosition != null && pos30d != null ? pos30d - currentPosition : null;
      const change90d = currentPosition != null && pos90d != null ? pos90d - currentPosition : null;

      let direction: 'up' | 'down' | 'stable' | 'new' = 'stable';
      if (change7d != null) {
        if (change7d > 0) direction = 'up';
        else if (change7d < 0) direction = 'down';
      } else if (currentPosition != null && pos7d == null) {
        direction = 'new';
      }

      return {
        id: kw.id,
        keyword: kw.keyword,
        intent: kw.intent,
        priority: kw.priority,
        volume: kw.volume,
        currentPosition,
        change7d,
        change30d,
        change90d,
        direction,
        history,
      };
    });

    res.json({ keywords, hasData: true });
  } catch (error) {
    logger.error('[OpsDashboard] serp-keywords error', error as string);
    res.status(500).json({ error: 'Failed to fetch SERP keywords' });
  }
});

// ============================================================
// 4. GET /api/ops-dashboard/:siteId/content-status
// Content Execution Status
// ============================================================
router.get('/:siteId/content-status', async (req, res) => {
  try {
    const { siteId } = req.params;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const websiteId = await resolveWebsiteId(siteId);

    if (!websiteId) {
      return res.json({
        upcoming: [],
        recentlyPublished: [],
        contentUpdates: [],
        hasContent: false,
      });
    }

    // Upcoming content (drafts not yet published)
    const upcoming = await db
      .select()
      .from(contentDrafts)
      .where(and(
        eq(contentDrafts.websiteId, websiteId),
        inArray(contentDrafts.state, ['drafted', 'qa_passed', 'approved', 'generating', 'revision_needed'])
      ))
      .orderBy(desc(contentDrafts.createdAt))
      .limit(5);

    // Recently published
    const recentlyPublished = await db
      .select()
      .from(contentDrafts)
      .where(and(
        eq(contentDrafts.websiteId, websiteId),
        eq(contentDrafts.state, 'published')
      ))
      .orderBy(desc(contentDrafts.updatedAt))
      .limit(5);

    // Content updates (non-blog content that was recently touched)
    const contentUpdates = await db
      .select()
      .from(contentDrafts)
      .where(and(
        eq(contentDrafts.websiteId, websiteId),
        sql`${contentDrafts.contentType} != 'blog_post'`,
        gte(contentDrafts.updatedAt, new Date(daysAgo(30)))
      ))
      .orderBy(desc(contentDrafts.updatedAt))
      .limit(5);

    function mapDraft(d: ContentDraft) {
      return {
        draftId: d.draftId,
        title: d.title,
        contentType: d.contentType,
        state: d.state,
        targetUrl: d.targetUrl,
        targetKeywords: d.targetKeywords,
        qaScore: d.qaScore,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      };
    }

    res.json({
      upcoming: upcoming.map(mapDraft),
      recentlyPublished: recentlyPublished.map(mapDraft),
      contentUpdates: contentUpdates.map(mapDraft),
      hasContent: upcoming.length > 0 || recentlyPublished.length > 0 || contentUpdates.length > 0,
    });
  } catch (error) {
    logger.error('[OpsDashboard] content-status error', error as string);
    res.status(500).json({ error: 'Failed to fetch content status' });
  }
});

// ============================================================
// 5. GET /api/ops-dashboard/:siteId/changes-log
// What Arclo Did (Changes Log)
// ============================================================
router.get('/:siteId/changes-log', async (req, res) => {
  try {
    const { siteId } = req.params;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const websiteId = await resolveWebsiteId(siteId);

    const entries: Array<{
      id: string;
      what: string;
      why: string;
      when: string;
      severity: 'silent' | 'notify' | 'ask';
      outcome: string;
      category: string;
      source: 'audit' | 'proposal';
    }> = [];

    // Get audit entries
    if (websiteId) {
      const auditEntries = await db
        .select()
        .from(actionExecutionAudit)
        .where(eq(actionExecutionAudit.websiteId, websiteId))
        .orderBy(desc(actionExecutionAudit.executedAt))
        .limit(20);

      for (const a of auditEntries) {
        const severity = (a as any).executionMode === 'autonomous' ? 'silent' as const
          : (a as any).executionMode === 'assisted' ? 'notify' as const
          : 'ask' as const;

        entries.push({
          id: String(a.id),
          what: a.actionType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          why: (a.result as any)?.evidence ? String((a.result as any).evidence) : ((a.result as any)?.rule || 'Automated action'),
          when: (a.executedAt ?? a.createdAt).toISOString(),
          severity,
          outcome: a.status,
          category: a.actionCategory,
          source: 'audit',
        });
      }

      // Get recent change proposals (applied or accepted)
      const proposals = await db
        .select()
        .from(changeProposals)
        .where(and(
          eq(changeProposals.websiteId, websiteId),
          inArray(changeProposals.status, ['applied', 'accepted', 'open'])
        ))
        .orderBy(desc(changeProposals.updatedAt))
        .limit(10);

      for (const p of proposals) {
        const severity = p.riskLevel === 'low' ? 'silent' as const
          : p.riskLevel === 'medium' ? 'notify' as const
          : 'ask' as const;

        entries.push({
          id: p.proposalId,
          what: p.title,
          why: typeof p.rationale === 'string' ? p.rationale : (p.description || 'Change proposed'),
          when: p.updatedAt.toISOString(),
          severity,
          outcome: p.status === 'applied' ? 'success' : p.status === 'accepted' ? 'success' : 'pending',
          category: p.type,
          source: 'proposal',
        });
      }
    }

    // Sort by date, most recent first
    entries.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

    res.json({
      entries: entries.slice(0, 20),
      hasHistory: entries.length > 0,
    });
  } catch (error) {
    logger.error('[OpsDashboard] changes-log error', error as string);
    res.status(500).json({ error: 'Failed to fetch changes log' });
  }
});

// ============================================================
// 6. GET /api/ops-dashboard/:siteId/system-state
// Plan & System State
// ============================================================
router.get('/:siteId/system-state', async (req, res) => {
  try {
    const { siteId } = req.params;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Get user plan
    const [user] = await db
      .select({ plan: users.plan })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const plan = user?.plan || 'free';
    const websiteId = await resolveWebsiteId(siteId);

    if (!websiteId) {
      return res.json({
        plan,
        capabilities: { enabled: [], locked: [] },
        pendingApprovals: [],
        policies: null,
      });
    }

    // Get trust levels
    const trustLevels = await db
      .select()
      .from(websiteTrustLevels)
      .where(eq(websiteTrustLevels.websiteId, websiteId));

    const TRUST_LABELS: Record<number, string> = {
      0: 'Observe',
      1: 'Recommend',
      2: 'Assisted',
      3: 'Autonomous',
    };

    const CATEGORY_LABELS: Record<string, string> = {
      'tech-seo': 'Technical SEO',
      'content': 'Content',
      'links': 'Link Building',
      'ads': 'Advertising',
      'indexing': 'Indexing',
      'performance': 'Performance',
      'compliance': 'Compliance',
    };

    const enabled = trustLevels
      .filter(t => t.trustLevel > 0)
      .map(t => ({
        category: t.actionCategory,
        trustLevel: t.trustLevel,
        label: CATEGORY_LABELS[t.actionCategory] || t.actionCategory,
        trustLabel: TRUST_LABELS[t.trustLevel] || `Level ${t.trustLevel}`,
        confidence: t.confidence,
      }));

    const locked = trustLevels
      .filter(t => t.trustLevel === 0)
      .map(t => ({
        category: t.actionCategory,
        label: CATEGORY_LABELS[t.actionCategory] || t.actionCategory,
        reason: 'Observe-only mode',
      }));

    // Get policies
    const [policies] = await db
      .select()
      .from(websitePolicies)
      .where(eq(websitePolicies.websiteId, websiteId))
      .limit(1);

    // Get pending approvals (blocking open proposals)
    const pendingApprovals = await db
      .select()
      .from(changeProposals)
      .where(and(
        eq(changeProposals.websiteId, websiteId),
        eq(changeProposals.status, 'open'),
        eq(changeProposals.blocking, true)
      ))
      .orderBy(desc(changeProposals.createdAt))
      .limit(10);

    res.json({
      plan,
      capabilities: { enabled, locked },
      pendingApprovals: pendingApprovals.map(p => ({
        proposalId: p.proposalId,
        title: p.title,
        riskLevel: p.riskLevel,
        createdAt: p.createdAt.toISOString(),
      })),
      policies: policies ? {
        canAutoFixTechnical: policies.canAutoFixTechnical,
        canAutoPublishContent: policies.canAutoPublishContent,
        canAutoUpdateContent: policies.canAutoUpdateContent,
        canAutoOptimizeImages: policies.canAutoOptimizeImages,
        canAutoUpdateCode: policies.canAutoUpdateCode,
      } : null,
    });
  } catch (error) {
    logger.error('[OpsDashboard] system-state error', error as string);
    res.status(500).json({ error: 'Failed to fetch system state' });
  }
});

// ============================================================
// 7. GET /api/ops-dashboard/:siteId/insights
// Actionable tips derived from cached dashboard data
// ============================================================
router.get('/:siteId/insights', async (req, res) => {
  try {
    const { siteId } = req.params;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const sevenDaysAgo = daysAgo(7);
    const fourteenDaysAgo = daysAgo(14);

    // ── 1. Metrics (GA4 + GSC) ──────────────────────────────
    const ga4Data = await db
      .select()
      .from(ga4Daily)
      .where(and(eq(ga4Daily.siteId, siteId), gte(ga4Daily.date, fourteenDaysAgo)))
      .orderBy(ga4Daily.date);

    const gscData = await db
      .select()
      .from(gscDaily)
      .where(and(eq(gscDaily.siteId, siteId), gte(gscDaily.date, fourteenDaysAgo)))
      .orderBy(gscDaily.date);

    const ga4Connected = ga4Data.length > 0;
    const gscConnected = gscData.length > 0;

    const ga4Current = ga4Data.filter(d => d.date >= sevenDaysAgo);
    const ga4Previous = ga4Data.filter(d => d.date < sevenDaysAgo);

    function avg(rows: GA4Daily[], field: 'bounceRate' | 'avgSessionDuration' | 'pagesPerSession'): number | null {
      const valid = rows.filter(r => r[field] != null);
      if (valid.length === 0) return null;
      return valid.reduce((sum, r) => sum + (r[field] as number), 0) / valid.length;
    }

    function convRate(rows: GA4Daily[]): number | null {
      const s = rows.reduce((sum, r) => sum + r.sessions, 0);
      const c = rows.reduce((sum, r) => sum + r.conversions, 0);
      return s === 0 ? null : (c / s) * 100;
    }

    function delta(cur: number | null, prev: number | null): number | null {
      if (cur == null || prev == null || prev === 0) return null;
      return ((cur - prev) / Math.abs(prev)) * 100;
    }

    const gscCurrent = gscData.filter(d => d.date >= sevenDaysAgo);
    const gscPrevious = gscData.filter(d => d.date < sevenDaysAgo);

    function avgCtr(rows: GSCDaily[]): number | null {
      const valid = rows.filter(r => r.ctr != null);
      if (valid.length === 0) return null;
      return valid.reduce((sum, r) => sum + r.ctr, 0) / valid.length;
    }

    const bounceRateCur = avg(ga4Current, 'bounceRate');
    const bounceRatePrev = avg(ga4Previous, 'bounceRate');
    const convCur = convRate(ga4Current);
    const convPrev = convRate(ga4Previous);
    const ctrCur = avgCtr(gscCurrent);
    const ctrPrev = avgCtr(gscPrevious);
    const sessionDurCur = avg(ga4Current, 'avgSessionDuration');
    const sessionDurPrev = avg(ga4Previous, 'avgSessionDuration');

    // ── 2. SERP snapshot ────────────────────────────────────
    const activeKeywords = await db
      .select()
      .from(serpKeywords)
      .where(eq(serpKeywords.active, true));

    const totalTracked = activeKeywords.length;
    let position1 = 0, top3 = 0, top10 = 0, top100 = 0;
    let gained = 0, lost = 0, improved = 0, declined = 0, netChange = 0;
    let hasBaseline = false;

    if (totalTracked > 0) {
      const keywordIds = activeKeywords.map(k => k.id);

      const latestRankings = await db
        .select()
        .from(serpRankings)
        .where(and(inArray(serpRankings.keywordId, keywordIds), gte(serpRankings.date, daysAgo(3))))
        .orderBy(desc(serpRankings.date));

      const latestByKw = new Map<number, typeof latestRankings[0]>();
      for (const r of latestRankings) {
        if (!latestByKw.has(r.keywordId)) latestByKw.set(r.keywordId, r);
      }

      const previousRankings = await db
        .select()
        .from(serpRankings)
        .where(and(inArray(serpRankings.keywordId, keywordIds), gte(serpRankings.date, daysAgo(10)), lte(serpRankings.date, daysAgo(5))))
        .orderBy(desc(serpRankings.date));

      const prevByKw = new Map<number, typeof previousRankings[0]>();
      for (const r of previousRankings) {
        if (!prevByKw.has(r.keywordId)) prevByKw.set(r.keywordId, r);
      }

      for (const [, r] of latestByKw) {
        if (r.position != null) {
          if (r.position === 1) position1++;
          if (r.position <= 3) top3++;
          if (r.position <= 10) top10++;
          if (r.position <= 100) top100++;
        }
      }

      for (const kw of activeKeywords) {
        const cur = latestByKw.get(kw.id);
        const prev = prevByKw.get(kw.id);
        if (cur?.position != null && prev?.position == null) gained++;
        else if (cur?.position == null && prev?.position != null) lost++;
        else if (cur?.position != null && prev?.position != null) {
          const diff = prev.position - cur.position;
          netChange += diff;
          if (diff > 0) improved++;
          if (diff < 0) declined++;
        }
      }

      hasBaseline = prevByKw.size > 0;
    }

    // ── 3. Content status ───────────────────────────────────
    const websiteId = await resolveWebsiteId(siteId);
    let upcomingCount = 0;
    let recentlyPublishedCount = 0;
    let staleDraftCount = 0;

    if (websiteId) {
      const upcoming = await db
        .select({ cnt: count() })
        .from(contentDrafts)
        .where(and(
          eq(contentDrafts.websiteId, websiteId),
          inArray(contentDrafts.state, ['drafted', 'qa_passed', 'approved', 'generating', 'revision_needed'])
        ));
      upcomingCount = upcoming[0]?.cnt ?? 0;

      const published = await db
        .select({ cnt: count() })
        .from(contentDrafts)
        .where(and(
          eq(contentDrafts.websiteId, websiteId),
          eq(contentDrafts.state, 'published'),
          gte(contentDrafts.updatedAt, new Date(sevenDaysAgo))
        ));
      recentlyPublishedCount = published[0]?.cnt ?? 0;

      const stale = await db
        .select({ cnt: count() })
        .from(contentDrafts)
        .where(and(
          eq(contentDrafts.websiteId, websiteId),
          inArray(contentDrafts.state, ['drafted', 'revision_needed']),
          lte(contentDrafts.updatedAt, new Date(fourteenDaysAgo))
        ));
      staleDraftCount = stale[0]?.cnt ?? 0;
    }

    // ── 4. Changes log ──────────────────────────────────────
    let recentChangeCount = 0;
    let hasSuccessfulActions = false;

    if (websiteId) {
      const audits = await db
        .select()
        .from(actionExecutionAudit)
        .where(and(
          eq(actionExecutionAudit.websiteId, websiteId),
          gte(actionExecutionAudit.executedAt, new Date(sevenDaysAgo))
        ));
      recentChangeCount = audits.length;
      hasSuccessfulActions = audits.some(a => a.status === 'success');
    }

    // ── 5. Suggestions ──────────────────────────────────────
    const highSev = await db
      .select({ cnt: count() })
      .from(seoSuggestions)
      .where(and(
        eq(seoSuggestions.siteId, siteId),
        eq(seoSuggestions.status, 'open'),
        inArray(seoSuggestions.severity, ['high', 'critical'])
      ));

    const catRows = await db
      .selectDistinct({ category: seoSuggestions.category })
      .from(seoSuggestions)
      .where(and(
        eq(seoSuggestions.siteId, siteId),
        eq(seoSuggestions.status, 'open')
      ));

    // ── Assemble input & generate ───────────────────────────

    const input: InsightsInput = {
      metrics: {
        ga4Connected,
        gscConnected,
        bounceRate: { value: bounceRateCur, change7d: delta(bounceRateCur, bounceRatePrev) },
        conversionRate: { value: convCur, change7d: delta(convCur, convPrev) },
        organicCtr: { value: ctrCur, change7d: delta(ctrCur, ctrPrev) },
        avgSessionDuration: { value: sessionDurCur, change7d: delta(sessionDurCur, sessionDurPrev) },
      },
      serp: {
        totalTracked,
        hasBaseline,
        rankingCounts: { position1, top3, top10, top100 },
        weekOverWeek: { netChange, gained, lost, improved, declined },
      },
      content: {
        upcomingCount,
        recentlyPublishedCount,
        staleDraftCount,
      },
      changes: {
        recentCount: recentChangeCount,
        hasSuccessfulActions,
      },
      suggestions: {
        highSeverityCount: highSev[0]?.cnt ?? 0,
        categories: catRows.map(r => r.category),
      },
    };

    const tips = generateInsights(input);
    res.json({ tips });
  } catch (error) {
    logger.error('[OpsDashboard] insights error', error as string);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// ============================================================
// 8. GET /api/ops-dashboard/:siteId/metric-explanations
// Batch endpoint: "What Changed?" explanations for all 4 KPIs
// ============================================================
router.get('/:siteId/metric-explanations', async (req, res) => {
  try {
    const { siteId } = req.params;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const explanations = await analyzeAllMetrics(siteId);
    res.json(explanations);
  } catch (error) {
    logger.error('[OpsDashboard] metric-explanations error', error as string);
    res.status(500).json({ error: 'Failed to generate metric explanations' });
  }
});

// ============================================================
// 9. GET /api/ops-dashboard/:siteId/metric-explanation/:metricKey
// Single metric breakdown for the detailed analysis page
// ============================================================
router.get('/:siteId/metric-explanation/:metricKey', async (req, res) => {
  try {
    const { siteId, metricKey } = req.params;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const validKeys: MetricKey[] = ['activeUsers', 'eventCount', 'newUsers', 'avgTimeToLeadSubmit'];
    if (!validKeys.includes(metricKey as MetricKey)) {
      return res.status(400).json({
        error: 'Invalid metric key',
        validKeys,
      });
    }

    const explanation = await analyzeMetric(siteId, metricKey as MetricKey);
    res.json(explanation);
  } catch (error) {
    logger.error('[OpsDashboard] metric-explanation error', error as string);
    res.status(500).json({ error: 'Failed to generate metric explanation' });
  }
});

// ============================================================
// 10. GET /api/ops-dashboard/:siteId/acquisition-overview
// Paid vs Organic acquisition analysis for overview page
// ============================================================
router.get('/:siteId/acquisition-overview', async (req, res) => {
  try {
    const { siteId } = req.params;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const overview = await analyzeAcquisitionOverview(siteId);
    res.json(overview);
  } catch (error) {
    logger.error('[OpsDashboard] acquisition-overview error', error as string);
    res.status(500).json({ error: 'Failed to generate acquisition overview' });
  }
});

// ============================================================
// 11. GET /api/ops-dashboard/:siteId/acquisition-budget
// Budget sensitivity analysis and spend recommendations
// ============================================================
router.get('/:siteId/acquisition-budget', async (req, res) => {
  try {
    const { siteId } = req.params;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const budget = await analyzeAcquisitionBudget(siteId);
    if (!budget) {
      return res.status(200).json({
        error: 'Insufficient data',
        message: 'Need at least 4 weeks of spend data for budget analysis.',
      });
    }
    res.json(budget);
  } catch (error) {
    logger.error('[OpsDashboard] acquisition-budget error', error as string);
    res.status(500).json({ error: 'Failed to generate budget analysis' });
  }
});

export default router;
