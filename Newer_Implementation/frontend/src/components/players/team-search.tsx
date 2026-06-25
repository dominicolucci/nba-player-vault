"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Kicker } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { League, TeamSummary } from "@/lib/types";

/**
 * Team list with a live filter. `teams` is already scoped to the active league
 * (NBA or WNBA) by the server fetch, so the search only ever matches teams in
 * that league. Chips remain shareable links into the roster view.
 */
export function TeamSearch({
  teams,
  league,
  selectedTeam,
}: {
  teams: TeamSummary[];
  league: League;
  selectedTeam?: string;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const filtered = useMemo(
    () => (needle ? teams.filter((t) => t.team.toLowerCase().includes(needle)) : teams),
    [teams, needle],
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Kicker tone="info">
          {filtered.length} {filtered.length === 1 ? "team" : "teams"} · {league}
        </Kicker>
        <label className="relative w-full sm:w-64">
          <span className="sr-only">Search {league} teams</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${league} teams…`}
            className="w-full rounded-lg border border-border bg-card-2 py-2 pl-9 pr-3 text-sm text-fg placeholder:text-dim focus-visible:border-accent focus-visible:outline-none"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">
          No {league} teams match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {filtered.map((t) => {
            const active = t.team === selectedTeam;
            return (
              <li key={t.team}>
                <Link
                  href={`/players?league=${league}&team=${encodeURIComponent(t.team)}`}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors duration-150",
                    active
                      ? "border-accent bg-accent-soft text-accent-text"
                      : "border-border bg-card-2 text-muted hover:border-border-strong hover:text-fg",
                  )}
                >
                  {t.team}
                  <span className="font-mono text-xs tabular-nums text-dim">{t.count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
