"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth/context";
import { postLoginRedirect } from "@/lib/auth/post-login";
import { consumeSessionExpired, SESSION_EXPIRED_EVENT } from "@/lib/auth/safe-session";

const schema = z.object({
  email: z.string().min(1, "El correo es obligatorio").email("Correo inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});
type FormValues = z.infer<typeof schema>;

// Sign-in route (/login). The (auth) layout owns the centered shell, so this
// page is just the card. On a live staff session it bounces to the admin root.
export default function LoginPage() {
  const { signIn, session, isStaff, loading } = useAuth();
  const router = useRouter();
  const [expired, setExpired] = useState(false);

  // Already signed in as staff → go straight to the back-office.
  useEffect(() => {
    if (!loading && session && isStaff) router.replace("/admin");
  }, [loading, session, isStaff, router]);

  // A background session expiry (orphaned token cleaned by safeGetSession)
  // leaves a one-shot flag; show it here. Also react to the live event in case
  // it fires while this screen is mounted.
  useEffect(() => {
    const fire = () => {
      if (consumeSessionExpired()) setExpired(true);
    };
    fire();
    window.addEventListener(SESSION_EXPIRED_EVENT, fire);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, fire);
  }, []);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      await signIn(values.email, values.password);
      // Destination by role: staff → admin root, customer → storefront.
      router.replace(await postLoginRedirect());
    } catch (e) {
      setError("root", {
        message: e instanceof Error ? e.message : "No se pudo iniciar sesión",
      });
    }
  }

  return (
    <main className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-card">
      <h1 className="text-xl font-bold text-fg">Iniciar sesión</h1>
      <p className="mt-1 text-sm text-fg-muted">Accede con tu cuenta de personal.</p>

      {expired && (
        <p role="status" className="mt-4 rounded-md bg-primary-surface px-3 py-2 text-sm text-fg">
          Tu sesión expiró. Inicia sesión de nuevo.
        </p>
      )}

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {errors.root && (
          <p role="alert" className="rounded-md bg-danger-surface px-3 py-2 text-sm text-danger">
            {errors.root.message}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-fg">
            Correo
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            className="min-h-[44px] w-full rounded-md border border-border bg-surface px-3 text-fg placeholder:text-fg-muted focus-visible:border-primary"
            {...register("email")}
          />
          {errors.email && (
            <span role="alert" className="text-xs text-danger">
              {errors.email.message}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-fg">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            className="min-h-[44px] w-full rounded-md border border-border bg-surface px-3 text-fg placeholder:text-fg-muted focus-visible:border-primary"
            {...register("password")}
          />
          {errors.password && (
            <span role="alert" className="text-xs text-danger">
              {errors.password.message}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-primary px-4 font-semibold text-on-brand transition-colors hover:bg-primary-hover active:bg-primary-active disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-brand border-t-transparent" />
          )}
          {isSubmitting ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
