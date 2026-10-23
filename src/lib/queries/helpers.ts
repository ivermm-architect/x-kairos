"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { QueryKey } from "./keys";

/** The shared, typed Supabase browser client. Authorization stays in Postgres. */
type Sb = ReturnType<typeof getSupabaseClient>;

/**
 * PostgREST surfaces an embedded one-to-one relation as a single object, but
 * the generated types (and some joins) can hand it back as an array. `one()`
 * normalizes "object | array | nullish" down to "object | null".
 */
export function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * Typed `useQuery` wrapper: pass a `key()` query key and a function that
 * receives the Supabase client and returns the data (throw on error). Keeps
 * every read consistent and the client injection in a single place.
 */
export function useSupabaseQuery<T>(
  queryKey: QueryKey,
  queryFn: (sb: Sb) => Promise<T>,
  options?: Omit<UseQueryOptions<T, Error, T, QueryKey>, "queryKey" | "queryFn">,
): UseQueryResult<T, Error> {
  return useQuery<T, Error, T, QueryKey>({
    queryKey,
    queryFn: () => queryFn(getSupabaseClient()),
    ...options,
  });
}

type OptimisticContext = { snapshot?: unknown };

/**
 * Typed `useMutation` wrapper with two conveniences:
 *   - `invalidate`: query keys to refetch once the mutation succeeds.
 *   - `optimistic`: snapshot the cache, apply an update before the request, and
 *     roll back automatically if it fails.
 *
 * User-supplied lifecycle callbacks still run after the built-in behaviour.
 */
export function useSupabaseMutation<TData, TVars>(
  mutationFn: (sb: Sb, vars: TVars) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, Error, TVars, OptimisticContext>, "mutationFn"> & {
    invalidate?: QueryKey[];
    optimistic?: { key: QueryKey; apply: (prev: unknown, vars: TVars) => unknown };
  },
): UseMutationResult<TData, Error, TVars, OptimisticContext> {
  const qc = useQueryClient();
  const { invalidate, optimistic, onMutate, onError, onSuccess, ...rest } = options ?? {};

  return useMutation<TData, Error, TVars, OptimisticContext>({
    mutationFn: (vars) => mutationFn(getSupabaseClient(), vars),
    onMutate: async (vars, mutationCtx) => {
      await onMutate?.(vars, mutationCtx);
      if (!optimistic) return {};
      await qc.cancelQueries({ queryKey: optimistic.key });
      const snapshot = qc.getQueryData(optimistic.key);
      qc.setQueryData(optimistic.key, (prev: unknown) => optimistic.apply(prev, vars));
      return { snapshot };
    },
    onError: (err, vars, result, mutationCtx) => {
      if (optimistic && result && result.snapshot !== undefined) {
        qc.setQueryData(optimistic.key, result.snapshot);
      }
      onError?.(err, vars, result, mutationCtx);
    },
    onSuccess: (data, vars, result, mutationCtx) => {
      invalidate?.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      onSuccess?.(data, vars, result, mutationCtx);
    },
    ...rest,
  });
}
