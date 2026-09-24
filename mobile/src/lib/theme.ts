import { useColorScheme } from "react-native";

export interface ThemeColors {
  surface: string;
  textPrimary: string;
  textSecondary: string;
  muted: string;
  axis: string;
  series: string;
  seriesForecast: string;
  warning: string;
  danger: string;
}

/**
 * Every text/surface pair here has been checked against its own mode's
 * `surface` with the WCAG contrast formula, not eyeballed — small/normal
 * text needs >=4.5:1. `muted` (used for axis labels and table cells, both
 * small text) previously used the same value in both modes: fine on the
 * dark surface (4.85:1) but only 3.50:1 on the light one. `warning` and
 * `danger` previously had no dark variant at all (same hardcoded color
 * regardless of scheme).
 */
const PALETTE: Record<"light" | "dark", ThemeColors> = {
  light: {
    surface: "#fcfcfb",
    textPrimary: "#0b0b0b",
    textSecondary: "#52514e",
    muted: "#6f6d68",
    axis: "#c3c2b7",
    series: "#2a78d6",
    seriesForecast: "#a9c8ec",
    warning: "#835800",
    danger: "#c0392b",
  },
  dark: {
    surface: "#1a1a19",
    textPrimary: "#ffffff",
    textSecondary: "#c3c2b7",
    muted: "#898781",
    axis: "#383835",
    series: "#3987e5",
    seriesForecast: "#2c4d73",
    warning: "#af8329",
    danger: "#d16e64",
  },
};

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === "dark" ? PALETTE.dark : PALETTE.light;
}
