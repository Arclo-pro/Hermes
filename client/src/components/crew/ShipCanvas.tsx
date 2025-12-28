import { cn } from "@/lib/utils";
import { getCrewMember, USER_FACING_AGENTS } from "@/config/agents";
import { Badge } from "@/components/ui/badge";

interface ShipCanvasProps {
  enabledAgents: string[];
  selectedAgents: string[];
  onSlotClick: (roleId: string) => void;
}

type CompartmentPosition = {
  gridArea: string;
};

const COMPARTMENT_LAYOUT: Record<string, CompartmentPosition> = {
  content_decay: { gridArea: "top" },
  competitive_snapshot: { gridArea: "upperleft" },
  serp_intel: { gridArea: "upperright" },
  backlink_authority: { gridArea: "center" },
  seo_kbase: { gridArea: "midleft" },
  google_data_connector: { gridArea: "midright" },
  crawl_render: { gridArea: "lowerleft" },
  core_web_vitals: { gridArea: "lowerright" },
  content_generator: { gridArea: "bottomleft" },
  google_ads_connector: { gridArea: "bottomright" },
};

function Compartment({
  agentId,
  isEnabled,
  isSelected,
  gridArea,
  onClick,
}: {
  agentId: string;
  isEnabled: boolean;
  isSelected: boolean;
  gridArea: string;
  onClick: () => void;
}) {
  const crew = getCrewMember(agentId);
  const state = isEnabled ? "enabled" : isSelected ? "selected" : "empty";

  return (
    <button
      onClick={onClick}
      data-testid={`ship-compartment-${agentId}`}
      className={cn(
        "relative flex flex-col items-center justify-center p-3 transition-all duration-300",
        "rounded-2xl cursor-pointer",
        "bg-gradient-to-b backdrop-blur-sm",
        state === "enabled" && [
          "from-surface-2 to-surface-3",
          "border-2 border-gold",
          "shadow-gold",
        ],
        state === "selected" && [
          "from-surface-1 to-surface-2",
          "border-2 border-semantic-info-border",
          "shadow-[0_0_12px_var(--color-semantic-info-soft)]",
        ],
        state === "empty" && [
          "from-surface-1 to-muted",
          "border border-border",
          "hover:border-muted-foreground hover:from-surface-2",
        ]
      )}
      style={{ gridArea }}
    >
      <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center mb-1">
        {crew.avatar ? (
          <img
            src={crew.avatar}
            alt={crew.nickname}
            className={cn(
              "w-full h-full object-contain transition-all duration-300",
              state === "enabled" && "opacity-100 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]",
              state === "selected" && "opacity-65",
              state === "empty" && "opacity-25 grayscale"
            )}
          />
        ) : (
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
              state === "enabled" ? "bg-gold-soft text-gold" :
              state === "selected" ? "bg-semantic-info-soft text-semantic-info" :
              "bg-muted text-muted-foreground"
            )}
          >
            {crew.nickname.charAt(0)}
          </div>
        )}
      </div>

      <span
        className={cn(
          "text-[11px] sm:text-xs font-semibold text-center leading-tight",
          state === "enabled" ? "text-gold" :
          state === "selected" ? "text-semantic-info" :
          "text-muted-foreground"
        )}
      >
        {crew.nickname}
      </span>
      <span className="text-[9px] sm:text-[10px] text-muted-foreground text-center leading-tight">
        {crew.role}
      </span>

      {state === "enabled" && (
        <Badge className="absolute -top-2 -right-2 bg-gold text-background text-[9px] px-2 py-0.5 border-0 font-semibold shadow-lg">
          Active
        </Badge>
      )}
      {state === "selected" && (
        <Badge className="absolute -top-2 -right-2 bg-semantic-info text-background text-[9px] px-2 py-0.5 border-0 font-semibold shadow-lg">
          Selected
        </Badge>
      )}
    </button>
  );
}

