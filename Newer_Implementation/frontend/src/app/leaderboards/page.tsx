import type { Metadata } from "next";
import Link from "next/link";
import { ConnectionNotice } from "@/components/data/connection-notice";
import { LeagueToggle } from "@/components/players/league-toggle";
import { SeasonSelect } from "@/components/leaderboards/season-select";
import { Container, Kicker, PageHeader, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { ApiError, getLeaderboards, getSeasons } from "@/lib/api";
import { cn } from "@/lib/cn";
import { fmtPct, fmtStat } from "@/lib/format";
import { AVG_STATS, STAT_META, type AvgStat, type League, type LeaderboardRow } from "@/lib/types";

export const metadata: Metadata = {
  title: "Leaderboards",
  description: "All-time and single-season NBA & WNBA statistical leaderboards.",
};

type Mode = "alltime" | "season";
const ROW_LIMIT = 25;

function normalizeLeague(v?: string): League {
  return v?.toUpperCase() === "WNBA" ? "WNBA" : "NBA";
}
function normalizeStat(v?: string): AvgStat {
  return (AVG_STATS as readonly string[]).includes(v ?? "") ? (v as AvgStat) : "pts";
}
function errMessage(e: unknown): string {
  return e instanceof ApiError ? `${e.status || ""} ${e.message}`.trim() : String(e);
}
function formatValue(stat: AvgStat, v: number): string {
  return STAT_META[stat].kind === "percent" ? fmtPct(v) : fmtStat(v, 1);
}

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string; mode?: string; stat?: string; season?: string }>;
}) {
  const sp = await searchParams;
  const league = normalizeLeague(sp.league);
  const stat = normalizeStat(sp.stat);
  const mode: Mode = sp.mode === "season" ? "season" : "alltime";

  // URL builder that preserves the relevant params.
  function href(p: { league?: League; mode?: Mode; stat?: AvgStat; season?: string }) {
    const l = p.league ?? league;
    const m = p.mode ?? mode;
    const s = p.stat ?? stat;
    const params = new URLSearchParams({ league: l, mode: m, stat: s });
    if (m === "season" && p.season) params.set("season", p.season);
    return `/leaderboards?${params.toString()}`;
  }

  // Resolve the season list + active season (single-season mode only).
  let seasonList: string[] = [];
  let season: string | undefined;
  let loadError: string | undefined;
  if (mode === "season") {
    try {
      seasonList = await getSeasons(league, { revalidate: 0 });
      season = sp.season && seasonList.includes(sp.season) ? sp.season : seasonList[0];
    } catch (e) {
      loadError = errMessage(e);
    }
  }

  let rows: LeaderboardRow[] = [];
  if (!loadError) {
    try {
      rows = await getLeaderboards(
        { stat, league, limit: ROW_LIMIT, season: mode === "season" ? season : undefined },
        { revalidate: 0 },
      );
    } catch (e) {
      loadError = errMessage(e);
    }
  }

  const maxValue = rows.length > 0 ? Number(rows[0][stat]) || 0 : 0;
  const scope = mode === "season" ? (season ?? "—") : "All-time";

  return (
    <Container>
      <div className="py-12">
        <PageHeader
          kicker="Leaderboards"
          title="Who leads the league"
          description="All-time and single-season rankings across every major category — shooting percentages are volume-weighted (total makes ÷ attempts), not averaged."
          actions={<LeagueToggle current={league} hrefFor={(l) => href({ league: l })} />}
        />

        {/* Controls */}
        <div className="mt-8 flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Mode toggle */}
            <div
              role="group"
              aria-label="Leaderboard range"
              className="inline-flex rounded-lg border border-border bg-card-2 p-0.5"
            >
              {(["alltime", "season"] as Mode[]).map((m) => {
                const active = m === mode;
                return (
                  <Link
                    key={m}
                    href={href({ mode: m })}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors duration-150",
                      active ? "bg-accent text-accent-foreground" : "text-muted hover:text-fg",
                    )}
                  >
                    {m === "alltime" ? "All-time" : "Single-season"}
                  </Link>
                );
              })}
            </div>
            {mode === "season" && seasonList.length > 0 && season ? (
              <SeasonSelect seasons={seasonList} current={season} league={league} stat={stat} />
            ) : null}
          </div>

          {/* Category selector */}
          <div>
            <Kicker tone="muted" className="mb-2.5">
              Category
            </Kicker>
            <ul className="flex flex-wrap gap-2">
              {AVG_STATS.map((st) => {
                const active = st === stat;
                return (
                  <li key={st}>
                    <Link
                      href={href({ stat: st, season: mode === "season" ? season : undefined })}
                      aria-current={active ? "true" : undefined}
                      title={STAT_META[st].long}
                      className={cn(
                        "inline-flex rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors duration-150",
                        active
                          ? "border-accent bg-accent-soft text-accent-text"
                          : "border-border bg-card-2 text-muted hover:border-border-strong hover:text-fg",
                      )}
                    >
                      {STAT_META[st].label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Table */}
        <section className="mt-8">
          {loadError ? (
            <ConnectionNotice detail={loadError} />
          ) : rows.length === 0 ? (
            <p className="text-muted">No leaderboard data for this selection.</p>
          ) : (
            <>
              <Kicker className="mb-4">
                {STAT_META[stat].long} · {scope} · {league}
              </Kicker>
              <Table>
                <THead>
                  <TR>
                    <TH className="w-12">#</TH>
                    <TH>Player</TH>
                    <TH numeric>GP</TH>
                    <TH numeric>{STAT_META[stat].label}</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((r, i) => {
                    const value = Number(r[stat]) || 0;
                    const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
                    return (
                      <TR key={`${r.player}-${i}`} interactive>
                        <TD
                          className={cn(
                            "font-mono tabular-nums",
                            i < 3 ? "text-accent-text" : "text-dim",
                          )}
                        >
                          {i + 1}
                        </TD>
                        <TD>
                          <Link
                            href={`/players/${encodeURIComponent(r.player)}`}
                            className="font-medium text-fg transition-colors duration-150 hover:text-accent-text"
                          >
                            {r.player}
                          </Link>
                        </TD>
                        <TD numeric className="text-muted">
                          {r.games}
                        </TD>
                        <TD numeric>
                          <div className="flex items-center justify-end gap-3">
                            <span
                              aria-hidden
                              className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-card-2 sm:block lg:w-28"
                            >
                              <span
                                className="block h-full rounded-full bg-accent"
                                style={{ width: `${pct}%` }}
                              />
                            </span>
                            <span className="w-16 text-right font-mono font-medium tabular-nums text-accent-text">
                              {formatValue(stat, value)}
                            </span>
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </>
          )}
        </section>
      </div>
    </Container>
  );
}
