import HemingwayContent from "./hemingway/HemingwayContent";
import { pageStyles } from "@/lib/design-system";

export default function ContentDashboard() {
  return (
    <div className="min-h-screen p-6" style={pageStyles.background}>
      <div className="max-w-7xl mx-auto">
        <HemingwayContent />
      </div>
    </div>
  );
}
