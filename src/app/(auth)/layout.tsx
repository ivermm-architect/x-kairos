import type { ReactNode } from "react";

// Auth shell (/login). No app chrome and no gate — just a centered frame for the
// sign-in form. The actual form, validation states and redirect-on-success are
// implemented in #36.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-6 py-16">{children}</div>
  );
}
