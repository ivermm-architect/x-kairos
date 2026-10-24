"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import { safeGetSession } from "@/lib/auth/safe-session";

/**
 * Decides where a user lands after signing in, by type:
 *   - Staff (active) → admin root `/`.
 *   - Everyone else (customer) → public storefront `/shop`.
 *
 * Same login for both; the destination is the role. Uses the
 * `is_active_staff` RPC (SECURITY DEFINER) as the single source of truth —
 * the same check RLS enforces — so the client never escalates privilege.
 * On any failure it treats the user as a customer (`/shop`), never admin.
 */
export async function postLoginRedirect(): Promise<string> {
  const { session } = await safeGetSession(); // orphan token → no session, no throw
  if (!session?.user) return "/login";

  const { data, error } = await getSupabaseClient().rpc("is_active_staff");
  if (error) return "/shop"; // on failure, treat as customer (no escalation)
  return data ? "/" : "/shop";
}
