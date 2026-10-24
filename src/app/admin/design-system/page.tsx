"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Design-system showcase — a living gallery of the tokens defined in
 * `src/styles/tokens.css`. It renders the brand ramps, semantic roles,
 * typography, spacing, radius and shadows so we can eyeball the result and
 * iterate on branding before any real component work (M2) begins.
 *
 * Everything here reads tokens (var(--…)) or token-backed Tailwind utilities —
 * no hardcoded design values.
 */

type Theme = "light" | "dark";

const PINK = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"] as const;
const NEUTRAL = PINK;
const SLATE = ["400", "500", "600", "700", "800", "900", "950"] as const;

const SEMANTIC = [
  "primary",
  "primary-hover",
  "primary-active",
  "primary-surface",
  "secondary",
  "secondary-hover",
  "secondary-surface",
  "success",
  "success-surface",
  "warning",
  "warning-surface",
  "danger",
  "danger-surface",
  "bg-app",
  "bg-surface",
  "bg-sidebar",
  "bg-muted",
  "border",
  "border-strong",
  "text",
  "text-muted",
] as const;

const TYPE_SCALE = [
  ["--text-3xl", "Heading 3xl · 32px"],
  ["--text-2xl", "Heading 2xl · 26px"],
  ["--text-xl", "Heading xl · 22px"],
  ["--text-lg", "Subtitle lg · 18px"],
  ["--text-base", "Body base · 16px"],
  ["--text-sm", "Caption sm · 14px"],
  ["--text-xs", "Micro xs · 12px"],
] as const;

