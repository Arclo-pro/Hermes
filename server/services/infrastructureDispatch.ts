/**
 * Infrastructure Worker Dispatch
 *
 * Routes consolidated infrastructure services to their internal implementations.
 * Called by workerOrchestrator when a service has type "infrastructure" (no base_url).
 *
 * Each handler returns data in the same shape the orchestrator's extractMetrics()
 * expects, so metrics extraction works identically to HTTP workers.
 */

import { logger } from "../utils/logger";
import { storage } from "../storage";
import { blogContentService } from "./blogContentService";
import { runContentDecayAnalysis } from "./contentDecayService";
import { isSendGridConfigured } from "./notificationService";
import { runCoreWebVitalsAnalysis } from "./coreWebVitalsService";
import { runBacklinkAuthorityAnalysis } from "./backlinkAuthorityService";

export interface InfrastructureRunContext {
  siteId: string;
  runId: string;
  domain: string;
}

/**
 * Dispatch a consolidated infrastructure worker to its internal implementation.
 * Returns the data payload in the same shape extractMetrics() expects.
 */
export async function runInfrastructureWorker(
  workerKey: string,
  ctx: InfrastructureRunContext
): Promise<Record<string, any>> {
  switch (workerKey) {
    case "content_generator":
      return runContentGenerator(ctx);

    case "content_decay":
      return runContentDecay(ctx);

    case "content_qa":
      return runContentQA(ctx);

    case "notifications":
      return runNotificationsCheck(ctx);

    case "audit_log":
      return runAuditLog(ctx);

    case "google_data_connector":
      return runGoogleDataConnector(ctx);

    case "seo_kbase":
      return runSeoKbase(ctx);

    case "site_executor":
      return runSiteExecutor(ctx);

    case "core_web_vitals":
      return runCoreWebVitals(ctx);

    case "backlink_authority":
      return runBacklinkAuthority(ctx);

    case "technical_seo":
      return runTechnicalSeo(ctx);

    case "orchestrator":
      // The orchestrator is self-referential — it IS the caller.
      // Return a health-check status instead of recursing.
      return { ok: true, service: "orchestrator", message: "Orchestrator is the caller" };

    default:
      logger.info("InfrastructureDispatch", `No internal handler for ${workerKey}, returning empty result`);
      return { ok: true, message: `Infrastructure service ${workerKey} has no run handler` };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT GENERATOR (hemingway)
// ═══════════════════════════════════════════════════════════════════════════

async function runContentGenerator(ctx: InfrastructureRunContext): Promise<Record<string, any>> {
  // The content generator is demand-driven (called via /api/content/generate-blog).
  // During orchestration runs, we report existing draft counts instead of generating.
  const posts = await blogContentService.getBlogPostsBySite(ctx.siteId);
  const recentDrafts = posts.filter(p => p.status === "draft");

  return {
    drafts: recentDrafts.map(d => ({
      id: d.id,
      title: d.title,
      status: d.status,
    })),
    totalPosts: posts.length,
    draftCount: recentDrafts.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT DECAY (sentinel)
// ═══════════════════════════════════════════════════════════════════════════

async function runContentDecay(ctx: InfrastructureRunContext): Promise<Record<string, any>> {
  return runContentDecayAnalysis(ctx.siteId, ctx.domain);
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT QA (scholar) — placeholder until full implementation
// ═══════════════════════════════════════════════════════════════════════════

async function runContentQA(ctx: InfrastructureRunContext): Promise<Record<string, any>> {
  logger.info("InfrastructureDispatch", `content_qa: no implementation yet for site ${ctx.siteId}`);
  return {
    issueCount: 0,
    passedCount: 0,
    message: "Content QA service not yet implemented",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS — health check during orchestration
// ═══════════════════════════════════════════════════════════════════════════

async function runNotificationsCheck(_ctx: InfrastructureRunContext): Promise<Record<string, any>> {
  return {
    ok: true,
    service: "notifications",
    sendgrid_configured: isSendGridConfigured(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT LOG (socrates) — report recent audit log activity
// ═══════════════════════════════════════════════════════════════════════════

async function runAuditLog(ctx: InfrastructureRunContext): Promise<Record<string, any>> {
  // Audit logging is passive (writes happen throughout orchestration via socratesLogger).
  // During dispatch, report that the service is active and healthy.
  logger.info("InfrastructureDispatch", `audit_log: service active for site ${ctx.siteId}`);
  return {
    ok: true,
    service: "audit_log",
    message: "Audit log service is active (writes happen during orchestration)",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE DATA CONNECTOR (popular) — fetch latest GA4 + GSC data
// ═══════════════════════════════════════════════════════════════════════════

async function runGoogleDataConnector(ctx: InfrastructureRunContext): Promise<Record<string, any>> {
  // During orchestration, report the latest GA4 + GSC data availability.
  // Actual data fetching is triggered via dedicated connector routes.
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  try {
    const [ga4Data, gscData] = await Promise.all([
      storage.getGA4DataByDateRange(yesterday, today, ctx.siteId),
      storage.getGSCDataByDateRange(yesterday, today, ctx.siteId),
    ]);

    const latestGA4 = ga4Data[0];
    const latestGSC = gscData[0];

    return {
      ok: true,
      service: "google_data_connector",
      ga4: latestGA4 ? {
        date: latestGA4.date,
        sessions: latestGA4.sessions,
        users: latestGA4.users,
        events: latestGA4.events,
      } : null,
      gsc: latestGSC ? {
        date: latestGSC.date,
        clicks: latestGSC.clicks,
        impressions: latestGSC.impressions,
        ctr: latestGSC.ctr,
        position: latestGSC.position,
      } : null,
      ga4_records: ga4Data.length,
      gsc_records: gscData.length,
    };
  } catch (error: any) {
    logger.error("InfrastructureDispatch", `google_data_connector failed for site ${ctx.siteId}`, { error: error.message });
    return {
      ok: false,
      service: "google_data_connector",
      error: error.message,
      ga4: null,
      gsc: null,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SEO KNOWLEDGE BASE (kbase) — synthesis requires KBaseClient, report status
// ═══════════════════════════════════════════════════════════════════════════

async function runSeoKbase(ctx: InfrastructureRunContext): Promise<Record<string, any>> {
  // Full kbase synthesis requires a KBaseClient instance and is triggered
  // post-orchestration (via synthesizeAndWriteDiagnosis). During dispatch,
  // report that the service is ready.
  logger.info("InfrastructureDispatch", `seo_kbase: ready for site ${ctx.siteId}, run ${ctx.runId}`);
  return {
    ok: true,
    service: "seo_kbase",
    message: "Knowledge base synthesis runs post-orchestration",
    runId: ctx.runId,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SITE EXECUTOR (deployer) — report deployment queue status
// ═══════════════════════════════════════════════════════════════════════════

async function runSiteExecutor(ctx: InfrastructureRunContext): Promise<Record<string, any>> {
  // Site executor handles deployments via GitHub API.
  // During orchestration dispatch, report queue/deployment status.
  logger.info("InfrastructureDispatch", `site_executor: checking status for site ${ctx.siteId}`);
  return {
    ok: true,
    service: "site_executor",
    message: "Site executor is demand-driven (triggered via deploy API)",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE WEB VITALS (speedster) — PageSpeed Insights API
// ═══════════════════════════════════════════════════════════════════════════

async function runCoreWebVitals(ctx: InfrastructureRunContext): Promise<Record<string, any>> {
  return runCoreWebVitalsAnalysis(ctx.domain);
}

// ═══════════════════════════════════════════════════════════════════════════
// BACKLINK AUTHORITY (beacon) — domain authority scoring
// ═══════════════════════════════════════════════════════════════════════════

async function runBacklinkAuthority(ctx: InfrastructureRunContext): Promise<Record<string, any>> {
  return runBacklinkAuthorityAnalysis(ctx.domain);
}

// ═══════════════════════════════════════════════════════════════════════════
// TECHNICAL SEO (unified) — delegates to runTechnicalSeoAgent
// ═══════════════════════════════════════════════════════════════════════════

async function runTechnicalSeo(ctx: InfrastructureRunContext): Promise<Record<string, any>> {
  // Technical SEO is a meta-agent that orchestrates crawl_render,
  // core_web_vitals, and content_decay. It's called separately
  // via runTechnicalSeoAgent() rather than through the standard
  // worker dispatch loop. Return status here.
  logger.info("InfrastructureDispatch", `technical_seo: unified agent for site ${ctx.siteId}`);
  return {
    ok: true,
    service: "technical_seo",
    message: "Technical SEO agent orchestrates crawl_render, core_web_vitals, content_decay",
    subWorkers: ["crawl_render", "core_web_vitals", "content_decay"],
  };
}
