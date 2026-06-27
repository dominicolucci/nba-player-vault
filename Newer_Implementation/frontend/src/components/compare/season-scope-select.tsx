"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import type { League } from "@/lib/types";

/**
 * Per-player scope picker for the compare page: "Career" (default) or any of
 * that player's seasons. Navigates on change, preserving the other player's
 * selection (URL-driven, shareable).
 */
export function SeasonScopeSelect({
  seasons,
  value,
  slot,
  league,
  a,
  b,
  sa,
  sb,
}: {
  seasons: string[];
  value: string; // "career" or a season
  slot: "a" | "b";
  league: League;
  a?: string;
  b?: string;
  sa: string; // current scope for A ("career" or season)
  sb: string; // current scope for B
}) {
  const router = useRouter();

  function go(next: string) {
    const params = new URLSearchParams({ league });
    if (a) params.set("a", a);
    if (b) params.set("b", b);
    const nextSa = slot === "a" ? next : sa;
    const nextSb = slot === "b" ? next : sb;
    if (nextSa && nextSa !== "career") params.set("sa", nextSa);
    if (nextSb && nextSb !== "career") params.set("sb", nextSb);
    // scroll: false keeps the viewport in place (the season selects sit lower down).
    router.push(`/compare?${params.toString()}`, { scroll: false });
  }

  return (
    <label className="relative block">
      <span className="sr-only">Season for {slot === "a" ? "Player A" : "Player B"}</span>
      <select
        value={value}
        onChange={(e) => go(e.target.value)}
        className="w-full appearance-none rounded-lg border border-border bg-card-2 py-2 pl-3 pr-8 text-sm text-fg cursor-pointer transition-colors duration-150 hover:border-border-strong focus-visible:border-accent focus-visible:outline-none"
      >
        <option value="career">Career</option>
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
