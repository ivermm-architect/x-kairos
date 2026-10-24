"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const BASE =
  "min-h-11 w-full rounded-md border bg-surface px-3 text-fg placeholder:text-fg-muted transition-colors disabled:cursor-not-allowed disabled:opacity-60";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

/**
 * Text input primitive. States: default, focus (global ring), disabled and
 * error (`invalid` flips the border to danger and sets aria-invalid). Pair with
 * <Field> for label/hint/error wiring.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid = false, className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        BASE,
        invalid ? "border-danger" : "border-border hover:border-border-strong",
        className,
      )}
      {...props}
    />
  );
});
