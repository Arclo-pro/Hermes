import { ActionCode } from "@shared/schema";

export interface EnrichmentStep {
  type: 'fetch_gsc_queries' | 'fetch_page_meta' | 'check_indexing' | 'check_sitemap' | 'fetch_serp';
  params: Record<string, any>;
}

export interface ImplementationStep {
  type: 'update_meta' | 'add_internal_link' | 'trigger_recrawl' | 'create_pr';
  params: Record<string, any>;
  requiresApproval: boolean;
}

export interface VerificationStep {
  type: 'recheck_serp' | 'recheck_gsc' | 'validate_indexing';
  scheduledFor: 'immediate' | 'tomorrow' | 'next_week';
}

export interface ActionPlan {
  enrichmentSteps: EnrichmentStep[];
  implementationSteps: ImplementationStep[];
  verificationSteps: VerificationStep[];
}

export interface EnrichmentFinding {
  type: string;
  data: any;
  summary: string;
}

export interface ChangeRecord {
  type: string;
  url: string;
  before: any;
  after: any;
  appliedAt: Date;
}

export interface ActionOutput {
  findings: EnrichmentFinding[];
  changes: ChangeRecord[];
  nextSteps: string[];
  summary: string;
}

export interface DropAnomaly {
  date: string;
  source: string;
  metric: string;
  dropPercent: string;
  value: number;
  avg7d: number;
  zScore: number;
}

export function getRecommendedActionCode(drop: DropAnomaly): ActionCode {
  const metric = drop.metric.toLowerCase();
  const source = drop.source.toLowerCase();
  
  if (source === 'gsc') {
    if (metric.includes('click')) {
      return 'CHECK_GSC_QUERY_LOSSES';
    }
    if (metric.includes('impression')) {
      return 'CHECK_INDEXATION_STATUS';
    }
  }
  
  if (source === 'ga4') {
    if (metric.includes('session') || metric.includes('user')) {
      return 'FETCH_PAGE_META';
    }
  }
  
  return 'CHECK_GSC_QUERY_LOSSES';
}

export function dropToAnomalyId(drop: DropAnomaly): string {
  return `${drop.date}_${drop.source}_${drop.metric}`.replace(/\s+/g, '_').toLowerCase();
}
