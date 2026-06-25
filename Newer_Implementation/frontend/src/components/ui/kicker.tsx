import { cn } from "@/lib/cn";

/** Monospace, upper-cased eyebrow label — the editorial section kicker. */
export function Kicker({
  className,
  tone = "accent",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & { tone?: "accent" | "info" | "muted" }) {
  const color =
    tone === "info" ? "text-info-text" : tone === "muted" ? "text-dim" : "text-accent-text";
  return (
    <p
      className={cn(
        "font-mono text-xs font-medium uppercase tracking-[0.14em]",
        color,
        className,
      )}
      {...props}
    />
  );
}

export interface SectionHeadingProps {
  kicker?: string;
  kickerTone?: "accent" | "info" | "muted";
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned actions (e.g. a "View all" link). */
  actions?: React.ReactNode;
  className?: string;
}

/** Kicker + title + optional description, with optional trailing actions. */
export function SectionHeading({
  kicker,
  kickerTone = "accent",
  title,
  description,
  actions,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="max-w-2xl">
        {kicker ? <Kicker tone={kickerTone} className="mb-2">{kicker}</Kicker> : null}
        <h2 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
          {title}
        </h2>
        {description ? <p className="mt-2 text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}
