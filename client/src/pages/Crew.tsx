import { useLocation, useSearch } from "wouter";
import { useEffect, useState, useRef } from "react";
import { buildRoute } from "@shared/routes";
import { AgentCard } from "@/components/crew/AgentCard";
import { AgentCoveragePanel } from "@/components/crew/AgentCoveragePanel";
import { USER_FACING_AGENTS, getCrewMember } from "@/config/agents";
import { getMockAgentData } from "@/config/mockAgentInsights";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { colors, pageStyles, badgeStyles, gradients } from "@/lib/design-system";

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

export default function CrewPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const [focusedAgentId, setFocusedAgentId] = useState<string | null>(null);
  const agentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  const [subscriptions, setSubscriptions] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    USER_FACING_AGENTS.forEach((serviceId) => {
      initial[serviceId] = true;
    });
    return initial;
  });

  const handleToggleSubscription = (serviceId: string) => {
    setSubscriptions((prev) => {
      const newValue = !prev[serviceId];
      if (newValue) {
        console.log(`Subscribed to agent: ${serviceId}`);
      } else {
        console.log(`Unsubscribed from agent: ${serviceId}`);
      }
      return { ...prev, [serviceId]: newValue };
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(search);
    const focusParam = params.get("focus");
    
    if (focusParam && USER_FACING_AGENTS.includes(focusParam)) {
      setFocusedAgentId(focusParam);
      
      setTimeout(() => {
        const element = agentRefs.current[focusParam];
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);

      setTimeout(() => {
        setFocusedAgentId(null);
        window.history.replaceState({}, "", window.location.pathname);
      }, 2000);
    }
  }, [search]);
  
  const userFacingAgents = USER_FACING_AGENTS
    .map((serviceId) => {
      const crew = getCrewMember(serviceId);
      const mockData = getMockAgentData(serviceId);
      return {
        serviceId,
        crew,
        score: mockData?.score || 0,
        lastCheckIn: mockData ? "1 hour ago" : null,
        findings: mockData?.findings || [],
        nextSteps: mockData?.nextSteps || [],
      };
    });

  const coreAgents = userFacingAgents.filter((a) => a.crew.category === "core");
  const additionalAgents = userFacingAgents.filter((a) => a.crew.category === "additional");

  const avgScore = userFacingAgents.length > 0 
    ? Math.round(userFacingAgents.reduce((sum, a) => sum + a.score, 0) / userFacingAgents.length)
    : 0;
  const needsAttention = userFacingAgents.filter((a) => a.score < 50).length;

  // Get badge style based on score
  const getScoreBadgeStyle = (score: number) => {
    if (score >= 70) return badgeStyles.green;
    if (score >= 40) return badgeStyles.amber;
    return badgeStyles.red;
  };

  return (
    <div className="min-h-screen p-6" style={pageStyles.background} data-testid="agents-page">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${colors.brand.purple}14` }}
            >
              <Bot className="w-5 h-5" style={{ color: colors.brand.purple }} />
            </div>
            <h1 className="text-4xl font-bold" style={{ color: colors.text.primary, letterSpacing: "-0.03em" }}>
              <span style={gradients.brandText}>Agents</span>
            </h1>
          </div>
          <p style={{ color: colors.text.secondary }}>
            Your hired specialists analyzing and improving your site
          </p>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span style={{ color: colors.text.muted }}>Active Agents:</span>
            <span
              className="px-2 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wide"
              style={{ color: badgeStyles.gray.color, background: badgeStyles.gray.bg }}
            >
              {userFacingAgents.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: colors.text.muted }}>Avg Score:</span>
            <span
              className="px-2 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wide"
              style={{ color: getScoreBadgeStyle(avgScore).color, background: getScoreBadgeStyle(avgScore).bg }}
            >
              {avgScore}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: colors.text.muted }}>Needs Attention:</span>
            <span
              className="px-2 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wide"
              style={{ color: badgeStyles.amber.color, background: badgeStyles.amber.bg }}
            >
              {needsAttention}
            </span>
          </div>
        </div>

        {/* Agent Sections */}
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-1" style={{ color: colors.text.primary }}>Core Agents</h2>
            <p className="text-sm mb-4" style={{ color: colors.text.muted }}>These agents are included and active by default.</p>
            <div className="flex flex-col gap-6">
              {coreAgents.map((agent) => (
                <div
                  key={agent.serviceId}
                  id={agent.serviceId}
                  ref={(el) => { agentRefs.current[agent.serviceId] = el; }}
                  className={cn(
                    "transition-all duration-500",
                    focusedAgentId === agent.serviceId && "ring-2 ring-offset-2 rounded-lg animate-pulse"
                  )}
                  style={focusedAgentId === agent.serviceId ? {
                    "--tw-ring-color": colors.brand.purple,
                    "--tw-ring-offset-color": "#FFFFFF"
                  } as React.CSSProperties : undefined}
                >
                  <AgentCard
                    serviceId={agent.serviceId}
                    score={agent.score}
                    lastCheckIn={agent.lastCheckIn}
                    findings={agent.findings}
                    nextSteps={agent.nextSteps}
                    onClick={() => navigate(buildRoute.agent(agent.serviceId))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-1" style={{ color: colors.text.primary }}>Additional Agents</h2>
            <p className="text-sm mb-4" style={{ color: colors.text.muted }}>Optional agents you can add or remove at any time.</p>
            <div className="flex flex-col gap-6">
              {additionalAgents.map((agent) => (
                <div
                  key={agent.serviceId}
                  id={agent.serviceId}
                  ref={(el) => { agentRefs.current[agent.serviceId] = el; }}
                  className={cn(
                    "transition-all duration-500",
                    focusedAgentId === agent.serviceId && "ring-2 ring-offset-2 rounded-lg animate-pulse"
                  )}
                  style={focusedAgentId === agent.serviceId ? {
                    "--tw-ring-color": colors.brand.purple,
                    "--tw-ring-offset-color": "#FFFFFF"
                  } as React.CSSProperties : undefined}
                >
                  <AgentCard
                    serviceId={agent.serviceId}
                    score={agent.score}
                    lastCheckIn={agent.lastCheckIn}
                    findings={agent.findings}
                    nextSteps={agent.nextSteps}
                    isSubscribed={subscriptions[agent.serviceId]}
                    onToggleSubscribe={() => handleToggleSubscription(agent.serviceId)}
                    onClick={() => navigate(buildRoute.agent(agent.serviceId))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <AgentCoveragePanel subscriptions={subscriptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
