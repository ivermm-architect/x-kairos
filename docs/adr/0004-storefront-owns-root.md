# ADR 0004 — Storefront owns the root URL; back-office moves to /admin

- Status: Accepted
- Date: 2026-10-23
- Supersedes: ADR 0003 (the "admin owns `/`" decision only; the public/admin split and client-side gate still stand)
- Refs: #24 (routing structure), #36 (auth gate)

## Context

ADR 0003 put the **admin back-office at the root URL** (`/`) on a staff-first
premise. In practice the product is customer-facing first: the root is where
visitors expect a **commercial landing** (home, about, shop), and the ERP is an
internal surface that should be namespaced and gated, not the front door.

Keeping admin at `/` also forces every public page to carry a prefix and makes
the un-gated root (until the client gate loads) show internal chrome to
anonymous visitors.

## Decision

Flip the root ownership:

- `src/app/(public)/` owns the **root** (`/`): `page.tsx` (commercial home),
  `about/`, `shop/`, and future marketing/storefront routes. Open, no auth.
- `src/app/admin/` is now a **literal** `admin/` segment (not a route group):
  `admin/layout.tsx` carries the `AuthGuard` + `RouteRoleGuard`, `admin/page.tsx`
  is the back-office dashboard, and `admin/design-system/` stays here (now also
  behind the gate, which is correct for internal tooling).
- `src/app/(auth)/login/` stays the shared sign-in route.

### Redirect targets (updated in #36)

- Post-login: active staff → `/admin`, everyone else → `/`.
- `AuthGuard`: no session → `/login`; signed-in non-staff → `/` (never loops
  back into `/admin`).

### What ADR 0003 still governs

The public/admin separation, the per-surface layouts, and the client-side gate
rationale (static export → no middleware; Postgres RLS is the real boundary) are
unchanged. Only the "admin at root" placement is superseded.

## Consequences

- Clean product shape: `/` is marketing/storefront, `/admin` is the gated ERP.
  Anonymous visitors never see internal chrome at the root.
- The admin surface now uses a visible `/admin` prefix instead of a route group,
  matching the already-literal `admin/design-system` placement.
- design-system is now behind the auth gate (via `admin/layout.tsx`). Accepted:
  it is staff/dev tooling, not a public page.
