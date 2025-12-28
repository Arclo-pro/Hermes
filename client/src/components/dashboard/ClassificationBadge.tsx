import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, TrendingDown, Eye, Layers, HelpCircle, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const classificationConfig: Record<string, { 
  label: string; 
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = {
  VISIBILITY_LOSS: {
    label: 'Visibility Loss',
    description: 'Impressions are down - pages may not be appearing in search results',
    icon: Eye,
    color: 'bg-semantic-danger',
  },
  CTR_LOSS: {
    label: 'CTR Loss',
    description: 'Impressions stable but clicks down - snippets may need optimization',
    icon: TrendingDown,
    color: 'bg-semantic-warning',
  },
  PAGE_CLUSTER_REGRESSION: {
    label: 'Cluster Regression',
    description: 'Traffic loss concentrated in a specific section of the site',
    icon: Layers,
    color: 'bg-gold',
  },
  TRACKING_OR_ATTRIBUTION_GAP: {
    label: 'Tracking Gap',
    description: 'GA4 sessions down but search traffic stable - likely a tracking issue',
    icon: AlertTriangle,
    color: 'bg-purple-accent',
  },
  INCONCLUSIVE: {
    label: 'Inconclusive',
    description: 'No significant issues detected or insufficient data',
    icon: HelpCircle,
    color: 'bg-muted-foreground',
  },
};

const confidenceColors: Record<string, string> = {
  high: 'bg-semantic-success-soft text-semantic-success',
  medium: 'bg-semantic-warning-soft text-semantic-warning',
  low: 'bg-muted text-muted-foreground',
};

export function ClassificationBadge() {
  const { data: latestRun, isLoading, isError } = useQuery({
    queryKey: ['latest-run'],
    queryFn: async () => {
      const res = await fetch('/api/run/latest');
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch latest run');
      }
      return res.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center animate-pulse">
            <Activity className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
            <div className="h-3 bg-muted rounded w-48 mt-2 animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !latestRun) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Activity className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">No diagnostics run yet</p>
            <p className="text-xs text-muted-foreground">Run diagnostics to see classification</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const classification = latestRun.primaryClassification || 'INCONCLUSIVE';
  const confidence = latestRun.confidenceOverall || 'low';
  const config = classificationConfig[classification] || classificationConfig.INCONCLUSIVE;
  const Icon = config.icon;

  return (
    <Card data-testid="classification-card">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold" data-testid="classification-label">{config.label}</h3>
              <Badge 
                variant="secondary" 
                className={confidenceColors[confidence]}
                data-testid="confidence-badge"
              >
                {confidence} confidence
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1" data-testid="classification-description">
              {config.description}
            </p>
            {latestRun.summary && (
              <p className="text-sm mt-2 font-medium" data-testid="run-summary">
                {latestRun.summary}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Last run: {new Date(latestRun.finishedAt || latestRun.startedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
