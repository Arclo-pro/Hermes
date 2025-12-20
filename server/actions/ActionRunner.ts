import { storage } from "../storage";
import { ActionCode, ActionRun, InsertActionRun } from "@shared/schema";
import { getConnector, PageMeta } from "./WebsiteConnector";
import { ActionPlan, ActionOutput, EnrichmentFinding, DropAnomaly, dropToAnomalyId } from "./types";
import { logger } from "../utils/logger";

function generateRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

async function buildEnrichmentPlan(actionCode: ActionCode, drop: DropAnomaly): Promise<ActionPlan> {
  const plan: ActionPlan = {
    enrichmentSteps: [],
    implementationSteps: [],
    verificationSteps: [],
  };

  switch (actionCode) {
    case 'CHECK_GSC_QUERY_LOSSES':
      plan.enrichmentSteps.push({
        type: 'fetch_gsc_queries',
        params: { dateRange: drop.date, limit: 10 },
      });
      plan.enrichmentSteps.push({
        type: 'fetch_page_meta',
        params: { topPages: 3 },
      });
      plan.verificationSteps.push({
        type: 'recheck_gsc',
        scheduledFor: 'tomorrow',
      });
      break;

    case 'CHECK_INDEXATION_STATUS':
      plan.enrichmentSteps.push({
        type: 'check_indexing',
        params: { affectedPages: true },
      });
      plan.enrichmentSteps.push({
        type: 'check_sitemap',
        params: {},
      });
      break;

    case 'FETCH_PAGE_META':
      plan.enrichmentSteps.push({
        type: 'fetch_page_meta',
        params: { topPages: 5 },
      });
      break;

    case 'CHECK_SERP_RANKINGS':
      plan.enrichmentSteps.push({
        type: 'fetch_serp',
        params: { topQueries: 5 },
      });
      break;

    default:
      plan.enrichmentSteps.push({
        type: 'fetch_gsc_queries',
        params: { dateRange: drop.date, limit: 5 },
      });
  }

  return plan;
}

async function executeEnrichment(
  siteId: string,
  baseUrl: string,
  plan: ActionPlan,
  drop: DropAnomaly
): Promise<EnrichmentFinding[]> {
  const findings: EnrichmentFinding[] = [];
  const connector = getConnector(siteId, baseUrl);

  for (const step of plan.enrichmentSteps) {
    try {
      switch (step.type) {
        case 'fetch_page_meta': {
          const pagesToCheck = [
            baseUrl,
            `${baseUrl}/services`,
            `${baseUrl}/about`,
          ].slice(0, step.params.topPages || 3);

          const metaResults: PageMeta[] = [];
          for (const pageUrl of pagesToCheck) {
            const meta = await connector.fetchPageMeta(pageUrl);
            if (meta.title || meta.description) {
              metaResults.push(meta);
            }
          }

          findings.push({
            type: 'page_meta',
            data: metaResults,
            summary: `Checked ${metaResults.length} pages. ${metaResults.filter(m => !m.description).length} missing meta descriptions.`,
          });
          break;
        }

        case 'check_indexing': {
          const signals = await connector.fetchIndexingSignals(baseUrl);
          findings.push({
            type: 'indexing_signals',
            data: signals,
            summary: signals.noindex 
              ? 'WARNING: Homepage has noindex tag!' 
              : 'Indexing signals look healthy.',
          });
          break;
        }

        case 'fetch_gsc_queries': {
          const gscData = await storage.getGSCDailyByDateRange(
            new Date(drop.date).toISOString().split('T')[0],
            new Date(drop.date).toISOString().split('T')[0]
          );
          
          const queryStats = new Map<string, { clicks: number; impressions: number }>();
          for (const row of gscData) {
            if (row.query) {
              const existing = queryStats.get(row.query) || { clicks: 0, impressions: 0 };
              existing.clicks += row.clicks;
              existing.impressions += row.impressions;
              queryStats.set(row.query, existing);
            }
          }

          const topQueries = Array.from(queryStats.entries())
            .sort((a, b) => b[1].impressions - a[1].impressions)
            .slice(0, step.params.limit || 10)
            .map(([query, stats]) => ({ query, ...stats }));

          findings.push({
            type: 'gsc_queries',
            data: topQueries,
            summary: `Found ${topQueries.length} queries for ${drop.date}. Top query: "${topQueries[0]?.query || 'N/A'}"`,
          });
          break;
        }

        case 'check_sitemap': {
          try {
            const sitemapUrl = `${baseUrl}/sitemap.xml`;
            const response = await fetch(sitemapUrl, {
              headers: { 'User-Agent': 'SEO-Doctor-Bot/1.0' },
            });
            
            findings.push({
              type: 'sitemap',
              data: { 
                url: sitemapUrl, 
                status: response.status,
                accessible: response.ok,
              },
              summary: response.ok 
                ? 'Sitemap is accessible' 
                : `Sitemap returned ${response.status}`,
            });
          } catch (e) {
            findings.push({
              type: 'sitemap',
              data: { error: 'Could not fetch sitemap' },
              summary: 'Could not access sitemap.xml',
            });
          }
          break;
        }
      }
    } catch (error: any) {
      logger.error('ActionRunner', `Enrichment step ${step.type} failed`, { error: error.message });
      findings.push({
        type: step.type,
        data: { error: error.message },
        summary: `Failed to execute ${step.type}`,
      });
    }
  }

  return findings;
}

