// Sign-in route (/login). Placeholder that fixes the auth segment in place; the
// real form (email/password, loading/error states) and redirect to the admin
// surface on success are implemented in #36.
export default function LoginPage() {
  return (
    <section className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-card">
      <h1 className="text-xl font-semibold tracking-tight">Iniciar sesión</h1>
      <p className="mt-2 text-sm text-fg-muted">
        El formulario de acceso del staff se implementa en #36.
      </p>
    </section>
  );
}
