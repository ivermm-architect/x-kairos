# ADR 0002 — Product lifecycle and availability

- Status: Accepted
- Date: 2026-10-22
- Refs: #28 (catalog schema)

## Context

The business treats each product as unique: when the "same" item arrives again it
comes with a new code and is registered as a **new product**, not a restock of the
existing one. A product that sells out is therefore effectively gone — it will not be
replenished under the same row.

This raised a design question: do we need an explicit state field (e.g. a
`status` enum `active / paused / discontinued`, or a `deleted_at`) to tell apart
"hidden on purpose" from "sold out / discontinued"? The risk is conflating two
different concerns into one column, or duplicating state that already lives elsewhere.

## Decision

**No extra lifecycle field is added to `products`.** The two concerns live in
separate layers and must not be merged:

- **Admin intent (show/hide)** → `products.is_active boolean`. Manual, deliberate.
  `false` = hidden everywhere without losing history.
- **Availability (sold out)** → **derived**, not stored. It is computed from the
  inventory domain (`warehouse_stock`, issue #29): a product is available when
  `is_active = true AND EXISTS(stock > 0)`. Catalog does not store stock.

"Discontinued forever" is a **derived** state in this model, not a persisted one:
`is_active = false` + zero stock + no future entry under that SKU. It is a
query/reporting concept, not a column.

### Why not a `status` enum

A `status` enum would duplicate information already expressed by `is_active` plus
stock, creating two sources of truth that drift (e.g. `status = 'active'` with zero
stock). Rejected to avoid the drift.

### Escape hatch (future, only if needed)

If a concrete reporting need appears to mark _permanently discontinued_ products
independently of stock (audit, SKU reuse policy), add a single
`discontinued_at timestamptz null` to `products` in its own migration — a flag and a
timestamp at once. Never an enum. Not part of #28.

### Product uniqueness is a flow rule, not a schema constraint

"New arrival with a new code = new product" is enforced in the product-creation flow
(admin, #50), not by the schema. The schema is intentionally more general:
`warehouse_stock` keeps one row per lot, so it does not forbid multiple lots per
product. The uniqueness convention lives above the database.

## Scope

Covers the catalog `products` lifecycle only. Stock mechanics, FIFO lots and the
availability JOIN belong to the inventory schema (#29) and its own ADR if needed.

## Consequences

- `products` stays minimal; no redundant state column to keep in sync.
- Storefront/admin "is it available" filters must JOIN against inventory (#29);
  catalog alone cannot answer it. This dependency is expected, not a gap.
- Hard deletion of a product with history is already blocked by `ON DELETE RESTRICT`
  FKs from inventory/sales; soft-disable via `is_active` is the standard path.
