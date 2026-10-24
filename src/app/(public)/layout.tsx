import type { ReactNode } from "react";

// Public storefront shell. Open surface (no auth): everything under (public)
// renders without the admin AuthProvider. Kept minimal per ADR 0003; the real
// storefront chrome (header, cart, footer) lands with the web-orders work.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-full flex-1 flex-col">{children}</div>;
}
