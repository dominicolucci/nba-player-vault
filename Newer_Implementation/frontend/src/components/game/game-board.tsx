"use client";

import { Check, Dices, RotateCcw, X } from "lucide-react";
import { useEffect, useReducer, useState } from "react";
import { EggDialog } from "./egg-dialog";
import { ContributionBars, RecordHeader } from "./result-panel";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { Button, Card, Kicker } from "@/components/ui";
import { ApiError, getGamePool, getPlayerSeasons, simulateGame } from "@/lib/api";
import { cn } from "@/lib/cn";
import { fmtStat } from "@/lib/format";
import {
  type Lineup,
  type LineupEntry,
  SEASON_RESPINS,
  SLOT_LABELS,
  SLOTS,
  OFFER_RESPINS,
  eligibleOpenSlots,
  entries,
  hasEasterEgg,
  makeOffer,
  openSlots,
  pra,
} from "@/lib/game";
import type { GamePoolPlayer, GameSlot, League, SeasonAverages, SimResult } from "@/lib/types";

/* ------------------------------- state ---------------------------------- */

interface State {
  league: League;
  pool: GamePoolPlayer[];
  lineup: Lineup;
  offer: GamePoolPlayer[];
  offerRespins: number;
  pending: GamePoolPlayer | null;
  slotChoice: GameSlot | null;
  rolled: SeasonAverages | null;
  seasonRespins: number;
  seenSeasons: string[];
  eggShown: boolean;
}

type Action =
  | { type: "INIT"; pool: GamePoolPlayer[]; league: League; offer: GamePoolPlayer[] }
  | { type: "RESET"; offer: GamePoolPlayer[] }
  | { type: "RESPIN_OFFER"; offer: GamePoolPlayer[] }
  | { type: "DRAFT"; player: GamePoolPlayer; slot: GameSlot }
  | { type: "CANCEL_PENDING" }
  | { type: "ROLL"; season: SeasonAverages; respin: boolean }
  | { type: "LOCK"; entry: LineupEntry; slot: GameSlot; offer: GamePoolPlayer[] }
  | { type: "MOVE"; from: GameSlot; to: GameSlot }
  | { type: "REMOVE"; slot: GameSlot; offer: GamePoolPlayer[] }
  | { type: "MARK_EGG" };

function freshState(pool: GamePoolPlayer[], league: League, offer: GamePoolPlayer[]): State {
  return {
    league,
    pool,
    lineup: {},
    offer,
    offerRespins: OFFER_RESPINS,
    pending: null,
    slotChoice: null,
    rolled: null,
    seasonRespins: 0,
    seenSeasons: [],
    eggShown: false,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INIT":
      return freshState(action.pool, action.league, action.offer);
    case "RESET":
      return freshState(state.pool, state.league, action.offer);
    case "RESPIN_OFFER":
      return { ...state, offer: action.offer, offerRespins: state.offerRespins - 1 };
    case "DRAFT":
      return { ...state, pending: action.player, slotChoice: action.slot, rolled: null, seenSeasons: [] };
    case "CANCEL_PENDING":
      return { ...state, pending: null, slotChoice: null, rolled: null, seenSeasons: [] };
    case "ROLL":
      return {
        ...state,
        rolled: action.season,
        seenSeasons: [...state.seenSeasons, action.season.season],
        seasonRespins: action.respin ? state.seasonRespins + 1 : state.seasonRespins,
      };
    case "LOCK":
      return {
        ...state,
        lineup: { ...state.lineup, [action.slot]: action.entry },
        offer: action.offer,
        pending: null,
        slotChoice: null,
        rolled: null,
        seenSeasons: [],
      };
    case "MOVE": {
      const moving = state.lineup[action.from];
      if (!moving) return state;
      const lineup = { ...state.lineup };
      delete lineup[action.from];
      lineup[action.to] = moving;
      return { ...state, lineup };
    }
    case "REMOVE": {
      const lineup = { ...state.lineup };
      delete lineup[action.slot];
      return { ...state, lineup, offer: action.offer };
    }
    case "MARK_EGG":
      return { ...state, eggShown: true };
    default:
      return state;
  }
}

function randomOf<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ------------------------------- board ---------------------------------- */

