"use client";

import { useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type TabItem = { value: string; label: string; disabled?: boolean };

export type TabsProps = {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children?: ReactNode;
};

/**
 * Accessible tablist with roving focus: arrow keys move between enabled tabs,
 * Home/End jump to the ends. States: default, active (selected), disabled and
 * focus (global ring). Panels are the caller's responsibility; pass the active
 * panel as children.
 */
export function Tabs({ items, value, onValueChange, className, children }: TabsProps) {
  const baseId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function focusTab(index: number) {
    const el = refs.current[index];
    if (el) {
      el.focus();
      onValueChange(items[index].value);
    }
  }

  function moveTo(from: number, dir: 1 | -1) {
    const n = items.length;
    for (let step = 1; step <= n; step++) {
      const next = (from + dir * step + n) % n;
      if (!items[next].disabled) return focusTab(next);
    }
  }

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      moveTo(index, 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      moveTo(index, -1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusTab(items.findIndex((i) => !i.disabled));
    } else if (e.key === "End") {
      e.preventDefault();
      for (let i = items.length - 1; i >= 0; i--) {
        if (!items[i].disabled) return focusTab(i);
      }
    }
  }

  return (
    <div className={className}>
      <div role="tablist" className="flex gap-1 border-b border-border">
        {items.map((item, index) => {
          const selected = item.value === value;
          return (
            <button
              key={item.value}
              ref={(el) => {
                refs.current[index] = el;
              }}
              role="tab"
              type="button"
              id={`${baseId}-tab-${item.value}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.value}`}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => onValueChange(item.value)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={cn(
                "-mb-px min-h-11 border-b-2 px-4 text-sm font-medium transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-60",
                selected
                  ? "border-primary text-primary"
                  : "border-transparent text-fg-muted hover:text-fg",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-${value}`}
        aria-labelledby={`${baseId}-tab-${value}`}
        className="pt-4"
      >
        {children}
      </div>
    </div>
  );
}
