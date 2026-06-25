# NBA Player Vault — Master Design System

> **Single source of truth** for the product UI. Every page inherits this system
> automatically. Read this before building any new page or component, and keep it
> in sync when the system evolves.
>
> - **Technical source of truth:** design tokens live in
>   [`src/app/globals.css`](../src/app/globals.css) as CSS custom properties,
>   exposed as Tailwind utilities. JS-side chart colours live in
>   [`src/lib/design-tokens.ts`](../src/lib/design-tokens.ts).
> - **This file** is the human-readable spec and rationale.
> - **Page overrides:** deviations for a specific page go in
>   [`design-system/pages/<page>.md`](./pages/) and override this Master.

---

## 1. Aesthetic

**Clean editorial sports-analytics** — the feel of FiveThirtyEight and The
Athletic. Confident, data-dense, and quiet: the numbers are the loudest thing on
the page. Dark-mode-first (newsprint-black) with a fully realised light theme.

**Principles**

1. **Data first.** Chrome recedes; figures use tabular mono so columns align and
   scan like a box score.
2. **One accent, used with intent.** Amber marks the focal point — a CTA, the
   primary data series, the player in focus. Blue is the secondary/comparison
   voice. Never decorate with accent colour.
3. **Hairlines over boxes.** Structure comes from 1px borders and generous space,
   not heavy fills or drop shadows.
4. **Editorial hierarchy.** A mono kicker → display headline → muted lede opens
   every section.
5. **Calm motion.** 150–200ms colour/opacity transitions only. No bouncing, no
   layout-shifting scale.

---

## 2. How inheritance works

Every page gets the system for free through three mechanisms — you rarely touch
raw colours or fonts:

1. **Tokens → utilities.** `globals.css` defines semantic CSS variables and maps
   them to Tailwind via `@theme inline`. Use utilities like `bg-card`,
   `text-muted`, `border-border`, `text-accent-text`, `font-display`. They flip
   with the theme with zero extra code.
2. **Shared shell.** [`src/app/layout.tsx`](../src/app/layout.tsx) wraps all
   routes with the fonts, `<SiteHeader>`, `<SiteFooter>`, and `<ThemeProvider>`.
3. **Primitives.** Build from [`src/components/ui`](../src/components/ui) instead
   of styling raw elements. Import via the barrel: `import { Card, Stat } from "@/components/ui"`.

**Adding a page** (the standard skeleton):

```tsx
import { Container, PageHeader } from "@/components/ui";

export default function Page() {
  return (
    <Container>
      <div className="py-12">
        <PageHeader kicker="Players" title="…" description="…" />
        {/* sections built from ui primitives */}
      </div>
    </Container>
  );
}
```

---

## 3. Colour

Tokens are **semantic**, not literal — `--card`, not `--gray-900`. Each has a dark
and light value and a Tailwind utility. Use the utility; only reach for
`var(--token)` in inline styles (e.g. chart props).

### Surfaces (by elevation)

| Token | Utility | Dark | Light | Use |
|------|---------|------|-------|-----|
| `--bg` | `bg-bg` | `#090b12` | `#f6f7f9` | Page background |
| `--panel` | `bg-panel` | `#0e121b` | `#eef1f5` | Recessed bands, table headers, footer |
| `--card` | `bg-card` | `#151a25` | `#ffffff` | Primary raised surface (cards) |
| `--card-2` | `bg-card-2` | `#1b2130` | `#f4f6f9` | Nested surface / hover |

### Hairlines

| Token | Utility | Use |
|------|---------|-----|
| `--border` | `border-border` | Default 1px hairline (the global default border colour) |
| `--border-strong` | `border-border-strong` | Emphasised dividers, input borders |

### Text

| Token | Utility | Use |
|------|---------|-----|
| `--fg` | `text-fg` | Primary text, headings |
| `--muted` | `text-muted` | Secondary text, body copy |
| `--dim` | `text-dim` | Captions, labels, table headers |

### Accent & semantics

| Token | Utility | Notes |
|------|---------|-------|
| `--accent` (`#f5a623`) | `bg-accent`, `border-accent` | Brand amber — **fills/borders only** |
| `--accent-foreground` | `text-accent-foreground` | Text **on** amber fills (near-black) |
| `--accent-text` | `text-accent-text` | Accent as **text/links** — contrast-safe per theme (darkens to `#9a5b00` on light) |
| `--accent-soft` | `bg-accent-soft` | Tinted chip/badge background |
| `--info` (`#4aa3df`) | `bg-info`, `text-info` | Secondary/comparison voice |
| `--info-text` | `text-info-text` | Info as text/links |
| `--positive` / `--negative` | `text-positive` / `text-negative` | Stat deltas (up/down). Never colour-only — pair with a sign (`+`/`-`). |

> **Contrast rule:** for accent text always use `text-accent-text` (not
> `text-accent`). Amber on a light background fails WCAG AA; the `*-text` token
> is pre-darkened to pass.

---

## 4. Typography

Editorial three-voice pairing, loaded via `next/font` and exposed as utilities.

| Role | Family | Utility | Use |
|------|--------|---------|-----|
| Display | **Space Grotesk** | `font-display` | Headings, player names, hero |
| Body / UI | **Inter** | `font-sans` (default) | Interface, reading copy |
| Mono | **DM Mono** | `font-mono` | Figures, kickers, labels, table headers |

