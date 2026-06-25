import { cn } from "@/lib/cn";
import { Kicker } from "./kicker";

/** Centered content column capped to the shared shell width. */
export function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("container-shell", className)} {...props} />;
}

/** Vertical rhythm wrapper for a page section. */
export function Section({
  className,
  bleed = false,
  ...props
}: React.HTMLAttributes<HTMLElement> & { bleed?: boolean }) {
  return (
    <section
      className={cn("py-10 sm:py-14", className)}
      {...props}
      // `bleed` lets a section opt out of the container for full-width bands.
      data-bleed={bleed || undefined}
    />
  );
}

export interface PageHeaderProps {
  kicker?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/** Standard page title block: kicker, large display heading, lede, actions. */
export function PageHeader({ kicker, title, description, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-3xl">
        {kicker ? <Kicker className="mb-2.5">{kicker}</Kicker> : null}
        <h1 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 text-lg leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
