/**
 * Admin navigation model. A standalone home entry plus collapsible sections that
 * group the legacy Kairos modules. `icon` is a key into the shared `Icons` map
 * (see ./icons) so this model stays JSX-free. Hrefs live under the `/admin`
 * back-office segment (ADR 0004, #110); the final sub-route taxonomy is owned by
 * #24, so destinations may 404 until their module ships.
 */
export type NavItem = {
  href: string;
  label: string;
  icon: string;
};

export type NavGroup = {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
};

/** Dashboard root — a top-level link, not part of any group. */
export const HOME: NavItem = { href: "/admin", label: "Inicio", icon: "home" };

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "operacion",
    label: "Operación",
    icon: "tag",
    items: [
      { href: "/admin/ventas", label: "Ventas", icon: "tag" },
      { href: "/admin/caja", label: "Caja", icon: "wallet" },
      { href: "/admin/inventario", label: "Inventario", icon: "box" },
    ],
  },
  {
    id: "clientes",
    label: "Clientes",
    icon: "users",
    items: [{ href: "/admin/clientes", label: "Clientes", icon: "users" }],
  },
  {
    id: "analisis",
    label: "Análisis",
    icon: "chart",
    items: [
      { href: "/admin/reportes", label: "Reportes", icon: "chart" },
      { href: "/admin/auditoria", label: "Auditoría", icon: "shield" },
    ],
  },
  {
    id: "administracion",
    label: "Administración",
    icon: "settings",
    items: [
      { href: "/admin/usuarios", label: "Usuarios", icon: "userCog" },
      { href: "/admin/configuracion", label: "Configuración", icon: "settings" },
    ],
  },
];

/** Every leaf link, flattened — used by the collapsed icon rail. */
export const NAV_FLAT: NavItem[] = [HOME, ...NAV_GROUPS.flatMap((g) => g.items)];

/** True when `pathname` is the item route or a child of it. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** True when any item inside the group matches the current path. */
export function isGroupActive(pathname: string, group: NavGroup): boolean {
  return group.items.some((item) => isActivePath(pathname, item.href));
}
