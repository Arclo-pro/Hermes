export interface CaptainPriority {
  rank: 1 | 2 | 3;
  title: string;
  why: string;
  impact: "High" | "Medium" | "Low";
  effort: "S" | "M" | "L";
  agents: { id: string; name: string }[];
  cta: { label: string; anchor: string };
}

export interface CaptainBlocker {
  id: string;
  title: string;
  fix: string;
}

export interface CaptainsCoverage {
  active: number;
  total: number;
  blocked: number;
}

export interface CaptainsRecommendations {
  generated_at: string;
  contributing_agents: string[];
  coverage: CaptainsCoverage;
  priorities: CaptainPriority[];
  blockers: CaptainBlocker[];
  confidence: "High" | "Medium" | "Low";
}
