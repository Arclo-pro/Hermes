/**
 * Channel Split Driver
 *
 * Computes paid vs organic split at traffic, lead, and conversion levels.
 */

import type {
  ChannelSplit,
  ChannelSplitAnalysis,
  AcquisitionChannel,
} from "../../../../shared/types/acquisitionAnalysis";
import type { GA4Row, LeadRow } from "../types";
import { percentage } from "../types";
import { classifyGA4Channel, classifyLeadChannel } from "../utils/attribution";

interface TrafficTotals {
  paid: { sessions: number; users: number };
  organic: { sessions: number; users: number };
}

interface LeadTotals {
  paid: { count: number; signedUp: number };
  organic: { count: number; signedUp: number };
}

/**
 * Aggregate GA4 traffic by paid/organic
 */
function aggregateTraffic(data: GA4Row[]): TrafficTotals {
  const totals: TrafficTotals = {
    paid: { sessions: 0, users: 0 },
    organic: { sessions: 0, users: 0 },
  };

  for (const row of data) {
    const channel = classifyGA4Channel(row.channel);
    if (channel === "paid") {
      totals.paid.sessions += row.sessions || 0;
      totals.paid.users += row.users || 0;
    } else {
      // organic + unknown → organic bucket
      totals.organic.sessions += row.sessions || 0;
      totals.organic.users += row.users || 0;
    }
  }

  return totals;
}

/**
 * Aggregate leads by paid/organic
 */
function aggregateLeads(data: LeadRow[]): LeadTotals {
  const totals: LeadTotals = {
    paid: { count: 0, signedUp: 0 },
    organic: { count: 0, signedUp: 0 },
  };

  for (const lead of data) {
    const channel = classifyLeadChannel(lead);
    const bucket = channel === "paid" ? totals.paid : totals.organic;
    bucket.count++;
    if (lead.outcome === "signed_up") {
      bucket.signedUp++;
    }
  }

  return totals;
}

/**
 * Build channel split data from aggregates
 */
function buildChannelSplit(
  traffic: TrafficTotals,
  leads: LeadTotals
): ChannelSplit[] {
  const totalSessions = traffic.paid.sessions + traffic.organic.sessions;
  const totalUsers = traffic.paid.users + traffic.organic.users;
  const totalLeads = leads.paid.count + leads.organic.count;

  const splits: ChannelSplit[] = [
    {
      channel: "paid",
      traffic: {
        sessions: traffic.paid.sessions,
        users: traffic.paid.users,
        share: percentage(traffic.paid.sessions, totalSessions),
      },
      leads: {
        count: leads.paid.count,
        share: percentage(leads.paid.count, totalLeads),
        conversionRate: percentage(leads.paid.count, traffic.paid.sessions),
      },
      conversions: {
        count: leads.paid.signedUp,
        rate: percentage(leads.paid.signedUp, leads.paid.count),
      },
    },
    {
      channel: "organic",
      traffic: {
        sessions: traffic.organic.sessions,
        users: traffic.organic.users,
        share: percentage(traffic.organic.sessions, totalSessions),
      },
      leads: {
        count: leads.organic.count,
        share: percentage(leads.organic.count, totalLeads),
        conversionRate: percentage(leads.organic.count, traffic.organic.sessions),
      },
      conversions: {
        count: leads.organic.signedUp,
        rate: percentage(leads.organic.signedUp, leads.organic.count),
      },
    },
  ];

  return splits;
}

/**
 * Determine trend direction
 */
function determineTrend(
  currentPaidShare: number,
  previousPaidShare: number
): "shifting_to_paid" | "shifting_to_organic" | "stable" {
  const change = currentPaidShare - previousPaidShare;
  if (Math.abs(change) < 3) return "stable";
  return change > 0 ? "shifting_to_paid" : "shifting_to_organic";
}

/**
 * Main driver: Analyze channel split between current and previous periods
 */
export function analyzeChannelSplit(
  currentGA4: GA4Row[],
  previousGA4: GA4Row[],
  currentLeads: LeadRow[],
  previousLeads: LeadRow[]
): ChannelSplitAnalysis {
  // Aggregate current period
  const currentTraffic = aggregateTraffic(currentGA4);
  const currentLeadTotals = aggregateLeads(currentLeads);
  const current = buildChannelSplit(currentTraffic, currentLeadTotals);

  // Aggregate previous period
  const previousTraffic = aggregateTraffic(previousGA4);
  const previousLeadTotals = aggregateLeads(previousLeads);
  const previous = buildChannelSplit(previousTraffic, previousLeadTotals);

  // Calculate delta
  const currentPaidShare = current.find(c => c.channel === "paid")?.traffic.share || 0;
  const previousPaidShare = previous.find(c => c.channel === "paid")?.traffic.share || 0;

  const paidShareChange = currentPaidShare - previousPaidShare;
  const organicShareChange = -paidShareChange;

  return {
    current,
    previous,
    delta: {
      paidShareChange: Math.round(paidShareChange * 10) / 10,
      organicShareChange: Math.round(organicShareChange * 10) / 10,
      trendDirection: determineTrend(currentPaidShare, previousPaidShare),
    },
  };
}

/**
 * Create empty channel split for no-data scenarios
 */
export function emptyChannelSplit(): ChannelSplitAnalysis {
  const emptySplit: ChannelSplit = {
    channel: "organic",
    traffic: { sessions: 0, users: 0, share: 0 },
    leads: { count: 0, share: 0, conversionRate: 0 },
    conversions: { count: 0, rate: 0 },
  };

  return {
    current: [
      { ...emptySplit, channel: "paid" },
      { ...emptySplit, channel: "organic" },
    ],
    previous: [
      { ...emptySplit, channel: "paid" },
      { ...emptySplit, channel: "organic" },
    ],
    delta: {
      paidShareChange: 0,
      organicShareChange: 0,
      trendDirection: "stable",
    },
  };
}
