# Compare (`/compare`) — overrides

**Inherits:** [`../MASTER.md`](../MASTER.md) in full.

Server-rendered, URL-driven: `/compare?league=&a=&b=`. Player A / B selections
live in the query string, so any head-to-head is shareable and SSR'd.

## API (all already existed — no backend change)

- `GET /players?league=` — roster for the two pickers, scoped by the league toggle.
- `GET /compare?players=a,b` — each player's full `career` block + metadata.
- `GET /players/{name}/seasons` — per-player season list + per-season averages,
  for the independent **scope dropdown** (Career / a specific season).

## Scope (career vs season)

Each player has a `<select>`: **Career** (default) or any of their seasons,
chosen independently. URL: `?league=&a=&b=&sa=&sb=` where `sa`/`sb` are `career`
(omitted) or a season. The board renders whichever stat line each side resolves
to — `SeasonAverages` is structurally compatible with the career `CareerAverages`
line, so the same board handles both. Swapping a player resets *that* player's
scope to career but preserves the other's.

## Page-specific patterns

- **Two-colour convention** — Player A = amber (`--chart-1` / accent), Player B =
  blue (`--chart-2` / info), used consistently across pickers, avatars (ring
  override), the value highlights, and the split bars. This is the one place two
  accents coexist on purpose (it's a 2-series comparison, per MASTER §5).
- **Accessible combobox** — [`player-combobox.tsx`](../../src/components/compare/player-combobox.tsx):
  `role="combobox"` + `aria-expanded`/`aria-controls`/`aria-activedescendant`, a
  `role="listbox"` of `role="option"` rows, full keyboard support (↑/↓/Enter/Esc),
  click-outside to close. Selecting navigates (URL-driven).
- **Category board** — [`comparison-board.tsx`](../../src/components/compare/comparison-board.tsx):
  one row per category with each player's value, a centred label, and a split
  **magnitude bar** (amber vs blue, `aria-hidden`). The **winner per category** is
  bold + tinted (non-colour signal = weight + the value itself); **TOV is
  lower-is-better**. A category-win **tally** sits between the player headers.
- **Value formatting** — percentages via `fmtPct`, counts via `fmtStat`.
