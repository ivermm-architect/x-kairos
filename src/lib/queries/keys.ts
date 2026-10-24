/**
 * Query-key convention for the whole app.
 *
 * Keys are tuples: a kebab-case domain string first, then the parameters that
 * scope the query, e.g.
 *   key("products")                 -> ["products"]            (the list)
 *   key("product", id)              -> ["product", id]         (one row)
 *   key("product-units", productId) -> ["product-units", id]   (a scoped sub-list)
 *
 * Every domain module builds its keys with `key()` so invalidation stays
 * consistent: invalidating `["products"]` always means "the product list".
 */
export type QueryKey = readonly [string, ...unknown[]];

export function key(domain: string, ...params: unknown[]): QueryKey {
  return [domain, ...params] as QueryKey;
}
