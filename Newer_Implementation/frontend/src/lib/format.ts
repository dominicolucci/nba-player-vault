/**
 * format.ts — display formatters for warehouse values.
 * Keeps number presentation consistent across every page.
 */

/** Fixed-decimal counting stat (e.g. 29.2). Null/blank → em dash. */
export function fmtStat(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(decimals);
}

/** Shooting percentage stored as a 0–1 ratio (e.g. 0.352 → "35.2%"). */
export function fmtPct(ratio: number | null | undefined, decimals = 1): string {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return "—";
  return `${(ratio * 100).toFixed(decimals)}%`;
}

/** Signed delta for comparisons (e.g. +1.6 / -0.4). */
export function fmtDelta(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}`;
}

/** Thousands-separated integer (e.g. 163204 → "163,204"). */
export function fmtInt(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Math.round(value).toLocaleString("en-US");
}

/** Compact magnitude for big counts (e.g. 163204 → "163K"). */
export function fmtCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

/** Tone of a delta, for semantic colouring. */
export function deltaTone(value: number | null | undefined): "positive" | "negative" | "neutral" {
  if (value === null || value === undefined || Number.isNaN(value) || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}
