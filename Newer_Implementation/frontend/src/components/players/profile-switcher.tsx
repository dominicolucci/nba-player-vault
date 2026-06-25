"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { LeagueToggle } from "./league-toggle";
import type { League, TeamPlayer, TeamSummary } from "@/lib/types";

const selectClass =
  "appearance-none rounded-lg border border-border bg-card-2 py-1.5 pl-3 pr-8 text-sm text-fg " +
  "cursor-pointer transition-colors duration-150 hover:border-border-strong focus-visible:border-accent focus-visible:outline-none";

function SelectShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dim"
        aria-hidden
      />
    </div>
  );
}

export interface ProfileSwitcherProps {
  league: League;
  team: string;
  teams: TeamSummary[];
  teammates: TeamPlayer[];
  currentPlayer: string;
}

/** Compact league / team / player switcher kept atop the profile. */
export function ProfileSwitcher({
  league,
  team,
  teams,
  teammates,
  currentPlayer,
}: ProfileSwitcherProps) {
  const router = useRouter();
  const teamInList = teams.some((t) => t.team === team);
  const playerInList = teammates.some((p) => p.player === currentPlayer);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <LeagueToggle current={league} hrefFor={(l) => `/players?league=${l}`} />

      {teams.length > 0 ? (
        <SelectShell>
          <select
            aria-label="Browse a team"
            value={teamInList ? team : ""}
            onChange={(e) =>
              router.push(`/players?league=${league}&team=${encodeURIComponent(e.target.value)}`)
            }
            className={selectClass}
          >
            {!teamInList ? <option value="">{team || "Select team"}</option> : null}
            {teams.map((t) => (
              <option key={t.team} value={t.team}>
                {t.team}
              </option>
            ))}
          </select>
        </SelectShell>
      ) : null}

      {teammates.length > 0 ? (
        <SelectShell>
          <select
            aria-label="Switch player"
            value={currentPlayer}
            onChange={(e) => {
              if (e.target.value !== currentPlayer) {
                router.push(`/players/${encodeURIComponent(e.target.value)}`);
              }
            }}
            className={selectClass}
          >
            {!playerInList ? <option value={currentPlayer}>{currentPlayer}</option> : null}
            {teammates.map((p) => (
              <option key={p.player} value={p.player}>
                {p.player}
              </option>
            ))}
          </select>
        </SelectShell>
      ) : null}
    </div>
  );
}
