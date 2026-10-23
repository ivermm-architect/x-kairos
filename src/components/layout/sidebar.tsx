"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUiStore } from "@/lib/store/ui";
import { NAV_ITEMS, isActivePath } from "./nav";

/**
 * Admin sidebar. On desktop it is a rail that collapses to icons
 * (`sidebarCollapsed`); on mobile it is the off-canvas drawer content. Links
 * close the mobile drawer on navigation. The active link is derived from the
 * current path and exposed via aria-current.
 */
export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const closeSidebar = useUiStore((s) => s.closeSidebar);

  return (
    <nav aria-label="Navegación principal" className="flex h-full flex-col gap-1 p-3">
      <div className="mb-2 flex items-center gap-2 px-2 py-1">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-on-brand">
          K
        </span>
        {!collapsed && <span className="text-lg font-bold text-fg">Kairos</span>}
      </div>

      {NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeSidebar}
            aria-current={active ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            className={[
              "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
              collapsed ? "justify-center" : "",
              active
                ? "bg-primary-surface text-primary"
                : "text-fg-muted hover:bg-muted hover:text-fg",
            ].join(" ")}
          >
            <span aria-hidden className="text-base">
              {item.icon}
            </span>
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
