"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "success" | "danger" | "warning" | "info";

type Toast = { id: number; tone: Tone; title: string; description?: string };

type ToastInput = { tone?: Tone; title: string; description?: string; duration?: number };

const TONES: Record<Tone, string> = {
  success: "border-success bg-success-surface text-success",
  danger: "border-danger bg-danger-surface text-danger",
  warning: "border-warning bg-warning-surface text-warning",
  info: "border-border bg-surface text-fg",
};

const ToastContext = createContext<((input: ToastInput) => void) | null>(null);

/**
 * Toast provider. Wrap the admin shell with it, then call `useToast()` to push
 * transient messages. Toasts auto-dismiss, stack bottom-right, and announce via
 * an aria-live region. Tones: success, danger, warning, info.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    ({ tone = "info", title, description, duration = 4000 }: ToastInput) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, tone, title, description }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((timer) => clearTimeout(timer));
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        role="region"
        aria-live="polite"
        aria-label="Notificaciones"
        className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start justify-between gap-3 rounded-md border px-4 py-3 shadow-card",
              TONES[t.tone],
            )}
          >
            <div>
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs opacity-80">{t.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Cerrar notificación"
              className="min-h-11 shrink-0 px-1 text-fg-muted"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
