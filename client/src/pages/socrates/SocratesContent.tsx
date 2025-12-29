import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Lightbulb, 
  Target, 
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Clock,
  Loader2,
  Brain,
  Users,
  Activity,
  Map
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSiteContext } from "@/hooks/useSiteContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { getCrewMember } from "@/config/agents";
import {
  CrewDashboardShell,
  type CrewIdentity,
  type MissionStatusState,
  type MissionItem,
  type KpiDescriptor,
  type InspectorTab,
} from "@/components/crew-dashboard";

interface Learning {
  id: string;
  title: string;
  description?: string;
  category: string;
  severity: string;
  sourceAgent?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface AgentActivity {
  agentId: string;
  findingsCount: number;
  latestFinding: string | null;
}

interface KBOverviewData {
  configured: boolean;
  isRealData: boolean;
  dataSource: string;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  totalLearnings: number;
  insightsCount: number;
  recommendationsCount: number;
  patternsCount: number;
  activeAgents: number;
  agentActivity: AgentActivity[];
  recentLearnings: Learning[];
  insights: Learning[];
  recommendations: Learning[];
  patterns: Learning[];
}

const categoryColors: Record<string, string> = {
  insight: "bg-semantic-info-soft text-semantic-info",
  learning: "bg-semantic-info-soft text-semantic-info",
  recommendation: "bg-semantic-warning-soft text-semantic-warning",
  action: "bg-semantic-warning-soft text-semantic-warning",
  pattern: "bg-primary-soft text-primary",
  trend: "bg-primary-soft text-primary",
};

const severityColors: Record<string, string> = {
  critical: "bg-semantic-danger-soft text-semantic-danger",
  high: "bg-semantic-warning-soft text-semantic-warning",
  medium: "bg-semantic-info-soft text-semantic-info",
  low: "bg-muted text-muted-foreground",
  info: "bg-muted text-muted-foreground",
};

function LearningCard({ learning }: { learning: Learning }) {
  const sourceAgent = learning.sourceAgent ? getCrewMember(learning.sourceAgent) : null;
  const timeAgo = learning.createdAt 
    ? formatDistanceToNow(new Date(learning.createdAt), { addSuffix: true })
    : null;

  return (
    <div 
      className="p-4 rounded-xl bg-card/60 border border-border hover:bg-card/80 transition-colors"
      data-testid={`learning-${learning.id}`}
    >
      <div className="flex items-start gap-3">
        {sourceAgent?.avatar ? (
          <img 
            src={sourceAgent.avatar} 
            alt={sourceAgent.nickname} 
            className="w-8 h-8 object-contain flex-shrink-0" 
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Brain className="w-4 h-4 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm text-foreground truncate">{learning.title}</h4>
          </div>
          {learning.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {learning.description}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn("text-xs", categoryColors[learning.category] || "bg-muted text-muted-foreground")}>
              {learning.category}
            </Badge>
            {learning.severity && learning.severity !== 'info' && (
              <Badge className={cn("text-xs", severityColors[learning.severity])}>
                {learning.severity}
              </Badge>
            )}
            {sourceAgent && (
              <Badge 
                variant="outline" 
                className="text-xs"
                style={{ borderColor: sourceAgent.color, color: sourceAgent.color }}
              >
                {sourceAgent.nickname}
              </Badge>
            )}
            {timeAgo && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentActivityCard({ activity }: { activity: AgentActivity }) {
  const agent = getCrewMember(activity.agentId);
  const timeAgo = activity.latestFinding 
    ? formatDistanceToNow(new Date(activity.latestFinding), { addSuffix: true })
    : null;

  return (
    <div 
      className="flex items-center gap-3 p-3 rounded-lg bg-card/40 border border-border/50"
      data-testid={`agent-activity-${activity.agentId}`}
    >
      {agent.avatar ? (
        <img src={agent.avatar} alt={agent.nickname} className="w-8 h-8 object-contain" />
      ) : (
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: agent.color }}
        >
          {agent.nickname.slice(0, 2)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{agent.nickname}</p>
        <p className="text-xs text-muted-foreground">{agent.role}</p>
      </div>
      <div className="text-right">
        <Badge variant="secondary" className="text-xs">{activity.findingsCount} findings</Badge>
        {timeAgo && (
          <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
        )}
      </div>
    </div>
  );
}

export function SocratesContent() {
  const { currentSite } = useSiteContext();
  const queryClient = useQueryClient();
  const siteId = currentSite?.siteId || "default";
  const [activeTab, setActiveTab] = useState("learnings");

  const { data, isLoading, error, refetch } = useQuery<KBOverviewData>({
    queryKey: ["kbase-overview", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/kb/overview?siteId=${siteId}`);
      if (!res.ok) throw new Error("Failed to fetch Knowledge Base data");
      return res.json();
    },
    staleTime: 60000,
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/kbase/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, mode: "quick" }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to run Knowledge Base");
      }
      return res.json();
    },
    onSuccess: (result) => {
      toast.success("Knowledge Base updated", {
        description: result.findingsCount ? `${result.findingsCount} new insights` : "Refresh complete",
      });
      queryClient.invalidateQueries({ queryKey: ["kbase-overview"] });
    },
    onError: (error: Error) => {
      toast.error(`Analysis failed: ${error.message}`);
    },
  });

  const crewMember = getCrewMember("seo_kbase");

  const crew: CrewIdentity = {
    crewId: "seo_kbase",
    crewName: crewMember.nickname,
    subtitle: crewMember.role,
    description: crewMember.blurb || "Aggregates insights from all agents into searchable knowledge.",
    avatar: crewMember.avatar ? (
      <img src={crewMember.avatar} alt={crewMember.nickname} className="w-full h-full object-contain" />
    ) : (
      <Map className="w-6 h-6" style={{ color: crewMember.color }} />
    ),
    accentColor: crewMember.color,
    capabilities: ["Read", "Write", "Search", "Synthesize"],
    monitors: data?.configured ? ["Worker Connected"] : ["Worker Not Configured"],
  };

  const tier = data?.totalLearnings && data.totalLearnings >= 10 
    ? "looking_good" 
    : data?.totalLearnings && data.totalLearnings > 0 
      ? "doing_okay" 
      : "needs_attention";

  const missionStatus: MissionStatusState = {
    tier,
    summaryLine: data?.isRealData 
      ? `${data.totalLearnings} learnings collected` 
      : "Waiting for agent data",
    nextStep: data?.isRealData 
      ? "Review insights from agents" 
      : "Run diagnostics to collect learnings",
    priorityCount: data?.recommendationsCount || 0,
    blockerCount: 0,
    autoFixableCount: 0,
    status: isLoading ? "loading" : "ready",
  };

  const missions: MissionItem[] = [
    {
      id: "collect",
      title: "Collect Agent Insights",
      status: data?.isRealData ? "done" : "in_progress",
      impact: "high",
    },
    {
      id: "synthesize",
      title: "Synthesize Cross-Agent Patterns",
      status: data?.patternsCount ? "done" : "pending",
      impact: "medium",
    },
    {
      id: "recommend",
      title: "Generate Recommendations",
      status: data?.recommendationsCount ? "done" : "pending",
      impact: "medium",
    },
  ];

  const kpis: KpiDescriptor[] = [
    {
      id: "total-learnings",
      label: "Total Learnings",
      value: data?.totalLearnings || 0,
    },
    {
      id: "active-agents",
      label: "Active Agents",
      value: data?.activeAgents || 0,
    },
    {
      id: "insights",
      label: "Insights",
      value: data?.insightsCount || 0,
    },
    {
      id: "recommendations",
      label: "Recommendations",
      value: data?.recommendationsCount || 0,
    },
  ];

  const inspectorTabs: InspectorTab[] = [
    {
      id: "learnings",
      label: "Learnings",
      icon: <BookOpen className="w-4 h-4" />,
      badge: data?.totalLearnings || 0,
      state: data?.recentLearnings?.length ? "ready" : "empty",
      content: (
        <div className="space-y-3">
          {!data?.recentLearnings?.length ? (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No learnings collected yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Run diagnostics to generate insights from your agents
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => runMutation.mutate()}
                disabled={runMutation.isPending}
                className="mt-4"
              >
                {runMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Collect Learnings
              </Button>
            </div>
          ) : (
            data.recentLearnings.map((learning) => (
              <LearningCard key={learning.id} learning={learning} />
            ))
          )}
        </div>
      ),
    },
    {
      id: "insights",
      label: "Insights",
      icon: <Lightbulb className="w-4 h-4" />,
      badge: data?.insightsCount || 0,
      state: data?.insights?.length ? "ready" : "empty",
      content: (
        <div className="space-y-3">
          {!data?.insights?.length ? (
            <div className="text-center py-8">
              <Lightbulb className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No insights yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Insights are generated from cross-agent analysis
              </p>
            </div>
          ) : (
            data.insights.map((insight) => (
              <LearningCard key={insight.id} learning={insight} />
            ))
          )}
        </div>
      ),
    },
    {
      id: "recommendations",
      label: "Recommendations",
      icon: <Target className="w-4 h-4" />,
      badge: data?.recommendationsCount || 0,
      state: data?.recommendations?.length ? "ready" : "empty",
      content: (
        <div className="space-y-3">
          {!data?.recommendations?.length ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No recommendations yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Recommendations are generated after analyzing patterns
              </p>
            </div>
          ) : (
            data.recommendations.map((rec) => (
              <LearningCard key={rec.id} learning={rec} />
            ))
          )}
        </div>
      ),
    },
    {
      id: "agents",
      label: "Agent Activity",
      icon: <Users className="w-4 h-4" />,
      badge: data?.activeAgents || 0,
      state: data?.agentActivity?.length ? "ready" : "empty",
      content: (
        <div className="space-y-3">
          {!data?.agentActivity?.length ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No agent activity recorded</p>
              <p className="text-xs text-muted-foreground mt-1">
                Run diagnostics to see which agents are contributing findings
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.agentActivity.map((activity) => (
                <AgentActivityCard key={activity.agentId} activity={activity} />
              ))}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <CrewDashboardShell
      crew={crew}
      agentScore={data?.totalLearnings ? Math.min(100, data.totalLearnings * 5) : null}
      agentScoreTooltip="Based on learnings collected from all agents"
      missionStatus={missionStatus}
      missions={missions}
      kpis={kpis}
      inspectorTabs={inspectorTabs}
      onRefresh={() => runMutation.mutate()}
      isRefreshing={runMutation.isPending}
    >
      {data?.patterns && data.patterns.length > 0 && (
        <Card className="bg-card/80 backdrop-blur-sm border-border rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Detected Patterns
              </CardTitle>
              <Badge className="bg-primary-soft text-primary">{data.patternsCount}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.patterns.map((pattern) => (
                <LearningCard key={pattern.id} learning={pattern} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </CrewDashboardShell>
  );
}

export default SocratesContent;
