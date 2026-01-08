import { LucideIcon } from "lucide-react";

interface IconBadgeProps {
  icon: LucideIcon;
  size?: "sm" | "md" | "lg";
}

export function IconBadge({ icon: Icon, size = "lg" }: IconBadgeProps) {
  const sizeClasses = {
    sm: "w-14 h-14 p-3",
    md: "w-18 h-18 p-4",
    lg: "w-24 h-24 p-5",
  };

  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-12 h-12",
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-2xl shadow-[0_8px_24px_rgba(124,58,237,0.12)] flex items-center justify-center`}
      style={{
        background: "linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(34, 197, 94, 0.12), rgba(6, 182, 212, 0.08))",
        border: "1px solid rgba(124, 58, 237, 0.15)",
      }}
    >
      <Icon className={`${iconSizes[size]} text-[#0F172A]`} strokeWidth={2} />
    </div>
  );
}
