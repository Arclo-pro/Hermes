import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";

interface ConnectorsStatusProps {
  authenticated?: boolean;
}

const connectors = [
  {
    name: "Google Analytics 4",
    details: "GA4 Data API"
  },
  {
    name: "Google Search Console",
    details: "Search analytics data"
  },
  {
    name: "Google Ads",
    details: "Campaign performance"
  },
  {
    name: "Website Checks",
    details: "Health monitoring",
    alwaysHealthy: true
  }
];

export function ConnectorsStatus({ authenticated }: ConnectorsStatusProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {connectors.map((connector) => {
        const isHealthy = connector.alwaysHealthy || authenticated;
        
        return (
          <div 
            key={connector.name}
            className="flex flex-col p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">{connector.name}</span>
              {isHealthy ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              )}
            </div>
            <div className="mt-auto">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <RefreshCw className="w-3 h-3" />
                {isHealthy ? 'Ready' : 'Auth Required'}
              </div>
              <p className="text-xs truncate font-mono opacity-70">{connector.details}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
