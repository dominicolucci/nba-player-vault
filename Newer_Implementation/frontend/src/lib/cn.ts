/**
 * Minimal className combiner — joins truthy class fragments with a space.
 * Kept dependency-free on purpose; primitives compose Tailwind utilities,
 * and conflicting-utility resolution is avoided by design (variant maps).
 */
export type ClassValue = string | number | null | false | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
