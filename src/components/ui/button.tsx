"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-on-brand shadow-brand hover:bg-primary-hover active:bg-primary-active",
  secondary: "bg-muted text-fg border border-border hover:border-border-strong active:bg-surface",
  ghost: "bg-transparent text-primary hover:bg-primary-surface active:bg-muted",
  danger: "bg-danger text-on-brand hover:brightness-110 active:brightness-95",
};

// Every size keeps a >=44px touch target (WCAG 2.2); only padding/type scale.
const SIZES: Record<Size, string> = {
  sm: "min-h-11 px-3 text-sm",
  md: "min-h-11 px-4 text-base",
  lg: "min-h-12 px-5 text-lg",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leadingIcon?: ReactNode;
};

/**
 * The primary action primitive. Covers the explicit states: default, hover,
 * focus (global :focus-visible ring), active, disabled and loading (spinner +
 * aria-busy, input locked). Styling is tokens-only via Tailwind utilities.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    leadingIcon,
    disabled,
    className,
    children,
    type,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      {!loading && leadingIcon}
      {children}
    </button>
  );
});
