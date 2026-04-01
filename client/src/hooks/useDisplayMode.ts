import { useMemo } from "react";

export type DisplayMode = "light" | "dark" | "auto";
export type DisplayThemeCategory = "minimal" | "quantum" | "warp" | "emoji" | "others";

function getLuminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    const normalized = v / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

const parseHexColor = (value?: string): { r: number; g: number; b: number } | null => {
  if (!value) return null;

  const match = value.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (!match) return null;

  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => `${char}${char}`)
      .join("");
  }

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
};

const parseDominantFromGradient = (gradient?: string): { r: number; g: number; b: number } | null => {
  if (!gradient) return null;

  const hexMatch = gradient.match(/#([\da-f]{3}|[\da-f]{6})/i);
  if (!hexMatch) return null;
  return parseHexColor(hexMatch[0]);
};

export function useDisplayMode(
  themeCategory: DisplayThemeCategory,
  displayMode: DisplayMode,
  bgSource?: string,
): "display-dark" | "display-light" | null {
  return useMemo(() => {
    if (themeCategory !== "quantum" && themeCategory !== "emoji") {
      return null;
    }

    if (displayMode === "auto") {
      const rgb = parseHexColor(bgSource) || parseDominantFromGradient(bgSource) || { r: 15, g: 23, b: 42 };
      const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
      return luminance > 0.5 ? "display-dark" : "display-light";
    }

    return displayMode === "dark" ? "display-dark" : "display-light";
  }, [bgSource, displayMode, themeCategory]);
}
