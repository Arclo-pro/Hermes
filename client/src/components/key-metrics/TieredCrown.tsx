import { cn } from "@/lib/utils";

type CrownTier = "top1" | "top3" | "top10" | "default";

const tierColors: Record<CrownTier, string> = {
  top1: "#D4AF37",
  top3: "#C0C0C0",
  top10: "#CD7F32",
  default: "#E48FAE",
};

interface TieredCrownProps {
  tier: CrownTier;
  className?: string;
  size?: number;
}

export function TieredCrown({ tier, className, size = 20 }: TieredCrownProps) {
  const color = tierColors[tier] || tierColors.default;
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={cn("shrink-0", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M2.5 19h19v2h-19v-2zm19-11l-3.5 5L12 7l-6 6-3.5-5L0 19h24l-2.5-11z" />
    </svg>
  );
}

export { tierColors };
export type { CrownTier };
