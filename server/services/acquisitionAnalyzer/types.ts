/**
 * Internal Types for Acquisition Analyzer
 */

import type { GA4Daily, Lead, AdsDaily } from "../../../shared/schema";

// Row types from database
export type GA4Row = GA4Daily;
export type LeadRow = Lead;
export type AdsRow = AdsDaily;

// Aggregated traffic by channel
export interface ChannelTrafficAggregate {
  channel: string;
  sessions: number;
  users: number;
  conversions: number;
}

// Aggregated leads by channel
export interface ChannelLeadsAggregate {
  channel: "paid" | "organic" | "unknown";
  count: number;
  signedUp: number;
  notSignedUp: number;
  avgTimeToConversion: number | null;
  avgContactAttempts: number;
}

// Weekly spend aggregate
export interface WeeklySpendAggregate {
  week: string;
  spend: number;
  clicks: number;
  impressions: number;
}

// Weekly leads aggregate
export interface WeeklyLeadsAggregate {
  week: string;
  paidLeads: number;
  organicLeads: number;
  totalLeads: number;
}

// Analysis period data
export interface PeriodData {
  ga4: GA4Row[];
  leads: LeadRow[];
  ads: AdsRow[];
  dateRange: {
    start: string;
    end: string;
  };
}

// Helper to get start of week (Sunday)
export function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split("T")[0];
}

// Helper to get date string N days ago
export function daysAgo(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString().split("T")[0];
}

// Helper to calculate percentage
export function percentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 1000) / 10; // one decimal place
}

// Helper to calculate days between dates
export function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
