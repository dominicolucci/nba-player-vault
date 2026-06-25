/**
 * stats.ts — pure derivations the profile page computes from the game log and
 * season averages. No I/O. Percentages are always re-derived from totals
 * (makes ÷ attempts), never averaged across games — matching the warehouse.
 */

import type { GameLog, SeasonAverages } from "./types";

/** A player with fewer than this many seasons is treated as a rookie. */
export const ROOKIE_SEASON_THRESHOLD = 3;

export function isRookie(seasonCount: number): boolean {
  return seasonCount < ROOKIE_SEASON_THRESHOLD;
}

/** Metrics the trajectory chart and splits can show. */
export type CountMetric = "pts" | "reb" | "ast" | "stl" | "blk" | "min" | "gmsc";
export type PctMetric = "fg_pct" | "fg3_pct" | "ft_pct";
export type TrajectoryMetric = CountMetric | PctMetric;

const PCT_PARTS: Record<PctMetric, [keyof GameLog, keyof GameLog]> = {
  fg_pct: ["fg", "fga"],
  fg3_pct: ["fg3", "fg3a"],
  ft_pct: ["ft", "fta"],
};

function isPctMetric(m: TrajectoryMetric): m is PctMetric {
  return m === "fg_pct" || m === "fg3_pct" || m === "ft_pct";
}

export interface TrajectoryPoint {
  /** X-axis label (season string, or game number). */
  label: string;
  /** Metric value; null = undefined (e.g. 0 attempts) so the line can gap. */
  value: number | null;
  /** Secondary caption (GP for seasons, date for games). */
  sub?: string;
}

/** Games endpoint returns newest-first; this returns a chronological copy. */
export function gamesAscending(games: GameLog[]): GameLog[] {
  return [...games].sort((a, b) => a.date.localeCompare(b.date));
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/** Veteran view: one point per season. */
export function seasonTrajectory(
  seasons: SeasonAverages[],
  metric: TrajectoryMetric,
): TrajectoryPoint[] {
  return seasons.map((s) => ({
    label: s.season,
    value: (s[metric] as number | null) ?? null,
    sub: `${s.games} GP`,
  }));
}

/**
 * Rookie view: trailing rolling average over the game log (default 10 games).
 * Uses a partial window at the start so the curve begins at game 1.
 */
export function rollingTrajectory(
  gamesAsc: GameLog[],
  metric: TrajectoryMetric,
  window = 10,
): TrajectoryPoint[] {
  return gamesAsc.map((game, i) => {
    const slice = gamesAsc.slice(Math.max(0, i - window + 1), i + 1);
    let value: number | null;
    if (isPctMetric(metric)) {
      const [makeKey, attKey] = PCT_PARTS[metric];
      const att = sum(slice.map((g) => Number(g[attKey]) || 0));
      value = att === 0 ? null : sum(slice.map((g) => Number(g[makeKey]) || 0)) / att;
    } else {
      value = mean(slice.map((g) => Number(g[metric]) || 0));
    }
    return { label: `${i + 1}`, value, sub: game.date };
  });
}

export interface MonthSplit {
  month: string;
  gp: number;
  min: number | null;
  pts: number | null;
  reb: number | null;
  ast: number | null;
  fg_pct: number | null;
  fg3_pct: number | null;
  ft_pct: number | null;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
// Basketball-season order (NBA Oct→Jun, WNBA May→Oct). Months without games drop out.
const SEASON_MONTH_ORDER = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Month-by-month splits across the whole game log; %s derived from totals. */
export function monthSplits(games: GameLog[]): MonthSplit[] {
  const byMonth = new Map<number, GameLog[]>();
  for (const g of games) {
    const m = Number(g.date.slice(5, 7));
    if (!Number.isFinite(m)) continue;
    const bucket = byMonth.get(m);
    if (bucket) bucket.push(g);
    else byMonth.set(m, [g]);
  }

  const pct = (slice: GameLog[], makeKey: keyof GameLog, attKey: keyof GameLog) => {
    const att = sum(slice.map((g) => Number(g[attKey]) || 0));
    return att === 0 ? null : sum(slice.map((g) => Number(g[makeKey]) || 0)) / att;
  };

  return SEASON_MONTH_ORDER.filter((m) => byMonth.has(m)).map((m) => {
    const slice = byMonth.get(m)!;
    return {
      month: MONTH_NAMES[m - 1],
      gp: slice.length,
      min: mean(slice.map((g) => g.min)),
      pts: mean(slice.map((g) => g.pts)),
      reb: mean(slice.map((g) => g.reb)),
      ast: mean(slice.map((g) => g.ast)),
      fg_pct: pct(slice, "fg", "fga"),
      fg3_pct: pct(slice, "fg3", "fg3a"),
      ft_pct: pct(slice, "ft", "fta"),
    };
  });
}

/** "vs WAS" (home) or "@ NOP" (away). */
export function matchup(game: Pick<GameLog, "home" | "opponent">): string {
  return `${game.home ? "vs" : "@"} ${game.opponent}`;
}

/** Distinct seasons present in a game log, newest first. */
export function seasonsInGames(games: GameLog[]): string[] {
  return Array.from(new Set(games.map((g) => g.season))).sort((a, b) => b.localeCompare(a));
}
