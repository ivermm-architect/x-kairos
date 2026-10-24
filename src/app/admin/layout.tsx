import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { RouteRoleGuard } from "@/components/auth/route-role-guard";
import { AdminHeader } from "@/components/admin/admin-header";

// Admin surface root (/admin): every screen renders behind the session gate
// (AuthGuard) and the per-route role gate (RouteRoleGuard), with the admin
// header (identity + sign-out). The auth context is provided app-wide in the
// root layout.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <RouteRoleGuard>
        <div className="flex min-h-full flex-1 flex-col">
          <AdminHeader />
          <div className="flex flex-1 flex-col">{children}</div>
        </div>
      </RouteRoleGuard>
    </AuthGuard>
  );
}
