export const brand = {
  primary: {
    DEFAULT: "hsl(320 80% 58%)",
    subtle: "hsl(320 80% 58% / 0.15)",
    muted: "hsl(320 80% 58% / 0.08)",
  },
  accentBlue: {
    DEFAULT: "hsl(210 90% 55%)",
    subtle: "hsl(210 90% 55% / 0.15)",
    muted: "hsl(210 90% 55% / 0.08)",
  },
  accentCyan: {
    DEFAULT: "hsl(185 85% 50%)",
    subtle: "hsl(185 85% 50% / 0.15)",
    muted: "hsl(185 85% 50% / 0.08)",
  },
  accentViolet: {
    DEFAULT: "hsl(270 70% 55%)",
    subtle: "hsl(270 70% 55% / 0.15)",
    muted: "hsl(270 70% 55% / 0.08)",
  },
  accentAmber: {
    DEFAULT: "hsl(35 95% 55%)",
    subtle: "hsl(35 95% 55% / 0.15)",
    muted: "hsl(35 95% 55% / 0.08)",
  },
  accentGreen: {
    DEFAULT: "hsl(155 75% 45%)",
    subtle: "hsl(155 75% 45% / 0.15)",
    muted: "hsl(155 75% 45% / 0.08)",
  },
} as const;

export const semantic = {
  good: brand.accentGreen,
  watch: brand.accentAmber,
  alert: {
    DEFAULT: "hsl(0 70% 55%)",
    subtle: "hsl(0 70% 55% / 0.15)",
    muted: "hsl(0 70% 55% / 0.08)",
  },
  info: brand.accentBlue,
  progress: brand.accentCyan,
} as const;

export const charts = {
  traffic: brand.accentBlue.DEFAULT,
  conversions: brand.accentGreen.DEFAULT,
  engagement: brand.accentAmber.DEFAULT,
  authority: brand.accentViolet.DEFAULT,
  performance: brand.accentCyan.DEFAULT,
} as const;

export const agentColors: Record<string, string> = {
  google_data_connector: brand.accentBlue.DEFAULT,
  serp_intel: brand.accentViolet.DEFAULT,
  competitive_snapshot: brand.accentAmber.DEFAULT,
  crawl_render: brand.accentCyan.DEFAULT,
  content_generator: brand.accentGreen.DEFAULT,
  core_web_vitals: brand.primary.DEFAULT,
} as const;

export type BrandColor = typeof brand;
export type SemanticColor = typeof semantic;
