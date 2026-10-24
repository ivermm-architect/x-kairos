// About page (/about) — public marketing surface (ADR 0004). Placeholder copy;
// real content lands with the storefront work.
export default function About() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight">Nosotros</h1>
      <p className="max-w-prose text-base text-fg-muted">
        x-kairos es el punto de venta e inventario del negocio. Esta página reúne la historia, el
        equipo y la información de contacto; su contenido se completa en el milestone de storefront.
      </p>
    </main>
  );
}
