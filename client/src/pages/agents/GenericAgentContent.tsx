import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCrewMember } from "@/config/agents";
import { useQuery } from "@tanstack/react-query";
import { PlayCircle, AlertCircle, CheckCircle2, Clock, Wrench, Loader2 } from "lucide-react";
import { useSiteContext } from "@/hooks/useSiteContext";

interface AgentData {
  ok: boolean;
  agentId: string;
  score: number;
  findings: { label: string; value: string; severity: string; category: string }[] | null;
  nextSteps: { step: number; action: string }[] | null;
  lastRun: {
    runId: string;
    status: string;
    durationMs: number;
    summary: string;
    createdAt: string;
  } | null;
  suggestionsCount: number;
  findingsCount: number;
  isRealData: boolean;
}

interface GenericAgentContentProps {
  agentId: string;
}

export default function GenericAgentContent({ agentId }: GenericAgentContentProps) {
  const crew = getCrewMember(agentId);
  const { activeSite } = useSiteContext();
  const siteId = activeSite?.id || "default";

  const { data, isLoading } = useQuery<AgentData>({
    queryKey: ['agent-data', agentId, siteId],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${agentId}/data?site_id=${siteId}`);
      if (!res.ok) throw new Error('Failed to fetch agent data');
      return res.json();
    },
    refetchInterval: 60000,
  });

  const findings = data?.findings || [];
  const nextSteps = data?.nextSteps || [];
  const hasRealData = data?.isRealData ?? false;

  return (
    <div className="space-y-6">
      {!hasRealData && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
            No Data
          </Badge>
          <span className="text-sm text-muted-foreground">
            Run this agent or wait for webhook findings to populate this dashboard.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-semantic-success" />
              Recent Findings
            </CardTitle>
            <CardDescription>
              What {crew.nickname} has discovered
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : findings.length > 0 ? (
              <div className="space-y-3">
                {findings.map((finding, i) => (
                  <div 
                    key={i} 
                    className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                  >
                    <span className="text-sm text-muted-foreground">{finding.label}</span>
                    <Badge 
                      variant="secondary"
                      className={
                        finding.severity === 'critical' ? 'bg-red-500/20 text-red-600' :
                        finding.severity === 'high' ? 'bg-amber-500/20 text-amber-600' :
                        'bg-blue-500/20 text-blue-600'
                      }
                    >
                      {finding.value}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No findings yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Run this agent to start collecting data
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-semantic-info" />
              Next Steps
            </CardTitle>
            <CardDescription>
              Recommended actions from {crew.nickname}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : nextSteps.length > 0 ? (
              <ol className="space-y-3">
                {nextSteps.map((step) => (
                  <li 
                    key={step.step}
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <span 
                      className="flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
                      style={{ backgroundColor: `${crew.color}15`, color: crew.color }}
                    >
                      {step.step}
                    </span>
                    <span className="text-sm">{step.action}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Wrench className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No recommendations yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Configure and run this agent first
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PlayCircle className="w-5 h-5" />
            Agent Controls
          </CardTitle>
          <CardDescription>
            Run diagnostics and configure {crew.nickname}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button data-testid="button-run-agent">
              <PlayCircle className="w-4 h-4 mr-2" />
              Run Now
            </Button>
            <Button variant="outline" data-testid="button-view-history">
              View History
            </Button>
            <Button variant="outline" data-testid="button-configure-agent">
              Configure
            </Button>
          </div>
          
          {data?.lastRun && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-medium mb-3">Last Run</h4>
              <div className="flex items-center gap-4 text-sm">
                <Badge variant={data.lastRun.status === 'success' ? 'default' : 'destructive'}>
                  {data.lastRun.status}
                </Badge>
                <span className="text-muted-foreground">
                  {new Date(data.lastRun.createdAt).toLocaleString()}
                </span>
                <span className="text-muted-foreground">
                  {data.lastRun.durationMs}ms
                </span>
              </div>
              {data.lastRun.summary && (
                <p className="text-sm text-muted-foreground mt-2">{data.lastRun.summary}</p>
              )}
            </div>
          )}
          
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-medium mb-3">Service Endpoints</h4>
            {crew.endpoints && crew.endpoints.length > 0 ? (
              <div className="space-y-2">
                {crew.endpoints.map((endpoint, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <Badge 
                      variant="outline" 
                      className={endpoint.method === 'GET' ? 'bg-semantic-success-soft text-semantic-success' : 'bg-semantic-info-soft text-semantic-info'}
                    >
                      {endpoint.method}
                    </Badge>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{endpoint.path}</code>
                    <Badge variant="secondary" className="text-xs">
                      {endpoint.auth === 'none' ? 'Public' : 'API Key'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No endpoints configured</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
