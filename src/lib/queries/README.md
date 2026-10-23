# `src/lib/queries` — the Front ↔ DB contract

Every feature reads and writes Supabase through this layer so data access looks
the same across the whole app. React Query owns the cache; Postgres (RLS + RPC)
owns authorization. Nothing here enforces permissions — it only shapes data.

## Convention

- **One module per domain.** `products.ts`, `sales.ts`, `cash.ts`… Each slice
  adds its own module when its issue lands; this folder ships only the base
  tools plus one reference example.
- **Types come from the generated schema** (`src/lib/db/types.ts`), never
  hand-written. Derive row types with
  `Database["public"]["Tables"]["<table>"]["Row"]`.
- **Query keys are built with `key()`** (`keys.ts`): a kebab-case domain string
  first, then the scoping params.

  ```ts
  key("products"); // ["products"]        — the list
  key("product", id); // ["product", id]  — one row
  key("product-units", productId); // scoped sub-list
  ```

- **Reads use `useSupabaseQuery`**, writes use `useSupabaseMutation`
  (`helpers.ts`). Both inject the shared client and surface a typed `Error`, so
  components get consistent `isPending` / `isError` / `data` to drive the
  8-state UI primitives (#37).

## Reads

```ts
export function useProducts() {
  return useSupabaseQuery(key("products"), async (sb) => {
    const { data, error } = await sb.from("products").select("*");
    if (error) throw error;
    return data ?? [];
  });
}
```

Pass React Query options through the third argument (e.g. `enabled` for
parameterized queries):

```ts
useSupabaseQuery(key("product", id), fetchOne, { enabled: !!id });
```

## Writes

```ts
export function useCreateProduct() {
  return useSupabaseMutation(
    async (sb, input: NewProduct) => {
      const { data, error } = await sb.from("products").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    { invalidate: [key("products")] },
  );
}
```

`invalidate` refetches the listed keys on success. For instant feedback, add
`optimistic` — it snapshots the cache, applies your update before the request,
and rolls back on error:

```ts
useSupabaseMutation(toggleActive, {
  invalidate: [key("products")],
  optimistic: {
    key: key("products"),
    apply: (prev, vars) => /* next cache value */ prev,
  },
});
```

## Helpers

- `one(value)` — normalizes a PostgREST embedded relation that may arrive as an
  array down to `object | null`.

## Reference

`example.ts` (`useMeasurementUnits`) is the working template to copy when a new
domain module is added.
