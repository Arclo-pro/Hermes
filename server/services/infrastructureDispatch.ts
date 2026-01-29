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
import { blogContentService } from "./blogContentService";
import { runContentDecayAnalysis } from "./contentDecayService";
import {
  processNotificationEvent,
  isSendGridConfigured,
} from "./notificationService";

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
  // Content QA has no worker implementation yet. Return empty metrics.
  logger.info("InfrastructureDispatch", `content_qa: no implementation yet for site ${ctx.siteId}`);
  return {
    issueCount: 0,
    passedCount: 0,
    message: "Content QA service not yet implemented",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS (popular) — health check during orchestration
// ═══════════════════════════════════════════════════════════════════════════

async function runNotificationsCheck(_ctx: InfrastructureRunContext): Promise<Record<string, any>> {
  return {
    ok: true,
    service: "notifications",
    sendgrid_configured: isSendGridConfigured(),
  };
}
