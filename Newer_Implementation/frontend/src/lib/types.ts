/**
 * types.ts — TypeScript mirror of the NBA Player Vault REST API (api.py),
 * which serves the DuckDB warehouse via the shared data.py layer.
 *
 * Column names match the warehouse exactly (SQL-friendly, snake_case).
 */

export type League = "NBA" | "WNBA";

/** Stats that can be averaged / sorted by (the leaderboard whitelist). */
export const AVG_STATS = [
  "min",
  "pts",
  "reb",
  "ast",
  "stl",
  "blk",
  "tov",
  "fg_pct",
  "fg3_pct",
  "ft_pct",
  "gmsc",
] as const;
export type AvgStat = (typeof AVG_STATS)[number];

/** Warehouse summary — GET / */
export interface VaultSummary {
  app?: string;
  version?: string;
  games: number;
  players: number;
  leagues: number;
}

/** One row of the `players` table — GET /players */
export interface PlayerSummary {
  player: string;
  player_id: number | null;
  league: League;
  headshot_url: string | null;
  first_season: string;
  last_season: string;
  games_played: number;
}

/** Career averages block (counting stats averaged; %s derived from totals). */
export interface CareerAverages {
  games: number;
  min: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  gmsc: number;
  fg_pct: number | null;
  fg3_pct: number | null;
  ft_pct: number | null;
}

/** GET /players/{name} */
export interface PlayerProfile extends PlayerSummary {
  /** Current team affiliation (from teams.json); "Free Agents" if unmapped. */
  team: string;
  career: CareerAverages;
}

/** One row of GET /teams */
export interface TeamSummary {
  team: string;
  count: number;
}

/** One row of GET /teams/{team}/players */
export interface TeamPlayer {
  player: string;
  player_id: number | null;
  headshot_url: string | null;
  ppg: number | null;
}

/** One row of the `games` table — GET /players/{name}/games */
export interface GameLog {
  player: string;
  player_id: number | null;
  league: League;
  season: string;
  date: string;
  opponent: string;
  home: boolean;
  b2b: boolean;
  result: string;
  min: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  fg: number;
  fga: number;
  fg_pct: number | null;
  fg3: number;
  fg3a: number;
  fg3_pct: number | null;
  ft: number;
  fta: number;
  ft_pct: number | null;
  gmsc: number;
  plus_minus: number | null;
}

/** One row of the `season_averages` view — GET /players/{name}/seasons */
export interface SeasonAverages {
  player: string;
  league: League;
  season: string;
  games: number;
  min: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  fg_pct: number | null;
  fg3_pct: number | null;
  ft_pct: number | null;
  gmsc: number;
}

/** GET /players/{name}/seasons/{season} */
export interface SeasonDetail {
  averages: SeasonAverages;
  games: GameLog[];
}

/** One entry of GET /compare */
export interface CompareEntry {
  player: string;
  league: League;
  headshot_url: string | null;
  career: CareerAverages;
}

/**
 * One row of GET /leaderboards. The ranked stat is returned under its own key
 * (e.g. `pts`), so the dynamic column is modelled as an index signature.
 */
export interface LeaderboardRow {
  player: string;
  league: League;
  games: number;
  [stat: string]: number | string | null;
}

/* ----------------------------- 82-0 game ------------------------------ */

export type GameSlot = "PG" | "SG" | "SF" | "PF" | "C";
export const GAME_SLOTS: GameSlot[] = ["PG", "SG", "SF", "PF", "C"];

/** One row of GET /game/pool — a draftable player's peak-season line + eligibility. */
export interface GamePoolPlayer {
  player_id: number | null;
  player: string;
  headshot_url: string | null;
  peak_season: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  gmsc: number;
  position: string;
  /** Court slots this player is eligible for (server-computed). */
  slots: GameSlot[];
}

/** One lineup line sent to POST /game/simulate. */
export interface SimSlotInput {
  player: string;
  season?: string | null;
  pts: number;
  reb: number;
  ast: number;
}

export interface SimContribution {
  player: string;
  pra: number;
}

/** Response of POST /game/simulate (game82.simulate). */
export interface SimResult {
  wins: number;
  losses: number;
  team_pra: number;
  contributions: SimContribution[];
  tier: string;
  comparison: string;
  bonus: number;
}

/** Human labels + display formatting hints for each stat. */
export const STAT_META: Record<
  AvgStat,
  { label: string; long: string; kind: "count" | "percent" }
> = {
  min: { label: "MIN", long: "Minutes", kind: "count" },
  pts: { label: "PTS", long: "Points", kind: "count" },
  reb: { label: "REB", long: "Rebounds", kind: "count" },
  ast: { label: "AST", long: "Assists", kind: "count" },
  stl: { label: "STL", long: "Steals", kind: "count" },
  blk: { label: "BLK", long: "Blocks", kind: "count" },
  tov: { label: "TOV", long: "Turnovers", kind: "count" },
  fg_pct: { label: "FG%", long: "Field Goal %", kind: "percent" },
  fg3_pct: { label: "3P%", long: "Three-Point %", kind: "percent" },
  ft_pct: { label: "FT%", long: "Free Throw %", kind: "percent" },
  gmsc: { label: "GmSc", long: "Game Score", kind: "count" },
};
