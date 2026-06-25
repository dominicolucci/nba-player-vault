import type { Metadata } from "next";
import { ConnectionNotice } from "@/components/data/connection-notice";
import { LeagueToggle } from "@/components/players/league-toggle";
import { PlayerGrid } from "@/components/players/player-grid";
import { TeamSearch } from "@/components/players/team-search";
import { Container, Kicker, PageHeader } from "@/components/ui";
import { ApiError, getTeamPlayers, getTeams } from "@/lib/api";
import type { League, TeamPlayer, TeamSummary } from "@/lib/types";

export const metadata: Metadata = {
  title: "Players",
  description: "Browse NBA & WNBA players by league and team.",
};

function normalizeLeague(value?: string): League {
  return value?.toUpperCase() === "WNBA" ? "WNBA" : "NBA";
}

function errMessage(e: unknown): string {
  return e instanceof ApiError ? `${e.status || ""} ${e.message}`.trim() : String(e);
}

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string; team?: string }>;
}) {
  const sp = await searchParams;
  const league = normalizeLeague(sp.league);
  const selectedTeam = sp.team;

  let teams: TeamSummary[] = [];
  let teamsError: string | undefined;
  try {
    teams = await getTeams(league);
  } catch (e) {
    teamsError = errMessage(e);
  }

  let players: TeamPlayer[] | null = null;
  let playersError: string | undefined;
  if (selectedTeam) {
    try {
      players = await getTeamPlayers(league, selectedTeam);
    } catch (e) {
      playersError = errMessage(e);
    }
  }

  return (
    <Container>
      <div className="py-12">
        <PageHeader
          kicker="Players"
          title="Browse players"
          description="Pick a league and team to find a player, then open their profile for full career splits."
          actions={
            <LeagueToggle current={league} hrefFor={(l) => `/players?league=${l}`} />
          }
        />

        {teamsError ? (
          <div className="mt-10">
            <ConnectionNotice detail={teamsError} />
          </div>
        ) : (
          <>
            {/* Teams */}
            <section className="mt-10">
              <TeamSearch teams={teams} league={league} selectedTeam={selectedTeam} />
            </section>

            {/* Players */}
            <section className="mt-10 border-t border-border pt-10">
              {!selectedTeam ? (
                <p className="text-muted">Select a team above to see its roster.</p>
              ) : playersError ? (
                <ConnectionNotice detail={playersError} />
              ) : players && players.length > 0 ? (
                <>
                  <Kicker className="mb-4">
                    {selectedTeam} · {players.length} players
                  </Kicker>
                  <PlayerGrid players={players} />
                </>
              ) : (
                <p className="text-muted">No players found for {selectedTeam}.</p>
              )}
            </section>
          </>
        )}
      </div>
    </Container>
  );
}
