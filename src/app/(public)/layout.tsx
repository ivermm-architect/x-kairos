import type { ReactNode } from "react";
import Link from "next/link";

// Public storefront shell — open surface (no auth). Per ADR 0004 the storefront
// owns the root "/", so this is the commercial chrome (header nav + footer) that
// wraps the marketing and shop pages. The full cart/account chrome lands with
// the web-orders work.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="text-base font-semibold tracking-tight">
            x-kairos
          </Link>
          <nav className="flex items-center gap-1 text-sm" aria-label="Principal">
            <Link href="/" className="rounded-md px-3 py-2 font-medium hover:bg-muted">
              Inicio
            </Link>
            <Link href="/shop" className="rounded-md px-3 py-2 font-medium hover:bg-muted">
              Tienda
            </Link>
            <Link href="/about" className="rounded-md px-3 py-2 font-medium hover:bg-muted">
              Nosotros
            </Link>
            <Link
              href="/login"
              className="ml-1 rounded-md bg-primary px-4 py-2 font-medium text-on-brand hover:bg-primary-hover active:bg-primary-active"
            >
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex flex-1 flex-col">{children}</div>

      <footer className="mt-auto border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-6 py-6 text-sm text-fg-muted">
          © {new Date().getFullYear()} x-kairos
        </div>
      </footer>
    </div>
  );
}
