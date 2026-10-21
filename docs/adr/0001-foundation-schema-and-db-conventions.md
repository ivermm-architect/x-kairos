# ADR 0001 — Foundation schema and DB conventions

- Status: Accepted
- Date: 2026-10-21
- Refs: #12 (design), #13 (migration)

## Context

The database grows process by process (catalog, inventory, POS, cash, web). Before
writing any SQL we fix (a) the minimal foundation every later module depends on and
(b) the conventions that keep those modules consistent. All authorization lives in
Postgres, so these rules are load-bearing, not cosmetic.

## Decision

### Foundation tables (phase 0)

Three tables. Supabase Auth (`auth.users`) owns credentials; `public` only models
who is staff and what they can do.

- `staff` — one row per back-office operator. `id uuid` PK = `auth.users.id`.
  `full_name text`, `is_active boolean`, `created_at timestamptz`.
- `roles` — catalog of operational roles. `id uuid` PK, `key text` (stable machine
  key used in code/policies), `label text`.
- `staff_roles` — many-to-many bridge. Composite PK `(staff_id, role_id)`, both FKs,
  `granted_at timestamptz`.

`assert_staff()` and RLS policies are the authorization layer (below), not tables.

### Authorization functions

- `assert_staff()` — `SECURITY DEFINER`, raises if `auth.uid()` is not a row in
  `staff` with `is_active = true`. Every privileged path calls it.
- `has_role(role_key text)` — `SECURITY DEFINER`, returns whether the current staff
  holds that role (via `staff_roles` → `roles.key`).

Both are `SECURITY DEFINER` with a fixed `search_path`, owned by a trusted role, and
granted to `authenticated` only.

### RLS pattern

- RLS is **enabled on every table in `public`**; default is deny.
- Read/write policies are expressed in terms of `assert_staff()` / `has_role(...)`,
  never by hand-checking `auth.uid()` in each policy.
- Mutations that need to bypass RLS go through `SECURITY DEFINER` RPC functions, not
  broad table grants.

### Staff provisioning

Staff rows are **provisioned explicitly** by an admin — there is no trigger that turns
every `auth.users` signup into staff. This keeps "being authenticated" separate from
"being staff". Self-signup is disabled during M1 hardening (`config.toml` currently
has `enable_signup = true`, to be tightened).

### Naming

- `snake_case` for tables and columns; table names plural (`roles`, `staff_roles`);
  `staff` is uncountable.
- PK is `id uuid` except bridge tables, which use the composite natural key.
- FK columns are `<singular>_id` (`staff_id`, `role_id`).
- Timestamps are `timestamptz`, named by event (`created_at`, `granted_at`).

### Migration layout

- `supabase/migrations/NNNN_<slug>.sql`, sequential, one concern per file.
- Reference data (the `roles` seed) ships **inside the migration**, idempotent.
- Sample/test data lives in `supabase/seed.sql`, never in migrations.

## Scope

This ADR covers only the foundation and the shared conventions. Process schemas
(catalog, POS, inventory, cash, orders) are designed and migrated in their own
milestones (M1+), each following these rules — not here.

## Consequences

- Later modules inherit a single authorization pattern; no per-table ad-hoc checks.
- The ER viewer in `docs/er-viewer/` renders this foundation and will grow with it.
- The foundation migration (#13) is unblocked and must implement exactly the above.
