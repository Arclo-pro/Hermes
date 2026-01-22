import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Compass, AlertCircle, ArrowRight, Lightbulb, TrendingUp, Clock } from "lucide-react";
import { getCrewMember } from "@/config/agents";
import type { CaptainsRecommendations as CaptainsRecommendationsType, CaptainPriority, CaptainBlocker } from "@shared/captainsRecommendations";
import { cn } from "@/lib/utils";
import { RecommendationFeedback } from "@/components/recommendations/RecommendationFeedback";

interface CaptainsRecommendationsProps {
  data: CaptainsRecommendationsType;
}

const FALLBACK_PRIORITIES: CaptainPriority[] = [
  {
    rank: 1,
    title: "Connect remaining agents",
    why: "More agents means better recommendations",
    impact: "Medium",
    effort: "S",
    agents: [],
    cta: { label: "View agents", anchor: "#" },
  },
  {
    rank: 2,
    title: "Run first full scan",
    why: "Establish baseline metrics for your site",
    impact: "Medium",
    effort: "S",
    agents: [],
    cta: { label: "Start scan", anchor: "#" },
  },
  {
    rank: 3,
    title: "Review results after completion",
    why: "Initial insights will guide your SEO strategy",
    impact: "Low",
    effort: "S",
    agents: [],
    cta: { label: "View dashboard", anchor: "/" },
  },
];

function ensureThreePriorities(priorities: CaptainPriority[]): CaptainPriority[] {
  const result: CaptainPriority[] = [];
  for (let i = 0; i < 3; i++) {
    if (priorities[i]) {
      result.push({ ...priorities[i], rank: (i + 1) as 1 | 2 | 3 });
    } else {
      result.push({ ...FALLBACK_PRIORITIES[i], rank: (i + 1) as 1 | 2 | 3 });
    }
  }
  return result;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${Math.floor(diffHours / 24)} days ago`;
}

function ImpactBadge({ impact }: { impact: "High" | "Medium" | "Low" }) {
  const colors = {
    High: "bg-semantic-danger-soft text-semantic-danger",
    Medium: "bg-semantic-warning-soft text-semantic-warning",
    Low: "bg-semantic-success-soft text-semantic-success",
  };
  return <Badge className={cn("text-xs", colors[impact])}>{impact}</Badge>;
}

function EffortBadge({ effort }: { effort: "S" | "M" | "L" }) {
  const labels = { S: "Quick", M: "Medium", L: "Large" };
  return (
    <Badge variant="outline" className="text-xs">
      {labels[effort]}
    </Badge>
  );
}

function ConfidenceBadge({ confidence }: { confidence: "High" | "Medium" | "Low" }) {
  const colors = {
    High: "bg-semantic-success-soft text-semantic-success",
    Medium: "bg-semantic-warning-soft text-semantic-warning",
    Low: "bg-semantic-danger-soft text-semantic-danger",
  };
  return (
    <Badge className={cn("text-xs", colors[confidence])}>
      {confidence} Confidence
    </Badge>
  );
}

function generateRecommendationId(priority: CaptainPriority): string {
  const titleSlug = priority.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 30);
  return `priority-${priority.rank}-${titleSlug}`;
}

async function handleRecommendationFeedback(
  recommendationId: string,
  helpful: boolean,
  reason?: string
): Promise<void> {
  try {
    if (helpful) {
      await fetch(`/api/recommendations/${encodeURIComponent(recommendationId)}/helpful`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } else {
      await fetch(`/api/recommendations/${encodeURIComponent(recommendationId)}/invalidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
    }
  } catch (error) {
    console.error("Failed to submit recommendation feedback:", error);
  }
}

function PriorityCard({ priority }: { priority: CaptainPriority }) {
  const priorityStyles = {
    1: { bg: "bg-semantic-danger-soft", border: "border-semantic-danger-border" },
    2: { bg: "bg-gold-soft", border: "border-gold" }, 
    3: { bg: "bg-semantic-info-soft", border: "border-semantic-info-border" },
  };
  const styles = priorityStyles[priority.rank as 1 | 2 | 3] || { bg: "bg-muted", border: "border-border" };
  const recommendationId = generateRecommendationId(priority);
  
  return (
    <div 
      className={cn(
        "flex gap-4 p-5 rounded-2xl border-2 hover:shadow-md transition-shadow",
        styles.bg,
        styles.border
      )} 
      data-testid={`priority-${priority.rank}`}
    >
      <div 
        className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center"
      >
        {priority.rank}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium">{priority.title}</h4>
          <RecommendationFeedback
            recommendationId={recommendationId}
            onFeedback={(helpful, reason) => handleRecommendationFeedback(recommendationId, helpful, reason)}
          />
        </div>
        <p className="text-sm text-muted-foreground">{priority.why}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Signals:</span>
          {priority.agents.map((agent) => {
            const crew = getCrewMember(agent.id);
            return (
              <Badge 
                key={agent.id} 
                variant="outline" 
                className="text-xs"
                style={{ borderColor: crew.color, color: crew.color }}
              >
                {agent.name}
              </Badge>
            );
          })}
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Impact:</span>
            <ImpactBadge impact={priority.impact} />
            <span className="text-xs text-muted-foreground ml-2">Effort:</span>
            <EffortBadge effort={priority.effort} />
          </div>
          <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
            <a href={priority.cta.anchor}>
              {priority.cta.label}
              <ArrowRight className="w-3 h-3 ml-1" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function BlockerItem({ blocker }: { blocker: CaptainBlocker }) {
  const crew = getCrewMember(blocker.id);
  return (
    <div className="flex items-start gap-3 text-sm">
      <AlertCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
      <div>
        <span className="font-medium" style={{ color: crew.color }}>{blocker.title}</span>
        <span className="text-muted-foreground"> — {blocker.fix}</span>
      </div>
    </div>
  );
}

export function CaptainsRecommendations({ data }: CaptainsRecommendationsProps) {
  if (data.coverage.active < 2) {
    return null;
  }

  const priorities = ensureThreePriorities(data.priorities);

  return (
    <Card className="border border-border shadow-md bg-card overflow-hidden" data-testid="captains-recommendations">
      <CardHeader className="pb-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shadow-sm">
              <Compass className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Missions</CardTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span>Based on {data.coverage.active} active agents</span>
                <span>•</span>
                <Clock className="w-3 h-3" />
                <span>Updated {formatRelativeTime(data.generated_at)}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ConfidenceBadge confidence={data.confidence} />
            <Badge variant="outline" className="text-xs bg-card">
              {data.coverage.active}/{data.coverage.total} agents
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-5">
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Priority Actions</h3>
          </div>
          <div className="space-y-4">
            {priorities.map((priority) => (
              <PriorityCard key={priority.rank} priority={priority} />
            ))}
          </div>
        </div>

        {data.blockers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
              <AlertCircle className="w-4 h-4 text-gold" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Blockers</h3>
            </div>
            <div className="space-y-2 p-4 rounded-lg bg-gold-soft border-2 border-gold shadow-sm">
              {data.blockers.map((blocker) => (
                <BlockerItem key={blocker.id} blocker={blocker} />
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground italic flex items-center gap-1 pt-3 border-t border-border">
          <Lightbulb className="w-3 h-3" />
          Recommendations improve as more agents contribute data.
        </p>
      </CardContent>
    </Card>
  );
}
