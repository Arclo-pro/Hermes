import { AGENTS, getCrewMember } from "@/config/agents";

export type CrewColorSet = {
  accent: string;
  accentRgb: string;
  accentSoft: string;
  accentBorder: string;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function getCrewColorSet(serviceId: string): CrewColorSet {
  const member = getCrewMember(serviceId);
  const hex = member.color;
  const rgb = hexToRgb(hex);

  if (!rgb) {
    return {
      accent: hex,
      accentRgb: "156, 163, 175",
      accentSoft: "rgba(156, 163, 175, 0.12)",
      accentBorder: "rgba(156, 163, 175, 0.25)",
    };
  }

  const rgbString = `${rgb.r}, ${rgb.g}, ${rgb.b}`;

  return {
    accent: hex,
    accentRgb: rgbString,
    accentSoft: `rgba(${rgbString}, 0.12)`,
    accentBorder: `rgba(${rgbString}, 0.25)`,
  };
}

export function getCrewAccentStyle(serviceId: string) {
  const colors = getCrewColorSet(serviceId);
  return {
    "--crew-accent": colors.accent,
    "--crew-accent-rgb": colors.accentRgb,
    "--crew-accent-soft": colors.accentSoft,
    "--crew-accent-border": colors.accentBorder,
  } as React.CSSProperties;
}

export function getCrewTextStyle(serviceId: string) {
  const colors = getCrewColorSet(serviceId);
  return { color: colors.accent };
}

export function getCrewBgSoftStyle(serviceId: string) {
  const colors = getCrewColorSet(serviceId);
  return { backgroundColor: colors.accentSoft };
}

export function getCrewBorderStyle(serviceId: string) {
  const colors = getCrewColorSet(serviceId);
  return { borderColor: colors.accentBorder };
}

export function getCrewProgressStyle(serviceId: string) {
  const colors = getCrewColorSet(serviceId);
  return { backgroundColor: colors.accent };
}
