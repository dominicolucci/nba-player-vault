# NBA Player Vault — Web App

The product UI for NBA Player Vault: a Next.js + Tailwind frontend that consumes
the existing FastAPI backend ([`../api.py`](../api.py)) over its typed REST API.

Built with an editorial sports-analytics aesthetic (FiveThirtyEight / The
Athletic), dark-mode-first with a full light theme.

## Stack

- **Next.js 16** (App Router, React 19) · **TypeScript**
- **Tailwind CSS v4** (CSS-first tokens via `@theme`)
- **lucide-react** for SVG icons

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

Point the app at the backend in `.env.local` (see `.env.example`):

```
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Run the backend separately from the repo's `Newer_Implementation/` dir:

```bash
uvicorn api:app --reload
```

## Design system

This project is driven by **one cohesive design system**. Before building any
page, read **[`design-system/MASTER.md`](./design-system/MASTER.md)** — the
human-readable spec — and browse the live **`/styleguide`** route.

- **Tokens** (colour, type, charts) live in
  [`src/app/globals.css`](./src/app/globals.css) as CSS variables mapped to
  Tailwind utilities (`bg-card`, `text-muted`, `text-accent-text`, …). They flip
  with the theme automatically.
- **Primitives** live in [`src/components/ui`](./src/components/ui) — import via
  the barrel: `import { Card, Stat, Table } from "@/components/ui"`.
- **Page overrides:** [`design-system/pages/`](./design-system/pages/).

## Project layout

```
src/
  app/
    layout.tsx        # root shell: fonts, metadata, theme, header/footer
    page.tsx          # home / product hub
    styleguide/       # living design-system showcase
    not-found.tsx
    globals.css       # design tokens + Tailwind theme (source of truth)
  components/
    layout/           # SiteHeader (nav shell), SiteFooter, Logo
    theme/            # ThemeProvider, ThemeToggle (no-flash dark/light)
    ui/               # Button, Card, Badge, Stat, Table, Sparkline, …
  lib/
    api.ts            # typed client for every api.py endpoint
    types.ts          # TS mirror of the warehouse/API shapes
    format.ts         # stat/percentage/delta formatters
    design-tokens.ts  # JS-side chart palette
    site.ts           # site metadata + navigation IA
design-system/
  MASTER.md           # the design system spec
  pages/              # per-page overrides
```

## Status

Built: the home hub (with a rotating hero of 20+ PPG career scorers), `/styleguide`, player
**browse + profiles** (`/players`, `/players/[name]` — Recharts trajectory, full game log, month
splits), and the **82-0 draft game** (`/game`). Still to port: `/compare` and `/leaderboards`.

Backend routes added for these pages (thin wrappers over `data.py` / `game82.py`): `GET /teams`,
`GET /teams/{team}/players`, `GET /game/pool`, `POST /game/simulate`, plus a `team` field on
`GET /players/{name}`.
