/**
 * Role-based navigation access — UI layer only.
 *
 * Real data security is enforced in Postgres (RLS + SECURITY DEFINER RPC).
 * These helpers only decide what an authenticated staff member may *see* or
 * *navigate*, so they never grant access the database would deny.
 */

/**
 * Route-prefix → allowed role keys. A path matches when it equals the prefix
 * or starts with `prefix + "/"`. Empty by default: any staff member can reach
 * admin routes until a module declares its own restriction here. Extend this
 * map as admin slices land (e.g. `"/users": ["admin"]`).
 */
export const ROUTE_ROLES: Record<string, string[]> = {};

/** Whether the current roles include a given role key. */
export function hasRole(roles: string[], key: string): boolean {
  return roles.includes(key);
}

/** Whether any of the current roles may access the given pathname. */
export function canAccessPath(roles: string[], pathname: string): boolean {
  const match = Object.entries(ROUTE_ROLES).find(
    ([prefix]) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
  if (!match) return true; // no restriction configured for this path
  return match[1].some((key) => roles.includes(key));
}
