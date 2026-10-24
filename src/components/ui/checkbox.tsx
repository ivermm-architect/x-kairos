"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  invalid?: boolean;
};

/**
 * Checkbox + label primitive. The native input stays accessible (keyboard,
 * screen readers) and is sized to a 44px hit area. States: default, checked,
 * focus, disabled and error.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, invalid = false, className, id, disabled, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 text-sm text-fg",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className,
      )}
    >
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-5 w-5 rounded-sm border bg-surface accent-primary",
          invalid ? "border-danger" : "border-border-strong",
        )}
        {...props}
      />
      {label}
    </label>
  );
});
