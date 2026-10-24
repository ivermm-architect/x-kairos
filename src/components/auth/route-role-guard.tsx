"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { canAccessPath } from "@/lib/auth/access";

/**
 * Blocks a route by role (UI defense; data is protected by RLS). When the
 * current roles can't access the route's module, it renders a restricted
 * notice instead of the content. AuthGuard already handles the session/loading
 * state, so this only decides role visibility.
 */
export function RouteRoleGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { roles } = useAuth();

  if (!canAccessPath(roles, pathname)) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6 text-center">
        <div>
          <h2 className="text-lg font-bold text-fg">Acceso restringido</h2>
          <p className="mt-1 text-sm text-fg-muted">Tu rol no tiene acceso a esta sección.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
