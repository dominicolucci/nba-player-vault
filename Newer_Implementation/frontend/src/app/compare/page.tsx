import type { Metadata } from "next";
import { ComparisonBoard, type CompareSide } from "@/components/compare/comparison-board";
import { PlayerCombobox } from "@/components/compare/player-combobox";
import { SeasonScopeSelect } from "@/components/compare/season-scope-select";
import { ConnectionNotice } from "@/components/data/connection-notice";
import { LeagueToggle } from "@/components/players/league-toggle";
import { Card, Container, PageHeader } from "@/components/ui";
import { ApiError, comparePlayers, getPlayerSeasons, listPlayers } from "@/lib/api";
import type { CompareEntry, League, PlayerSummary, SeasonAverages } from "@/lib/types";

export const metadata: Metadata = {
  title: "Compare",
  description: "Head-to-head career or single-season comparison of any two NBA or WNBA players.",
};

function normalizeLeague(v?: string): League {
  return v?.toUpperCase() === "WNBA" ? "WNBA" : "NBA";
}

/** Resolve a side's stat line + label from the chosen scope ("career" or a season). */
function buildSide(entry: CompareEntry, scope: string, seasons: SeasonAverages[]): CompareSide {
  const line = scope === "career" ? entry.career : (seasons.find((s) => s.season === scope) ?? entry.career);
  return {
    player: entry.player,
    league: entry.league,
    headshot_url: entry.headshot_url,
    scope: scope === "career" ? "Career" : scope,
    line,
  };
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string; a?: string; b?: string; sa?: string; sb?: string }>;
}) {
  const sp = await searchParams;
  const league = normalizeLeague(sp.league);
  const a = sp.a?.trim() || undefined;
  const b = sp.b?.trim() || undefined;

  let players: PlayerSummary[] = [];
  let rosterError: string | undefined;
  try {
    players = await listPlayers(league, { revalidate: 600 });
  } catch (e) {
    rosterError = e instanceof ApiError ? e.message : String(e);
  }

  // Per-player season lists (drive the scope dropdowns + per-season values).
  const [aSeasons, bSeasons] = await Promise.all([
    a ? getPlayerSeasons(a, { revalidate: 600 }).catch(() => [] as SeasonAverages[]) : Promise.resolve([] as SeasonAverages[]),
    b ? getPlayerSeasons(b, { revalidate: 600 }).catch(() => [] as SeasonAverages[]) : Promise.resolve([] as SeasonAverages[]),
  ]);
  const aSeasonStrings = aSeasons.map((s) => s.season).sort((x, y) => y.localeCompare(x));
  const bSeasonStrings = bSeasons.map((s) => s.season).sort((x, y) => y.localeCompare(x));
  const aScope = sp.sa && aSeasonStrings.includes(sp.sa) ? sp.sa : "career";
  const bScope = sp.sb && bSeasonStrings.includes(sp.sb) ? sp.sb : "career";

  // Career averages + metadata for both (only when both are picked).
  let comparison: CompareEntry[] | null = null;
  let compareError: string | undefined;
  if (a && b) {
    try {
      comparison = await comparePlayers([a, b], { revalidate: 0 });
    } catch (e) {
      compareError = e instanceof ApiError ? `${e.status} ${e.message}`.trim() : String(e);
    }
  }

  // Guard against self-comparison (resolved names match — e.g. a hand-edited URL).
  const samePlayer =
    comparison !== null && comparison.length === 2 && comparison[0].player === comparison[1].player;
  const aSide = comparison && !samePlayer ? buildSide(comparison[0], aScope, aSeasons) : null;
  const bSide = comparison && !samePlayer ? buildSide(comparison[1], bScope, bSeasons) : null;

  return (
    <Container>
      <div className="py-12">
        <PageHeader
          kicker="Compare"
          title="Head-to-head"
          description="Pick any two players and compare them category by category — across their full careers, or any single season."
          actions={<LeagueToggle current={league} hrefFor={(l) => `/compare?league=${l}`} />}
        />

        {rosterError ? (
          <div className="mt-10">
            <ConnectionNotice detail={rosterError} />
          </div>
        ) : (
          <>
            {/* Pickers */}
            <div className="mt-8 grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
              <PlayerCombobox
                players={players}
                value={a}
                slot="a"
                otherValue={b}
                otherSeason={bScope}
                league={league}
                tone="a"
                label="Player A"
              />
              <span className="hidden pb-2.5 text-center font-mono text-xs uppercase tracking-[0.15em] text-dim sm:block">
                vs
              </span>
              <PlayerCombobox
                players={players}
                value={b}
                slot="b"
                otherValue={a}
                otherSeason={aScope}
                league={league}
                tone="b"
                label="Player B"
              />
            </div>

            {/* Comparison */}
            {compareError ? (
              <Card className="mt-10 p-6">
                <p className="font-display text-lg font-semibold text-fg">
                  Couldn&apos;t compare those players
                </p>
                <p className="mt-1 font-mono text-sm text-muted">{compareError}</p>
              </Card>
            ) : samePlayer ? (
              <p className="mt-14 text-center text-muted">
                Pick two different players to compare.
              </p>
            ) : aSide && bSide ? (
              <ComparisonBoard
                a={aSide}
                b={bSide}
                aSeasonControl={
                  <SeasonScopeSelect
                    seasons={aSeasonStrings}
                    value={aScope}
                    slot="a"
                    league={league}
                    a={a}
                    b={b}
                    sa={aScope}
                    sb={bScope}
                  />
                }
                bSeasonControl={
                  <SeasonScopeSelect
                    seasons={bSeasonStrings}
                    value={bScope}
                    slot="b"
                    league={league}
                    a={a}
                    b={b}
                    sa={aScope}
                    sb={bScope}
                  />
                }
              />
            ) : (
              <p className="mt-14 text-center text-muted">
                {a && !b
                  ? "Pick one more player to see the head-to-head."
                  : "Pick two players above to see the head-to-head."}
              </p>
            )}
          </>
        )}
      </div>
    </Container>
  );
}
