import { PlayerAvatar } from "@/components/players/player-avatar";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { fmtPct, fmtStat } from "@/lib/format";
import type { CareerAverages, League } from "@/lib/types";

/** One side of the comparison — career or a single season's averages. */
export interface CompareSide {
  player: string;
  league: League;
  headshot_url: string | null;
  /** Display label for the scope, e.g. "Career" or "2023-24". */
  scope: string;
  /** Stat line (career or season averages — structurally compatible). */
  line: CareerAverages;
}

type CatKey = keyof Pick<
  CareerAverages,
  "pts" | "reb" | "ast" | "stl" | "blk" | "tov" | "fg_pct" | "fg3_pct" | "ft_pct" | "gmsc" | "min"
>;

const CATEGORIES: { key: CatKey; label: string; lowerBetter?: boolean; pct?: boolean }[] = [
  { key: "pts", label: "PTS" },
  { key: "reb", label: "REB" },
  { key: "ast", label: "AST" },
  { key: "stl", label: "STL" },
  { key: "blk", label: "BLK" },
  { key: "tov", label: "TOV", lowerBetter: true },
  { key: "fg_pct", label: "FG%", pct: true },
  { key: "fg3_pct", label: "3P%", pct: true },
  { key: "ft_pct", label: "FT%", pct: true },
  { key: "gmsc", label: "GmSc" },
  { key: "min", label: "MPG" },
];

type Winner = "a" | "b" | "tie" | "none";

function winnerOf(a: number | null, b: number | null, lowerBetter?: boolean): Winner {
  if (a === null || b === null) return "none";
  if (a === b) return "tie";
  const aBetter = lowerBetter ? a < b : a > b;
  return aBetter ? "a" : "b";
}

function format(value: number | null, pct?: boolean): string {
  return pct ? fmtPct(value) : fmtStat(value, 1);
}

function PlayerHead({
  side,
  tone,
  align,
  control,
}: {
  side: CompareSide;
  tone: "a" | "b";
  align: "left" | "right";
  control?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-3", align === "right" ? "items-end" : "items-start")}>
      <div
        className={cn(
          "flex items-center gap-3",
          align === "right" ? "flex-row-reverse text-right" : "text-left",
        )}
      >
        <PlayerAvatar
          name={side.player}
          src={side.headshot_url}
          size={56}
          ring
          ringTone={tone === "a" ? "accent" : "info"}
        />
        <div className="min-w-0">
          <p className="truncate font-display font-semibold text-fg">{side.player}</p>
          <p className="font-mono text-xs tabular-nums text-dim">{side.line.games} games</p>
          <Badge tone={tone === "a" ? "accent" : "info"} mono className="mt-1">
            {side.league}
          </Badge>
        </div>
      </div>
      {control ? <div className="w-32 sm:w-40">{control}</div> : null}
    </div>
  );
}

/** Side-by-side, category-by-category comparison of two stat lines. */
export function ComparisonBoard({
  a,
  b,
  aSeasonControl,
  bSeasonControl,
}: {
  a: CompareSide;
  b: CompareSide;
  /** Per-player season scope pickers, rendered beside each player card. */
  aSeasonControl?: React.ReactNode;
  bSeasonControl?: React.ReactNode;
}) {
  let aWins = 0;
  let bWins = 0;
  for (const c of CATEGORIES) {
    const w = winnerOf(a.line[c.key], b.line[c.key], c.lowerBetter);
    if (w === "a") aWins += 1;
    else if (w === "b") bWins += 1;
  }

  return (
    <div className="mt-10">
      {/* Player headers + category tally */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 sm:gap-6">
        <PlayerHead side={a} tone="a" align="right" control={aSeasonControl} />
        <div className="pt-1 text-center">
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-dim">vs</span>
          <p className="mt-1 font-mono text-base tabular-nums text-fg">
            <span className={aWins >= bWins ? "text-accent-text" : undefined}>{aWins}</span>
            <span className="text-dim">–</span>
            <span className={bWins > aWins ? "text-info-text" : undefined}>{bWins}</span>
          </p>
          <p className="text-[0.62rem] uppercase tracking-wide text-dim">categories</p>
        </div>
        <PlayerHead side={b} tone="b" align="left" control={bSeasonControl} />
      </div>

      {/* Category rows */}
      <div className="mt-8 overflow-hidden rounded-card border border-border">
        {CATEGORIES.map((c, idx) => {
          const av = a.line[c.key];
          const bv = b.line[c.key];
          const w = winnerOf(av, bv, c.lowerBetter);
          const an = Number(av) || 0;
          const bn = Number(bv) || 0;
          const total = an + bn;
          const aShare = total > 0 ? (an / total) * 100 : 50;
          return (
            <div
              key={c.key}
              className={cn(
                "grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 sm:gap-6",
                idx % 2 === 1 ? "bg-panel" : "bg-card",
              )}
            >
              <div className="text-right font-mono text-lg tabular-nums">
                <span className={w === "a" ? "font-semibold text-accent-text" : "text-muted"}>
                  {format(av, c.pct)}
                </span>
              </div>

              <div className="w-24 sm:w-44">
                <p className="text-center font-mono text-[0.66rem] uppercase tracking-[0.1em] text-dim">
                  {c.label}
                </p>
                <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-card-2" aria-hidden>
                  <span className="bg-chart-1" style={{ width: `${aShare}%` }} />
                  <span className="bg-chart-2" style={{ width: `${100 - aShare}%` }} />
                </div>
              </div>

              <div className="text-left font-mono text-lg tabular-nums">
                <span className={w === "b" ? "font-semibold text-info-text" : "text-muted"}>
                  {format(bv, c.pct)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs text-dim">
        Higher wins each category (turnovers: lower wins). Shooting %s are volume-weighted.
      </p>
    </div>
  );
}
