import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Compass, Lightbulb } from "lucide-react";
import { getCrewMember } from "@/config/crewManifest";

export interface CaptainRecommendation {
  id: string;
  priority: number;
  title: string;
  description: string;
  contributingAgents: string[];
}

interface CaptainsRecommendationsProps {
  recommendations: CaptainRecommendation[];
  activeAgentCount: number;
}

export function CaptainsRecommendations({ recommendations, activeAgentCount }: CaptainsRecommendationsProps) {
  if (activeAgentCount < 2 || recommendations.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent" data-testid="captains-recommendations">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Compass className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Captain's Recommendations</CardTitle>
              <p className="text-xs text-muted-foreground">
                Insights based on {activeAgentCount} active agents
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority Actions This Week</p>
          <div className="space-y-4">
            {recommendations.slice(0, 3).map((rec, index) => (
              <div key={rec.id} className="flex gap-3" data-testid={`recommendation-${rec.id}`}>
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="font-medium text-sm">{rec.title}</p>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {rec.contributingAgents.map((agentId) => {
                      const agent = getCrewMember(agentId);
                      return (
                        <Badge 
                          key={agentId} 
                          variant="outline" 
                          className="text-xs"
                          style={{ borderColor: agent.color, color: agent.color }}
                        >
                          {agent.nickname}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground italic flex items-center gap-1 pt-2 border-t">
            <Lightbulb className="w-3 h-3" />
            Captain's Recommendations improve as more agents are active.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
