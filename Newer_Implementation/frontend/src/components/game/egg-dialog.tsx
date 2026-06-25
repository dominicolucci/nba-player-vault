"use client";

import { Crown } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui";

/** Accessible celebratory modal for the LeBron + Bronny "23 and Me" bonus. */
export function EggDialog({ bonus, onClose }: { bonus: number; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.querySelector("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="egg-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-panel border border-accent/60 bg-card p-8 text-center shadow-pop"
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-text">
          <Crown className="h-6 w-6" aria-hidden />
        </span>
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-accent-text">
          Secret combo
        </p>
        <h2
          id="egg-title"
          className="mt-2 font-display text-3xl font-bold text-accent-text"
          style={{ textShadow: "0 0 22px var(--accent-soft)" }}
        >
          23 and Me bonus
        </h2>
        <p className="mt-3 text-muted">
          LeBron &amp; Bronny James in the same lineup —{" "}
          <span className="font-semibold text-fg">+{bonus} PRA</span> added to your team.
        </p>
        <Button onClick={onClose} size="lg" className="mt-6 w-full">
          Let&apos;s go
        </Button>
      </div>
    </div>
  );
}
