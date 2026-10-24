"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUiStore } from "@/lib/store/ui";
import { useAuth } from "@/lib/auth/context";

/**
 * Admin app bar. The menu button toggles the mobile drawer below `lg` and the
 * desktop rail collapse at and above it. Carries the shell identity + sign-out
 * and a theme toggle; the title slot is passed by the shell. Sticky with a
 * safe-area-aware top padding.
 */
export function Topbar({ title }: { title?: string }) {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleCollapsed = useUiStore((s) => s.toggleCollapsed);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  function onMenu() {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      toggleCollapsed();
    } else {
      toggleSidebar();
    }
  }

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
    <header className="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-border bg-surface px-3 pt-[env(safe-area-inset-top)]">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Alternar navegación"
        className="grid min-h-11 min-w-11 place-items-center rounded-md text-fg-muted hover:bg-muted hover:text-fg"
      >
        ☰
      </button>

      <h1 className="flex-1 truncate text-base font-semibold text-fg">{title ?? "Kairos"}</h1>

      {user?.email && (
        <span className="hidden max-w-[12rem] truncate text-sm text-fg-muted sm:inline">
          {user.email}
        </span>
      )}

      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Cambiar tema"
        aria-pressed={theme === "dark"}
        className="grid min-h-11 min-w-11 place-items-center rounded-md text-fg-muted hover:bg-muted hover:text-fg"
      >
        {theme === "dark" ? "☀" : "☾"}
      </button>

      <button
        type="button"
        onClick={onSignOut}
        disabled={signingOut}
        aria-label="Cerrar sesión"
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-fg hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {signingOut && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-fg-muted border-t-transparent" />
        )}
        <span className="hidden sm:inline">{signingOut ? "Saliendo…" : "Cerrar sesión"}</span>
        <span aria-hidden className="sm:hidden">
          ⏻
        </span>
      </button>
    </header>
  );
}
