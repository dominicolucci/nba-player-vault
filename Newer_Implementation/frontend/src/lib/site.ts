/** Global site metadata + information architecture (shared by header, footer, metadata). */
export const siteConfig = {
  name: "NBA Player Vault",
  shortName: "Player Vault",
  tagline: "Career-long NBA & WNBA analytics",
  description:
    "Explore full career game logs, head-to-head comparisons, and leaderboards for 540+ NBA & WNBA players — served from a DuckDB warehouse over a typed REST API.",
  url: "https://nba-player-vault.example.com",
  links: {
    github: "https://github.com/",
  },
  /** Primary product navigation. */
  nav: [
    { href: "/players", label: "Players" },
    { href: "/compare", label: "Compare" },
    { href: "/leaderboards", label: "Leaderboards" },
    { href: "/game", label: "82-0 Game" },
  ],
} as const;

export type NavItem = (typeof siteConfig.nav)[number];
