import type { Metadata } from "next";
import { ConnectionNotice } from "@/components/data/connection-notice";
import { GameBoard } from "@/components/game/game-board";
import { Container, PageHeader } from "@/components/ui";
import { ApiError, getGamePool } from "@/lib/api";
import { makeOffer } from "@/lib/game";
import type { GamePoolPlayer } from "@/lib/types";

export const metadata: Metadata = {
  title: "82-0 Game",
  description: "Draft a starting five and chase a perfect, undefeated 82-0 season.",
};

export default async function GamePage() {
  let pool: GamePoolPlayer[] | null = null;
  let error: string | undefined;
  try {
    pool = await getGamePool("NBA", { revalidate: 0 });
  } catch (e) {
    error = e instanceof ApiError ? e.message : String(e);
  }

  return (
    <Container>
      <div className="py-12">
        <PageHeader
          kicker="82-0 Game"
          title="Chase a perfect season"
          description="Draft a starting five — one per position. Each pick's production feeds your team's total PRA (points + rebounds + assists), which maps to a real win-loss record. Hit 240 to go a perfect 82-0."
        />
        <div className="mt-10">
          {error || !pool ? (
            <ConnectionNotice detail={error} />
          ) : (
            <GameBoard
              initialLeague="NBA"
              initialPool={pool}
              initialOffer={makeOffer(pool, {})}
            />
          )}
        </div>
      </div>
    </Container>
  );
}
