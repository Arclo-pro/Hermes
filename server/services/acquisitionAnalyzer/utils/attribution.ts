/**
 * Attribution Utilities
 *
 * Logic for classifying traffic and leads into paid vs organic channels.
 */

import type { AcquisitionChannel } from "../../../../shared/types/acquisitionAnalysis";

// GA4 channel names that indicate paid traffic
const PAID_CHANNELS = [
  "paid search",
  "paid social",
  "display",
  "cpc",
  "ppc",
];

// UTM mediums that indicate paid traffic
const PAID_MEDIUMS = [
  "cpc",
  "ppc",
  "paid",
  "display",
  "paid_social",
  "paidsocial",
  "banner",
  "retargeting",
];

// UTM sources that indicate paid traffic
const PAID_SOURCE_PATTERNS = [
  "googleads",
  "google_ads",
  "facebook_ads",
  "facebookads",
  "meta_ads",
  "bing_ads",
  "bingads",
  "linkedin_ads",
];

/**
 * Check if a GA4 channel name indicates paid traffic
 */
export function isPaidChannel(channel: string | null | undefined): boolean {
  if (!channel) return false;
  const lower = channel.toLowerCase().trim();
  return PAID_CHANNELS.some(paid => lower.includes(paid));
}

/**
 * Check if a GA4 channel name indicates organic traffic
 */
export function isOrganicChannel(channel: string | null | undefined): boolean {
  if (!channel) return false;
  const lower = channel.toLowerCase().trim();
  return lower.includes("organic") || lower === "direct" || lower === "referral";
}

/**
 * Classify a GA4 channel into acquisition channel
 */
export function classifyGA4Channel(channel: string | null | undefined): AcquisitionChannel {
  if (!channel) return "unknown";

  if (isPaidChannel(channel)) return "paid";
  if (isOrganicChannel(channel)) return "organic";

  // Other channels like email, social, affiliates - treat as organic
  return "organic";
}

/**
 * Check if UTM parameters indicate paid traffic
 */
export function isPaidUtm(
  utmSource: string | null | undefined,
  utmMedium: string | null | undefined
): boolean {
  // Check medium first (most reliable)
  if (utmMedium) {
    const lower = utmMedium.toLowerCase().trim();
    if (PAID_MEDIUMS.includes(lower)) return true;
  }

  // Check source patterns
  if (utmSource) {
    const lower = utmSource.toLowerCase().replace(/[-_\s]/g, "");
    if (PAID_SOURCE_PATTERNS.some(pattern => lower.includes(pattern.replace(/[-_]/g, "")))) {
      return true;
    }
  }

  return false;
}

/**
 * Classify a lead into acquisition channel based on UTM params
 */
export function classifyLeadChannel(lead: {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}): AcquisitionChannel {
  // If no UTM data, it's likely organic/direct
  if (!lead.utmSource && !lead.utmMedium && !lead.utmCampaign) {
    return "organic";
  }

  if (isPaidUtm(lead.utmSource, lead.utmMedium)) {
    return "paid";
  }

  // Has UTM but not paid - likely organic campaign tracking
  return "organic";
}

/**
 * Check if a lead is from paid channels
 */
export function isPaidLead(lead: {
  utmSource?: string | null;
  utmMedium?: string | null;
}): boolean {
  return classifyLeadChannel(lead) === "paid";
}
