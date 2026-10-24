"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";

// Admin chrome header: identifies the signed-in staff member and offers sign-out.
// Lives inside AuthGuard, so a session is guaranteed here. On sign-out it clears
// the session and returns to /login.
export function AdminHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function onSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
    } catch {
      setSigningOut(false); // stay put so the user can retry
    }
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/admin" className="text-sm font-semibold tracking-tight">
          x-kairos · back-office
        </Link>
        <div className="flex items-center gap-3">
          {user?.email && (
            <span className="hidden text-sm text-fg-muted sm:inline">{user.email}</span>
          )}
          <button
            type="button"
            onClick={onSignOut}
            disabled={signingOut}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signingOut && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-fg-muted border-t-transparent" />
            )}
            {signingOut ? "Saliendo…" : "Cerrar sesión"}
          </button>
        </div>
      </div>
    </header>
  );
}
