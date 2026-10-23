import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth/context";

// Admin route-group root: everything under (admin) renders inside the auth
// context, so screens and future guards read the live session via useAuth().
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
