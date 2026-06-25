import Link from "next/link";
import { cn } from "@/lib/cn";
import type { League } from "@/lib/types";

const LEAGUES: League[] = ["NBA", "WNBA"];

/** Segmented NBA/WNBA control rendered as real links (SSR + shareable). */
export function LeagueToggle({
  current,
  hrefFor,
}: {
  current: League;
  hrefFor: (league: League) => string;
}) {
  return (
    <div
      role="group"
      aria-label="League"
      className="inline-flex rounded-lg border border-border bg-card-2 p-0.5"
    >
      {LEAGUES.map((league) => {
        const active = league === current;
        return (
          <Link
            key={league}
            href={hrefFor(league)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors duration-150",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:text-fg",
            )}
          >
            {league}
          </Link>
        );
      })}
    </div>
  );
}