function generateNextSteps(findings: EnrichmentFinding[], drop: DropAnomaly): string[] {
  const steps: string[] = [];
  
  for (const finding of findings) {
    if (finding.type === 'page_meta') {
      const missingDesc = finding.data?.filter((m: PageMeta) => !m.description)?.length || 0;
      if (missingDesc > 0) {
        steps.push(`Add meta descriptions to ${missingDesc} page(s)`);
      }
      const shortTitles = finding.data?.filter((m: PageMeta) => m.title && m.title.length < 30)?.length || 0;
      if (shortTitles > 0) {
        steps.push(`Consider expanding ${shortTitles} short title(s) for better CTR`);
      }
    }
    
    if (finding.type === 'indexing_signals' && finding.data?.noindex) {
      steps.push('URGENT: Remove noindex tag from affected pages');
    }
    
    if (finding.type === 'gsc_queries' && finding.data?.length > 0) {
      steps.push('Review top queries and ensure content matches search intent');
    }
  }
  
  if (steps.length === 0) {
    steps.push('Continue monitoring - no immediate action items identified');
    steps.push('Schedule a follow-up check in 24-48 hours');
  }
  
  return steps;
}

function generateSummary(findings: EnrichmentFinding[], drop: DropAnomaly): string {
  const parts: string[] = [];
  
  parts.push(`Analyzed ${drop.metric} drop of ${drop.dropPercent} on ${drop.date}.`);
  
  for (const finding of findings) {
    if (finding.summary && !finding.summary.includes('Failed')) {
      parts.push(finding.summary);
    }
  }
  
  return parts.join(' ');
}

export async function runAction(
  siteId: string,
  baseUrl: string,
  drop: DropAnomaly,
  actionCode: ActionCode,
  options: { enrichOnly?: boolean } = {}
): Promise<ActionRun> {
  const runId = generateRunId();
  const anomalyId = dropToAnomalyId(drop);

  const plan = await buildEnrichmentPlan(actionCode, drop);

  const insertData: InsertActionRun = {
    runId,
    siteId,
    anomalyId,
    actionCode,
    status: 'running',
    planJson: plan,
    triggeredBy: 'user',
    startedAt: new Date(),
  };

  const actionRun = await storage.createActionRun(insertData);

  try {
    const findings = await executeEnrichment(siteId, baseUrl, plan, drop);
    const nextSteps = generateNextSteps(findings, drop);
    const summary = generateSummary(findings, drop);

    const output: ActionOutput = {
      findings,
      changes: [],
      nextSteps,
      summary,
    };

    const updated = await storage.updateActionRun(runId, {
      status: 'completed',
      outputJson: output,
      completedAt: new Date(),
    });

    return updated || actionRun;
  } catch (error: any) {
    logger.error('ActionRunner', 'Action run failed', { runId, error: error.message });
    
    await storage.updateActionRun(runId, {
      status: 'failed',
      errorText: error.message,
      completedAt: new Date(),
    });

    throw error;
  }
}

export async function getActionRunsForAnomaly(
  siteId: string,
  anomalyId: string
): Promise<ActionRun[]> {
  return storage.getActionRunsByAnomaly(siteId, anomalyId);
}
