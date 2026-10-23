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
// Hrefs are module roots; the final sub-route taxonomy is owned by #24.
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: "◇" },
  { href: "/inventario", label: "Inventario", icon: "▤" },
  { href: "/ventas", label: "Ventas", icon: "▣" },
  { href: "/caja", label: "Caja", icon: "▦" },
  { href: "/clientes", label: "Clientes", icon: "◍" },
  { href: "/reportes", label: "Reportes", icon: "▧" },
  { href: "/auditoria", label: "Auditoría", icon: "▨" },
  { href: "/usuarios", label: "Usuarios", icon: "◉" },
  { href: "/configuracion", label: "Configuración", icon: "⚙" },
];

/** True when `pathname` is the item route or a child of it. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
