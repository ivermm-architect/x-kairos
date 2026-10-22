import { create } from "zustand";

/**
 * Minimal global UI state — the wiring reference for Zustand. Real stores live
 * in their own feature issues. Keep slices small and subscribe via selectors
 * (e.g. `useUiStore((s) => s.sidebarOpen)`) so consumers re-render narrowly and
 * unused state stays tree-shakeable.
 */
type UiState = {
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
