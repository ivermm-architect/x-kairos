import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { RouteRoleGuard } from "@/components/auth/route-role-guard";

// Admin route-group root: every admin screen renders behind the session gate
// (AuthGuard) and the per-route role gate (RouteRoleGuard). The auth context
// itself is provided app-wide in the root layout.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <RouteRoleGuard>{children}</RouteRoleGuard>
    </AuthGuard>
  );
}
