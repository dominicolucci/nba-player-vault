"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PlayerAvatar } from "./player-avatar";
import { Card } from "@/components/ui";
import { fmtStat } from "@/lib/format";
import type { TeamPlayer } from "@/lib/types";

/** Filterable grid of player cards that link to each player's profile. */
export function PlayerGrid({ players }: { players: TeamPlayer[] }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const filtered = useMemo(
    () => (needle ? players.filter((p) => p.player.toLowerCase().includes(needle)) : players),
    [players, needle],
  );

  return (
    <div>
      <label className="relative block max-w-sm">
        <span className="sr-only">Filter players by name</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter players…"
          className="w-full rounded-lg border border-border bg-card-2 py-2 pl-9 pr-3 text-sm text-fg placeholder:text-dim focus-visible:border-accent focus-visible:outline-none"
        />
      </label>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          No players match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <li key={p.player}>
              <Link
                href={`/players/${encodeURIComponent(p.player)}`}
                className="block rounded-card focus-visible:outline-none"
              >
                <Card interactive className="flex items-center gap-3 p-3">
                  <PlayerAvatar name={p.player} src={p.headshot_url} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display font-semibold text-fg">
                      {p.player}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-dim">
                      {fmtStat(p.ppg)} PPG career
                    </span>
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
