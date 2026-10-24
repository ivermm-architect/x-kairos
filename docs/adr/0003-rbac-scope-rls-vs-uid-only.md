# ADR 0003 — RBAC scope: per-module permissions in RLS vs UID/role-only

- Status: Accepted
- Date: 2026-10-22
- Refs: #35 (decision issue), #0001 foundation (roles/staff_roles/has_role), legacy `roles.ts` (UI gating)

## Context

Authorization today lives in two places:

- **Database (authoritative):** every table enables RLS and gates on
  `public.is_active_staff()` for staff-wide access, with sensitive writes narrowed to
  `public.has_role('admin')`. RPCs call `public.assert_staff()`. The role catalog
  (`admin`, `cashier`, `warehouse`) and the `staff_roles` bridge already exist
  (migration 0001).
- **Frontend (cosmetic):** the legacy `roles.ts` hides menus/actions per role. This is
  UX only — it is not a security boundary and must never be treated as one.

The known gap (**D10**) is that _data_ is separated almost entirely by "is this an active
staff member", not by role or module. A cashier and a warehouse operator currently see
and can mutate largely the same rows at the database layer; only the admin-only writes
are truly restricted. Real per-module RBAC — e.g. "cashier may read sales but not edit
the catalog", "warehouse may move stock but not open a cash drawer" — would require a
permission check on the order of **~40 tables**, each with read/write variants, plus a
permissions catalog and per-role grants.

The question this ADR settles: **do we build full per-module RBAC now, or defer it?**

## Decision

**Defer full per-module RBAC.** Keep the current two-tier model for the M1 wave:

1. `is_active_staff()` — the staff boundary (read + ordinary mutate).
2. `has_role('admin')` — the elevated boundary (sensitive writes / reference data).

No `has_permission(module, action)` enforcement is added to RLS now. This is a
deliberate, documented deferral, not an oversight.

### Why defer

- **Effort vs. priority.** Issue #35 is `priority: could`. Threading a module/action
  check through ~40 tables (and every RPC) is high-effort, high-risk work that would
  dominate the M1 wave for a benefit the current single-tenant, small-team operation
  does not yet need.
- **No correctness gap for the current threat model.** The real risks already closed in
  M1 are the anon-reachable holes (D1/D7) and server-side pricing/stock — none of which
  depend on inter-role separation. Staff are trusted operators; the dangerous surface is
  _unauthenticated_ and _client-trusted_ input, which RLS + SECURITY DEFINER RPCs already
  cover.
- **Avoid premature, drift-prone structure.** A permissions matrix that nobody enforces
  operationally becomes stale and gives false confidence. Better to add it when a
  concrete need (a role that must be denied data) exists.

### What stays true meanwhile

- The frontend `roles.ts` remains **UX only**. Any claim of security must be backed by an
  RLS policy or an RPC guard, never by hidden UI.
- `admin`-only writes stay enforced in the DB via `has_role('admin')`.

## Scope

Decision-only. No schema or policy change ships with this ADR. The pilot described below
is **not** built now; it is the agreed shape for when per-module RBAC is promoted to a
real milestone.

## Migration path (when RBAC is promoted)

Forward-compatible design so call sites do not churn later:

1. **Catalog + bridge (one migration):**
   - `permissions(key text pk, module text, action text, label text)` — e.g.
     `('sales.read','sales','read',…)`, `('catalog.write','catalog','write',…)`.
   - `role_permissions(role_id, permission_id)` bridge, seeded per role.
2. **One helper:**
   ```sql
   create function public.has_permission(p_module text, p_action text)
   returns boolean language sql stable security definer
   set search_path = public, pg_temp as $$
     select public.has_role('admin') or exists (
       select 1
       from public.staff_roles sr
       join public.role_permissions rp on rp.role_id = sr.role_id
       join public.permissions p on p.id = rp.permission_id
       where sr.staff_id = auth.uid()
         and p.module = p_module and p.action = p_action
     );
   $$;
   ```
   `admin` short-circuits true, so existing admin behavior is preserved.
3. **Pilot on one table first** (recommended: `sales` or `cash_sessions`): replace that
   table's `is_active_staff()` policy with `has_permission('sales','read')` /
   `('sales','write')`, verify with the three roles, then roll outward table-by-table.
4. **RPCs:** add `perform public.assert_permission(module, action)` (a raising wrapper)
   alongside the existing `assert_staff()`.

Because every call site today already funnels through `is_active_staff()` /
`has_role()`, swapping in `has_permission()` is a localized edit per table, not a
rewrite.

## Consequences

- M1 ships without inter-role data separation; this is an accepted, bounded risk for a
  trusted-operator, single-team deployment.
- When a real "this role must not see/do X" requirement appears, it has a ready design and
  a pilot-first rollout, tracked as its own milestone rather than bolted onto M1.
- The frontend role gating must keep carrying an explicit "UX only" note so it is never
  mistaken for enforcement.
