"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

export type AuthState = {
  session: Session | null;
  user: User | null;
  isStaff: boolean;
  roles: string[];
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    // Mirror Postgres authorization into the UI. The real checks live in the
    // database (RLS + SECURITY DEFINER RPC); this is a read for rendering only.
    async function loadStaff(current: Session | null) {
      if (!current) {
        if (active) {
          setIsStaff(false);
          setRoles([]);
        }
        return;
      }
      try {
        const [{ data: staffFlag, error: staffErr }, { data: roleRows, error: roleErr }] =
          await Promise.all([
            supabase.rpc("is_active_staff"),
            supabase.from("staff_roles").select("roles(key)").eq("staff_id", current.user.id),
          ]);
        if (staffErr) throw staffErr;
        if (roleErr) throw roleErr;
        if (!active) return;
        setIsStaff(Boolean(staffFlag));
        setRoles((roleRows ?? []).map((r) => r.roles?.key).filter((k): k is string => Boolean(k)));
      } catch (e) {
        if (active) setError(e instanceof Error ? e : new Error(String(e)));
      }
    }

    // Initial read, then stay in sync with sign in/out and token refresh.
    supabase.auth
      .getSession()
      .then(async ({ data, error: sessErr }) => {
        if (sessErr) throw sessErr;
        if (!active) return;
        setSession(data.session);
        await loadStaff(data.session);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      void loadStaff(next);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      isStaff,
      roles,
      loading,
      error,
      async signIn(email, password) {
        setError(null);
        const { error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) {
          setError(e);
          throw e;
        }
      },
      async signOut() {
        setError(null);
        const { error: e } = await supabase.auth.signOut();
        if (e) {
          setError(e);
          throw e;
        }
      },
    }),
    [session, isStaff, roles, loading, error, supabase],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
