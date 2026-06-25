"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { Badge, Card, Sparkline, Stat, StatGrid } from "@/components/ui";
import { cn } from "@/lib/cn";
import { fmtInt, fmtPct, fmtStat } from "@/lib/format";
import type { League } from "@/lib/types";

export interface HeroCard {
  player: string;
  headshot_url: string | null;
  league: League;
  games: number;
  ppg: number;
  rpg: number;
  apg: number;
  tp_pct: number | null;
  /** Per-season scoring averages, oldest → newest. */
  trajectory: number[];
}

const ROTATE_MS = 4500;

/**
 * Hero card that auto-rotates through featured players (20+ PPG career). Pauses
 * on hover/focus, honours prefers-reduced-motion, and exposes dot controls.
 */
export function RotatingHeroCard({ cards }: { cards: HeroCard[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const count = cards.length;

  useEffect(() => {
    if (count <= 1 || paused || reducedMotion) return;
    const id = window.setInterval(() => setIndex((p) => (p + 1) % count), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [count, paused, reducedMotion]);

  if (count === 0) return null;
  const card = cards[Math.min(index, count - 1)];

  return (
    <div
      ref={wrapRef}
      aria-roledescription="carousel"
      aria-label="Featured 20+ PPG career scorers"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <Card className="overflow-hidden shadow-card">
        {/* Rotating content (re-mounts per index to replay the entrance) */}
        <div key={card.player} className="animate-hero-in motion-reduce:animate-none">
          <div className="flex items-center gap-4 p-5">
            <PlayerAvatar name={card.player} src={card.headshot_url} size={56} ring />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold text-fg">{card.player}</p>
              <p className="text-xs text-dim">Career · {fmtInt(card.games)} games</p>
            </div>
            <Badge tone="accent" mono className="ml-auto">
              {card.league}
            </Badge>
          </div>

          <div className="border-y border-border px-5 py-4">
            <StatGrid columns={4} className="!gap-4">
              <Stat size="sm" align="center" value={fmtStat(card.ppg)} label="PPG" />
              <Stat size="sm" align="center" value={fmtStat(card.rpg)} label="RPG" />
              <Stat size="sm" align="center" value={fmtStat(card.apg)} label="APG" />
              <Stat size="sm" align="center" value={fmtPct(card.tp_pct)} label="3PT" />
            </StatGrid>
          </div>

          <div className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-dim">
                Scoring trajectory
              </p>
              <p className="mt-1 text-xs text-muted">Season over season</p>
            </div>
            <Sparkline
              data={card.trajectory}
              width={180}
              height={48}
              aria-label={`${card.player} scoring trajectory by season`}
            />
          </div>
        </div>

        {/* Dot controls */}
        {count > 1 ? (
          <div className="flex items-center justify-center gap-2 border-t border-border bg-panel py-3">
            {cards.map((c, i) => {
              const active = i === index;
              return (
                <button
                  key={c.player}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show ${c.player}`}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "h-2 rounded-full transition-all duration-200 cursor-pointer",
                    active ? "w-5 bg-accent" : "w-2 bg-border-strong hover:bg-dim",
                  )}
                />
              );
            })}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
