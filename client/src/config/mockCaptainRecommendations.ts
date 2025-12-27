import type { CaptainsRecommendations } from "@shared/captainsRecommendations";

export const MOCK_CAPTAIN_RECOMMENDATIONS: CaptainsRecommendations = {
  generated_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  contributing_agents: [
    "google_data_connector",
    "crawl_render",
    "content_generator",
    "serp_intel",
    "backlink_authority",
    "competitive_snapshot",
  ],
  coverage: {
    active: 6,
    total: 10,
    blocked: 2,
  },
  priorities: [
    {
      rank: 1,
      title: "Fix indexing for your top converting pages",
      why: "GA4 shows conversions down and Technical SEO detected crawl blocks",
      impact: "High",
      effort: "S",
      agents: [
        { id: "google_data_connector", name: "Pulse" },
        { id: "crawl_render", name: "Scotty" },
      ],
      cta: { label: "Review Scotty + Pulse", anchor: "#crawl_render" },
    },
    {
      rank: 2,
      title: "Publish a new blog targeting 'Telepsychiatry Florida'",
      why: "Blog cadence is slipping and SERP demand is strong",
      impact: "Medium",
      effort: "M",
      agents: [
        { id: "content_generator", name: "Hemingway" },
        { id: "serp_intel", name: "Lookout" },
      ],
      cta: { label: "Review BlogWriter", anchor: "#content_generator" },
    },
    {
      rank: 3,
      title: "Acquire 2 local backlinks to beat competitors",
      why: "Authority growth plateaued while competitors gained links",
      impact: "Medium",
      effort: "M",
      agents: [
        { id: "backlink_authority", name: "Beacon" },
        { id: "competitive_snapshot", name: "Natasha" },
      ],
      cta: { label: "Review Beacon + Natasha", anchor: "#backlink_authority" },
    },
  ],
  blockers: [
    {
      id: "google_ads_connector",
      title: "Draper: Google Ads not connected",
      fix: "Connect OAuth credentials",
    },
    {
      id: "content_decay",
      title: "Sentinel: Content Decay missing base URL",
      fix: "Update configuration",
    },
  ],
  confidence: "Medium",
};

export function getMockCaptainRecommendations(): CaptainsRecommendations {
  return {
    ...MOCK_CAPTAIN_RECOMMENDATIONS,
    generated_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  };
}
