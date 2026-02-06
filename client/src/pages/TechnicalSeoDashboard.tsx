import ScottyContent from "./scotty/ScottyContent";
import { pageStyles } from "@/lib/design-system";

export default function TechnicalSeoDashboard() {
  return (
    <div className="min-h-screen p-6" style={pageStyles.background}>
      <div className="max-w-7xl mx-auto">
        <ScottyContent />
      </div>
    </div>
  );
}
