"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUiStore } from "@/lib/store/ui";
import { useAuth } from "@/lib/auth/context";
import {
  BellIcon,
  ChevronDownIcon,
  LogoutIcon,
  MenuIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
  UserIcon,
} from "./icons";

/**
 * Admin app bar. The menu button toggles the mobile drawer below `lg` and the
 * desktop rail collapse at and above it. Left to right: menu + brand, a search
 * field (visual placeholder — no query backend yet), then notifications, the
 * theme toggle and a user menu carrying identity + sign-out. Sticky with a
 * safe-area-aware top padding.
 */
export function Topbar({ title }: { title?: string }) {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleCollapsed = useUiStore((s) => s.toggleCollapsed);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const { user, roles, isStaff, signOut } = useAuth();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close the user menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const email = user?.email ?? "";
  const name = email ? email.split("@")[0] : (title ?? "Kairos");
  const role = roles[0] ?? (isStaff ? "Staff" : "Invitado");
  const initial = (email || "K").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-[var(--border-chrome)] bg-sidebar px-3 pt-[env(safe-area-inset-top)] sm:gap-3 sm:px-4">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Alternar navegación"
        className="grid min-h-11 min-w-11 place-items-center rounded-md text-fg-muted hover:bg-muted hover:text-fg"
      >
        <MenuIcon />
      </button>

      <span className="hidden text-base font-bold text-fg sm:inline">{title ?? "Kairos"}</span>

      {/* Search — visual placeholder; no query backend yet. */}
      <div className="relative mr-auto w-full max-w-xl">
        <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-fg-muted">
          <SearchIcon />
        </span>
        <input
          type="search"
          aria-label="Buscar"
          placeholder="Buscar…"
          className="h-10 w-full rounded-lg border border-border bg-muted pr-3 pl-9 text-sm text-fg outline-none placeholder:text-fg-muted focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-sidebar)]"
        />
      </div>

      {/* Notifications — placeholder with an unread dot. */}
      <button
        type="button"
        aria-label="Notificaciones"
        className="relative grid min-h-11 min-w-11 place-items-center rounded-md text-fg-muted hover:bg-muted hover:text-fg"
      >
        <BellIcon />
        <span
          aria-hidden
          className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-primary ring-2 ring-sidebar"
        />
      </button>

      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Cambiar tema"
        aria-pressed={theme === "dark"}
        className="grid min-h-11 min-w-11 place-items-center rounded-md text-fg-muted hover:bg-muted hover:text-fg"
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>

      {/* User menu — identity + profile + sign-out. */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex min-h-11 items-center gap-2 rounded-md pr-1 pl-1 text-left hover:bg-muted sm:pr-2"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-on-brand">
            {initial}
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="max-w-[10rem] truncate text-sm font-medium text-fg">{name}</span>
            <span className="text-xs text-fg-muted">{role}</span>
          </span>
          <ChevronDownIcon className="hidden text-fg-muted sm:block" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            aria-label="Menú de usuario"
            className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-surface shadow-lift"
          >
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-medium text-fg">{name}</p>
              <p className="truncate text-xs text-fg-muted">{email || role}</p>
            </div>
            <Link
              href="/admin/perfil"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex min-h-11 items-center gap-3 px-4 text-sm text-fg hover:bg-muted"
            >
              <UserIcon className="text-fg-muted" />
              Perfil
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={onSignOut}
              disabled={signingOut}
              className="flex min-h-11 w-full items-center gap-3 px-4 text-sm text-fg hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signingOut ? (
                <span className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-fg-muted border-t-transparent" />
              ) : (
                <LogoutIcon className="text-fg-muted" />
              )}
              {signingOut ? "Saliendo…" : "Cerrar sesión"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
