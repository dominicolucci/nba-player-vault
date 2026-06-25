# 82-0 Game (`/game`) — overrides

**Inherits:** [`../MASTER.md`](../MASTER.md) in full. No token/type/colour deviations.

A stateful, client-driven draft game. The page (`app/game/page.tsx`) is a server
component that fetches the initial pool and the **initial random offer** (so SSR
and hydration agree); everything interactive lives in the `GameBoard` client
island.

## Mapping logic stays on the backend

The win-loss mapping is **never** reimplemented in the frontend. It lives in
`../../game82.py`, exposed via two routes added to `../../api.py`:

- `GET /game/pool?league=` — draft pool (`data.game_pool` + per-player eligible
  `slots` from `game82.eligibility`).
- `POST /game/simulate` — body is the lineup lines; returns
  `game82.simulate(...)` (`wins/losses/team_pra/contributions/tier/comparison/bonus`).
  Accepts 1-5 lines so the **running record** can update on every draft. The
  +67 LeBron+Bronny bonus is computed server-side here.

`lib/game.ts` only does the *draw* (random offer, eligibility lookup, PRA
display sum) — never the scoring.

## Page-specific patterns

- **State machine** — `useReducer` in `game-board.tsx`: offer → draft → spin
  (random season via `/players/{name}/seasons`) → lock, plus move/remove,
  re-spin budgets (1 offer, 2 season), and a per-game easter-egg flag.
- **Running record** — `RecordHeader` shows wins-losses + a progress bar toward
  82, recomputed by `POST /game/simulate` on every lineup change (debounce-free;
  one call per action, stale calls aborted).
- **Easter-egg modal** — `egg-dialog.tsx`: accessible `role="dialog"`,
  focus-on-open, Escape/overlay to close. Fires when both James's are drafted.
- **Randomness + SSR** — all `Math.random` (offers, spins) runs in client
  handlers or is seeded from a server-passed `initialOffer`; never during the
  client component's render, to avoid hydration mismatch.
- **Accessibility** — segmented league control (`aria-pressed`), labelled
  move/remove/draft buttons, `role="progressbar"` on the chase bar, PRA values
  shown as text beside every bar (chart is supplementary).
