import { getCrewMember } from "@/config/agents";
import { GlassCard, GlassCardContent, GlassCardHeader } from "@/components/ui/GlassCard";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { prefetchCrewStatus } from "@/lib/queryClient";
import { useSiteContext } from "@/hooks/useSiteContext";
import type { AgentFinding, AgentNextStep } from "@shared/agentInsight";
import { SERVICE_TO_CREW } from "@shared/registry";
import { UnlockOverlay } from "@/components/overlays";
import { colors, buttonStyles } from "@/lib/design-system";

interface AgentCardProps {
  serviceId: string;
  score?: number;
  lastCheckIn?: string | null;
  findings?: AgentFinding[];
  nextSteps?: AgentNextStep[];
  className?: string;
  onClick?: () => void;
  isSubscribed?: boolean;
  onToggleSubscribe?: () => void;
}

const DEFAULT_NEXT_STEPS: AgentNextStep[] = [
  { step: 1, action: "Connect required credentials" },
  { step: 2, action: "Run first scan" },
  { step: 3, action: "Review results after completion" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
      style={{ color: colors.text.disabled }}
    >
      {children}
    </p>
  );
}


export function AgentCard({ 
  serviceId, 
  score = 0,
  lastCheckIn, 
  findings = [],
  nextSteps,
  className, 
  onClick,
  isSubscribed,
  onToggleSubscribe
}: AgentCardProps) {
  const { currentSite } = useSiteContext();
  const crew = getCrewMember(serviceId);
  const Icon = crew.icon;

  const displayFindings = findings.slice(0, 3);
  const displaySteps = nextSteps && nextSteps.length > 0 ? nextSteps : DEFAULT_NEXT_STEPS;

  const handleMouseEnter = () => {
    if (currentSite?.siteId) {
      const crewId = SERVICE_TO_CREW[serviceId as keyof typeof SERVICE_TO_CREW] || serviceId;
      prefetchCrewStatus(currentSite.siteId, crewId);
    }
  };

  const showSubscribeButton = onToggleSubscribe !== undefined;
  const isActive = isSubscribed !== false;

  const showUnlockOverlay = showSubscribeButton && !isSubscribed;

  return (
    <GlassCard
      variant="marketing"
      className={cn(
        "agent-card relative overflow-hidden transition-all",
        !isActive && "opacity-60",
        onClick && !showUnlockOverlay && "cursor-pointer hover:shadow-lg",
        className
      )}
      style={{
        borderColor: crew.color,
        borderStyle: isActive ? "solid" : "dashed",
      }}
      onClick={showUnlockOverlay ? undefined : onClick}
      onMouseEnter={handleMouseEnter}
      data-testid={`agent-card-${serviceId}`}
    >
      <GlassCardHeader className={cn("pb-3 pt-4 px-5", showUnlockOverlay && "blur-sm")}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {crew.avatar ? (
              <img
                src={crew.avatar}
                alt={crew.nickname}
                className="w-12 h-12 object-contain flex-shrink-0"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${crew.color}15` }}
              >
                <Icon className="w-6 h-6" style={{ color: crew.color }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3
                  className="font-medium text-base leading-tight"
                  style={{ color: colors.text.primary }}
                >
                  {crew.nickname}
                </h3>
                {crew.tooltipInfo && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="transition-colors hover:opacity-70"
                          style={{ color: colors.text.muted }}
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`button-tooltip-${serviceId}`}
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs p-3">
                        <div className="space-y-2">
                          <div>
                            <p className="font-semibold" style={{ color: crew.color }}>{crew.nickname}</p>
                            <p className="text-xs" style={{ color: colors.text.muted }}>{crew.role}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium mb-1" style={{ color: colors.text.primary }}>What it does</p>
                            <p className="text-xs" style={{ color: colors.text.muted }}>{crew.tooltipInfo.whatItDoes}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium mb-1" style={{ color: colors.text.primary }}>What it outputs</p>
                            <ul className="text-xs space-y-0.5" style={{ color: colors.text.muted }}>
                              {crew.tooltipInfo.outputs.map((output, i) => (
                                <li key={i} className="flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-current" />
                                  {output}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <p className="text-xs" style={{ color: colors.text.secondary }}>{crew.role}</p>
              {crew.shortDescription && (
                <p className="text-xs truncate mt-0.5" style={{ color: colors.text.muted }}>{crew.shortDescription}</p>
              )}
              {!isActive && (
                <p className="text-xs mt-1" style={{ color: colors.text.muted }}>Not active</p>
              )}
            </div>
          </div>
          {showSubscribeButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSubscribe();
              }}
              className={cn(
                buttonStyles.secondary.base,
                "px-3 py-1.5 text-xs font-medium rounded-xl flex-shrink-0"
              )}
              style={isSubscribed ? {
                background: "transparent",
                border: `1px solid ${colors.border.default}`,
                color: colors.text.secondary,
              } : {
                background: colors.brand.purple,
                color: "#FFFFFF",
              }}
              data-testid={`button-subscribe-${serviceId}`}
            >
              {isSubscribed ? "Unsubscribe" : "Subscribe"}
            </button>
          )}
        </div>
      </GlassCardHeader>

      <GlassCardContent className={cn("px-5 pb-5 pt-0", showUnlockOverlay && "blur-sm")}>
        {crew.watchDescription && (
          <div className="mb-4">
            <SectionLabel>What I watch</SectionLabel>
            <p className="text-sm" style={{ color: colors.text.primary }}>{crew.watchDescription}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <SectionLabel>What I found</SectionLabel>
            {displayFindings.length > 0 ? (
              <div className="space-y-1.5">
                {displayFindings.map((finding, i) => (
                  <div key={i} className="flex justify-between items-baseline gap-2">
                    <span className="text-sm" style={{ color: colors.text.muted }}>{finding.label}</span>
                    <span className="text-sm font-medium tabular-nums" style={{ color: colors.text.primary }}>{finding.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic" style={{ color: colors.text.muted }}>No data yet</p>
            )}
          </div>

          <div>
            <SectionLabel>Last checked</SectionLabel>
            <p className="text-sm mb-4" style={{ color: colors.text.primary }}>{lastCheckIn || "Never"}</p>

            <SectionLabel>Next steps</SectionLabel>
            <ol className="space-y-1.5">
              {displaySteps.slice(0, 3).map((step) => (
                <li key={step.step} className="flex items-start gap-2">
                  <span
                    className="flex-shrink-0 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: `${crew.color}20`, color: crew.color }}
                  >
                    {step.step}
                  </span>
                  <span className="text-sm leading-snug" style={{ color: colors.text.primary }}>{step.action}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </GlassCardContent>

      {showUnlockOverlay && (
        <UnlockOverlay
          feature={crew.role}
          description={crew.shortDescription}
          onUnlock={() => {
            console.log(`Unlock requested for: ${crew.nickname} (${serviceId})`);
            onToggleSubscribe?.();
          }}
        />
      )}
    </GlassCard>
  );
}
