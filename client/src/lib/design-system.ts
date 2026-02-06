/**
 * Arclo Design System Constants
 *
 * This file centralizes all design tokens extracted from the Dashboard,
 * which serves as the single source of truth for visual design.
 *
 * IMPORTANT: Do not define custom styles outside this system.
 * All pages must use these constants for visual consistency.
 */

// ============================================================================
// COLOR TOKENS
// ============================================================================

export const colors = {
  // Text colors
  text: {
    primary: "#0F172A",      // Main headings, important text
    secondary: "#475569",    // Body text, descriptions
    muted: "#64748B",        // Less important text, labels
    disabled: "#94A3B8",     // Placeholder, disabled states
    placeholder: "#CBD5E1",  // Input placeholders, empty states
  },

  // Brand/accent colors
  brand: {
    purple: "#7c3aed",
    pink: "#ec4899",
    amber: "#f59e0b",
    cyan: "#06b6d4",
    blue: "#3b82f6",
  },

  // Semantic colors (status indicators only)
  semantic: {
    success: "#22c55e",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#3b82f6",
  },

  // Background colors
  background: {
    page: "#FFFFFF",
    card: "linear-gradient(180deg, #FFFFFF, #F8FAFC)",
    cardAccent: "linear-gradient(180deg, #FAFAFE, #F5F3FF)",
    surface: "#FFFFFF",
    muted: "rgba(15, 23, 42, 0.02)",
    hover: "rgba(15, 23, 42, 0.04)",
  },

  // Border colors
  border: {
    default: "rgba(15, 23, 42, 0.06)",
    subtle: "rgba(15, 23, 42, 0.04)",
    accent: "rgba(124, 58, 237, 0.12)",
    strong: "rgba(15, 23, 42, 0.08)",
  },
} as const;

// ============================================================================
// BADGE STYLES
// ============================================================================

export type BadgeColor = "purple" | "pink" | "amber" | "cyan" | "green" | "red" | "blue" | "gray";

export const badgeStyles: Record<BadgeColor, { color: string; bg: string; border?: string }> = {
  purple: { color: "#7c3aed", bg: "rgba(124, 58, 237, 0.08)" },
  pink: { color: "#ec4899", bg: "rgba(236, 72, 153, 0.08)" },
  amber: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.08)" },
  cyan: { color: "#06b6d4", bg: "rgba(6, 182, 212, 0.08)" },
  green: { color: "#22c55e", bg: "rgba(34, 197, 94, 0.08)" },
  red: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.08)" },
  blue: { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.08)" },
  gray: { color: "#64748B", bg: "rgba(100, 116, 139, 0.08)" },
};

// ============================================================================
// BUTTON STYLES
// ============================================================================

export const buttonStyles = {
  // Primary action button (filled)
  primary: {
    base: "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
    purple: {
      background: "#7c3aed",
      color: "#FFFFFF",
      boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
    },
    green: {
      background: "#22c55e",
      color: "#FFFFFF",
      boxShadow: "0 4px 12px rgba(34, 197, 94, 0.3)",
    },
    amber: {
      background: "#f59e0b",
      color: "#FFFFFF",
      boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
    },
    blue: {
      background: "#3b82f6",
      color: "#FFFFFF",
      boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
    },
    danger: {
      background: "#ef4444",
      color: "#FFFFFF",
      boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
    },
  },

  // Secondary/outline button
  secondary: {
    base: "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
    default: {
      background: "rgba(15, 23, 42, 0.04)",
      color: "#64748B",
      border: "none",
    },
    outline: {
      background: "transparent",
      color: "#7c3aed",
      border: "1px solid rgba(124, 58, 237, 0.2)",
    },
  },

  // Ghost/icon button
  ghost: {
    base: "p-1.5 rounded-lg transition-colors hover:bg-gray-100 disabled:opacity-50",
  },
} as const;

// ============================================================================
// CARD STYLES
// ============================================================================

export const cardStyles = {
  // Base card (white with subtle border)
  base: {
    background: "#FFFFFF",
    border: "1px solid rgba(15, 23, 42, 0.06)",
    borderRadius: "0.75rem", // rounded-xl
  },

  // Elevated card (with shadow)
  elevated: {
    background: "#FFFFFF",
    border: "1px solid rgba(15, 23, 42, 0.06)",
    borderRadius: "1rem", // rounded-2xl
    boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
  },

  // Inner card (for nested content)
  inner: {
    background: "#FFFFFF",
    border: "1px solid rgba(15, 23, 42, 0.06)",
    borderRadius: "0.75rem", // rounded-xl
  },

  // Muted background card
  muted: {
    background: "rgba(15, 23, 42, 0.02)",
    border: "1px solid rgba(15, 23, 42, 0.06)",
    borderRadius: "0.75rem",
  },
} as const;

// ============================================================================
// ICON CONTAINER STYLES
// ============================================================================

