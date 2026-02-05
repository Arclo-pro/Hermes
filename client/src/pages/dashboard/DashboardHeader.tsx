import { useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface DashboardHeaderProps {
  domain: string;
  siteId: string;
}

export function DashboardHeader({ domain, siteId }: DashboardHeaderProps) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    // Invalidate all dashboard-related queries
    await Promise.all([
      // Ops-dashboard queries (metrics, keywords, content, technical SEO, insights, etc.)
      queryClient.invalidateQueries({ queryKey: ["/api/ops-dashboard"] }),
      // Achievements
      queryClient.invalidateQueries({ queryKey: ["achievements"] }),
      // Sites data
      queryClient.invalidateQueries({ queryKey: ["sites"] }),
      // Legacy dashboard queries
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/missions"] }),
    ]);

    // Brief delay so the spinner is visible even if queries are fast
    setTimeout(() => setIsRefreshing(false), 500);
  }, [queryClient, isRefreshing]);

  return (
    <div className="mb-8 flex items-start justify-between">
      <div>
        <h1 className="text-4xl font-bold mb-2" style={{ color: "#0F172A", letterSpacing: "-0.03em" }}>
          Dash<span
            style={{
              backgroundImage: "linear-gradient(90deg, #7c3aed, #ec4899, #f59e0b)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >board</span>
        </h1>
        <p style={{ color: "#475569" }}>{domain}</p>
      </div>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(236,72,153,0.06))",
          border: "1px solid rgba(124, 58, 237, 0.15)",
          color: "#7c3aed",
        }}
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        {isRefreshing ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  );
}
