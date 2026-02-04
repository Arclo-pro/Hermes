import { useSiteContext } from "@/hooks/useSiteContext";
import { useState } from "react";
import { DashboardEmptyState } from "./dashboard/DashboardEmptyState";
import { DashboardHeader } from "./dashboard/DashboardHeader";
import { ConfigureOverlay } from "./dashboard/ConfigureOverlay";
import { MetricCardsSection } from "./dashboard/MetricCardsSection";
import { KeywordRankingsSection } from "./dashboard/KeywordRankingsSection";
import { ContentStatusSection } from "./dashboard/ContentStatusSection";
import { ChangesLogSection } from "./dashboard/ChangesLogSection";
import { PlannedUpdatesSection } from "./dashboard/PlannedUpdatesSection";
import { SetupCardsSection } from "./dashboard/SetupCardsSection";
import { InsightsSection } from "./dashboard/InsightsSection";
import { TechnicalSeoSection } from "./dashboard/TechnicalSeoSection";
import { AchievementsSection } from "./dashboard/AchievementsSection";

const DASHBOARD_BG = {
  background: `radial-gradient(1200px circle at 10% 0%, rgba(139, 92, 246, 0.06), transparent 40%),
               radial-gradient(1200px circle at 90% 10%, rgba(236, 72, 153, 0.04), transparent 40%),
               radial-gradient(800px circle at 50% 80%, rgba(245, 158, 11, 0.03), transparent 40%),
               #FFFFFF`,
};

export default function Dashboard() {
  const { selectedSite } = useSiteContext();
  const siteId = selectedSite?.siteId;
  const [showConfigOverlay, setShowConfigOverlay] = useState(false);

  // No site selected: show add-site form
  if (!siteId) {
    return <DashboardEmptyState />;
  }

  const domain = selectedSite?.baseUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "";

  return (
    <div className="min-h-screen p-6" style={DASHBOARD_BG}>
      {showConfigOverlay && (
        <ConfigureOverlay domain={domain} onClose={() => setShowConfigOverlay(false)} />
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        <DashboardHeader domain={domain} siteId={siteId} />

        {/* Setup / Configure Cards — shown at top when integrations need attention */}
        <SetupCardsSection siteId={siteId} />

        {/* Section 1: Metric Cards */}
        <MetricCardsSection siteId={siteId} />

        {/* Actionable Insights — tips derived from cached worker data */}
        <InsightsSection siteId={siteId} />

        {/* Section 2: Keyword Rankings (combined SERP snapshot + keywords table) */}
        <KeywordRankingsSection siteId={siteId} />

        {/* Content section */}
        <ContentStatusSection siteId={siteId} />

        {/* Technical SEO section */}
        <TechnicalSeoSection siteId={siteId} />

        {/* Achievements + Planned Updates + Recent Changes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AchievementsSection siteId={siteId} />
          <PlannedUpdatesSection siteId={siteId} />
          <ChangesLogSection siteId={siteId} />
        </div>
      </div>
    </div>
  );
}
