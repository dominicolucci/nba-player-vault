import type { Metadata } from "next";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Container,
  Kicker,
  PageHeader,
  Sparkline,
  Stat,
  StatGrid,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "Design system",
  description: "The NBA Player Vault design system — tokens, typography, and component primitives.",
};

const SURFACES = [
  { token: "--bg", label: "Background" },
  { token: "--panel", label: "Panel" },
  { token: "--card", label: "Card" },
  { token: "--card-2", label: "Card / hover" },
];

const ACCENTS = [
  { token: "--accent", label: "Accent" },
  { token: "--info", label: "Info" },
  { token: "--positive", label: "Positive" },
  { token: "--negative", label: "Negative" },
];

const TEXTS = [
  { token: "--fg", label: "Primary text" },
  { token: "--muted", label: "Muted text" },
  { token: "--dim", label: "Dim / captions" },
];

const CHART_TOKENS = Array.from({ length: 8 }, (_, i) => `--chart-${i + 1}`);

const SAMPLE_GAMES = [
  { date: "Apr 14", opp: "@ MIN", min: 38, pts: 31, reb: 10, ast: 9, fg: "11-22" },
  { date: "Apr 12", opp: "vs SAC", min: 36, pts: 28, reb: 8, ast: 11, fg: "9-19" },
  { date: "Apr 09", opp: "@ GSW", min: 41, pts: 35, reb: 12, ast: 7, fg: "13-25" },
];

function Swatch({ token, label }: { token: string; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-16 rounded-lg border border-border"
        style={{ background: `var(${token})` }}
      />
      <div className="leading-tight">
        <p className="text-sm text-fg">{label}</p>
        <p className="font-mono text-xs text-dim">{token}</p>
      </div>
    </div>
  );
}

function Block({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-12">
      <Kicker className="mb-2">{kicker}</Kicker>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-fg">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <Container>
      <div className="py-12">
        <PageHeader
          kicker="Design system · v1"
          title="One cohesive system"
          description="A clean editorial sports-analytics aesthetic — confident, data-dense, dark-mode-first. Every token below flips automatically when you toggle the theme in the header. Master spec lives in design-system/MASTER.md."
        />
      </div>

      {/* COLOR */}
      <Block kicker="Foundations" title="Colour tokens">
        <div className="space-y-8">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.12em] text-dim">Surfaces</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {SURFACES.map((s) => (
                <Swatch key={s.token} {...s} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.12em] text-dim">Accents &amp; semantics</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {ACCENTS.map((s) => (
                <Swatch key={s.token} {...s} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.12em] text-dim">Text</p>
            <div className="flex flex-wrap gap-8">
              {TEXTS.map((t) => (
                <div key={t.token}>
                  <p className="text-2xl font-medium" style={{ color: `var(${t.token})` }}>
                    {t.label}
                  </p>
                  <p className="font-mono text-xs text-dim">{t.token}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Block>

      {/* CHART PALETTE */}
      <Block kicker="Data visualization" title="Categorical chart scheme">
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {CHART_TOKENS.map((token, i) => (
            <div key={token} className="flex flex-col items-center gap-2">
              <div
                className="h-12 w-full rounded-md border border-border"
                style={{ background: `var(${token})` }}
              />
              <span className="font-mono text-[0.65rem] text-dim">{i + 1}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-end gap-8">
          <Sparkline data={[12, 15, 14, 19, 23, 26, 31]} width={200} height={56} aria-label="Sample rising series" />
          <Sparkline
            data={[31, 26, 24, 27, 20, 18, 14]}
            width={200}
            height={56}
            color="var(--chart-2)"
            aria-label="Sample falling series"
          />
        </div>
      </Block>

      {/* TYPOGRAPHY */}
      <Block kicker="Foundations" title="Typography">
        <div className="space-y-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-dim">
              Display · Space Grotesk
            </p>
            <p className="font-display text-4xl font-bold tracking-tight text-fg">
              Career numbers, told clearly
            </p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-dim">Body · Inter</p>
            <p className="max-w-2xl text-lg leading-relaxed text-muted">
              Inter carries the interface and reading copy — neutral, legible, and quiet so the
              data stays the loudest thing on the page.
            </p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-dim">
              Mono · DM Mono (tabular figures)
            </p>
            <p className="font-mono text-2xl tabular-nums text-accent-text">
              29.2 · 8.5 · 8.2 · 35.2%
            </p>
          </div>
        </div>
      </Block>

      {/* BUTTONS */}
      <Block kicker="Components" title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="subtle">Subtle</Button>
          <Button variant="link">Link</Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Block>

      {/* BADGES */}
      <Block kicker="Components" title="Badges">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="neutral">Neutral</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge tone="info">Info</Badge>
          <Badge tone="positive">+1.6</Badge>
          <Badge tone="negative">-0.4</Badge>
          <Badge tone="outline">Outline</Badge>
          <Badge tone="accent" mono>
            NBA
          </Badge>
        </div>
      </Block>

      {/* CARDS + STATS */}
      <Block kicker="Components" title="Cards & stat displays">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Static card</CardTitle>
              <CardDescription>The default surface for grouped content.</CardDescription>
            </CardHeader>
            <CardContent>
              <StatGrid columns={3} divided>
                <Stat align="center" value="27.6" label="PPG" delta="+1.2" deltaTone="positive" />
                <Stat align="center" value="11.3" label="RPG" delta="-0.3" deltaTone="negative" />
                <Stat align="center" value="3.8" label="APG" />
              </StatGrid>
            </CardContent>
          </Card>
          <Card interactive>
            <CardHeader>
              <CardTitle>Interactive card</CardTitle>
              <CardDescription>Hover for the accent border + lift. Use for links.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Stat value="33.9" label="Peak PPG" hint="2023-24 season" />
                <Sparkline data={[21, 28, 27, 28, 32, 33, 28]} width={150} height={48} />
              </div>
            </CardContent>
          </Card>
        </div>
      </Block>

      {/* TABLE */}
      <Block kicker="Components" title="Data table">
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Opp</TH>
              <TH numeric>MIN</TH>
              <TH numeric>PTS</TH>
              <TH numeric>REB</TH>
              <TH numeric>AST</TH>
              <TH numeric>FG</TH>
            </TR>
          </THead>
          <TBody>
            {SAMPLE_GAMES.map((g) => (
              <TR key={g.date} interactive>
                <TD>{g.date}</TD>
                <TD className="text-muted">{g.opp}</TD>
                <TD numeric>{g.min}</TD>
                <TD numeric className="font-medium text-accent-text">
                  {g.pts}
                </TD>
                <TD numeric>{g.reb}</TD>
                <TD numeric>{g.ast}</TD>
                <TD numeric className="text-muted">
                  {g.fg}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Block>
    </Container>
  );
}