**Scale** (Tailwind): hero `text-4xl`→`text-5xl` display-bold; section `text-2xl`/`text-3xl`
display-semibold; card title `text-lg` display-semibold; body `text-base`/`text-lg`;
labels/kickers `text-xs` mono uppercase `tracking-[0.12em]`.

**Rules**

- **Numbers that carry meaning** use `font-mono` + `tabular-nums` (or the `.tnum`
  helper) so they align in columns. The `Stat` and `TD numeric` primitives do
  this for you.
- **Kickers** are mono, upper-case, letter-spaced — use the `<Kicker>` primitive.
- Body line length ≤ ~70ch; line-height 1.6 (set on `body`).

---

## 5. Charts & data viz

- **Categorical scheme:** 8 colours `--chart-1 … --chart-8` (amber, blue, green,
  purple, rose, teal, orange, indigo). Import `CHART_SERIES` / `seriesColor(i)`
  from `src/lib/design-tokens.ts` for charting libs; values are `var(--chart-n)`
  so they theme automatically.
- **Single series:** use `--chart-1` (amber) for the focal player/metric,
  `--chart-2` (blue) for league baseline/comparison.
- **Roles:** `--chart-grid` for gridlines, `--positive`/`--negative` for
  diverging, `--dim` for axes (see `CHART_ROLES`).
- **Sparklines:** use the dependency-free `<Sparkline>` primitive for inline trend
  cells; it defaults to `--chart-1` and renders on the server.
- Always provide an `aria-label` on meaningful charts and a table alternative for
  dense data.

---

## 6. Component primitives (`src/components/ui`)

| Primitive | Purpose | Key props |
|-----------|---------|-----------|
| `Button` / `buttonVariants()` | Actions. `buttonVariants()` styles a `<Link>`. | `variant`: primary·secondary·ghost·subtle·link; `size`: sm·md·lg |
| `Card` + `CardHeader/Title/Description/Content/Footer` | Grouped content surface | `interactive` for hover lift |
| `Badge` | Tags, leagues, deltas | `tone`, `mono` |
| `Kicker` / `SectionHeading` | Editorial eyebrow + heading block | `tone`, `kicker`, `title`, `description`, `actions` |
| `Container` / `Section` / `PageHeader` | Layout — shell width, page title block | — |
| `Stat` / `StatGrid` | Headline stat displays (box-score style) | `value`, `label`, `delta`, `deltaTone`, `size`, `divided` |
| `Table` + `THead/TBody/TR/TH/TD` | Editorial data tables | `numeric` (right-align tabular), `interactive` rows |
| `Sparkline` | Inline SVG trend | `data`, `color`, `fill`, `aria-label` |

Layout shell: `SiteHeader` (sticky glass nav + theme toggle + mobile menu),
`SiteFooter`, `Logo`. Theme: `ThemeProvider` + `useTheme()` + `ThemeToggle`.

---

## 7. Spacing, radius, elevation, motion

- **Shell width:** `--spacing-shell` = `1180px` via `.container-shell` / `<Container>`.
- **Gutters:** `clamp(1rem, 4vw, 2.5rem)` (built into `.container-shell`).
- **Radius:** `rounded-card` (14px) for cards/tables, `rounded-panel` (18px) for
  large feature surfaces, `rounded-lg` (buttons/inputs), `rounded-full` (pills/avatars).
- **Elevation:** flat by default. `shadow-card` for the one hero/floating surface,
  `shadow-pop` for popovers. Prefer borders over shadows.
- **Motion:** `transition-colors duration-150`. Respect `prefers-reduced-motion`
  (handled globally for scroll; honour it in any custom animation).

---

## 8. Accessibility (non-negotiable)

- Body/contrast: text tokens meet WCAG AA; use `text-accent-text` for accent text.
- Focus: global `:focus-visible` amber ring is provided — don't remove outlines;
  add `focus-visible:outline-none` only when replacing with another visible state.
- Icon-only buttons need `aria-label` (see `ThemeToggle`, header actions).
- Colour is never the only signal (deltas carry `+`/`-`; active nav carries an
  underline + `aria-current`).
- Hit targets ≥ 36–44px. Images need `alt`. Inputs need labels.

---

## 9. Anti-patterns — do not

- ❌ **Emoji as icons.** Use `lucide-react` SVG icons. (The marketing site uses
  emoji; the app does not.)
- ❌ Raw hex values in components. Use tokens/utilities so theming holds.
- ❌ `text-accent` for body/links on light — fails contrast; use `text-accent-text`.
- ❌ Scale-on-hover that shifts layout. Use colour/border/shadow transitions.
- ❌ More than one accent colour competing for attention in a view.
- ❌ Proportional figures for stats — always tabular mono.
- ❌ Bypassing `<Container>` widths (keep one consistent max-width).

---

## 10. Heritage

This system harmonises with the existing marketing site
([`../../site/styles.css`](../../site/styles.css)) so the product and its landing
page read as one brand: same amber `#f5a623` + blue `#4aa3df` accents, same
Space Grotesk / Inter / DM Mono voices, same near-black editorial canvas — now
tokenised, dual-theme, and component-driven for the app.
```
