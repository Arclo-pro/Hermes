import { getCrewMember } from "@/config/agents";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import type { AgentFinding, AgentNextStep } from "@shared/agentInsight";

interface AgentCardProps {
  serviceId: string;
  status?: "healthy" | "degraded" | "down" | "disabled" | "unknown";
  lastCheckIn?: string | null;
  findings?: AgentFinding[];
  nextSteps?: AgentNextStep[];
  className?: string;
  onClick?: () => void;
}

const STATUS_CONFIG = {
  healthy: { label: "Healthy", color: "bg-green-50 text-green-600 border-green-200", icon: CheckCircle },
  degraded: { label: "Needs Attention", color: "bg-amber-50 text-amber-600 border-amber-200", icon: AlertTriangle },
  down: { label: "Down", color: "bg-red-50 text-red-600 border-red-200", icon: XCircle },
  disabled: { label: "Disabled", color: "bg-gray-50 text-gray-500 border-gray-200", icon: Clock },
  unknown: { label: "Unknown", color: "bg-gray-50 text-gray-500 border-gray-200", icon: Clock },
};

const DEFAULT_NEXT_STEPS: AgentNextStep[] = [
  { step: 1, action: "Connect required credentials" },
  { step: 2, action: "Run first scan" },
  { step: 3, action: "Review results after completion" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">
      {children}
    </p>
  );
}

function SectionDivider() {
  return <div className="border-t border-muted/40" />;
}

export function AgentCard({ 
  serviceId, 
  status = "unknown", 
  lastCheckIn, 
  findings = [],
  nextSteps,
  className, 
  onClick 
}: AgentCardProps) {
  const crew = getCrewMember(serviceId);
  const Icon = crew.icon;
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  const displayFindings = findings.slice(0, 3);
  const displaySteps = nextSteps && nextSteps.length > 0 ? nextSteps : DEFAULT_NEXT_STEPS;

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all shadow-sm hover:shadow-md rounded-xl border-l-2",
        onClick && "cursor-pointer",
        className
      )}
      style={{ borderLeftColor: `${crew.color}80` }}
      onClick={onClick}
      data-testid={`agent-card-${serviceId}`}
    >
      <CardHeader className="pb-4 pt-5 px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${crew.color}15` }}
            >
              <Icon className="w-4 h-4" style={{ color: crew.color }} />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight" style={{ color: crew.color }}>
                {crew.nickname}
              </h3>
              <p className="text-xs text-muted-foreground/80">{crew.role}</p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={cn("flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1", statusConfig.color)}
          >
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-0 space-y-5">
        {crew.watchDescription && (
          <>
            <div>
              <SectionLabel>What I watch</SectionLabel>
              <p className="text-sm text-foreground/90 leading-relaxed">{crew.watchDescription}</p>
            </div>
            <SectionDivider />
          </>
        )}

        <div>
          <SectionLabel>What I found</SectionLabel>
          {displayFindings.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {displayFindings.map((finding, i) => (
                <div key={i} className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">{finding.label}</span>
                  <span className="text-sm font-medium text-foreground">{finding.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/70 italic">No data collected yet</p>
          )}
        </div>

        <SectionDivider />

        <div className="flex items-baseline justify-between">
          <SectionLabel>Last checked</SectionLabel>
          <p className="text-sm text-foreground/80">{lastCheckIn || "Never"}</p>
        </div>

        <SectionDivider />

        <div>
          <SectionLabel>Next steps</SectionLabel>
          <ol className="space-y-2.5">
            {displaySteps.slice(0, 3).map((step) => (
              <li key={step.step} className="flex items-start gap-2.5">
                <span 
                  className="flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-semibold flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: `${crew.color}12`, color: crew.color }}
                >
                  {step.step}
                </span>
                <span className="text-sm text-foreground/90 leading-relaxed">{step.action}</span>
              </li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
