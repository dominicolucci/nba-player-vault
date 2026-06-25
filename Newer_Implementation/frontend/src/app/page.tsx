import { ArrowRight, GitCompareArrows, Gamepad2, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { RotatingHeroCard, type HeroCard } from "@/components/home/rotating-hero-card";
import { Card, Container, Kicker, buttonVariants } from "@/components/ui";
import { getLeaderboards, getPlayer, getPlayerSeasons } from "@/lib/api";

// Illustrative scale figures (match the warehouse). Static brand facts — the
// home page is the product hub, not a data-fetching feature page.
const SCALE = [
  { value: "540+", label: "Players" },
  { value: "163K+", label: "Game logs" },
  { value: "32", label: "Teams" },
  { value: "2", label: "Leagues" },
];

const FEATURES = [
  {
    href: "/players",
    icon: Users,
    title: "Player profiles",
    body: "Any player's full career — per-season splits, game logs, and an adaptive trajectory chart.",
  },
  {
    href: "/compare",
    icon: GitCompareArrows,
    title: "Head-to-head",
    body: "Put two stars side by side and see who takes each category, category by category.",
  },
  {
    href: "/leaderboards",
    icon: Trophy,
    title: "Leaderboards",
    body: "All-time and single-season rankings with correctly volume-weighted shooting percentages.",
  },
  {
    href: "/game",
    icon: Gamepad2,
    title: "The 82-0 game",
    body: "Draft a starting five and chase a perfect, undefeated season mapped to real production.",
  },
];

// Minimum career PPG for a player to appear in the rotating hero card.
const ELITE_PPG = 20;
const HERO_COUNT = 8;

const FALLBACK_CARDS: HeroCard[] = [
  {
    player: "Luka Dončić",
    headshot_url: "https://cdn.nba.com/headshots/nba/latest/1040x760/1629029.png",
    league: "NBA",
    games: 514,
    ppg: 29.2,
    rpg: 8.5,
    apg: 8.2,
    tp_pct: 0.352,
    trajectory: [21.2, 28.8, 27.7, 28.4, 32.4, 33.9, 28.1],
  },
];

/** Featured players for the hero: career 20+ PPG scorers, richest first. */
async function getHeroCards(): Promise<HeroCard[]> {
  try {
    const board = await getLeaderboards({ stat: "pts", limit: 16 }, { revalidate: 600 });
    const elite = board.filter((r) => Number(r.pts) >= ELITE_PPG).slice(0, HERO_COUNT);
    if (elite.length === 0) return FALLBACK_CARDS;

    const cards = await Promise.all(
      elite.map(async (r) => {
        const [profile, seasons] = await Promise.all([
          getPlayer(r.player, { revalidate: 600 }),
          getPlayerSeasons(r.player, { revalidate: 600 }),
        ]);
        return {
          player: profile.player,
          headshot_url: profile.headshot_url,
          league: profile.league,
          games: profile.games_played,
          ppg: profile.career.pts,
          rpg: profile.career.reb,
          apg: profile.career.ast,
          tp_pct: profile.career.fg3_pct,
          trajectory: seasons.map((s) => s.pts),
        } satisfies HeroCard;
      }),
    );
    return cards;
  } catch {
    return FALLBACK_CARDS;
  }
}

export default async function HomePage() {
  const heroCards = await getHeroCards();

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="aurora border-b border-border">
        <Container className="grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <Kicker>New product UI · built on the Vault REST API</Kicker>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.08] tracking-tight text-fg sm:text-5xl lg:text-[3.4rem]">
              The career vault for every{" "}
              <span className="text-accent-text">NBA &amp; WNBA</span> player.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Full career game logs, head-to-head comparisons, and leaderboards — served from a
              DuckDB warehouse over a typed REST API, in one clean editorial interface.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/players" className={buttonVariants({ variant: "primary", size: "lg" })}>
                Explore players
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/styleguide" className={buttonVariants({ variant: "ghost", size: "lg" })}>
                View the design system
              </Link>
            </div>
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.12em] text-dim">
              Official stats.nba.com data · validated vs Basketball-Reference
            </p>
          </div>

          {/* Rotating sample card — real 20+ PPG scorers from the warehouse */}
          <RotatingHeroCard cards={heroCards} />
        </Container>
      </section>

      {/* ---------------- SCALE BAND ---------------- */}
      <Container>
        <div className="-mt-px grid grid-cols-2 divide-x divide-y divide-border border-x border-b border-border sm:grid-cols-4 sm:divide-y-0">
          {SCALE.map((s) => (
            <div key={s.label} className="bg-panel px-6 py-7 text-center">
              <span className="block font-mono text-3xl font-medium tabular-nums text-fg">
                {s.value}
              </span>
              <span className="mt-1 block font-mono text-[0.7rem] uppercase tracking-[0.12em] text-dim">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </Container>

      {/* ---------------- FEATURE HUB ---------------- */}
      <Container>
        <section className="py-16">
          <div className="max-w-2xl">
            <Kicker tone="info">The product</Kicker>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg">
              Four ways into the data
            </h2>
            <p className="mt-2 text-muted">
              The navigation shell is wired and inherits the global design system. Feature pages
              plug into these routes next.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <Link key={f.href} href={f.href} className="group focus-visible:outline-none">
                  <Card interactive className="flex h-full flex-col p-5">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-accent-soft text-accent-text">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <h3 className="mt-4 font-display text-lg font-semibold text-fg">{f.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{f.body}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent-text">
                      Open
                      <ArrowRight
                        className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </span>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      </Container>
    </>
  );
}
