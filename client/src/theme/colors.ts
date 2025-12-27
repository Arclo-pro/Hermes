export const structural = {
  bg: {
    app: "#070A14",
    surface1: "rgba(255,255,255,0.04)",
    surface2: "rgba(255,255,255,0.07)",
    surface3: "rgba(255,255,255,0.10)",
  },
  border: {
    subtle: "rgba(255,255,255,0.10)",
    active: "rgba(255,255,255,0.20)",
  },
  text: {
    primary: "rgba(255,255,255,0.92)",
    secondary: "rgba(255,255,255,0.72)",
    muted: "rgba(255,255,255,0.48)",
  },
} as const;

export const accent = {
  primary: {
    DEFAULT: "#7C3AED",
    soft: "rgba(124,58,237,0.18)",
  },
  progress: {
    DEFAULT: "#F59E0B",
    soft: "rgba(245,158,11,0.20)",
  },
  system: {
    DEFAULT: "#38BDF8",
    soft: "rgba(56,189,248,0.20)",
  },
} as const;

export const semantic = {
  success: {
    DEFAULT: "#22C55E",
    soft: "rgba(34,197,94,0.15)",
    border: "rgba(34,197,94,0.35)",
  },
  warning: {
    DEFAULT: "#FBBF24",
    soft: "rgba(251,191,36,0.15)",
    border: "rgba(251,191,36,0.35)",
  },
  danger: {
    DEFAULT: "#EF4444",
    soft: "rgba(239,68,68,0.15)",
    border: "rgba(239,68,68,0.35)",
  },
  info: {
    DEFAULT: "#3B82F6",
    soft: "rgba(59,130,246,0.15)",
    border: "rgba(59,130,246,0.35)",
  },
  neutral: "rgba(255,255,255,0.55)",
} as const;

export const charts = {
  traffic: semantic.info.DEFAULT,
  conversions: semantic.success.DEFAULT,
  engagement: semantic.warning.DEFAULT,
  authority: accent.primary.DEFAULT,
  performance: accent.system.DEFAULT,
} as const;

export const agentColors: Record<string, string> = {
  google_data_connector: semantic.info.DEFAULT,
  serp_intel: accent.primary.DEFAULT,
  competitive_snapshot: semantic.warning.DEFAULT,
  crawl_render: accent.system.DEFAULT,
  content_generator: semantic.success.DEFAULT,
  core_web_vitals: accent.progress.DEFAULT,
  seo_kbase: semantic.success.DEFAULT,
  backlink_authority: accent.primary.DEFAULT,
  content_decay: semantic.warning.DEFAULT,
  google_ads_connector: accent.progress.DEFAULT,
} as const;

export const brand = {
  primary: {
    DEFAULT: accent.primary.DEFAULT,
    subtle: accent.primary.soft,
    muted: "rgba(124,58,237,0.08)",
  },
  accentBlue: {
    DEFAULT: semantic.info.DEFAULT,
    subtle: semantic.info.soft,
    muted: "rgba(59,130,246,0.08)",
  },
  accentCyan: {
    DEFAULT: accent.system.DEFAULT,
    subtle: accent.system.soft,
    muted: "rgba(56,189,248,0.08)",
  },
  accentViolet: {
    DEFAULT: accent.primary.DEFAULT,
    subtle: accent.primary.soft,
    muted: "rgba(124,58,237,0.08)",
  },
  accentAmber: {
    DEFAULT: accent.progress.DEFAULT,
    subtle: accent.progress.soft,
    muted: "rgba(245,158,11,0.08)",
  },
  accentGreen: {
    DEFAULT: semantic.success.DEFAULT,
    subtle: semantic.success.soft,
    muted: "rgba(34,197,94,0.08)",
  },
} as const;

export type StructuralColor = typeof structural;
export type AccentColor = typeof accent;
export type SemanticColor = typeof semantic;
export type BrandColor = typeof brand;
