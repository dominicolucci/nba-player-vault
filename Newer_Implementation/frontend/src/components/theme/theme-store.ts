"use client";

import { useSyncExternalStore } from "react";
import type { ThemeName } from "@/lib/design-tokens";

/**
 * Theme state lives on `<html data-theme>` (set before paint by the inline
 * script in the root layout). React reads it through `useSyncExternalStore` —
 * the idiomatic way to subscribe to an external system without syncing via
 * effects. No provider needed; the store is module-global.
 */

const STORAGE_KEY = "vault-theme";
const listeners = new Set<() => void>();
let storageBound = false;

function currentTheme(): ThemeName {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function notify() {
  for (const listener of listeners) listener();
}

function applyTheme(next: ThemeName) {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = next;
  }
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* storage unavailable (private mode) — the attribute still applies */
  }
  notify();
}

export function setTheme(next: ThemeName) {
  applyTheme(next);
}

export function toggleTheme() {
  applyTheme(currentTheme() === "dark" ? "light" : "dark");
}

function ensureStorageListener() {
  if (storageBound || typeof window === "undefined") return;
  storageBound = true;
  // Keep tabs in sync when the choice changes elsewhere.
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY && (event.newValue === "light" || event.newValue === "dark")) {
      document.documentElement.dataset.theme = event.newValue;
      notify();
    }
  });
}

function subscribe(callback: () => void): () => void {
  ensureStorageListener();
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function serverSnapshot(): ThemeName {
  return "dark";
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, currentTheme, serverSnapshot);
  return { theme, setTheme, toggleTheme };
}
