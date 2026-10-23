"use client";

import type { Database } from "@/lib/db/types";
import { key } from "./keys";
import { useSupabaseQuery } from "./helpers";

/**
 * Reference hook — the canonical template every domain module copies.
 *
 * It reads the already-applied catalog `measurement_units` table to show the
 * convention end to end: a typed row from `db/types.ts`, a `key()` query key,
 * and a `useSupabaseQuery` that receives the typed client. Real catalog hooks
 * land with the catalog slice (#45 / #50); this file stays as the living
 * example of the pattern, not as production domain code.
 */
export type MeasurementUnit = Database["public"]["Tables"]["measurement_units"]["Row"];

export function useMeasurementUnits() {
  return useSupabaseQuery<MeasurementUnit[]>(key("measurement-units"), async (sb) => {
    const { data, error } = await sb
      .from("measurement_units")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });
}
