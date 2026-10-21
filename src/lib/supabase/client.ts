import { createBrowserClient } from "@supabase/ssr";

// Lazy singleton: the browser client is created on first use and reused
// afterwards, so the whole app shares one connection/auth state.
let client: ReturnType<typeof createBrowserClient> | undefined;

/**
 * Returns the shared Supabase browser client.
 *
 * Reads only public (`NEXT_PUBLIC_*`) env vars — safe to expose client-side.
 * Authorization is enforced in Postgres (RLS + RPC), never here.
 */
export function getSupabaseClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.example).",
    );
  }

  client = createBrowserClient(url, anonKey);
  return client;
}
