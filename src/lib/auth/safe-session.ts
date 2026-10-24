"use client";

import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * Orphan-token resilient session reading.
 *
 * A refresh token saved in storage can go stale (expired server-side, project
 * reset, token revoked). Reading it then throws an `AuthApiError` and can hang
 * the app. `safeGetSession()` is the only session read the client app should
 * use: it never propagates that error, cleans the orphaned token locally, and
 * flags "session expired" so the UI can tell the user.
 */

/** Recognizes Supabase's invalid/orphaned refresh-token error. */
function isInvalidRefreshToken(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; message?: string };
  const msg = e.message ?? "";
  return (
    e.name === "AuthApiError" ||
    msg.includes("Refresh Token") ||
    msg.includes("Invalid Refresh Token")
  );
}

/**
 * Is there a Supabase auth cookie (`sb-<ref>-auth-token`, possibly chunked
 * `.0`/`.1`)? If one exists but no session resolved, the token is
 * orphaned/corrupt → clean up and warn. A normal logout leaves no auth cookie,
 * so we stay silent in that case.
 */
function hasAuthCookie(): boolean {
  if (typeof document === "undefined") return false;
  return /(?:^|;\s*)sb-[\w-]+-auth-token(?:\.\d+)?=/.test(document.cookie);
}

const EXPIRED_KEY = "x-kairos-session-expired";
export const SESSION_EXPIRED_EVENT = "x-kairos:session-expired";

// Avoid duplicate warnings: several parallel session readers can detect the
// same orphaned token. Mark once per load (a reload resets the module, but by
// then the cookie is cleared and it won't mark again).
let alreadyMarked = false;

/**
 * Flags that an orphaned session was cleaned, so the next screen can warn the
 * user. Persists in sessionStorage and emits an event for any live listener.
 */
function markSessionExpired(): void {
  if (typeof window === "undefined" || alreadyMarked) return;
  alreadyMarked = true;
  try {
    sessionStorage.setItem(EXPIRED_KEY, "1");
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  } catch {
    // no storage/event access: not critical
  }
}

/** Reads and clears the "session expired" flag. Returns true at most once. */
export function consumeSessionExpired(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(EXPIRED_KEY)) {
      sessionStorage.removeItem(EXPIRED_KEY);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Clears the orphaned token from local storage WITHOUT hitting the server
 * (`scope: "local"`), swallowing any error, and leaves the "session expired"
 * flag for the warning.
 */
async function clearOrphanSession(): Promise<void> {
  try {
    await getSupabaseClient().auth.signOut({ scope: "local" });
  } catch {
    // goal is only to clear local storage; ignore any failure
  }
  markSessionExpired();
}

/**
 * `getSession()` hardened against orphaned tokens. On an invalid-refresh-token
 * error (thrown or returned), it cleans the local session and resolves to
 * `{ session: null }` instead of breaking the app. Never throws.
 */
export async function safeGetSession(): Promise<{ session: Session | null }> {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase.auth.getSession();
    const session = data?.session ?? null;
    if (session) return { session };
    // No valid session: an auth error OR a leftover token cookie means the
    // token is orphaned → clean and flag. No error and no cookie = normal
    // logout → stay silent.
    if (error || hasAuthCookie()) await clearOrphanSession();
    return { session: null };
  } catch (err) {
    if (isInvalidRefreshToken(err) || hasAuthCookie()) await clearOrphanSession();
    return { session: null };
  }
}
