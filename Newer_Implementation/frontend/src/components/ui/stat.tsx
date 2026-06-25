import { cn } from "@/lib/cn";

export interface StatProps {
  /** Big value — pre-formatted (e.g. "29.2", "35.2%"). */
  value: React.ReactNode;
  /** Short uppercase label (e.g. "PPG"). */
  label: React.ReactNode;
  /** Optional signed delta string (e.g. "+1.6") with semantic tone. */
  delta?: React.ReactNode;
  deltaTone?: "positive" | "negative" | "neutral";
  /** Optional caption under the label. */
  hint?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  align?: "left" | "center";
  className?: string;
}

const valueSize = {
  sm: "text-2xl",
  md: "text-3xl",
  lg: "text-4xl sm:text-5xl",
};

const deltaColor = {
  positive: "text-positive",
  negative: "text-negative",
  neutral: "text-dim",
};

/** A single headline stat: big mono number, kicker-style label, optional delta. */
export function Stat({
  value,
  label,
  delta,
  deltaTone = "neutral",
  hint,
  size = "md",
  align = "left",
  className,
}: StatProps) {
  return (
    <div className={cn("flex flex-col gap-1", align === "center" && "items-center text-center", className)}>
      <div className="flex items-baseline gap-2">
        <span className={cn("font-mono font-medium leading-none tracking-tight text-fg tabular-nums", valueSize[size])}>
          {value}
        </span>
        {delta != null ? (
          <span className={cn("font-mono text-sm font-medium tabular-nums", deltaColor[deltaTone])}>
            {delta}
          </span>
        ) : null}
      </div>
      <span className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.12em] text-dim">
        {label}
      </span>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  );
}

/** Responsive grid of stats, with hairline dividers like a box score. */
export function StatGrid({
  columns = 4,
  divided = false,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { columns?: 2 | 3 | 4 | 5 | 6; divided?: boolean }) {
  const cols: Record<number, string> = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-3 sm:grid-cols-6",
  };
  return (
    <div
      className={cn(
        "grid gap-px",
        cols[columns],
        divided && "overflow-hidden rounded-card border border-border bg-border [&>*]:bg-card [&>*]:p-4",
        !divided && "gap-5",
        className,
      )}
      {...props}
    />
  );
}
