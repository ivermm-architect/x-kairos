import type { ReactNode } from "react";
import { AppShell } from "@/components/layout";

// Back-office frame: wraps the real admin modules in the responsive AppShell
// (app bar, nav, collapsible sidebar). Lives in a route group so it does not
// alter the URL — modules here are served under `/admin` while internal tools
// (design-system) stay outside the shell. The session + role gates are owned
// by the parent admin/layout.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
