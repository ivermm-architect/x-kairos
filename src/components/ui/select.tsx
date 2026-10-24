"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const BASE =
  "min-h-11 w-full appearance-none rounded-md border bg-surface px-3 pr-9 text-fg transition-colors disabled:cursor-not-allowed disabled:opacity-60";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };

/**
 * Native select primitive (keeps the OS picker for mobile reliability). States:
 * default, focus, disabled and error. The chevron is drawn with a token-backed
 * SVG background so no extra element is needed.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid = false, className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          BASE,
          invalid ? "border-danger" : "border-border hover:border-border-strong",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-fg-muted"
      >
        ▾
      </span>
    </div>
  );
});
