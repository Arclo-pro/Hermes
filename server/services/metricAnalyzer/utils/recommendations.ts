/**
 * Recommendation generator for metric explanations.
 */

import type { MetricKey, ExplanationStatus, TopDriver, Recommendation } from "../../../../shared/types/metricExplanation";
import type { DriverResult } from "../types";

interface RecommendationInput {
  metricKey: MetricKey;
  status: ExplanationStatus;
  topDrivers: TopDriver[];
  pageDrivers: DriverResult[];
}

export function generateRecommendations(input: RecommendationInput): Recommendation[] {
  const { metricKey, status, topDrivers, pageDrivers } = input;
  const recommendations: Recommendation[] = [];

  // No data or error - suggest setup
  if (status === "no_data" || status === "error") {
    recommendations.push({
      title: "Connect Google Analytics",
      why: "You need GA4 data to analyze this metric and receive actionable insights.",
      targetUrls: [],
      suggestedActions: ["Go to Settings > Integrations > Connect Google Analytics"],
    });
    return recommendations;
  }

  // Stable metrics don't need urgent action
  if (status === "stable") {
    recommendations.push({
      title: "Continue monitoring",
      why: "Your metrics are stable. Focus on maintaining current performance while testing incremental improvements.",
      targetUrls: [],
      suggestedActions: [
        "Set up weekly performance reviews",
        "Identify opportunities for growth experiments",
      ],
    });
    return recommendations;
  }

  // For needs_attention status, generate specific recommendations
  if (status === "needs_attention") {
    // Find declining pages
    const decliningPages = pageDrivers
      .filter(p => p.contribution < 0)
      .slice(0, 3);

    if (decliningPages.length > 0) {
      recommendations.push({
        title: "Investigate underperforming pages",
        why: `These pages contributed most to the ${metricKey === "avgEngagement" ? "engagement" : "traffic"} decline.`,
        targetUrls: decliningPages.map(p => p.label),
        suggestedActions: [
          "Review recent changes to these pages",
          "Check for broken links or slow load times",
          "Analyze search rankings for keywords targeting these pages",
        ],
      });
    }

    // Channel-specific recommendations
    const decliningChannels = topDrivers
      .filter(d => d.type === "channel" && d.contribution < 0);

    if (decliningChannels.length > 0) {
      const channel = decliningChannels[0].label;
      recommendations.push(getChannelRecommendation(channel, "decline"));
    }

    // Device-specific recommendations
    const decliningDevices = topDrivers
      .filter(d => d.type === "device" && d.contribution < 0);

    if (decliningDevices.length > 0) {
      const device = decliningDevices[0].label;
      recommendations.push(getDeviceRecommendation(device, "decline"));
    }
  }

  // For improving status, suggest scaling what's working
  if (status === "improving") {
    const improvingChannels = topDrivers
      .filter(d => d.type === "channel" && d.contribution > 0);

    if (improvingChannels.length > 0) {
      const channel = improvingChannels[0].label;
      recommendations.push(getChannelRecommendation(channel, "growth"));
    }

    const improvingPages = pageDrivers
      .filter(p => p.contribution > 0)
      .slice(0, 3);

    if (improvingPages.length > 0) {
      recommendations.push({
        title: "Double down on top performers",
        why: "These pages are driving your growth. Consider replicating their success.",
        targetUrls: improvingPages.map(p => p.label),
        suggestedActions: [
          "Create similar content based on these winning formats",
          "Increase internal linking to these pages",
          "Optimize call-to-actions on these high-traffic pages",
        ],
      });
    }
  }

  return recommendations.slice(0, 3); // Max 3 recommendations
}

