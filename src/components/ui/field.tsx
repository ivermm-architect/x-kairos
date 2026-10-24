"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  /** Render-prop: receives the wiring the control needs to be accessible. */
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
};

/**
 * Accessible form-field wrapper. Owns the label/hint/error layout and hands the
 * control an `id`, an `aria-describedby` that points at the hint/error, and an
 * `invalid` flag so inputs stay in sync with the error state. Covers the field
 * states: default, with-hint, required and error.
 */
export function Field({ label, error, hint, required, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const invalid = Boolean(error);
  const describedBy = cn(hint && hintId, invalid && errorId) || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        )}
      </label>

      {children({ id, describedBy, invalid })}

      {hint && !invalid && (
        <span id={hintId} className="text-xs text-fg-muted">
          {hint}
        </span>
      )}
      {invalid && (
        <span id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