export const iconContainerStyles = {
  // Small icon container (32x32)
  sm: {
    base: "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
    getStyle: (color: string) => ({
      background: `${color}14`,
      border: `1px solid ${color}20`,
    }),
  },

  // Medium icon container (36x36)
  md: {
    base: "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
    getStyle: (color: string) => ({
      background: `linear-gradient(135deg, ${color}14, ${color}08)`,
      border: `1px solid ${color}20`,
    }),
  },

  // Large icon container (40x40)
  lg: {
    base: "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
    getStyle: (color: string) => ({
      background: `${color}14`,
    }),
  },
} as const;

// ============================================================================
// METRIC CARD PATTERNS
// ============================================================================

export const metricStyles = {
  // Large metric value
  value: {
    className: "text-3xl font-bold",
    style: { color: colors.text.primary },
  },

  // Metric label
  label: {
    className: "text-sm font-medium",
    style: { color: colors.text.secondary },
  },

  // Delta/change indicator
  delta: {
    positive: { color: "#22c55e" },
    negative: { color: "#ef4444" },
    neutral: { color: "#94A3B8" },
    className: "text-xs font-medium",
  },

  // Stat bucket (small metric display)
  statBucket: {
    container: "rounded-xl p-3 text-center",
    containerStyle: cardStyles.inner,
    value: "text-2xl font-bold",
    valueStyle: { color: colors.text.primary },
    label: "text-xs",
    labelStyle: { color: colors.text.muted },
  },
} as const;

// ============================================================================
// TABLE STYLES
// ============================================================================

export const tableStyles = {
  // Table container
  container: "overflow-x-auto",

  // Table element
  table: "w-full",

  // Header row
  headerRow: {
    style: { borderBottom: "1px solid rgba(15, 23, 42, 0.08)" },
  },

  // Header cell
  headerCell: {
    className: "text-xs font-semibold py-3 px-3",
    style: { color: colors.text.muted },
  },

  // Body row
  bodyRow: {
    style: { borderBottom: "1px solid rgba(15, 23, 42, 0.04)" },
    hoverClass: "hover:bg-slate-50 transition-colors",
  },

  // Body cell
  bodyCell: {
    className: "py-3 px-3",
  },
} as const;

// ============================================================================
// SECTION HEADER STYLES
// ============================================================================

export const sectionStyles = {
  // Section title (uppercase label)
  title: {
    className: "text-xs font-semibold uppercase tracking-wide",
    style: { color: colors.text.disabled },
  },

  // Section header with toggle
  collapsibleHeader: {
    className: "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:opacity-80",
    style: { color: colors.text.disabled },
  },

  // Count badge in header
  count: {
    className: "ml-1 normal-case font-normal",
  },
} as const;

// ============================================================================
// PAGE LAYOUT STYLES
// ============================================================================

export const pageStyles = {
  // Dashboard-style page background
  background: {
    background: `radial-gradient(1200px circle at 10% 0%, rgba(139, 92, 246, 0.06), transparent 40%),
                 radial-gradient(1200px circle at 90% 10%, rgba(236, 72, 153, 0.04), transparent 40%),
                 radial-gradient(800px circle at 50% 80%, rgba(245, 158, 11, 0.03), transparent 40%),
                 #FFFFFF`,
  },

  // Page container
  container: "min-h-screen p-6",

  // Content wrapper
  content: "max-w-7xl mx-auto space-y-6",

  // Page header
  header: {
    container: "mb-8 flex items-start justify-between",
    title: {
      className: "text-4xl font-bold mb-2",
      style: { color: colors.text.primary, letterSpacing: "-0.03em" },
    },
    subtitle: {
      style: { color: colors.text.secondary },
    },
  },
} as const;

// ============================================================================
// MODAL/DIALOG STYLES
// ============================================================================

export const modalStyles = {
  // Overlay
  overlay: {
    className: "fixed inset-0 z-50 flex items-center justify-center",
    style: {
      background: "rgba(15, 23, 42, 0.6)",
      backdropFilter: "blur(4px)",
    },
  },

  // Modal container
  container: {
    className: "w-full max-w-md mx-4 p-6 rounded-2xl",
    style: {
      background: "#FFFFFF",
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    },
  },

  // Modal header
  header: {
    className: "flex items-start justify-between mb-4",
  },

  // Modal title
  title: {
    className: "font-semibold text-lg",
    style: { color: colors.text.primary },
  },

  // Modal description
  description: {
    className: "text-xs",
    style: { color: colors.text.muted },
  },

  // Modal body
  body: {
    className: "text-sm mb-4",
    style: { color: colors.text.secondary },
  },

  // Modal footer (button row)
  footer: {
    className: "flex gap-3",
  },
} as const;

// ============================================================================
// EMPTY STATE STYLES
// ============================================================================

