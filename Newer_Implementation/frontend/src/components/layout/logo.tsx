import { cn } from "@/lib/cn";

/** Basketball-seam mark + editorial wordmark. Pure SVG, themes via tokens. */
export function Logo({
  withWordmark = true,
  className,
}: {
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width="26"
        height="26"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <circle cx="16" cy="16" r="13" stroke="var(--accent)" strokeWidth="2" />
        <path d="M16 3v26M3 16h26" stroke="var(--accent)" strokeWidth="1.5" />
        <path
          d="M6.5 6.5C12 12 12 20 6.5 25.5M25.5 6.5C20 12 20 20 25.5 25.5"
          stroke="var(--accent)"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
      {withWordmark ? (
        <span className="font-display text-[0.95rem] font-bold leading-none tracking-wide text-fg">
          PLAYER<span className="text-accent-text"> VAULT</span>
        </span>
      ) : null}
    </span>
  );
}
