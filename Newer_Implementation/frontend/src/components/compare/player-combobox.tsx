"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { League, PlayerSummary } from "@/lib/types";

/**
 * Accessible search combobox for picking a player. URL-driven: selecting a
 * player navigates to /compare with this slot updated, so the comparison is
 * server-rendered and shareable. Full keyboard support (↑/↓/Enter/Esc).
 */
export function PlayerCombobox({
  players,
  value,
  slot,
  otherValue,
  otherSeason,
  league,
  tone,
  label,
}: {
  players: PlayerSummary[];
  value?: string;
  slot: "a" | "b";
  otherValue?: string;
  /** The other slot's season scope ("career" or a season) — preserved on change. */
  otherSeason?: string;
  league: League;
  tone: "a" | "b";
  label: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = `cmb-${slot}-list`;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Exclude the other slot's player so you can't compare someone with themselves.
    const avail = otherValue ? players.filter((p) => p.player !== otherValue) : players;
    return (q ? avail.filter((p) => p.player.toLowerCase().includes(q)) : avail).slice(0, 40);
  }, [players, query, otherValue]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function navigate(name: string | null) {
    const params = new URLSearchParams({ league });
    const a = slot === "a" ? name : (otherValue ?? null);
    const b = slot === "b" ? name : (otherValue ?? null);
    if (a) params.set("a", a);
    if (b) params.set("b", b);
    // Preserve the other player's season; the changed player's season resets to career.
    const otherSeasonKey = slot === "a" ? "sb" : "sa";
    if (otherSeason && otherSeason !== "career") params.set(otherSeasonKey, otherSeason);
    // scroll: false keeps the viewport put instead of jumping to the top.
    router.push(`/compare?${params.toString()}`, { scroll: false });
  }

  function choose(name: string) {
    setOpen(false);
    setQuery("");
    navigate(name);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[active]) {
        e.preventDefault();
        choose(filtered[active].player);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span
          className={cn("h-2 w-2 rounded-full", tone === "a" ? "bg-chart-1" : "bg-chart-2")}
          aria-hidden
        />
        <span className="font-mono text-xs uppercase tracking-[0.12em] text-dim">{label}</span>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim"
          aria-hidden
        />
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={label}
          aria-activedescendant={open && filtered[active] ? `${listId}-${active}` : undefined}
          value={open ? query : (value ?? "")}
          onFocus={() => {
            setOpen(true);
            setQuery("");
            setActive(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={`Search ${league} players…`}
          className="w-full rounded-lg border border-border bg-card-2 py-2.5 pl-9 pr-9 text-sm text-fg placeholder:text-dim focus-visible:border-accent focus-visible:outline-none"
        />
        {value && !open ? (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              navigate(null);
            }}
            aria-label={`Clear ${label}`}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-dim transition-colors duration-150 hover:text-fg"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label} options`}
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border-strong bg-card shadow-pop"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">No players match.</li>
          ) : (
            filtered.map((p, i) => (
              <li
                key={p.player}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={p.player === value}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(p.player);
                }}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm",
                  i === active ? "bg-card-2 text-fg" : "text-muted",
                )}
              >
                <span className="truncate">{p.player}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-dim">
                  {p.first_season}–{p.last_season}
                </span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
