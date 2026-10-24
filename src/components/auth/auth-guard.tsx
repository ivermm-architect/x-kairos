"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/context";

/**
 * Gates the admin area on the client (static export: no middleware, no server
 * redirects). No session → /login. Signed in but not staff → public home ("/"),
 * never back into /admin (which would loop). This is a UI barrier; the real data
 * security is RLS/RPC in Postgres.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { session, isStaff, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!isStaff) router.replace("/");
  }, [loading, session, isStaff, router]);

  if (loading || !session || !isStaff) {
    return (
      <div className="grid min-h-dvh place-items-center text-fg-muted" aria-busy="true">
        <span className="inline-flex items-center gap-3 text-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Cargando tu panel…
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
