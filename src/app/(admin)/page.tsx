import Link from "next/link";

// Back-office landing. The (admin) group owns the root URL ("/") per ADR 0003.
// This is a placeholder entry point; the real dashboard and the session gate
// (AuthGuard / RouteRoleGuard) arrive with #36. It renders inside <AuthProvider>
// via the group layout, so future guards can read the live session here.
export default function AdminHome() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">x-kairos · back-office</h1>
        <p className="max-w-prose text-sm text-fg-muted">
          Staff ERP surface. Routing is segmented into a public storefront and this admin
          back-office (ADR 0003). The session gate is wired in #36; until then these screens are
          reachable in dev only.
        </p>
      </header>

      <nav className="flex flex-wrap gap-3" aria-label="Internal tools">
        <Link
          href="/admin/design-system"
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-border-strong"
        >
          Design system →
        </Link>
        <Link
          href="/shop"
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-border-strong"
        >
          Public storefront →
        </Link>
      </nav>
    </main>
  );
}
