import type { ReactNode } from "react";

// Auth shell (/login). Mobile-first: a full-width cover photo (40vh) as a hero on
// top, with a 90%-width card below that subtly overlaps it. On md+ it switches to
// a two-pane split — brand panel beside a centered card. No app chrome, no gate;
// the form, validation and redirect live in the page.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col md:grid md:grid-cols-2">
      {/* Brand panel — desktop only. Product's own identity, no marketing filler. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-on-brand md:flex">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/brand/login-cover.avif)" }}
          aria-hidden
        />
        {/* Magenta tint for text contrast — brand tokens via color-mix, no hex. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--primary) 30%, transparent) 0%, color-mix(in srgb, var(--primary-active) 82%, transparent) 100%)",
          }}
          aria-hidden
        />
        <div className="relative flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-surface font-bold text-primary">
            K
          </span>
          <span className="text-lg font-bold">Kairos</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl leading-tight font-bold">
            Punto de venta, inventario y tienda en un solo lugar.
          </h2>
          <p className="mt-3 text-base opacity-90">
            Gestiona catálogo, caja, stock y ventas desde cualquier dispositivo.
          </p>
        </div>

        <p className="relative text-sm opacity-75">© {new Date().getFullYear()} Kairos</p>
      </aside>

      {/* Mobile hero — full-width cover photo, 40vh tall. Hidden on md+. */}
      <div className="relative h-[40vh] w-full shrink-0 overflow-hidden md:hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/brand/login-cover.avif)" }}
          aria-hidden
        />
        {/* Magenta tint — same brand treatment as the desktop panel. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--primary) 30%, transparent) 0%, color-mix(in srgb, var(--primary-active) 82%, transparent) 100%)",
          }}
          aria-hidden
        />
      </div>

      {/* Form pane. Mobile: a 90%-width card that subtly overlaps the hero.
          Desktop: a clean centered column (the photo lives in the aside). */}
      <div className="relative z-10 flex flex-1 flex-col md:items-center md:justify-center md:py-16">
        <div className="mx-auto -mt-[12vh] w-[90%] rounded-[2rem] bg-surface px-6 py-8 md:mt-0 md:w-full md:max-w-sm md:rounded-none md:bg-transparent md:p-0">
          {children}
        </div>
      </div>
    </div>
  );
}
