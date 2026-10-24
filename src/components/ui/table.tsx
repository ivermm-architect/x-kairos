"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

export type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
};

/**
 * Data table primitive that owns its loading / empty / error / data states so
 * every list looks the same. Loading shows skeleton rows, error shows a danger
 * banner, empty shows a neutral message, and data renders the rows.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error,
  emptyMessage = "Sin resultados.",
  onRowClick,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-border", className)}>
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-muted text-fg-muted">
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col" className={cn("px-4 py-3 font-medium", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="border-t border-border">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <span className="block h-4 w-2/3 animate-pulse rounded-sm bg-muted" />
                  </td>
                ))}
              </tr>
            ))}

          {!loading && error && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6">
                <p
                  role="alert"
                  className="rounded-md bg-danger-surface px-3 py-2 text-sm text-danger"
                >
                  {error}
                </p>
              </td>
            </tr>
          )}

          {!loading && !error && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-fg-muted">
                {emptyMessage}
              </td>
            </tr>
          )}

          {!loading &&
            !error &&
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-t border-border text-fg",
                  onRowClick && "cursor-pointer hover:bg-muted",
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3", col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
