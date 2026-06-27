"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AvgStat, League } from "@/lib/types";

/** Season dropdown for single-season leaderboards; navigates on change (SSR-shareable URLs). */
export function SeasonSelect({
  seasons,
  current,
  league,
  stat,
}: {
  seasons: string[];
  current: string;
  league: League;
  stat: AvgStat;
}) {
  const router = useRouter();

  function go(season: string) {
    const params = new URLSearchParams({ league, mode: "season", stat, season });
    router.push(`/leaderboards?${params.toString()}`);
  }

  return (
    <label className="relative">
      <span className="sr-only">Season</span>
      <select
        value={current}
        onChange={(e) => go(e.target.value)}
        className="appearance-none rounded-lg border border-border bg-card-2 py-1.5 pl-3 pr-8 text-sm text-fg cursor-pointer transition-colors duration-150 hover:border-border-strong focus-visible:border-accent focus-visible:outline-none"
      >
        {seasons.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dim"
        aria-hidden
      />
    </label>
  );
}
