# Leaderboards (`/leaderboards`) — overrides

**Inherits:** [`../MASTER.md`](../MASTER.md) in full. No token/type/colour deviations.

A server-rendered, URL-driven page (like `/players`): league, mode, category, and
season all live in the query string, so every view is shareable and SSR'd. The
only client island is the season `<select>`.

## API

- `GET /leaderboards?stat=&season=&league=&limit=` — the data. **All-time** omits
  `season`; **single-season** includes it. Shooting %s are already
  volume-weighted server-side.
- `GET /seasons?league=` — distinct seasons (newest first) for the picker; added
  to `../../api.py` as a thin wrapper over `data.seasons()`.

## Page-specific patterns

- **Two ranges** via a segmented mode toggle (All-time / Single-season). The
  season `<select>` ([`season-select.tsx`](../../src/components/leaderboards/season-select.tsx))
  appears only in single-season mode and navigates on change.
- **Category selection** — mono chips over `AVG_STATS`; the active chip maps to
  the `stat` param. Labels/long-names from `STAT_META`.
- **Scannable ranked table** — `#`, Player (links to the profile), GP, and the
  category value. The value cell carries a subtle accent **data bar** scaled to
  the leader (`aria-hidden`; the number is the accessible value). Top-3 ranks use
  `text-accent-text`.
- **Value formatting** keys off `STAT_META[stat].kind`: percentages via `fmtPct`,
  counts via `fmtStat`.
- League switch drops `season` (re-defaults to the latest of the new league,
  whose season labels differ — NBA `2024-25` vs WNBA `2025`).
