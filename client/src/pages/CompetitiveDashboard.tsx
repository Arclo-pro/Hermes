import NatashaContent from "./natasha/NatashaContent";
import { pageStyles } from "@/lib/design-system";

export default function CompetitiveDashboard() {
  return (
    <div className="min-h-screen p-6" style={pageStyles.background}>
      <div className="max-w-7xl mx-auto">
        <NatashaContent />
      </div>
    </div>
  );
}
