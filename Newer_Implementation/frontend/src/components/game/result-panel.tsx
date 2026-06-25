import { Badge, Card, Kicker } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { BadgeTone } from "@/components/ui/badge";
import type { SimContribution, SimResult } from "@/lib/types";

function tierTone(wins: number): BadgeTone {
  if (wins >= 65) return "accent";
  if (wins >= 50) return "positive";
  if (wins >= 30) return "info";
  return "neutral";
}

/** Prominent, always-visible running win-loss record + progress toward 82-0. */
export function RecordHeader({
  result,
  filled,
}: {
  result: SimResult | null;
  filled: number;
}) {
  const wins = result?.wins ?? 0;
  const losses = result?.losses ?? 82;
  const pct = Math.round((wins / 82) * 100);
  const perfect = filled === 5 && wins >= 82;

  return (
    <Card className={cn("overflow-hidden", perfect && "border-accent")}>
      <div className="aurora p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <Kicker>{filled === 5 ? "Final projected record" : "Running record"}</Kicker>
            <p className="mt-2 font-display text-5xl font-bold tracking-tight text-fg tabular-nums sm:text-6xl">
              {wins}
              <span className="text-dim">–</span>
              {losses}
            </p>
          </div>
          {result ? (
            <div className="text-left sm:text-right">
              <Badge tone={tierTone(wins)}>{result.tier}</Badge>
              {result.comparison ? (
                <p className="mt-1.5 max-w-xs text-xs text-muted">≈ {result.comparison}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between font-mono text-[0.7rem] uppercase tracking-[0.1em] text-dim">
            <span>Chase 82-0</span>
            <span className="tabular-nums">
              {filled}/5 drafted
              {result ? ` · ${result.team_pra} PRA` : ""}
              {result?.bonus ? ` · +${result.bonus} bonus` : ""}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={wins}
            aria-valuemin={0}
            aria-valuemax={82}
            aria-label="Projected wins toward a perfect 82-0 season"
            className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-card-2"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Per-player PRA bars (the lineup's contribution to the record). */
export function ContributionBars({ contributions }: { contributions: SimContribution[] }) {
  if (contributions.length === 0) return null;
  const max = Math.max(...contributions.map((c) => c.pra), 1);

  return (
    <ul className="space-y-2.5">
      {contributions.map((c) => (
        <li key={c.player} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-sm text-muted sm:w-44">{c.player}</span>
          <div className="h-6 flex-1 overflow-hidden rounded bg-card-2">
            <div
              className="h-full rounded bg-accent/80 transition-[width] duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${Math.max(6, (c.pra / max) * 100)}%` }}
            />
          </div>
          <span className="w-12 shrink-0 text-right font-mono text-sm tabular-nums text-fg">
            {c.pra}
          </span>
        </li>
      ))}
    </ul>
  );
}
