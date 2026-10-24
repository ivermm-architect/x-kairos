// Example module page under /admin/ventas. Lives in the (dashboard) route
// group so it renders inside the AppShell frame (sidebar + topbar) and behind
// the session + role gate. Placeholder work surface — just enough to verify the
// nav active accent and the shell framing; the real module ships with #24.
export default function VentasPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Ventas</h1>
        <p className="max-w-prose text-sm text-fg-muted">
          Superficie de ejemplo para validar el acento activo del sidebar y el frame del AppShell.
          El módulo real llega con #24.
        </p>
      </header>

      <div className="grid place-items-center rounded-lg border border-dashed border-border bg-surface p-12 text-sm text-fg-muted">
        Contenido del módulo de ventas (placeholder)
      </div>
    </div>
  );
}
