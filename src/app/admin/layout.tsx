import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { RouteRoleGuard } from "@/components/auth/route-role-guard";

// Admin surface gate (/admin): every screen below renders behind the session
// gate (AuthGuard) and the per-route role gate (RouteRoleGuard). The visual
// frame is not decided here — the (dashboard) group wraps the real modules in
// the AppShell, while internal tools (design-system) stay standalone under the
// same gate. The auth context is provided app-wide in the root layout.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <RouteRoleGuard>{children}</RouteRoleGuard>
    </AuthGuard>
  );
}