export function GameBoard({
  initialLeague,
  initialPool,
  initialOffer,
}: {
  initialLeague: League;
  initialPool: GamePoolPlayer[];
  /** Generated on the server and passed in so SSR and hydration agree (the
   *  offer is random; computing it during render would mismatch). */
  initialOffer: GamePoolPlayer[];
}) {
  const [state, dispatch] = useReducer(reducer, initialLeague, () =>
    freshState(initialPool, initialLeague, initialOffer),
  );
  const [result, setResult] = useState<SimResult | null>(null);
  const [seasonsCache, setSeasonsCache] = useState<Record<string, SeasonAverages[]>>({});
  const [poolError, setPoolError] = useState<string | null>(null);

  // Authoritative running record — recomputed by the backend on every change.
  useEffect(() => {
    const lines = entries(state.lineup).map((e) => ({
      player: e.player,
      season: e.season,
      pts: e.pts,
      reb: e.reb,
      ast: e.ast,
    }));
    const ctrl = new AbortController();
    simulateGame(lines, { signal: ctrl.signal })
      .then(setResult)
      .catch(() => {
        /* keep last good record on transient errors / aborts */
      });
    return () => ctrl.abort();
  }, [state.lineup]);

  // Load the pending player's seasons for the spin (cached per player).
  useEffect(() => {
    const p = state.pending;
    if (!p || seasonsCache[p.player]) return;
    const ctrl = new AbortController();
    getPlayerSeasons(p.player, { signal: ctrl.signal })
      .then((seasons) => setSeasonsCache((prev) => ({ ...prev, [p.player]: seasons })))
      .catch(() => {
        /* spin button stays disabled until seasons load */
      });
    return () => ctrl.abort();
  }, [state.pending, seasonsCache]);

  const open = openSlots(state.lineup);
  const filled = SLOTS.length - open.length;
  const showEgg = hasEasterEgg(state.lineup) && !state.eggShown;
  const pendingSeasons = state.pending ? (seasonsCache[state.pending.player] ?? null) : null;

  /* ---- handlers ---- */
  async function changeLeague(league: League) {
    if (league === state.league) return;
    try {
      setPoolError(null);
      const pool = await getGamePool(league);
      setResult(null);
      dispatch({ type: "INIT", pool, league, offer: makeOffer(pool, {}) });
    } catch (e) {
      setPoolError(e instanceof ApiError ? e.message : String(e));
    }
  }

  function respinOffer() {
    if (state.offerRespins <= 0) return;
    dispatch({ type: "RESPIN_OFFER", offer: makeOffer(state.pool, state.lineup) });
  }

  function draft(player: GamePoolPlayer) {
    const slots = eligibleOpenSlots(player, state.lineup);
    if (slots.length === 0) return;
    dispatch({ type: "DRAFT", player, slot: slots[0] });
  }

  function spin(respin: boolean) {
    if (!pendingSeasons) return;
    const choices = respin
      ? pendingSeasons.filter((s) => !state.seenSeasons.includes(s.season))
      : pendingSeasons;
    if (choices.length === 0) return;
    dispatch({ type: "ROLL", season: randomOf(choices), respin });
  }

  function lockIn() {
    const { pending, slotChoice, rolled } = state;
    if (!pending || !slotChoice || !rolled) return;
    const entry: LineupEntry = {
      player: pending.player,
      season: rolled.season,
      headshot_url: pending.headshot_url,
      position: pending.position,
      slots: pending.slots,
      pts: rolled.pts,
      reb: rolled.reb,
      ast: rolled.ast,
    };
    const lineup = { ...state.lineup, [slotChoice]: entry };
    dispatch({ type: "LOCK", entry, slot: slotChoice, offer: makeOffer(state.pool, lineup) });
  }

  function move(from: GameSlot, to: GameSlot) {
    dispatch({ type: "MOVE", from, to });
  }

  function remove(slot: GameSlot) {
    const lineup = { ...state.lineup };
    delete lineup[slot];
    dispatch({ type: "REMOVE", slot, offer: makeOffer(state.pool, lineup) });
  }

  function restart() {
    dispatch({ type: "RESET", offer: makeOffer(state.pool, {}) });
    setResult(null);
  }

  const inSpin = Boolean(state.pending && state.slotChoice);

  return (
    <div className="space-y-8">
      {showEgg ? <EggDialog bonus={67} onClose={() => dispatch({ type: "MARK_EGG" })} /> : null}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LeagueSegmented current={state.league} onChange={changeLeague} />
        <Button variant="ghost" size="sm" onClick={restart}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          Restart
        </Button>
      </div>

      {poolError ? (
        <p className="text-sm text-negative">Couldn&apos;t load the {state.league} pool: {poolError}</p>
      ) : null}

      <RecordHeader result={result} filled={filled} />

      <SlotStrip lineup={state.lineup} onMove={move} onRemove={remove} />

      {/* Draft area */}
      {inSpin && state.pending && state.slotChoice ? (
        <SpinPanel
          player={state.pending.player}
          slot={state.slotChoice}
          rolled={state.rolled}
          seasons={pendingSeasons}
          seasonRespins={state.seasonRespins}
          seenSeasons={state.seenSeasons}
          onSpin={spin}
          onLock={lockIn}
          onCancel={() => dispatch({ type: "CANCEL_PENDING" })}
        />
      ) : open.length > 0 ? (
        <OfferCards
          offer={state.offer}
          lineup={state.lineup}
          offerRespins={state.offerRespins}
          onDraft={draft}
          onRespin={respinOffer}
        />
      ) : (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <Kicker tone={filled === 5 && (result?.wins ?? 0) >= 82 ? "accent" : "info"}>
              {filled === 5 && (result?.wins ?? 0) >= 82 ? "Undefeated!" : "Squad set"}
            </Kicker>
            <p className="mt-1 text-sm text-muted">
              All five drafted. Restart to gamble a new lineup.
            </p>
          </div>
          <Button onClick={restart}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            New game
          </Button>
        </Card>
      )}

      {/* Contributions */}
      {result && result.contributions.length > 0 ? (
        <Card className="p-5">
          <Kicker className="mb-4">Lineup PRA</Kicker>
          <ContributionBars contributions={result.contributions} />
          <p className="mt-4 text-xs text-dim">
            Record is driven by total PRA (points + rebounds + assists) across your five — 240
            equals a perfect 82-0.
          </p>
        </Card>
      ) : null}
    </div>
  );
}

