"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-store";
import { cn } from "@/lib/cn";

/**
 * Icon button that flips between dark and light. Reads theme via
 * `useSyncExternalStore`, which renders the server snapshot during hydration
 * and reconciles to the real value afterwards — no hydration mismatch.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg",
        "border border-border-strong bg-card-2 text-muted",
        "transition-colors duration-150 hover:border-accent hover:text-fg",
        "cursor-pointer focus-visible:outline-none",
        className,
      )}
    >
      {isDark ? (
        <Moon className="h-[18px] w-[18px]" aria-hidden />
      ) : (
        <Sun className="h-[18px] w-[18px]" aria-hidden />
      )}
    </button>
  );
}
