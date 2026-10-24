"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Field, Input } from "@/components/ui";
import { useAuth } from "@/lib/auth/context";
import { postLoginRedirect } from "@/lib/auth/post-login";
import { consumeSessionExpired, SESSION_EXPIRED_EVENT } from "@/lib/auth/safe-session";

const schema = z.object({
  email: z.string().min(1, "El correo es obligatorio").email("Correo inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});
type FormValues = z.infer<typeof schema>;

// Sign-in route (/login). The (auth) layout owns the shell (centered card on
// mobile, split with a brand panel on lg+); this page is just the card. A live
// staff session bounces to the admin root.
export default function LoginPage() {
  const { signIn, session, isStaff, loading } = useAuth();
  const router = useRouter();
  const [expired, setExpired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Already signed in as staff → go straight to the back-office.
  useEffect(() => {
    if (!loading && session && isStaff) router.replace("/admin");
  }, [loading, session, isStaff, router]);

  // A background session expiry (orphaned token cleaned by safeGetSession) leaves
  // a one-shot flag; show it here. Also react to the live event in case it fires
  // while this screen is mounted.
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
    <main className="w-full md:max-w-sm md:rounded-2xl md:bg-surface md:p-8 md:shadow-card">
      {/* Brand mark — magenta wordmark, tokens only. */}
      <div className="mb-6 flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary font-bold text-on-brand">
          K
        </span>
        <span className="text-lg font-bold text-fg">Kairos</span>
      </div>

      <h1 className="text-2xl font-bold text-fg">Iniciar sesión</h1>
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

        <Field label="Correo" error={errors.email?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              aria-describedby={describedBy}
              invalid={invalid}
              {...register("email")}
            />
          )}
        </Field>

        <Field label="Contraseña" error={errors.password?.message}>
          {({ id, describedBy, invalid }) => (
            <div className="relative">
              <Input
                id={id}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                aria-describedby={describedBy}
                invalid={invalid}
                className="pr-11"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute inset-y-0 right-0 inline-flex min-h-11 w-11 items-center justify-center rounded-md text-fg-muted hover:text-fg"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          )}
        </Field>

        <Button type="submit" size="lg" loading={isSubmitting} className="mt-2 w-full">
          {isSubmitting ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </main>
  );
}

function EyeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-3.1 3.95M6.6 6.6A18 18 0 0 0 2 12s3.5 7 10 7a9.3 9.3 0 0 0 4.4-1.1" />
      <path d="M3 3l18 18" />
    </svg>
  );
}
