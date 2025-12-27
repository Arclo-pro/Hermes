import { getCrewMember } from "@/config/agents";
import { cn } from "@/lib/utils";

interface CrewBadgeProps {
  serviceId: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function CrewBadge({ serviceId, size = "md", showLabel = false, className }: CrewBadgeProps) {
  const crew = getCrewMember(serviceId);
  const Icon = crew.icon;
  
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };
  
  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "rounded-full flex items-center justify-center",
          sizeClasses[size]
        )}
        style={{ backgroundColor: `${crew.color}20`, borderColor: crew.color, borderWidth: 2 }}
        data-testid={`crew-badge-${serviceId}`}
      >
        <Icon className={iconSizes[size]} style={{ color: crew.color }} />
      </div>
      {showLabel && (
        <span className="font-medium text-sm" style={{ color: crew.color }}>
          {crew.nickname}
        </span>
      )}
    </div>
  );
}