const SPACING = ["1", "2", "3", "4", "5", "6", "8", "10"] as const;
const RADIUS = ["sm", "md", "lg", "xl", "pill"] as const;
const SHADOW = ["--shadow", "--shadow-lift", "--shadow-brand"] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-[var(--sp-4)]">
      <h2
        style={{
          fontSize: "var(--text-xl)",
          fontWeight: "var(--weight-semibold)",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Swatch({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-[var(--sp-1)]">
      <div
        className="h-16 w-full rounded-[var(--radius-md)]"
        style={{
          background: value,
          border: "1px solid var(--border)",
        }}
      />
      <code style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{label}</code>
    </div>
  );
}

export default function DesignSystemPage() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    return () => document.documentElement.removeAttribute("data-theme");
  }, [theme]);

  return (
    <main
      className="min-h-dvh"
      style={{
        background: "var(--bg-app)",
        color: "var(--text)",
        padding: "var(--sp-8)",
      }}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-[var(--sp-10)]">
        {/* Header + theme toggle */}
        <header className="flex items-center justify-between">
          <div className="flex flex-col gap-[var(--sp-1)]">
            <h1
              style={{
                fontSize: "var(--text-3xl)",
                fontWeight: "var(--weight-bold)",
                lineHeight: "var(--leading-tight)",
              }}
            >
              Design tokens
            </h1>
            <p style={{ color: "var(--text-muted)" }}>
              Single source of truth · src/styles/tokens.css
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            style={{
              minHeight: "var(--touch-target)",
              minWidth: "var(--touch-target)",
              padding: "0 var(--sp-4)",
              borderRadius: "var(--radius-pill)",
              background: "var(--primary)",
              color: "var(--text-on-brand)",
              fontWeight: "var(--weight-medium)",
              boxShadow: "var(--shadow-brand)",
            }}
          >
            {theme === "light" ? "Dark" : "Light"} mode
          </button>
        </header>

        {/* Branding — real logo variants on their intended backgrounds */}
        <Section title="Brand — logo">
          <div className="grid grid-cols-1 gap-[var(--sp-4)] sm:grid-cols-3">
            {/* Full logotype on a light surface */}
            <div
              className="flex items-center justify-center"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--sp-6)",
                minHeight: "200px",
              }}
            >
              <Image
                src="/brand/logo-full.svg"
                alt="Kairos Importadora logo"
                width={1024}
                height={1249}
                className="h-auto max-h-40 w-auto"
                priority
              />
            </div>

            {/* Vector monogram mark (traced, crisp at any size) on a surface */}
            <div
              className="flex items-center justify-center"
              style={{
                background: "var(--bg-muted)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--sp-6)",
                minHeight: "200px",
              }}
            >
              <Image
                src="/brand/logo-mark.svg"
                alt="Kairos monogram mark"
                width={1024}
                height={1024}
                className="h-auto max-h-28 w-auto"
              />
            </div>

            {/* App icon (generated — cold ink gradient, maskable-safe) */}
            <div
              className="flex items-center justify-center"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--sp-6)",
                minHeight: "200px",
              }}
            >
              <Image
                src="/brand/icon-512.png"
                alt="Kairos app icon"
                width={512}
                height={512}
                className="h-auto max-h-32 w-auto rounded-[var(--radius-lg)]"
              />
            </div>
          </div>

          {/* Wordmark + slogan (slogan is a placeholder — iterate) */}
          <div className="flex flex-col gap-[var(--sp-1)]">
            <span
              style={{
                fontSize: "var(--text-3xl)",
                fontWeight: "var(--weight-bold)",
                letterSpacing: "-0.02em",
              }}
            >
              Kairos
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: "var(--text-lg)" }}>
              {/* TODO: real slogan — iterate here */}
              Importadora · Oruro
            </span>
          </div>
        </Section>

        {/* Brand ramp */}
        <Section title="Brand — magenta ramp">
          <div className="grid grid-cols-5 gap-[var(--sp-3)] sm:grid-cols-10">
            {PINK.map((s) => (
              <Swatch key={s} label={`pink-${s}`} value={`var(--pink-${s})`} />
            ))}
          </div>
        </Section>

        {/* Neutral ramp */}
        <Section title="Neutral ramp">
          <div className="grid grid-cols-5 gap-[var(--sp-3)] sm:grid-cols-10">
            {NEUTRAL.map((s) => (
              <Swatch key={s} label={`neutral-${s}`} value={`var(--neutral-${s})`} />
            ))}
          </div>
        </Section>

        {/* Slate ramp — dark surfaces */}
        <Section title="Slate ramp (dark surfaces)">
          <div className="grid grid-cols-5 gap-[var(--sp-3)] sm:grid-cols-7">
            {SLATE.map((s) => (
              <Swatch key={s} label={`slate-${s}`} value={`var(--slate-${s})`} />
            ))}
          </div>
        </Section>

        {/* Semantic roles */}
        <Section title="Semantic roles (flip with theme)">
          <div className="grid grid-cols-3 gap-[var(--sp-3)] sm:grid-cols-6">
            {SEMANTIC.map((t) => (
              <Swatch key={t} label={t} value={`var(--${t})`} />
            ))}
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography scale">
          <div
            className="flex flex-col gap-[var(--sp-3)]"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--sp-6)",
            }}
          >
            {TYPE_SCALE.map(([token, label]) => (
              <div
                key={token}
                style={{
                  fontSize: `var(${token})`,
                  lineHeight: "var(--leading-tight)",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </Section>

        {/* Spacing */}
        <Section title="Spacing scale">
          <div className="flex flex-col gap-[var(--sp-2)]">
            {SPACING.map((s) => (
              <div key={s} className="flex items-center gap-[var(--sp-3)]">
                <code
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    width: "56px",
                  }}
                >
                  sp-{s}
                </code>
                <div
                  style={{
                    height: "16px",
                    width: `var(--sp-${s})`,
                    background: "var(--primary)",
                    borderRadius: "var(--radius-sm)",
                  }}
                />
              </div>
            ))}
          </div>
        </Section>

        {/* Radius */}
        <Section title="Radius">
          <div className="flex flex-wrap gap-[var(--sp-4)]">
            {RADIUS.map((r) => (
              <div key={r} className="flex flex-col items-center gap-[var(--sp-1)]">
                <div
                  style={{
                    height: "64px",
                    width: "64px",
                    background: "var(--primary-surface)",
                    border: "1px solid var(--primary)",
                    borderRadius: `var(--radius-${r})`,
                  }}
                />
                <code
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                  }}
                >
                  {r}
                </code>
              </div>
            ))}
          </div>
        </Section>

        {/* Shadow */}
        <Section title="Shadow / elevation">
          <div className="flex flex-wrap gap-[var(--sp-6)]">
            {SHADOW.map((token) => (
              <div
                key={token}
                className="flex items-center justify-center"
                style={{
                  height: "96px",
                  width: "160px",
                  background: "var(--bg-surface)",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: `var(${token})`,
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                }}
              >
                {token.replace("--", "")}
              </div>
            ))}
          </div>
        </Section>
      </div>
    </main>
  );
}
