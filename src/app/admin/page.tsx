import Link from "next/link";

// Back-office dashboard, served at /admin (ADR 0004: storefront owns "/",
// back-office lives under /admin). Rendered behind the session + role gate
// via admin/layout.tsx. Placeholder entry point; the real dashboard lands later.
export default function AdminHome() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">x-kairos · back-office</h1>
        <p className="max-w-prose text-sm text-fg-muted">
          Superficie ERP del staff, bajo <code>/admin</code> y protegida por sesión + rol. La tienda
          pública vive en la raíz (ADR 0004).
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
