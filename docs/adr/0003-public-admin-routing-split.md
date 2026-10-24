# ADR 0003 — Public storefront vs admin back-office routing split

- Status: Accepted
- Date: 2026-10-22
- Refs: #24 (routing structure), #36 (auth gate)

## Context

The app serves two surfaces that must never mix: a **public storefront**
(`area:storefront`, open to customers) and an **admin back-office / ERP**
(`area:admin`, staff-only, behind auth + RBAC). Without an explicit convention,
pages drift into the wrong surface and the boundary gets retrofitted later —
expensive and error-prone.

A second constraint shapes the solution: the app ships as a **Next.js static
export** (`output: "export"`). There is no server, no middleware, no
server-side redirect. Any access gate therefore runs **client-side**, and route
segmentation is purely an App Router folder convention.

## Decision

Routes are segmented with App Router **route groups** so each surface owns its
own layout/shell while the URL stays clean:

- `src/app/(admin)/` — the back-office. Renders at the **root URL** (`/`). This
  is the primary surface of the product; the ERP is what staff open first.
- `src/app/(public)/` — the storefront (e.g. `/shop`). Open, no session needed.
- `src/app/(auth)/login/` — the sign-in route. No shell, no gate.
- `src/app/admin/design-system/` — a **literal** `admin/` segment (not a route
  group) for internal dev/documentation tooling (the design-system showcase).
  It is intentionally namespaced away from the public surface and is not part of
  the public build intent.

Each group has its **own layout** so shells never leak across surfaces:
`(admin)/layout.tsx` carries the auth wrapper + admin shell; `(public)` and
`(auth)` have their own minimal layouts.

### Why route groups (parenthesized folders)

Route groups let the admin surface live at the root URL without a visible
`/admin` prefix, while keeping a physically separate folder, layout and shell
from the public storefront. The parentheses are stripped from the URL, so the
segmentation is a source-tree concern only — exactly the boundary we want.

### Why the gate is client-side

Static export rules out middleware and server redirects. `/admin/*`
protection is enforced in the browser by the auth layer (`AuthGuard` /
`RouteRoleGuard`, #36): no staff session → redirect to `/login`; authorization
decisions remain in Postgres (RLS + `is_active_staff`), never trusted on the
client. The client gate is UX, not the security boundary — the database is.

### design-system showcase placement

The showcase lives under the literal `admin/design-system` segment. It is
developer tooling: reachable in dev, excluded from the public surface by its
placement, and never linked from the storefront.

## Scope

Covers the route-group convention and the public/admin boundary only. The
actual auth gate wiring into `(admin)/layout.tsx` is owned by #36 and lands with
it; this ADR documents the split and where the gate attaches, not the auth
implementation.

## Consequences

- Every new page has an unambiguous home: storefront → `(public)`, staff ERP →
  `(admin)`, dev tooling → `admin/design-system`. No retrofitting.
- Because gating is client-side, the admin bundle is still _served_ statically;
  protection depends on the auth layer loading before content is actionable.
  This is accepted given the static-export constraint and the real security
  boundary living in Postgres RLS.
- The admin surface occupying the root URL means the storefront carries a path
  prefix (`/shop`, …), not the back-office. This matches the product intent
  (staff-first) but must be kept in mind when adding public routes.
