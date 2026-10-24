"use client";

import { AppShell } from "@/components/layout";

/**
 * Shell preview. Renders the admin frame with filler content so the responsive
 * behaviour can be verified: at 360px the sidebar is an off-canvas drawer
 * (menu button opens it); at ≥lg it becomes a rail the menu button collapses.
 * Final wiring into the (admin) route group happens once auth (#36) and routing
 * (#24) are merged.
 */
export default function ShellPreviewPage() {
  return (
    <AppShell title="Shell preview">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <h2 className="text-xl font-semibold text-fg">Mobile shell</h2>
        <p className="text-sm text-fg-muted">
          Reduce la ventana a 360px: la navegación pasa a un drawer. En ≥1024px el botón de menú
          colapsa el rail a solo iconos. Prueba teclado: Tab por los enlaces, Escape cierra el
          drawer.
        </p>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface p-5">
            <p className="font-medium text-fg">Tarjeta {i + 1}</p>
            <p className="text-sm text-fg-muted">Contenido de ejemplo para probar el scroll.</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
