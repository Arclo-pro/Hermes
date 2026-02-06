import { DashboardLayout } from "@/components/layout/DashboardLayout";
import NatashaContent from "./natasha/NatashaContent";

const PAGE_BG = "bg-gradient-to-br from-gray-50 via-white to-purple-50/30";

export default function CompetitiveDashboard() {
  return (
    <DashboardLayout className="dashboard-light">
      <div className={`min-h-screen ${PAGE_BG} -m-6 p-6`}>
        <NatashaContent />
      </div>
    </DashboardLayout>
  );
}
