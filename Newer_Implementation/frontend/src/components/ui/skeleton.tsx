import { cn } from "@/lib/cn";

/** Pulsing placeholder block. Animation is disabled under prefers-reduced-motion. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-card-2 motion-reduce:animate-none", className)}
    />
  );
}
