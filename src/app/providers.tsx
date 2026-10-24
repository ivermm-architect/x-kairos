"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AuthProvider } from "@/lib/auth/context";

/**
 * App-wide client runtime, mounted once in the root layout so every feature
 * shares a single React Query cache and one auth context. The query client is
 * created lazily in state so it is never shared across requests or re-created
 * on re-render. AuthProvider lives here (not just the admin group) because the
 * login screen and public account views need the session too.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // One short retry smooths transient network blips; mutations never
          // auto-retry (a failed write must surface to the user, not repeat).
          queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
          mutations: { retry: 0 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