export function ShipCanvas({ enabledAgents, selectedAgents, onSlotClick }: ShipCanvasProps) {
  return (
    <div className="relative w-full min-h-[500px] sm:min-h-[560px]">
      {/* SVG ship hull background */}
      <svg
        viewBox="0 0 400 560"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="hullGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
            <stop offset="40%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
          </linearGradient>
          <linearGradient id="cockpitGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(56,189,248,0.4)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0.1)" />
          </linearGradient>
          <radialGradient id="engineGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.95)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </radialGradient>
          <linearGradient id="highlightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="40%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* Main hull shape */}
        <path
          d="M 200 15
             C 320 15, 370 50, 385 100
             L 395 200
             C 400 280, 400 380, 395 460
             L 375 510
             C 340 545, 270 555, 200 555
             C 130 555, 60 545, 25 510
             L 5 460
             C 0 380, 0 280, 5 200
             L 15 100
             C 30 50, 80 15, 200 15
             Z"
          fill="url(#hullGradient)"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1.5"
        />
        
        {/* Top-left hull highlight */}
        <ellipse cx="120" cy="120" rx="80" ry="60" fill="url(#highlightGradient)" opacity="0.6" />

        {/* Cockpit dome at top */}
        <ellipse cx="200" cy="35" rx="60" ry="18" fill="url(#cockpitGradient)" />
        <ellipse cx="200" cy="32" rx="45" ry="12" fill="rgba(56,189,248,0.25)" />
        <ellipse cx="200" cy="30" rx="25" ry="6" fill="rgba(255,255,255,0.2)" />

        {/* Subtle internal panel lines */}
        <line x1="50" y1="100" x2="350" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <line x1="30" y1="200" x2="370" y2="200" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        <line x1="30" y1="330" x2="370" y2="330" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        <line x1="50" y1="460" x2="350" y2="460" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <line x1="200" y1="70" x2="200" y2="500" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />

        {/* Engine bay at bottom */}
        <path
          d="M120 530 L150 560 L250 560 L280 530"
          fill="rgba(30,41,59,0.95)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />
        <rect x="140" y="540" width="120" height="12" rx="3" fill="rgba(15,23,42,0.9)" />

        {/* Engine glow effects */}
        <circle cx="165" cy="550" r="8" fill="url(#engineGlow)" />
        <circle cx="200" cy="553" r="10" fill="url(#engineGlow)" />
        <circle cx="235" cy="550" r="8" fill="url(#engineGlow)" />
        
        {/* Small thruster accent dots */}
        <circle cx="152" cy="545" r="3" fill="rgba(34,211,238,0.7)" />
        <circle cx="248" cy="545" r="3" fill="rgba(34,211,238,0.7)" />
      </svg>

      {/* Compartments grid overlaid on hull */}
      <div
        className="absolute inset-0 p-4 sm:p-6"
        style={{
          clipPath: `polygon(
            50% 3%,
            85% 6%, 95% 18%,
            98% 35%, 100% 50%, 98% 75%,
            92% 90%, 80% 97%,
            50% 99%,
            20% 97%, 8% 90%,
            2% 75%, 0% 50%, 2% 35%,
            5% 18%, 15% 6%
          )`,
        }}
      >
        <div
          className="h-full w-full pt-[8%] pb-[6%] px-[6%]"
          style={{
            display: "grid",
            gridTemplateAreas: `
              ". top ."
              "upperleft . upperright"
              "midleft center midright"
              "lowerleft . lowerright"
              "bottomleft . bottomright"
            `,
            gridTemplateColumns: "1fr 1.2fr 1fr",
            gridTemplateRows: "0.85fr 1fr 1fr 1fr 0.85fr",
            gap: "6px",
          }}
        >
          {USER_FACING_AGENTS.map((agentId) => {
            const position = COMPARTMENT_LAYOUT[agentId];
            if (!position) return null;

            const isEnabled = enabledAgents.includes(agentId);
            const isSelected = selectedAgents.includes(agentId);

            return (
              <Compartment
                key={agentId}
                agentId={agentId}
                isEnabled={isEnabled}
                isSelected={isSelected}
                gridArea={position.gridArea}
                onClick={() => onSlotClick(agentId)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