function getChannelRecommendation(
  channel: string,
  trend: "growth" | "decline"
): Recommendation {
  const lowerChannel = channel.toLowerCase();

  if (lowerChannel.includes("organic") || lowerChannel.includes("search")) {
    return trend === "decline"
      ? {
          title: "Review SEO performance",
          why: "Organic search traffic has declined. Check for ranking drops or technical issues.",
          targetUrls: [],
          suggestedActions: [
            "Check Google Search Console for crawl errors",
            "Review keyword rankings for position drops",
            "Audit recent content changes",
          ],
        }
      : {
          title: "Scale your SEO success",
          why: "Organic search traffic is growing. Capitalize on this momentum.",
          targetUrls: [],
          suggestedActions: [
            "Identify new keyword opportunities",
            "Create more content in winning topic clusters",
            "Build more backlinks to high-performing pages",
          ],
        };
  }

  if (lowerChannel.includes("direct")) {
    return trend === "decline"
      ? {
          title: "Strengthen brand awareness",
          why: "Direct traffic has declined, suggesting reduced brand recognition.",
          targetUrls: [],
          suggestedActions: [
            "Increase brand marketing activities",
            "Send email campaigns to re-engage existing users",
            "Check for any site reliability issues",
          ],
        }
      : {
          title: "Build on brand momentum",
          why: "Direct traffic is growing, indicating strong brand recognition.",
          targetUrls: [],
          suggestedActions: [
            "Leverage this audience for upselling",
            "Encourage referrals from loyal visitors",
          ],
        };
  }

  if (lowerChannel.includes("referral")) {
    return trend === "decline"
      ? {
          title: "Revive referral partnerships",
          why: "Referral traffic has declined. Check your backlink sources.",
          targetUrls: [],
          suggestedActions: [
            "Audit referring domains in Google Analytics",
            "Reach out to top referrers for collaboration",
            "Check for lost or broken backlinks",
          ],
        }
      : {
          title: "Expand referral success",
          why: "Referral traffic is growing. Nurture these partnerships.",
          targetUrls: [],
          suggestedActions: [
            "Identify new partnership opportunities",
            "Create more shareable content",
          ],
        };
  }

  if (lowerChannel.includes("social")) {
    return trend === "decline"
      ? {
          title: "Boost social engagement",
          why: "Social media traffic has declined.",
          targetUrls: [],
          suggestedActions: [
            "Review posting frequency and content quality",
            "Engage more with your social audience",
            "Test different content formats",
          ],
        }
      : {
          title: "Amplify social success",
          why: "Social media traffic is growing.",
          targetUrls: [],
          suggestedActions: [
            "Increase posting frequency on winning platforms",
            "Repurpose content that resonates",
          ],
        };
  }

  // Generic channel recommendation
  return {
    title: `Analyze ${channel} channel`,
    why: `${channel} traffic has ${trend === "decline" ? "declined" : "grown"}.`,
    targetUrls: [],
    suggestedActions: [
      "Review channel-specific analytics",
      "Identify what changed in this channel",
    ],
  };
}

function getDeviceRecommendation(
  device: string,
  trend: "growth" | "decline"
): Recommendation {
  const lowerDevice = device.toLowerCase();

  if (lowerDevice.includes("mobile")) {
    return trend === "decline"
      ? {
          title: "Fix mobile experience",
          why: "Mobile traffic has declined. Check for mobile usability issues.",
          targetUrls: [],
          suggestedActions: [
            "Test site on mobile devices",
            "Check Core Web Vitals for mobile",
            "Ensure responsive design works properly",
            "Verify touch targets and font sizes",
          ],
        }
      : {
          title: "Optimize for mobile growth",
          why: "Mobile traffic is growing. Ensure the experience matches.",
          targetUrls: [],
          suggestedActions: [
            "Prioritize mobile-first features",
            "Test checkout/conversion flows on mobile",
          ],
        };
  }

  if (lowerDevice.includes("desktop")) {
    return trend === "decline"
      ? {
          title: "Review desktop experience",
          why: "Desktop traffic has declined.",
          targetUrls: [],
          suggestedActions: [
            "Check for browser compatibility issues",
            "Review desktop-specific features",
          ],
        }
      : {
          title: "Leverage desktop users",
          why: "Desktop traffic is growing.",
          targetUrls: [],
          suggestedActions: [
            "Optimize conversion flows for desktop",
            "Consider desktop-specific features",
          ],
        };
  }

  return {
    title: `Analyze ${device} experience`,
    why: `${device} traffic has ${trend === "decline" ? "declined" : "grown"}.`,
    targetUrls: [],
    suggestedActions: ["Review device-specific analytics"],
  };
}
