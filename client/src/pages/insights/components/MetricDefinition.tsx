/**
 * MetricDefinition - "What it means" section for the breakdown page
 */

import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { BookOpen } from "lucide-react";

interface MetricDefinitionProps {
  definition: string;
}

export function MetricDefinition({ definition }: MetricDefinitionProps) {
  return (
    <GlassCard variant="marketing">
      <GlassCardHeader className="pb-3">
        <GlassCardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="w-5 h-5" style={{ color: "#7c3aed" }} />
          What it means
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <p className="text-sm leading-relaxed" style={{ color: "#475569" }}>
          {definition}
        </p>
      </GlassCardContent>
    </GlassCard>
  );
}
