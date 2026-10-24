"use client";

import { useUiStore } from "@/lib/store/ui";
import { BellIcon, MenuIcon, MoonIcon, SearchIcon, SunIcon } from "./icons";

/**
 * Admin app bar. The menu button toggles the mobile drawer below `lg` and the
 * desktop rail collapse at and above it. Left to right: menu + brand, a search
 * field (visual placeholder — no query backend yet), then notifications and the
 * theme toggle. Identity and sign-out live in the sidebar footer. Sticky with a
 * safe-area-aware top padding.
 */
export function Topbar({ title }: { title?: string }) {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleCollapsed = useUiStore((s) => s.toggleCollapsed);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  function onMenu() {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      toggleCollapsed();
    } else {
      toggleSidebar();
    }
  }

  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-border bg-surface px-3 pt-[env(safe-area-inset-top)] sm:gap-3 sm:px-4">
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
      <div className="relative mx-auto w-full max-w-md">
        <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-fg-muted">
          <SearchIcon />
        </span>
        <input
          type="search"
          aria-label="Buscar"
          placeholder="Buscar…"
          className="h-10 w-full rounded-md border border-border bg-muted pr-3 pl-9 text-sm text-fg outline-none placeholder:text-fg-muted focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
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
          className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-primary ring-2 ring-surface"
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
    </header>
  );
}
