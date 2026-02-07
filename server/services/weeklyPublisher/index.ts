/**
 * Weekly Publisher Service
 *
 * Orchestrates the weekly selection and publishing of top 1-3 agent updates.
 * Runs every Monday at 7 AM Central via cron job.
 */

import { storage } from "../../storage";
import { rankSuggestions, computePriorityScore } from "./ranker";
import { selectTopUpdates } from "./selector";
import {
  getCurrentISOWeek,
  type PipelineView,
  type PublishResult,
} from "./types";
import type { SeoSuggestion, WeeklyPlan, InsertWeeklyPlan } from "../../../shared/schema";

/**
 * Run weekly publish for a single site.
 * Selects top 1-3 suggestions and creates a weekly plan.
 */
export async function runWeeklyPublish(siteId: string): Promise<PublishResult | null> {
  const weekString = getCurrentISOWeek();

  console.log(`[WeeklyPublisher] Running for site ${siteId}, week ${weekString}`);

  // 1. Get all suggestions in 'proposed' or 'backlog' status
  const candidates = await storage.getSuggestionsByPipelineStatus(siteId, ["proposed", "backlog"]);

  if (candidates.length === 0) {
    console.log(`[WeeklyPublisher] No candidates for site ${siteId}`);
    return null;
  }

  // 2. Score and rank all candidates
  const ranked = rankSuggestions(candidates);

  // 3. Select top 1-3 with diversity constraints
  const { selected, diversityApplied, agentSpread } = selectTopUpdates(ranked, 3);

  if (selected.length === 0) {
    console.log(`[WeeklyPublisher] No updates selected for site ${siteId}`);
    return null;
  }

  // 4. Create or update weekly plan
  const planData: InsertWeeklyPlan = {
    siteId,
    weekString,
    selectedSuggestionIds: selected.map((s) => s.suggestionId),
    diversityApplied,
    agentSpread,
    status: "published",
    generatedAt: new Date(),
    publishedAt: new Date(),
  };

  const plan = await storage.upsertWeeklyPlan(planData);

  // 5. Update suggestion pipeline statuses
  const selectedIds = selected.map((s) => s.suggestionId);
  await storage.updateSuggestionsPipelineStatus(
    selectedIds,
    "selected",
    weekString
  );

  console.log(
    `[WeeklyPublisher] Published ${selected.length} updates for site ${siteId}`
  );

  return {
    plan,
    updatedSuggestions: selectedIds,
  };
}

/**
 * Run weekly publish for all active sites.
 * Called by cron job.
 */
export async function runWeeklyPublishAll(): Promise<void> {
  console.log("[WeeklyPublisher] Starting weekly publish for all sites...");

  const sites = await storage.getAllActiveSites();

  let successCount = 0;
  let skipCount = 0;

  for (const site of sites) {
    try {
      const result = await runWeeklyPublish(site.siteId);
      if (result) {
        successCount++;
      } else {
        skipCount++;
      }
    } catch (err) {
      console.error(
        `[WeeklyPublisher] Failed for site ${site.siteId}:`,
        err
      );
    }
  }

  console.log(
    `[WeeklyPublisher] Complete. Published: ${successCount}, Skipped: ${skipCount}`
  );
}

/**
 * Get the current week's plan for a site.
 */
export async function getCurrentWeeklyPlan(
  siteId: string
): Promise<{ plan: WeeklyPlan | null; updates: SeoSuggestion[] }> {
  const weekString = getCurrentISOWeek();
  const plan = await storage.getWeeklyPlan(siteId, weekString);

  if (!plan || !plan.selectedSuggestionIds?.length) {
    return { plan: null, updates: [] };
  }

  const updates = await storage.getSuggestionsByIds(plan.selectedSuggestionIds);
  return { plan, updates };
}

/**
 * Get full pipeline view for a site (all suggestions grouped by status).
 */
export async function getUpdatePipeline(siteId: string): Promise<PipelineView> {
  const all = await storage.getAllSuggestionsForSite(siteId);

  const pipeline: PipelineView = {
    backlog: [],
    proposed: [],
    selected: [],
    published: [],
    skipped: [],
  };

  for (const suggestion of all) {
    const status = suggestion.pipelineStatus ?? "backlog";
    if (status in pipeline) {
      pipeline[status as keyof PipelineView].push(suggestion);
    } else {
      pipeline.backlog.push(suggestion);
    }
  }

  // Sort each bucket by priority score descending
  for (const status of Object.keys(pipeline) as (keyof PipelineView)[]) {
    pipeline[status].sort((a, b) => {
      const scoreA = a.priorityScore ?? computePriorityScore(a);
      const scoreB = b.priorityScore ?? computePriorityScore(b);
      return scoreB - scoreA;
    });
  }

  return pipeline;
}

/**
 * Get per-agent pipeline view.
 */
export async function getAgentUpdatePipeline(
  siteId: string,
  agentId: string
): Promise<PipelineView> {
  const all = await storage.getSuggestionsByAgent(siteId, agentId);

  const pipeline: PipelineView = {
    backlog: [],
    proposed: [],
    selected: [],
    published: [],
    skipped: [],
  };

  for (const suggestion of all) {
    const status = suggestion.pipelineStatus ?? "backlog";
    if (status in pipeline) {
      pipeline[status as keyof PipelineView].push(suggestion);
    } else {
      pipeline.backlog.push(suggestion);
    }
  }

  return pipeline;
}

/**
 * Move a suggestion to a different pipeline status.
 */
export async function moveSuggestionInPipeline(
  suggestionId: string,
  newStatus: string,
  reason?: string
): Promise<void> {
  await storage.updateSuggestionPipelineStatus(suggestionId, newStatus, reason);
}

// Re-export types for convenience
export * from "./types";
export { computePriorityScore, rankSuggestions } from "./ranker";
export { selectTopUpdates } from "./selector";
