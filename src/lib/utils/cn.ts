/**
 * Join conditional class names. Falsy values are dropped so callers can write
 * `cn("base", active && "is-active", className)` without stray spaces. This is
 * the single class-composition helper for the UI primitives — no literals leak
 * in because every class resolves to a token-backed Tailwind utility.
 */
export type ClassValue = string | number | null | false | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
