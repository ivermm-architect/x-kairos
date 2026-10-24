/**
 * Admin navigation model. Each module registers its entry here as it lands; the
 * final route taxonomy (public vs admin segments) is owned by #24. Hrefs use the
 * back-office paths and may 404 until their module ships — the shell only owns
 * the frame and the active-link behaviour, not the destinations.
 *
 * `icon` is a short glyph so the shell has no icon-library dependency yet; swap
 * for real icons when the design-system icon set lands.
 */
export type NavItem = {
  href: string;
  label: string;
  icon: string;
};

// Mirrors the legacy Kairos module set so the back-office exposes the same
// surfaces: Inicio (dashboard), Inventario, Ventas (POS + web orders live
// under it), Caja, Clientes, Reportes, Auditoría, Usuarios, Configuración.
// Hrefs live under the `/admin` back-office segment (ADR 0004, #110); the final
// sub-route taxonomy is owned by #24.
export const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Inicio", icon: "◇" },
  { href: "/admin/inventario", label: "Inventario", icon: "▤" },
  { href: "/admin/ventas", label: "Ventas", icon: "▣" },
  { href: "/admin/caja", label: "Caja", icon: "▦" },
  { href: "/admin/clientes", label: "Clientes", icon: "◍" },
  { href: "/admin/reportes", label: "Reportes", icon: "▧" },
  { href: "/admin/auditoria", label: "Auditoría", icon: "▨" },
  { href: "/admin/usuarios", label: "Usuarios", icon: "◉" },
  { href: "/admin/configuracion", label: "Configuración", icon: "⚙" },
];

/** True when `pathname` is the item route or a child of it. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
