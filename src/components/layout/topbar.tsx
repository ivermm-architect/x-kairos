"use client";

import { useUiStore } from "@/lib/store/ui";

/**
 * Admin app bar. The menu button toggles the mobile drawer below `lg` and the
 * desktop rail collapse at and above it. Includes a theme toggle; the title
 * slot is passed by the shell. Sticky with a safe-area-aware top padding.
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

      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Cambiar tema"
        aria-pressed={theme === "dark"}
        className="grid min-h-11 min-w-11 place-items-center rounded-md text-fg-muted hover:bg-muted hover:text-fg"
      >
        {theme === "dark" ? "☀" : "☾"}
      </button>
    </header>
  );
}
