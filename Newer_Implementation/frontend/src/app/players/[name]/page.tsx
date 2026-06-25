import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrajectoryPanel, type TrajectoryMetricOption } from "@/components/charts/trajectory-panel";
import { ConnectionNotice } from "@/components/data/connection-notice";
import { GameLogTable } from "@/components/players/game-log-table";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { ProfileSwitcher } from "@/components/players/profile-switcher";
import {
  Badge,
  Card,
  Container,
  Kicker,
  SectionHeading,
  Stat,
  StatGrid,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import {
  ApiError,
  getPlayer,
  getPlayerGames,
  getPlayerSeasons,
  getTeamPlayers,
  getTeams,
} from "@/lib/api";
import { fmtPct, fmtStat } from "@/lib/format";
import {
  gamesAscending,
  isRookie,
  monthSplits,
  rollingTrajectory,
  seasonsInGames,
  seasonTrajectory,
  type TrajectoryMetric,
  type TrajectoryPoint,
} from "@/lib/stats";
import type { TeamPlayer, TeamSummary } from "@/lib/types";

interface ProfileParams {
  params: Promise<{ name: string }>;
}

const TRAJECTORY_METRICS: TrajectoryMetricOption[] = [
  { key: "pts", label: "PTS", format: "count" },
  { key: "reb", label: "REB", format: "count" },
  { key: "ast", label: "AST", format: "count" },
  { key: "fg_pct", label: "FG%", format: "percent" },
  { key: "fg3_pct", label: "3P%", format: "percent" },
];

export async function generateMetadata({ params }: ProfileParams): Promise<Metadata> {
  const { name } = await params;
  const display = decodeURIComponent(name);
  return { title: display, description: `Career profile and game logs for ${display}.` };
}

export default async function PlayerProfilePage({ params }: ProfileParams) {
  const { name: rawName } = await params;
  // Next.js passes dynamic route params URL-encoded — decode before use.
  const name = decodeURIComponent(rawName);

  // Profile first — drives 404 vs connection error, and gives league/team.
  let profile;
  try {
    profile = await getPlayer(name);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return (
      <Container>
        <div className="py-12">
          <Kicker className="mb-4">Player profile</Kicker>
          <ConnectionNotice detail={e instanceof ApiError ? e.message : String(e)} />
        </div>
      </Container>
    );
  }

  const [seasons, games] = await Promise.all([
    getPlayerSeasons(name),
    getPlayerGames(name),
  ]);

  const hasTeam = profile.team && profile.team !== "Free Agents";
  const [teams, teammates] = await Promise.all([
    getTeams(profile.league).catch(() => [] as TeamSummary[]),
    hasTeam
      ? getTeamPlayers(profile.league, profile.team).catch(() => [] as TeamPlayer[])
      : Promise.resolve([] as TeamPlayer[]),
  ]);

  const c = profile.career;
  const careerStats = [
    { label: "PPG", value: fmtStat(c.pts) },
    { label: "RPG", value: fmtStat(c.reb) },
    { label: "APG", value: fmtStat(c.ast) },
    { label: "SPG", value: fmtStat(c.stl) },
    { label: "BPG", value: fmtStat(c.blk) },
    { label: "FG%", value: fmtPct(c.fg_pct) },
    { label: "3P%", value: fmtPct(c.fg3_pct) },
    { label: "FT%", value: fmtPct(c.ft_pct) },
    { label: "TOV", value: fmtStat(c.tov) },
    { label: "GmSc", value: fmtStat(c.gmsc) },
  ];

  // Adaptive trajectory: season line for veterans, 10-game rolling for rookies.
  const rookie = isRookie(seasons.length);
  const gamesAsc = gamesAscending(games);
  const series: Record<string, TrajectoryPoint[]> = Object.fromEntries(
    TRAJECTORY_METRICS.map((m) => [
      m.key,
      rookie
        ? rollingTrajectory(gamesAsc, m.key as TrajectoryMetric)
        : seasonTrajectory(seasons, m.key as TrajectoryMetric),
    ]),
  );

  const months = monthSplits(games);
  const gameLogSeasons = seasonsInGames(games);

  return (
    <Container>
      <div className="space-y-14 py-10">
        {/* ---------- Header ---------- */}
        <header className="flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <Kicker>Player profile</Kicker>
            <ProfileSwitcher
              league={profile.league}
              team={profile.team}
              teams={teams}
              teammates={teammates}
              currentPlayer={profile.player}
            />
          </div>
          <div className="flex items-center gap-5">
            <PlayerAvatar name={profile.player} src={profile.headshot_url} size={88} ring />
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">
                {profile.player}
              </h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
                <Badge tone="accent" mono>
                  {profile.league}
                </Badge>
                <span>{profile.team}</span>
                <span className="text-dim" aria-hidden>·</span>
                <span className="font-mono tabular-nums">
                  {profile.first_season}–{profile.last_season}
                </span>
                <span className="text-dim" aria-hidden>·</span>
                <span className="font-mono tabular-nums">{profile.games_played} career games</span>
              </div>
            </div>
          </div>
        </header>

        {/* ---------- Career averages ---------- */}
        <section>
          <SectionHeading kicker="Career averages" title="Per-game production" />
          <div className="mt-6">
            <StatGrid columns={5} divided>
              {careerStats.map((s) => (
                <Stat key={s.label} align="center" value={s.value} label={s.label} />
              ))}
            </StatGrid>
          </div>
        </section>

        {/* ---------- Adaptive trajectory ---------- */}
        <section>
          <SectionHeading
            kicker="Trajectory"
            title={rookie ? "Early-career form" : "Career trajectory"}
            description={
              rookie
                ? "Fewer than three seasons of data — shown as a 10-game rolling average across the career game log."
                : "Season-over-season averages across the player's career."
            }
          />
          <Card className="mt-6 p-5">
            <TrajectoryPanel
              mode={rookie ? "rolling" : "season"}
              xCaption={rookie ? "Game" : "Season"}
              series={series}
              metrics={TRAJECTORY_METRICS}
              note={
                rookie
                  ? "Rolling 10-game average · partial window at the start of the career."
                  : `${seasons.length} seasons · hover a point for the per-season value.`
              }
            />
          </Card>
        </section>

        {/* ---------- Per-season averages ---------- */}
        {seasons.length > 0 ? (
          <section>
            <SectionHeading kicker="By season" title="Per-season averages" />
            <div className="mt-6">
              <Table>
                <THead>
                  <TR>
                    <TH>Season</TH>
                    <TH numeric>GP</TH>
                    <TH numeric>MIN</TH>
                    <TH numeric>PTS</TH>
                    <TH numeric>REB</TH>
                    <TH numeric>AST</TH>
                    <TH numeric>STL</TH>
                    <TH numeric>BLK</TH>
                    <TH numeric>FG%</TH>
                    <TH numeric>3P%</TH>
                    <TH numeric>FT%</TH>
                    <TH numeric>GmSc</TH>
                  </TR>
                </THead>
                <TBody>
                  {seasons.map((s) => (
                    <TR key={s.season} interactive>
                      <TD className="whitespace-nowrap font-medium">{s.season}</TD>
                      <TD numeric className="text-muted">{s.games}</TD>
                      <TD numeric className="text-muted">{fmtStat(s.min)}</TD>
                      <TD numeric className="font-medium text-accent-text">{fmtStat(s.pts)}</TD>
                      <TD numeric>{fmtStat(s.reb)}</TD>
                      <TD numeric>{fmtStat(s.ast)}</TD>
                      <TD numeric>{fmtStat(s.stl)}</TD>
                      <TD numeric>{fmtStat(s.blk)}</TD>
                      <TD numeric className="text-muted">{fmtPct(s.fg_pct)}</TD>
                      <TD numeric className="text-muted">{fmtPct(s.fg3_pct)}</TD>
                      <TD numeric className="text-muted">{fmtPct(s.ft_pct)}</TD>
                      <TD numeric>{fmtStat(s.gmsc)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </section>
        ) : null}

        {/* ---------- Game log ---------- */}
        <section>
          <SectionHeading
            kicker="Game log"
            title="Every game"
            description="Opponent and result are fused into one column. Filter by season; the header sticks as you scroll."
          />
          <div className="mt-6">
            <GameLogTable games={games} seasons={gameLogSeasons} />
          </div>
        </section>

        {/* ---------- Month splits ---------- */}
        {months.length > 0 ? (
          <section>
            <SectionHeading
              kicker="Splits"
              title="Month by month"
              description="Career production grouped by calendar month; shooting percentages re-derived from totals."
            />
            <div className="mt-6">
              <Table>
                <THead>
                  <TR>
                    <TH>Month</TH>
                    <TH numeric>GP</TH>
                    <TH numeric>MIN</TH>
                    <TH numeric>PTS</TH>
                    <TH numeric>REB</TH>
                    <TH numeric>AST</TH>
                    <TH numeric>FG%</TH>
                    <TH numeric>3P%</TH>
                    <TH numeric>FT%</TH>
                  </TR>
                </THead>
                <TBody>
                  {months.map((m) => (
                    <TR key={m.month} interactive>
                      <TD className="font-medium">{m.month}</TD>
                      <TD numeric className="text-muted">{m.gp}</TD>
                      <TD numeric className="text-muted">{fmtStat(m.min)}</TD>
                      <TD numeric className="font-medium text-accent-text">{fmtStat(m.pts)}</TD>
                      <TD numeric>{fmtStat(m.reb)}</TD>
                      <TD numeric>{fmtStat(m.ast)}</TD>
                      <TD numeric className="text-muted">{fmtPct(m.fg_pct)}</TD>
                      <TD numeric className="text-muted">{fmtPct(m.fg3_pct)}</TD>
                      <TD numeric className="text-muted">{fmtPct(m.ft_pct)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </section>
        ) : null}
      </div>
    </Container>
  );
}
