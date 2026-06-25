/**
 * game.ts — client helpers for the 82-0 draft UI.
 *
 * IMPORTANT: none of this is the win-loss mapping. The scoring (PRA → wins,
 * tiers, the +67 easter-egg bonus) lives only in the backend (game82.py via
 * POST /game/simulate). These helpers only handle the *draw* — which random
 * players to offer, which slots a player can fill — pure UI/state concerns.
 */

import { GAME_SLOTS, type GamePoolPlayer, type GameSlot } from "./types";

export const SLOTS = GAME_SLOTS;

export const SLOT_LABELS: Record<GameSlot, string> = {
  PG: "Point Guard",
  SG: "Shooting Guard",
  SF: "Small Forward",
  PF: "Power Forward",
  C: "Center",
};

/** Re-spin budgets, mirrored from the Streamlit game. */
export const OFFER_RESPINS = 1;
export const SEASON_RESPINS = 2;

/** A locked-in lineup line (carries the spun season's averages). */
export interface LineupEntry {
  player: string;
  season: string;
  headshot_url: string | null;
  position: string;
  slots: GameSlot[];
  pts: number;
  reb: number;
  ast: number;
}

export type Lineup = Partial<Record<GameSlot, LineupEntry>>;

export function pra(line: { pts: number; reb: number; ast: number }): number {
  return (line.pts || 0) + (line.reb || 0) + (line.ast || 0);
}

export function entries(lineup: Lineup): LineupEntry[] {
  return SLOTS.map((s) => lineup[s]).filter((e): e is LineupEntry => Boolean(e));
}

export function openSlots(lineup: Lineup): GameSlot[] {
  return SLOTS.filter((s) => !lineup[s]);
}

/** Open court slots a player can fill, in PG-SG-SF-PF-C order. */
export function eligibleOpenSlots(player: { slots: GameSlot[] }, lineup: Lineup): GameSlot[] {
  const open = new Set(openSlots(lineup));
  return SLOTS.filter((s) => player.slots.includes(s) && open.has(s));
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * A random set of undrafted players, guaranteeing at least one still fits an
 * open slot so the round is always playable.
 */
export function makeOffer(pool: GamePoolPlayer[], lineup: Lineup, k = 5): GamePoolPlayer[] {
  const used = new Set(entries(lineup).map((e) => e.player));
  const avail = pool.filter((p) => !used.has(p.player));
  if (avail.length === 0) return [];

  const fitting = avail.filter((p) => eligibleOpenSlots(p, lineup).length > 0);
  const offer: GamePoolPlayer[] = fitting.length > 0 ? [pickOne(fitting)] : [];
  const rest = shuffle(avail.filter((p) => !offer.includes(p)));
  for (const p of rest) {
    if (offer.length >= k) break;
    offer.push(p);
  }
  return shuffle(offer);
}

/** The "23 and Me" duo — used only to trigger the popup; the +67 is backend-side. */
export const EASTER_EGG_NAMES = ["lebron james", "bronny james"] as const;

export function hasEasterEgg(lineup: Lineup): boolean {
  const names = new Set(entries(lineup).map((e) => e.player.toLowerCase()));
  return EASTER_EGG_NAMES.every((n) => names.has(n));
}
