"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useUiStore, readStoredTheme } from "@/lib/store/ui";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/**
 * Admin frame: a collapsible desktop rail (≥lg) and an off-canvas mobile drawer
 * (<lg) sharing the same <Sidebar>, plus the sticky <Topbar> and the scrolling
 * content column. Mobile-first — usable at 360px, scales to tablet/desktop. All
 * layout state lives in `useUiStore`; the drawer closes on backdrop click or
 * Escape, and the chosen theme is applied to <html>.
 */
export function AppShell({ title, children }: { title?: string; children: ReactNode }) {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  const drawerRef = useRef<HTMLElement>(null);

  // Hydrate the persisted theme after mount. Done here (not in the store's
  // initial state) so the first client render matches the server and React
  // doesn't warn; the inline head script already applied it before paint.
  useEffect(() => {
    const stored = readStoredTheme();
    if (stored) setTheme(stored);
  }, [setTheme]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme) root.setAttribute("data-theme", theme);
    else root.removeAttribute("data-theme");
  }, [theme]);

  useEffect(() => {
    if (!sidebarOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeSidebar();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sidebarOpen, closeSidebar]);

  // Move focus into the drawer when it opens so keyboard users land inside the
  // trap (the main column is inert while open).
  useEffect(() => {
    if (sidebarOpen) drawerRef.current?.focus();
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-dvh bg-app">
      {/* Desktop rail */}
      <aside
        className={[
          "hidden shrink-0 border-r border-[var(--border-chrome)] bg-sidebar transition-[width] lg:block",
          sidebarCollapsed ? "w-16" : "w-64",
        ].join(" ")}
      >
        <div className="sticky top-0 h-dvh overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      {/* Mobile drawer + backdrop */}
      <div
        className={[
          "fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden",
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={closeSidebar}
        aria-hidden
      />
      <aside
        ref={drawerRef}
        tabIndex={-1}
        inert={!sidebarOpen}
        className={[
          "fixed inset-y-0 left-0 z-50 w-72 border-r border-[var(--border-chrome)] bg-sidebar transition-transform outline-none lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="h-full overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      {/* Main column. Marked inert while the mobile drawer is open so keyboard
          focus stays trapped in the drawer (the backdrop already blocks clicks). */}
      <div className="flex min-w-0 flex-1 flex-col" inert={sidebarOpen}>
        <Topbar title={title} />
        <main className="flex-1 overflow-x-hidden p-4 pb-[env(safe-area-inset-bottom)]">
          {children}
        </main>
      </div>
    </div>
  );
}
