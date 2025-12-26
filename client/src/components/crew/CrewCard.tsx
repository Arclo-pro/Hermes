import { getCrewMember, type CrewMember } from "@/config/crewManifest";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";

interface CrewCardProps {
  serviceId: string;
  status?: "healthy" | "degraded" | "down" | "disabled" | "unknown";
  lastCheckIn?: string | null;
  className?: string;
  onClick?: () => void;
}

const STATUS_CONFIG = {
  healthy: { label: "Healthy", color: "bg-green-100 text-green-700", icon: CheckCircle },
  degraded: { label: "Degraded", color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle },
  down: { label: "Down", color: "bg-red-100 text-red-700", icon: XCircle },
  disabled: { label: "Disabled", color: "bg-gray-100 text-gray-500", icon: Clock },
  unknown: { label: "Unknown", color: "bg-gray-100 text-gray-500", icon: Clock },
};

export function CrewCard({ serviceId, status = "unknown", lastCheckIn, className, onClick }: CrewCardProps) {
  const crew = getCrewMember(serviceId);
  const Icon = crew.icon;
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all hover:shadow-md cursor-pointer",
        className
      )}
      style={{ borderLeftColor: crew.color, borderLeftWidth: 4 }}
      onClick={onClick}
      data-testid={`crew-card-${serviceId}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${crew.color}20` }}
            >
              <Icon className="w-6 h-6" style={{ color: crew.color }} />
            </div>
            <div>
              <CardTitle className="text-lg" style={{ color: crew.color }}>
                {crew.nickname}
              </CardTitle>
              <CardDescription className="text-sm">{crew.role}</CardDescription>
            </div>
          </div>
          <Badge className={cn("flex items-center gap-1", statusConfig.color)}>
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {crew.blurb && (
          <p className="text-sm text-muted-foreground mb-3">{crew.blurb}</p>
        )}
        
        {crew.capabilities && crew.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {crew.capabilities.map((cap) => (
              <Badge key={cap} variant="outline" className="text-xs">
                {cap}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{serviceId}</code>
          {lastCheckIn && (
            <span>Last seen: {lastCheckIn}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CrewCardCompact({ serviceId, status = "unknown", showServiceId = true }: { 
  serviceId: string; 
  status?: "healthy" | "degraded" | "down" | "disabled" | "unknown";
  showServiceId?: boolean;
}) {
  const crew = getCrewMember(serviceId);
  const Icon = crew.icon;
  const statusConfig = STATUS_CONFIG[status];

  return (
    <div 
      className="flex items-center gap-3 p-2"
      data-testid={`crew-card-compact-${serviceId}`}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${crew.color}20`, borderColor: crew.color, borderWidth: 1 }}
      >
        <Icon className="w-4 h-4" style={{ color: crew.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm" style={{ color: crew.color }}>
            {crew.nickname}
          </span>
          <span className="text-xs text-muted-foreground">{crew.role}</span>
        </div>
        {showServiceId && (
          <code className="text-xs font-mono text-muted-foreground">{serviceId}</code>
        )}
      </div>
      <Badge className={cn("text-xs", statusConfig.color)}>
        {statusConfig.label}
      </Badge>
    </div>
  );
}
