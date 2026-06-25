# Page-specific design overrides

Files here describe where a single page **deviates** from
[`../MASTER.md`](../MASTER.md). The Master is the default; a page file only
records the exceptions.

**Convention:** one file per route, named after the page —
`players.md`, `compare.md`, `leaderboards.md`, `game.md`.

**Resolution order when building a page:**

1. Read [`../MASTER.md`](../MASTER.md) for the global system.
2. If `design-system/pages/<page>.md` exists, its rules **override** the Master
   for that page only.
3. If it doesn't exist, the Master applies in full.

Keep overrides minimal and justified — most pages should need none. Reach for an
override only when a page has a genuinely distinct need (e.g. the 82-0 game's
draft board may want a denser grid or a court-themed accent treatment).

### Suggested template

```markdown
# <Page> — overrides

**Inherits:** MASTER.md

## Deviations
- <token / component / layout> — <what changes> — <why>

## Page-specific patterns
- <any composite components unique to this page>
```
```
