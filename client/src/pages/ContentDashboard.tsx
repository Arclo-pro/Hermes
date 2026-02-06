import { DashboardLayout } from "@/components/layout/DashboardLayout";
import HemingwayContent from "./hemingway/HemingwayContent";

const PAGE_BG = "bg-gradient-to-br from-gray-50 via-white to-purple-50/30";

export default function ContentDashboard() {
  return (
    <DashboardLayout className="dashboard-light">
      <div className={`min-h-screen ${PAGE_BG} -m-6 p-6`}>
        <HemingwayContent />
      </div>
    </DashboardLayout>
  );
}
