import { z } from "zod";
import { CREW } from "../registry";

export const BaseKpiSchema = z.object({
  crewId: z.string(),
  kpiId: z.string(),
  value: z.union([z.number(), z.string()]),
  unit: z.string().optional(),
  measuredAt: z.string().datetime().optional(),
});

export type BaseKpi = z.infer<typeof BaseKpiSchema>;

export const CREW_KPI_CONTRACTS: Record<string, { allowedKpis: string[]; primaryKpi: string }> = {
  scotty: {
    allowedKpis: ["tech.errors", "tech.warnings", "tech.pages_crawled", "tech.blocked_urls", "crawl_health"],
    primaryKpi: "tech.errors",
  },
  speedster: {
    allowedKpis: ["vitals.performance_score", "vitals.lcp", "vitals.cls", "vitals.inp", "vitals.fcp", "vitals.ttfb"],
    primaryKpi: "vitals.performance_score",
  },
  popular: {
    allowedKpis: ["ga4.sessions", "ga4.users", "ga4.conversions", "gsc.clicks", "gsc.impressions", "gsc.ctr", "gsc.position"],
    primaryKpi: "ga4.sessions",
  },
  lookout: {
    allowedKpis: ["serp.keywords_tracked", "serp.keywords_top10", "serp.avg_position"],
    primaryKpi: "serp.keywords_top10",
  },
  beacon: {
    allowedKpis: ["links.total", "links.new", "links.lost", "links.domain_authority"],
    primaryKpi: "links.domain_authority",
  },
  sentinel: {
    allowedKpis: ["content.decay_signals", "content.refresh_candidates"],
    primaryKpi: "content.decay_signals",
  },
  natasha: {
    allowedKpis: ["competitive.gaps", "competitive.opportunities"],
    primaryKpi: "competitive.gaps",
  },
  draper: {
    allowedKpis: ["ads.spend", "ads.clicks", "ads.impressions", "ads.conversions", "ads.cpc"],
    primaryKpi: "ads.conversions",
  },
  hemingway: {
    allowedKpis: ["content_score", "articles_generated"],
    primaryKpi: "content_score",
  },
  socrates: {
    allowedKpis: ["kb.insights_written", "kb.guidance_used"],
    primaryKpi: "kb.insights_written",
  },
  atlas: {
    allowedKpis: ["ai.coverage_score", "ai.llm_visibility"],
    primaryKpi: "ai.coverage_score",
  },
  major_tom: {
    allowedKpis: ["orchestration_health"],
    primaryKpi: "orchestration_health",
  },
};

export function validateKpiForCrew(crewId: string, kpiId: string): { valid: boolean; error?: string } {
  const contract = CREW_KPI_CONTRACTS[crewId];
  if (!contract) {
    return { valid: false, error: `Unknown crewId: ${crewId}` };
  }
  if (!contract.allowedKpis.includes(kpiId)) {
    return { valid: false, error: `KPI '${kpiId}' not allowed for crew '${crewId}'. Allowed: ${contract.allowedKpis.join(", ")}` };
  }
  return { valid: true };
}

export function validateCrewKpiContract(crewId: string): { valid: boolean; errors: string[] } {
  const contract = CREW_KPI_CONTRACTS[crewId];
  const errors: string[] = [];
  
  if (!contract) {
    return { valid: false, errors: [`No KPI contract defined for crew '${crewId}'`] };
  }
  
  if (!contract.allowedKpis.includes(contract.primaryKpi)) {
    errors.push(`Primary KPI '${contract.primaryKpi}' is not in allowedKpis for crew '${crewId}'`);
  }
  
  return { valid: errors.length === 0, errors };
}
