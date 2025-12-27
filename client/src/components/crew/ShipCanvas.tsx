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
          "from-slate-600/90 to-slate-700/95",
          "border-2 border-amber-400/80",
          "shadow-[0_0_20px_rgba(251,191,36,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]",
        ],
        state === "selected" && [
          "from-slate-600/70 to-slate-700/80",
          "border-2 border-sky-400/70",
          "shadow-[0_0_12px_rgba(56,189,248,0.3)]",
        ],
        state === "empty" && [
          "from-slate-700/50 to-slate-800/60",
          "border border-slate-500/40",
          "hover:border-slate-400/60 hover:from-slate-600/60",
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
              state === "enabled" ? "bg-amber-500/40 text-amber-200" :
              state === "selected" ? "bg-sky-500/40 text-sky-200" :
              "bg-slate-600/50 text-slate-400"
            )}
          >
            {crew.nickname.charAt(0)}
          </div>
        )}
      </div>

      <span
        className={cn(
          "text-[11px] sm:text-xs font-semibold text-center leading-tight",
          state === "enabled" ? "text-amber-100" :
          state === "selected" ? "text-sky-100" :
          "text-slate-300"
        )}
      >
        {crew.nickname}
      </span>
      <span className="text-[9px] sm:text-[10px] text-slate-400 text-center leading-tight">
        {crew.role}
      </span>

      {state === "enabled" && (
        <Badge className="absolute -top-2 -right-2 bg-amber-500 text-amber-950 text-[9px] px-2 py-0.5 border-0 font-semibold shadow-lg">
          Active
        </Badge>
      )}
      {state === "selected" && (
        <Badge className="absolute -top-2 -right-2 bg-sky-500 text-sky-950 text-[9px] px-2 py-0.5 border-0 font-semibold shadow-lg">
          Selected
        </Badge>
      )}
    </button>
  );
}

export function ShipCanvas({ enabledAgents, selectedAgents, onSlotClick }: ShipCanvasProps) {
  return (
    <div className="relative w-full h-full min-h-[480px] sm:min-h-[520px] p-2">
      <div
        className={cn(
          "absolute inset-0",
          "bg-gradient-to-b from-slate-600/40 via-slate-700/50 to-slate-800/60",
          "border-2 border-slate-500/50",
          "shadow-[0_0_40px_rgba(0,0,0,0.4),inset_0_2px_0_rgba(255,255,255,0.05)]"
        )}
        style={{
          borderRadius: "40% 40% 35% 35% / 8% 8% 12% 12%",
          clipPath: `polygon(
            15% 0%, 85% 0%,
            95% 3%, 100% 10%,
            100% 90%, 95% 97%,
            85% 100%, 15% 100%,
            5% 97%, 0% 90%,
            0% 10%, 5% 3%
          )`,
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(148,163,184,0.12),transparent_50%)]" />
        
        <div className="absolute top-[2%] left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.9)]" />

        <div className="absolute left-[15%] top-[15%] bottom-[15%] w-px bg-gradient-to-b from-transparent via-slate-500/25 to-transparent" />
        <div className="absolute right-[15%] top-[15%] bottom-[15%] w-px bg-gradient-to-b from-transparent via-slate-500/25 to-transparent" />
        <div className="absolute left-[20%] right-[20%] top-[50%] h-px bg-gradient-to-r from-transparent via-slate-500/25 to-transparent" />
      </div>

      <div
        className="relative h-full p-4 sm:p-6"
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
          gridTemplateRows: "1fr 1fr 1fr 1fr 1fr",
          gap: "8px",
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

      <div className="absolute bottom-[-2%] left-1/2 -translate-x-1/2 w-[25%] h-[6%]">
        <div className="w-full h-full bg-gradient-to-b from-slate-500/40 to-slate-600/30 rounded-b-full border-x border-b border-slate-500/40" />
        <div className="absolute top-1/2 left-1/3 w-2 h-2 rounded-full bg-cyan-400/70 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />
        <div className="absolute top-1/2 right-1/3 w-2 h-2 rounded-full bg-cyan-400/70 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />
      </div>
    </div>
  );
}