/* --------------------------- sub-components ------------------------------ */

function LeagueSegmented({
  current,
  onChange,
}: {
  current: League;
  onChange: (l: League) => void;
}) {
  const leagues: League[] = ["NBA", "WNBA"];
  return (
    <div role="group" aria-label="League" className="inline-flex rounded-lg border border-border bg-card-2 p-0.5">
      {leagues.map((l) => {
        const active = l === current;
        return (
          <button
            key={l}
            type="button"
            onClick={() => onChange(l)}
            aria-pressed={active}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 cursor-pointer",
              active ? "bg-accent text-accent-foreground" : "text-muted hover:text-fg",
            )}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

function SlotStrip({
  lineup,
  onMove,
  onRemove,
}: {
  lineup: Lineup;
  onMove: (from: GameSlot, to: GameSlot) => void;
  onRemove: (slot: GameSlot) => void;
}) {
  const open = openSlots(lineup);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {SLOTS.map((slot) => {
        const e = lineup[slot];
        const targets = e ? SLOTS.filter((s) => s !== slot && open.includes(s) && e.slots.includes(s)) : [];
        return (
          <Card key={slot} className="flex flex-col p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-medium uppercase tracking-[0.1em] text-dim">
                {slot}
              </span>
              {e ? (
                <button
                  type="button"
                  onClick={() => onRemove(slot)}
                  aria-label={`Remove ${e.player} from ${SLOT_LABELS[slot]}`}
                  className="text-dim transition-colors duration-150 hover:text-negative cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              ) : null}
            </div>

            {e ? (
              <div className="mt-2 flex flex-1 flex-col items-center text-center">
                <PlayerAvatar name={e.player} src={e.headshot_url} size={48} />
                <span className="mt-2 line-clamp-2 text-sm font-medium leading-tight text-fg">
                  {e.player}
                </span>
                <span className="font-mono text-[0.7rem] text-dim">{e.season}</span>
                <span className="mt-1 font-mono text-xs text-accent-text tabular-nums">
                  {pra(e).toFixed(0)} PRA
                </span>
                {targets.length > 0 ? (
                  <div className="mt-2 flex flex-wrap justify-center gap-1">
                    {targets.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => onMove(slot, t)}
                        aria-label={`Move ${e.player} to ${SLOT_LABELS[t]}`}
                        className="rounded border border-border px-1.5 py-0.5 font-mono text-[0.65rem] text-muted transition-colors duration-150 hover:border-accent hover:text-fg cursor-pointer"
                      >
                        →{t}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-2 flex flex-1 flex-col items-center justify-center py-5 text-center">
                <span className="text-xs text-dim">{SLOT_LABELS[slot]}</span>
                <span className="mt-1 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-dim">
                  open
                </span>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function OfferCards({
  offer,
  lineup,
  offerRespins,
  onDraft,
  onRespin,
}: {
  offer: GamePoolPlayer[];
  lineup: Lineup;
  offerRespins: number;
  onDraft: (p: GamePoolPlayer) => void;
  onRespin: () => void;
}) {
  const open = openSlots(lineup);
  return (
    <Card className="p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Kicker>Draft a player</Kicker>
          <p className="mt-1 text-sm text-muted">
            Open: <span className="font-mono text-fg">{open.join(" · ")}</span>
          </p>
        </div>
        <Button variant="subtle" size="sm" onClick={onRespin} disabled={offerRespins <= 0}>
          <Dices className="h-4 w-4" aria-hidden />
          Re-spin ({offerRespins})
        </Button>
      </div>

      {offer.length === 0 ? (
        <p className="text-sm text-muted">No players left in the pool.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {offer.map((p) => {
            const elig = eligibleOpenSlots(p, lineup);
            const can = elig.length > 0;
            return (
              <div
                key={p.player}
                className="flex flex-col items-center rounded-card border border-border bg-card-2 p-3 text-center"
              >
                <PlayerAvatar name={p.player} src={p.headshot_url} size={52} />
                <span className="mt-2 line-clamp-2 min-h-[2.5em] text-sm font-semibold leading-tight text-fg">
                  {p.player}
                </span>
                <span className="font-mono text-[0.68rem] text-dim">Plays {p.slots.join("/")}</span>
                <span className="font-mono text-xs tabular-nums text-muted">
                  best {pra(p).toFixed(0)} PRA
                </span>
                <Button
                  size="sm"
                  variant={can ? "primary" : "subtle"}
                  disabled={!can}
                  onClick={() => onDraft(p)}
                  aria-label={can ? `Draft ${p.player}` : `${p.player} has no open spot`}
                  className="mt-2 w-full"
                >
                  {can ? `Draft → ${elig.join("/")}` : "No open spot"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function SpinPanel({
  player,
  slot,
  rolled,
  seasons,
  seasonRespins,
  seenSeasons,
  onSpin,
  onLock,
  onCancel,
}: {
  player: string;
  slot: GameSlot;
  rolled: SeasonAverages | null;
  seasons: SeasonAverages[] | null;
  seasonRespins: number;
  seenSeasons: string[];
  onSpin: (respin: boolean) => void;
  onLock: () => void;
  onCancel: () => void;
}) {
  const loading = seasons === null;
  const unseen = seasons ? seasons.filter((s) => !seenSeasons.includes(s.season)) : [];
  const canRespin = seasonRespins < SEASON_RESPINS && unseen.length > 0;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Kicker>Spin a season</Kicker>
          <p className="mt-1 text-sm text-muted">
            {player} → <span className="font-mono text-accent-text">{slot}</span>
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Pick someone else
        </Button>
      </div>

      <div className="mt-5">
        {loading ? (
          <p className="py-6 text-center text-sm text-dim">Loading seasons…</p>
        ) : rolled === null ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted">
              {player} has {seasons.length} {seasons.length === 1 ? "season" : "seasons"} — spin to
              roll one.
            </p>
            <Button size="lg" onClick={() => onSpin(false)} disabled={seasons.length === 0}>
              <Dices className="h-4 w-4" aria-hidden />
              Spin for season
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-dim">
              {rolled.season} season
            </span>
            <p className="font-display text-2xl font-semibold tabular-nums text-fg">
              {fmtStat(rolled.pts)} <span className="text-dim">/</span> {fmtStat(rolled.reb)}{" "}
              <span className="text-dim">/</span> {fmtStat(rolled.ast)}
            </p>
            <p className="text-xs text-muted">
              PTS / REB / AST →{" "}
              <span className="font-mono text-accent-text tabular-nums">
                {pra(rolled).toFixed(1)} PRA
              </span>
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Button onClick={onLock}>
                <Check className="h-4 w-4" aria-hidden />
                Lock in {rolled.season}
              </Button>
              <Button variant="subtle" onClick={() => onSpin(true)} disabled={!canRespin}>
                <Dices className="h-4 w-4" aria-hidden />
                Spin again ({SEASON_RESPINS - seasonRespins} left)
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
