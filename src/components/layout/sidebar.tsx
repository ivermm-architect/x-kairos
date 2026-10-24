"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUiStore } from "@/lib/store/ui";
import { useAuth } from "@/lib/auth/context";
import { HOME, NAV_GROUPS, NAV_FLAT, isActivePath, isGroupActive } from "./nav";
import { Icons, HomeIcon, ChevronDownIcon, LogoutIcon } from "./icons";

/**
 * Admin sidebar. Expanded it shows the brand, a standalone Inicio link and
 * collapsible module sections (accordion) with an active accent (filled surface
 * + left bar); collapsed (desktop rail) it flattens to an icon list. A user
 * footer carries identity + sign-out. Links close the mobile drawer on nav.
 */
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  const { user, roles, isStaff, signOut } = useAuth();

  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map((g) => [g.id, isGroupActive(pathname, g)])),
  );
  const [signingOut, setSigningOut] = useState(false);

  // Keep the active section open as the route changes (without collapsing the
  // others the user may have opened). Adjusting state during render on a path
  // change is React's sanctioned pattern — no effect, no cascading render.
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    const active = NAV_GROUPS.find((g) => isGroupActive(pathname, g));
    if (active && !open[active.id]) {
      setOpen((prev) => ({ ...prev, [active.id]: true }));
    }
  }

  async function onSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
    } catch {
      setSigningOut(false);
    }
  }

  const email = user?.email ?? "";
  const name = email ? email.split("@")[0] : "Kairos";
  const role = roles[0] ?? (isStaff ? "Staff" : "Invitado");
  const initial = (email || "K").charAt(0).toUpperCase();

  // Collapsed desktop rail: a flat list of leaf icons, no groups.
  if (collapsed) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-center p-3">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-on-brand">
            K
          </span>
        </div>
        <nav aria-label="Navegación principal" className="flex flex-1 flex-col gap-1 px-2">
          {NAV_FLAT.map((item) => {
            const Icon = Icons[item.icon] ?? HomeIcon;
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                title={item.label}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative grid min-h-11 place-items-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:outline-none focus-visible:ring-inset",
                  active
                    ? "bg-primary-surface text-primary"
                    : "text-fg-muted hover:bg-muted hover:text-fg",
                ].join(" ")}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute top-1.5 bottom-1.5 left-0 w-1 rounded-r-full bg-primary"
                  />
                )}
                <Icon />
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={onSignOut}
            disabled={signingOut}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="grid min-h-11 w-full place-items-center rounded-md text-fg-muted hover:bg-muted hover:text-fg focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:outline-none focus-visible:ring-inset disabled:opacity-60"
          >
            <LogoutIcon />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2 p-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-on-brand">
          K
        </span>
        <span className="text-lg font-bold text-fg">Kairos</span>
      </div>

      <nav
        aria-label="Navegación principal"
        className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pt-2 pb-3"
      >
        {/* Inicio — standalone */}
        <SidebarLink item={HOME} pathname={pathname} onNavigate={closeSidebar} />

        {NAV_GROUPS.map((group) => {
          const GroupIcon = Icons[group.icon] ?? HomeIcon;
          const groupActive = isGroupActive(pathname, group);
          const isOpen = open[group.id] ?? false;
          return (
            <div key={group.id} className="mt-1">
              <button
                type="button"
                onClick={() => setOpen((p) => ({ ...p, [group.id]: !p[group.id] }))}
                aria-expanded={isOpen}
                className={[
                  "relative flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:outline-none focus-visible:ring-inset",
                  groupActive
                    ? "bg-primary-surface text-primary"
                    : "text-fg-muted hover:bg-muted hover:text-fg",
                ].join(" ")}
              >
                {groupActive && (
                  <span
                    aria-hidden
                    className="absolute inset-y-2 left-0.5 w-1 rounded-full bg-primary"
                  />
                )}
                <GroupIcon />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDownIcon
                  className={["transition-transform", isOpen ? "rotate-180" : ""].join(" ")}
                />
              </button>

              {isOpen && (
                <div className="mt-1 flex flex-col gap-1 pl-4">
                  {group.items.map((item) => (
                    <SidebarLink
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      onNavigate={closeSidebar}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="flex items-center gap-3 border-t border-border p-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-on-brand">
          {initial}
        </span>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-sm font-medium text-fg">{name}</span>
          <span className="truncate text-xs text-fg-muted">{role}</span>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          aria-label="Cerrar sesión"
          className="grid min-h-11 min-w-11 place-items-center rounded-md text-fg-muted hover:bg-muted hover:text-fg focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:outline-none focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-60"
        >
          {signingOut ? (
            <span className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-fg-muted border-t-transparent" />
          ) : (
            <LogoutIcon />
          )}
        </button>
      </div>
    </div>
  );
}

/** A single nav leaf with the active accent (filled surface + left bar). */
function SidebarLink({
  item,
  pathname,
  onNavigate,
}: {
  item: { href: string; label: string; icon: string };
  pathname: string;
  onNavigate: () => void;
}) {
  const Icon = Icons[item.icon] ?? HomeIcon;
  const active = isActivePath(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={[
        "relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:outline-none focus-visible:ring-inset",
        active
          ? "bg-primary-surface font-medium text-primary"
          : "text-fg-muted hover:bg-muted hover:text-fg",
      ].join(" ")}
    >
      {active && (
        <span aria-hidden className="absolute inset-y-2 -left-1.5 w-1 rounded-full bg-primary" />
      )}
      <Icon />
      <span>{item.label}</span>
    </Link>
  );
}
