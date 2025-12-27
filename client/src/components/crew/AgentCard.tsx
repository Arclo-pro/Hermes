import { getCrewMember, type CrewMember } from "@/config/crewManifest";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertTriangle, Clock, ArrowRight } from "lucide-react";

interface AgentCardProps {
  serviceId: string;
  status?: "healthy" | "degraded" | "down" | "disabled" | "unknown";
  lastCheckIn?: string | null;
  findings?: string[];
  recommendation?: string;
  className?: string;
  onClick?: () => void;
}

const STATUS_CONFIG = {
  healthy: { label: "Healthy", color: "bg-green-100 text-green-700", icon: CheckCircle },
  degraded: { label: "Needs Attention", color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle },
  down: { label: "Down", color: "bg-red-100 text-red-700", icon: XCircle },
  disabled: { label: "Disabled", color: "bg-gray-100 text-gray-500", icon: Clock },
  unknown: { label: "Unknown", color: "bg-gray-100 text-gray-500", icon: Clock },
};

export function AgentCard({ 
  serviceId, 
  status = "unknown", 
  lastCheckIn, 
  findings = [],
  recommendation,
  className, 
  onClick 
}: AgentCardProps) {
  const crew = getCrewMember(serviceId);
  const Icon = crew.icon;
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  const hasFindings = findings.length > 0;
  const hasRecommendation = recommendation && recommendation.length > 0;

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all hover:shadow-md",
        onClick && "cursor-pointer",
        className
      )}
      style={{ borderLeftColor: crew.color, borderLeftWidth: 4 }}
      onClick={onClick}
      data-testid={`agent-card-${serviceId}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${crew.color}20` }}
            >
              <Icon className="w-5 h-5" style={{ color: crew.color }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: crew.color }}>
                {crew.nickname}
              </h3>
              <p className="text-xs text-muted-foreground">{crew.role}</p>
            </div>
          </div>
          <Badge className={cn("flex items-center gap-1 text-xs", statusConfig.color)}>
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {crew.watchDescription && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">What I watch</p>
            <p className="text-sm">{crew.watchDescription}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">What I found</p>
          {hasFindings ? (
            <ul className="text-sm space-y-1">
              {findings.slice(0, 3).map((finding, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">No findings yet</p>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Recommendation</p>
          {hasRecommendation ? (
            <p className="text-sm flex items-start gap-2">
              <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>{recommendation}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Keep monitoring</p>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>Last checked</span>
          <span>{lastCheckIn || "Never"}</span>
        </div>
      </CardContent>
    </Card>
  );
}
