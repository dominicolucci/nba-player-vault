"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { fmtStat } from "@/lib/format";
import { matchup } from "@/lib/stats";
import type { GameLog } from "@/lib/types";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${MONTHS[Number(m) - 1]} ${Number(d)} '${y.slice(2)}`;
}

function makesAttempts(makes: number, attempts: number): string {
  return `${makes}-${attempts}`;
}

export function GameLogTable({ games, seasons }: { games: GameLog[]; seasons: string[] }) {
  const [season, setSeason] = useState("all");
  const rows = useMemo(
    () => (season === "all" ? games : games.filter((g) => g.season === season)),
    [games, season],
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-dim">
          {rows.length} {rows.length === 1 ? "game" : "games"}
        </p>
        <label className="relative">
          <span className="sr-only">Filter game log by season</span>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="appearance-none rounded-lg border border-border bg-card-2 py-1.5 pl-3 pr-8 text-sm text-fg cursor-pointer transition-colors duration-150 hover:border-border-strong focus-visible:border-accent focus-visible:outline-none"
          >
            <option value="all">All seasons</option>
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
      </div>

      <Table containerClassName="max-h-[34rem] overflow-y-auto">
        <THead className="sticky top-0 z-10 [&_th]:bg-panel">
          <TR>
            <TH>Date</TH>
            <TH>Matchup</TH>
            <TH numeric>MIN</TH>
            <TH numeric>PTS</TH>
            <TH numeric>REB</TH>
            <TH numeric>AST</TH>
            <TH numeric>STL</TH>
            <TH numeric>BLK</TH>
            <TH numeric>TOV</TH>
            <TH numeric>FG</TH>
            <TH numeric>3P</TH>
            <TH numeric>FT</TH>
            <TH numeric>GmSc</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((g, i) => (
            <TR key={`${g.date}-${i}`} interactive>
              <TD className="whitespace-nowrap text-muted">{fmtDate(g.date)}</TD>
              <TD className="whitespace-nowrap">
                <span className="inline-flex items-center gap-2">
                  <span className="text-fg">{matchup(g)}</span>
                  <Badge tone={g.result === "W" ? "positive" : "negative"}>{g.result}</Badge>
                </span>
              </TD>
              <TD numeric className="text-muted">{g.min}</TD>
              <TD numeric className="font-medium text-accent-text">{g.pts}</TD>
              <TD numeric>{g.reb}</TD>
              <TD numeric>{g.ast}</TD>
              <TD numeric>{g.stl}</TD>
              <TD numeric>{g.blk}</TD>
              <TD numeric className="text-muted">{g.tov}</TD>
              <TD numeric className="text-muted">{makesAttempts(g.fg, g.fga)}</TD>
              <TD numeric className="text-muted">{makesAttempts(g.fg3, g.fg3a)}</TD>
              <TD numeric className="text-muted">{makesAttempts(g.ft, g.fta)}</TD>
              <TD numeric>{fmtStat(g.gmsc, 1)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
