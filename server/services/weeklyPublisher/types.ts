/**
 * Internal types for the weekly publisher service.
 */

import type { SeoSuggestion, WeeklyPlan } from "../../../shared/schema";

export type PipelineStatus = "backlog" | "proposed" | "selected" | "published" | "skipped";

export interface ScoredSuggestion extends SeoSuggestion {
  priorityScore: number;
}

export interface AgentSpread {
  [agentId: string]: number;
}

export interface SelectionResult {
  selected: ScoredSuggestion[];
  diversityApplied: boolean;
  agentSpread: AgentSpread;
}

export interface PublishResult {
  plan: WeeklyPlan;
  updatedSuggestions: string[];
}

export interface PipelineView {
  backlog: SeoSuggestion[];
  proposed: SeoSuggestion[];
  selected: SeoSuggestion[];
  published: SeoSuggestion[];
  skipped: SeoSuggestion[];
}

/**
 * Get current ISO week string in format "YYYY-Www"
 * e.g., "2026-W06" for week 6 of 2026
 */
export function getCurrentISOWeek(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - jan1.getTime()) / 86400000);
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNum.toString().padStart(2, "0")}`;
}

/**
 * Get days since a given date
 */
export function daysSince(date: Date): number {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / 86400000);
}

/**
 * Parse ISO week string to start and end dates
 */
export function parseISOWeek(weekString: string): { start: Date; end: Date } {
  // Format: "2026-W06"
  const [yearStr, weekPart] = weekString.split("-");
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekPart.replace("W", ""), 10);

  // Get January 4th of the year (always in week 1)
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7; // Convert Sunday from 0 to 7

  // Calculate start of week 1
  const week1Start = new Date(jan4);
  week1Start.setDate(jan4.getDate() - jan4Day + 1);

  // Calculate start of target week
  const start = new Date(week1Start);
  start.setDate(week1Start.getDate() + (week - 1) * 7);

  // End is 6 days after start
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { start, end };
}

/**
 * Format week string for display
 */
export function formatWeekDisplay(weekString: string): string {
  const { start, end } = parseISOWeek(weekString);
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", options)}`;
}
