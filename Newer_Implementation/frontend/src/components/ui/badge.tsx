import { cn } from "@/lib/cn";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "info"
  | "positive"
  | "negative"
  | "outline";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-card-2 text-muted border border-border",
  accent: "bg-accent-soft text-accent-text border border-transparent",
  info: "bg-info-soft text-info-text border border-transparent",
  positive: "bg-positive-soft text-positive border border-transparent",
  negative: "bg-negative-soft text-negative border border-transparent",
  outline: "bg-transparent text-muted border border-border-strong",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Monospace, upper-cased "tag" styling for kicker-like labels. */
  mono?: boolean;
}

export function Badge({ tone = "neutral", mono = false, className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium leading-5",
        mono && "font-mono uppercase tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
