import Link from "next/link";

// Commercial landing at "/" (ADR 0004). Public marketing entry point; the real
// hero, featured catalog and CTAs land with the storefront + web-orders work.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-6 py-20">
      <section className="flex flex-col gap-5">
        <span className="text-sm font-medium tracking-wide text-fg-muted uppercase">x-kairos</span>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Tu tienda y tu operación, en un solo lugar.
        </h1>
        <p className="max-w-prose text-base text-fg-muted">
          Compra en línea y deja que el equipo gestione inventario, ventas y caja desde el
          back-office. Esta es la superficie pública; el catálogo completo llega pronto.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/shop"
            className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-on-brand hover:bg-primary-hover active:bg-primary-active"
          >
            Ir a la tienda
          </Link>
          <Link
            href="/about"
            className="rounded-lg border border-border bg-surface px-5 py-3 text-sm font-medium hover:border-border-strong"
          >
            Conócenos
          </Link>
        </div>
      </section>
    </main>
  );
}
