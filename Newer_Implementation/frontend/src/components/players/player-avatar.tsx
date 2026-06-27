import Image from "next/image";
import { cn } from "@/lib/cn";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export interface PlayerAvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  /** Accent ring (use for the focal player on a profile). */
  ring?: boolean;
  /** Ring colour when `ring` is set (default amber). */
  ringTone?: "accent" | "info";
  className?: string;
}

/** Headshot when available; a mono monogram fallback otherwise. */
export function PlayerAvatar({
  name,
  src,
  size = 44,
  ring = false,
  ringTone = "accent",
  className,
}: PlayerAvatarProps) {
  const shared = cn(
    "shrink-0 rounded-full bg-card-2 object-cover",
    ring ? (ringTone === "info" ? "border-2 border-info" : "border-2 border-accent") : "border border-border",
    className,
  );
  if (src) {
    return (
      <Image
        src={src}
        alt={`${name} headshot`}
        width={size}
        height={size}
        sizes={`${size}px`}
        className={shared}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(shared, "inline-flex items-center justify-center font-mono font-medium text-dim")}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
    >
      {initials(name)}
    </span>
  );
}
