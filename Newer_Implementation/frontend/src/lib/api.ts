/**
 * api.ts — typed client for the NBA Player Vault REST API (FastAPI / api.py).
 *
 * Foundation for the feature pages built next: every endpoint in api.py has a
 * typed function here. Designed for React Server Components (uses `fetch` with
 * Next.js caching), but works anywhere.
 *
 * Configure the backend origin with NEXT_PUBLIC_API_BASE_URL (see .env.example).
 */

import type {
  AvgStat,
  CompareEntry,
  GameLog,
  GamePoolPlayer,
  League,
  LeaderboardRow,
  PlayerProfile,
  PlayerSummary,
  SeasonAverages,
  SeasonDetail,
  SimResult,
  SimSlotInput,
  TeamPlayer,
  TeamSummary,
  VaultSummary,
} from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:8000";

/** Default cache window for warehouse reads (data changes at most daily). */
const DEFAULT_REVALIDATE = 300;

export class ApiError extends Error {
  constructor(
    public status: number,
    public url: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface FetchOptions {
  /** ISR revalidation window in seconds; pass 0 to opt out of caching. */
  revalidate?: number;
  signal?: AbortSignal;
  /** HTTP method (default GET). */
  method?: "GET" | "POST";
  /** JSON request body (serialized automatically). */
  body?: unknown;
}

async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const revalidate = opts.revalidate ?? DEFAULT_REVALIDATE;
  const method = opts.method ?? "GET";
  const isWrite = method !== "GET";

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
      next: !isWrite && revalidate > 0 ? { revalidate } : undefined,
      cache: isWrite || revalidate <= 0 ? "no-store" : undefined,
    });
  } catch (cause) {
    throw new ApiError(0, url, `Network error reaching the Vault API: ${String(cause)}`);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body?.detail) detail = body.detail;
    } catch {
      /* non-JSON error body — keep statusText */
    }
    throw new ApiError(res.status, url, detail);
  }

  return (await res.json()) as T;
}

const enc = encodeURIComponent;

/** Build a query string from defined params only. */
function qs(params: Record<string, string | number | undefined | null>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${enc(String(v))}`).join("&");
}

/* ------------------------------------------------------------------ */
/* Endpoints — one function per route in api.py                        */
/* ------------------------------------------------------------------ */

/** GET / — warehouse summary. */
export function getSummary(opts?: FetchOptions): Promise<VaultSummary> {
  return apiFetch<VaultSummary>("/", opts);
}

/** GET /players — full roster, optionally filtered by league. */
export function listPlayers(league?: League, opts?: FetchOptions): Promise<PlayerSummary[]> {
  return apiFetch<PlayerSummary[]>(`/players${qs({ league })}`, opts);
}

/** GET /players/{name} — profile + career averages. */
export function getPlayer(name: string, opts?: FetchOptions): Promise<PlayerProfile> {
  return apiFetch<PlayerProfile>(`/players/${enc(name)}`, opts);
}

/** GET /players/{name}/games — game log, optionally by season or last N. */
export function getPlayerGames(
  name: string,
  params: { season?: string; last?: number } = {},
  opts?: FetchOptions,
): Promise<GameLog[]> {
  return apiFetch<GameLog[]>(`/players/${enc(name)}/games${qs(params)}`, opts);
}

/** GET /players/{name}/seasons — per-season averages. */
export function getPlayerSeasons(name: string, opts?: FetchOptions): Promise<SeasonAverages[]> {
  return apiFetch<SeasonAverages[]>(`/players/${enc(name)}/seasons`, opts);
}

/** GET /players/{name}/seasons/{season} — one season's averages + game log. */
export function getPlayerSeason(
  name: string,
  season: string,
  opts?: FetchOptions,
): Promise<SeasonDetail> {
  return apiFetch<SeasonDetail>(`/players/${enc(name)}/seasons/${enc(season)}`, opts);
}

/** GET /compare — career averages for 2+ players side by side. */
export function comparePlayers(names: string[], opts?: FetchOptions): Promise<CompareEntry[]> {
  return apiFetch<CompareEntry[]>(`/compare${qs({ players: names.join(",") })}`, opts);
}

/** GET /teams — distinct teams in a league with player counts. */
export function getTeams(league: League, opts?: FetchOptions): Promise<TeamSummary[]> {
  return apiFetch<TeamSummary[]>(`/teams${qs({ league })}`, opts);
}

/** GET /teams/{team}/players — roster for a team, sorted by career PPG. */
export function getTeamPlayers(
  league: League,
  team: string,
  opts?: FetchOptions,
): Promise<TeamPlayer[]> {
  return apiFetch<TeamPlayer[]>(`/teams/${enc(team)}/players${qs({ league })}`, opts);
}

/** GET /leaderboards — ranked averages across all tracked players. */
export function getLeaderboards(
  params: { stat?: AvgStat; season?: string; league?: League; limit?: number } = {},
  opts?: FetchOptions,
): Promise<LeaderboardRow[]> {
  return apiFetch<LeaderboardRow[]>(`/leaderboards${qs(params)}`, opts);
}

/** GET /seasons — distinct seasons (newest first), optionally by league. */
export function getSeasons(league?: League, opts?: FetchOptions): Promise<string[]> {
  return apiFetch<string[]>(`/seasons${qs({ league })}`, opts);
}

/** GET /game/pool — 82-0 draft pool for a league. */
export function getGamePool(league: League, opts?: FetchOptions): Promise<GamePoolPlayer[]> {
  return apiFetch<GamePoolPlayer[]>(`/game/pool${qs({ league })}`, opts);
}

/** POST /game/simulate — project an 82-game record from a (partial) lineup. */
export function simulateGame(lineup: SimSlotInput[], opts?: FetchOptions): Promise<SimResult> {
  return apiFetch<SimResult>("/game/simulate", { ...opts, method: "POST", body: lineup });
}
