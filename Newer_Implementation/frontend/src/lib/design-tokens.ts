/**
 * design-tokens.ts — JS-accessible mirror of the design system.
 *
 * Colours and type live canonically in `app/globals.css` (CSS custom
 * properties) so the source of truth is single. This module re-exports the
 * pieces that JavaScript needs — chiefly the categorical chart palette for
 * charting libraries that take colours as props rather than CSS.
 *
 * Each chart colour is referenced through its CSS variable so it still flips
 * with the active theme. Pass these straight to Recharts/visx/Chart.js stroke
 * & fill props.
 */

/** Ordered categorical series colours (head-to-head, multi-line trajectories). */
export const CHART_SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
] as const;

/** Semantic roles for single-series and diverging charts. */
export const CHART_ROLES = {
  primary: "var(--chart-1)", // amber — the focal player / main metric
  secondary: "var(--chart-2)", // blue — comparison / league baseline
  grid: "var(--chart-grid)",
  positive: "var(--positive)",
  negative: "var(--negative)",
  axis: "var(--dim)",
} as const;

/** Pick a stable series colour by index (wraps around the 8-colour scale). */
export function seriesColor(index: number): string {
  return CHART_SERIES[((index % CHART_SERIES.length) + CHART_SERIES.length) % CHART_SERIES.length];
}

/** Type scale tokens (font-family CSS vars) for non-utility contexts. */
export const FONTS = {
  sans: "var(--font-sans)",
  display: "var(--font-display)",
  mono: "var(--font-mono)",
} as const;

export type ThemeName = "dark" | "light";

/**
 * Concrete hex mirror of the chart palette, per theme. Charting libraries
 * (Recharts) apply colours as SVG attributes where CSS `var()` does NOT
 * resolve, so JS needs literal values. KEEP IN SYNC with the `--chart-*`,
 * `--chart-grid`, and `--dim` tokens in `app/globals.css`.
 */
export const CHART_HEX: Record<ThemeName, readonly string[]> = {
  dark: ["#f5a623", "#4aa3df", "#46c08d", "#9b7fe0", "#ef6f8e", "#36c2b4", "#ff8a4c", "#6f86e0"],
  light: ["#d98a12", "#2f7fc0", "#1f9e6e", "#7c5ad0", "#d9476e", "#149688", "#e06a28", "#4861c4"],
} as const;

export const CHART_GRID_HEX: Record<ThemeName, string> = {
  dark: "rgba(255,255,255,0.07)",
  light: "rgba(15,23,42,0.08)",
};

export const CHART_AXIS_HEX: Record<ThemeName, string> = {
  dark: "#6b7384", // --dim (dark)
  light: "#64748b", // --dim (light)
};

/** Stable categorical colour by index for the active theme (wraps the scale). */
export function chartColor(theme: ThemeName, index: number): string {
  const arr = CHART_HEX[theme] ?? CHART_HEX.dark;
  return arr[((index % arr.length) + arr.length) % arr.length];
}