export const emptyStateStyles = {
  container: "py-8 text-center",
  icon: {
    className: "w-8 h-8 mx-auto mb-3",
    style: { color: colors.text.placeholder },
  },
  title: {
    className: "text-sm font-medium mb-1",
    style: { color: colors.text.secondary },
  },
  description: {
    className: "text-xs",
    style: { color: colors.text.disabled },
  },
} as const;

// ============================================================================
// LOADING STATE STYLES
// ============================================================================

export const loadingStyles = {
  container: "flex items-center justify-center py-8",
  spinner: {
    className: "w-6 h-6 animate-spin",
    style: { color: colors.text.disabled },
  },
  skeleton: {
    className: "rounded bg-gray-100 animate-pulse",
  },
} as const;

// ============================================================================
// INPUT STYLES
// ============================================================================

export const inputStyles = {
  // Base input
  base: {
    className: "w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2",
    style: {
      background: "#FFFFFF",
      border: "1px solid rgba(15, 23, 42, 0.12)",
      color: colors.text.primary,
    },
    focusRing: "focus:ring-purple-500/30",
  },

  // Search input
  search: {
    className: "w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none",
    style: {
      background: "rgba(15, 23, 42, 0.04)",
      border: "1px solid rgba(15, 23, 42, 0.06)",
      color: colors.text.primary,
    },
  },

  // Input label
  label: {
    className: "text-sm font-medium mb-2 block",
    style: { color: colors.text.primary },
  },

  // Input helper text
  helper: {
    className: "text-xs mt-1",
    style: { color: colors.text.muted },
  },

  // Input error text
  error: {
    className: "text-xs mt-1",
    style: { color: colors.semantic.danger },
  },
} as const;

// ============================================================================
// SPACING TOKENS
// ============================================================================

export const spacing = {
  // Standard gap sizes (Tailwind classes)
  gap: {
    xs: "gap-1",     // 4px
    sm: "gap-2",     // 8px
    md: "gap-3",     // 12px
    lg: "gap-4",     // 16px
    xl: "gap-6",     // 24px
  },

  // Standard padding sizes
  padding: {
    card: "p-6",
    cardCompact: "p-4",
    section: "p-5",
    inner: "p-3",
  },

  // Standard margin sizes
  margin: {
    sectionGap: "mb-6",
    headerGap: "mb-4",
    itemGap: "mb-2",
  },
} as const;

// ============================================================================
// TYPOGRAPHY CLASSES
// ============================================================================

export const typography = {
  // Headings
  h1: "text-4xl font-bold",
  h2: "text-2xl font-bold",
  h3: "text-lg font-semibold",
  h4: "text-sm font-semibold",

  // Body text
  body: "text-sm",
  bodySmall: "text-xs",
  bodyTiny: "text-[11px]",

  // Special text
  mono: "font-mono",
  uppercase: "uppercase tracking-wide",
  truncate: "truncate",
  lineClamp2: "line-clamp-2",
} as const;

// ============================================================================
// GRADIENT DEFINITIONS
// ============================================================================

export const gradients = {
  // Brand gradient for headings
  brandText: {
    backgroundImage: "linear-gradient(90deg, #7c3aed, #ec4899, #f59e0b)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  },

  // Card tint gradients (for GlassCard borders)
  tints: {
    cyan: "linear-gradient(135deg, rgba(6,182,212,0.35), rgba(59,130,246,0.18))",
    purple: "linear-gradient(135deg, rgba(168,85,247,0.30), rgba(236,72,153,0.18))",
    green: "linear-gradient(135deg, rgba(34,197,94,0.30), rgba(16,185,129,0.18))",
    pink: "linear-gradient(135deg, rgba(244,63,94,0.30), rgba(236,72,153,0.18))",
    amber: "linear-gradient(135deg, rgba(245,158,11,0.30), rgba(234,179,8,0.18))",
    red: "linear-gradient(135deg, rgba(239,68,68,0.30), rgba(244,63,94,0.18))",
    blue: "linear-gradient(135deg, rgba(59,130,246,0.30), rgba(99,102,241,0.18))",
  },

  // Button/CTA gradients
  button: {
    purple: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(236,72,153,0.06))",
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get badge style for a given color
 */
export function getBadgeStyle(color: BadgeColor) {
  return badgeStyles[color];
}

/**
 * Get semantic color for delta values
 */
export function getDeltaColor(value: number | null): string {
  if (value === null) return metricStyles.delta.neutral.color;
  if (value > 0) return metricStyles.delta.positive.color;
  if (value < 0) return metricStyles.delta.negative.color;
  return metricStyles.delta.neutral.color;
}

/**
 * Get icon container style for a color
 */
export function getIconContainerStyle(color: string, size: "sm" | "md" | "lg" = "sm") {
  return iconContainerStyles[size].getStyle(color);
}

/**
 * Format numbers with K/M suffixes
 */
export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

/**
 * Get relative time string
 */
export function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
