# Players (browse + profile) — overrides

**Inherits:** [`../MASTER.md`](../MASTER.md) in full. No token, type, or colour deviations.

Routes: `/players` (league → team → player selection) and `/players/[name]`
(profile). Both are server components that fetch from the FastAPI backend;
interactive bits are isolated client islands.

## Page-specific patterns

- **Trajectory chart** — `components/charts/trajectory-chart.tsx` (Recharts
  `AreaChart`) + `trajectory-panel.tsx` (metric toggle). **Adaptive rule:**
  ≥3 seasons → season-over-season line; <3 seasons (rookie) → 10-game rolling
  average over the career game log (`lib/stats.ts`). Colours come from the
  per-theme hex mirror in `lib/design-tokens.ts` (`chartColor`,
  `CHART_GRID_HEX`, `CHART_AXIS_HEX`) — Recharts sets colours as SVG attributes
  where CSS `var()` won't resolve, so JS needs literal hex. **Keep that mirror
  in sync with the `--chart-*` tokens.** A table alternative (season + game-log
  tables) always accompanies the chart for accessibility (MASTER §5/§8).
- **Profile switcher** — `components/players/profile-switcher.tsx`: compact
  league toggle + team `<select>` + player `<select>`, kept atop the profile.
  Native selects (accessible, light); navigation via `useRouter`.
- **Fused matchup column** — game log merges `home`+`opponent`+`result` into one
  cell: "vs WAS" / "@ NOP" plus a positive/negative `Badge` for W/L.
- **Sticky table header** — the (potentially long) game log scrolls inside a
  `max-h` container with a `sticky` `THead`.
- **Selection state in the URL** — `/players?league=&team=` so the browse view is
  shareable and SSR-rendered; `/players/[name]` is a shareable deep link.

## Backend dependency

Adds two routes to `../../api.py` (`GET /teams`, `GET /teams/{team}/players`)
and a `team` field to `GET /players/{name}` — all thin wrappers over existing
`data.py` logic. Typed in `lib/types.ts` + `lib/api.ts`.
