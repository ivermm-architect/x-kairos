import { create } from "zustand";

/**
 * Global UI state for the app shell. Keep slices small and subscribe via
 * selectors (e.g. `useUiStore((s) => s.sidebarOpen)`) so consumers re-render
 * narrowly and unused state stays tree-shakeable.
 *
 * Two independent sidebar axes:
 *   - `sidebarOpen`      — the mobile off-canvas drawer (closed by default).
 *   - `sidebarCollapsed` — the desktop rail collapsed to icons (expanded by
 *     default).
 *
 * `theme` is `null` when following the OS (prefers-color-scheme); the shell
 * applies it to <html data-theme> and persists the explicit choice so it
 * survives reloads. The initial value stays `null` (not read from storage) to
 * match the server render and avoid a hydration mismatch — the inline head
 * script prevents the flash, and the shell hydrates the stored theme after
 * mount via `readStoredTheme`.
 */
type Theme = "light" | "dark";

/** localStorage key for the persisted theme. Kept in sync with the anti-FOUC
 *  head script that reads it before paint. */
export const THEME_KEY = "x-kairos-theme";

/** Reads the persisted theme, or `null` to follow the OS. Safe on the server. */
export function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
}

function persistTheme(theme: Theme | null): void {
  if (typeof window === "undefined") return;
  try {
    if (theme) localStorage.setItem(THEME_KEY, theme);
    else localStorage.removeItem(THEME_KEY);
  } catch {
    // no storage access: not critical
  }
}

type UiState = {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: Theme | null;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  toggleCollapsed: () => void;
  setTheme: (theme: Theme | null) => void;
  toggleTheme: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  theme: null,
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setTheme: (theme) => {
    persistTheme(theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((s) => {
      const next: Theme = s.theme === "dark" ? "light" : "dark";
      persistTheme(next);
      return { theme: next };
    }),
}));
