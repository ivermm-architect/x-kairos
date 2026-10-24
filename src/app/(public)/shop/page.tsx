// Storefront entry (/shop). Placeholder that fixes the public segment in place;
// the catalog grid and cart arrive with the storefront + web-orders milestone.
export default function ShopHome() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-3 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Tienda</h1>
      <p className="max-w-prose text-sm text-fg-muted">
        Superficie pública del storefront. El catálogo y el carrito se construyen en el milestone de
        storefront + pedidos web.
      </p>
    </main>
  );
}
