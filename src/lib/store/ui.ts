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
 * applies it to <html data-theme>.
 */
type Theme = "light" | "dark";

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
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
}));
