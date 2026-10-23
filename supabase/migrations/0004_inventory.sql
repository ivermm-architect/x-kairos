-- Migration 0004 — Inventory (phase 2)
-- Consolidates the old scattered inventory migrations (0003 / 0008-0012 / 0044-0057)
-- into one clean domain: warehouses, their nested locations, receiving documents
-- (stock entries), per-lot stock, in-transit transfer lots, inter-warehouse
-- transfers and the append-only kardex ledger. Depends on 0001 (authorization
-- helpers is_active_staff / has_role, staff table) and 0002 (products,
-- measurement_units).
--
-- Scope note: this issue ships the SCHEMA only. The receiving / transfer /
-- relocation / defective RPCs land with their feature issue, and cost
-- currency freezing (unit_cost_base, exchange rate) lands in the later
-- multi-currency M1 migration — so every cost here is in the store base
-- currency. Everything is staff-only (deny-by-default RLS); public reads are
-- out of scope.

-- ---------------------------------------------------------------------------
-- products.cost — latest unit cost, base currency (D8)
-- ---------------------------------------------------------------------------

alter table public.products
  add column cost numeric(16, 4) not null default 0 check (cost >= 0);

comment on column public.products.cost is
  'Latest unit cost in the store base currency; drives margin and stock valuation. Maintained by inventory receiving. Currency handling lands in the multi-currency M1 migration.';

-- ---------------------------------------------------------------------------
-- Warehouses
-- ---------------------------------------------------------------------------

create table public.warehouses (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  code           text unique,
  address        text,
  city           text,
  phone          text,
  responsible_id uuid references public.staff (id) on delete set null,
  is_active      boolean not null default true,
  is_default     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.warehouses is
  'Stock-holding locations (branches/warehouses). One is marked default for new operations.';
comment on column public.warehouses.id is 'Primary key.';
comment on column public.warehouses.name is 'Display name.';
comment on column public.warehouses.code is 'Optional short code; unique when present.';
comment on column public.warehouses.address is 'Optional street address.';
comment on column public.warehouses.city is 'Optional city.';
comment on column public.warehouses.phone is 'Optional contact phone.';
comment on column public.warehouses.responsible_id is
  'Staff member in charge; SET NULL if that staff row is removed.';
comment on column public.warehouses.is_active is 'If false, hidden from new operations without losing history.';
comment on column public.warehouses.is_default is 'Preselected warehouse. At most one default.';
comment on column public.warehouses.created_at is 'When the warehouse was created.';
comment on column public.warehouses.updated_at is 'Last modification; maintained by trigger.';

-- At most one default warehouse.
create unique index warehouses_one_default_idx
  on public.warehouses (is_default)
  where is_default;

-- ---------------------------------------------------------------------------
-- Warehouse locations (self-referencing tree inside a warehouse)
-- ---------------------------------------------------------------------------

create table public.warehouse_locations (
  id           uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses (id) on delete cascade,
  parent_id    uuid references public.warehouse_locations (id) on delete set null,
  name         text not null,
  code         text,
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.warehouse_locations is
  'Positions inside a warehouse (aisle / shelf / bin); parent_id nests them. Stock and movements can be pinned to a location.';
comment on column public.warehouse_locations.id is 'Primary key.';
comment on column public.warehouse_locations.warehouse_id is 'FK to warehouses; CASCADE so locations vanish with the warehouse.';
comment on column public.warehouse_locations.parent_id is
  'Parent location; null for roots. SET NULL on parent deletion (the child is reparented to root, not destroyed).';
comment on column public.warehouse_locations.name is 'Display name within the warehouse.';
comment on column public.warehouse_locations.code is 'Optional short code.';
comment on column public.warehouse_locations.sort_order is 'Display order among siblings.';
comment on column public.warehouse_locations.is_active is 'If false, hidden from new placement without losing history.';
comment on column public.warehouse_locations.created_at is 'When the location was created.';
comment on column public.warehouse_locations.updated_at is 'Last modification; maintained by trigger.';

create index warehouse_locations_warehouse_id_idx on public.warehouse_locations (warehouse_id);
create index warehouse_locations_parent_id_idx on public.warehouse_locations (parent_id);

-- ---------------------------------------------------------------------------
-- Stock entries — receiving documents (header)
-- ---------------------------------------------------------------------------

create table public.stock_entries (
  id               uuid primary key default gen_random_uuid(),
  entry_number     text not null unique,
  reference        text,
  warehouse_id     uuid not null references public.warehouses (id) on delete restrict,
  status           text not null default 'draft' check (status in ('draft', 'closed', 'cancelled')),
  dim_number       text,
  dim_document_url text,
  entry_date       date not null default current_date,
  total_items      integer not null default 0,
  total_units      numeric(16, 2) not null default 0,
  total_boxes      numeric(16, 2) not null default 0,
  notes            text,
  created_by       uuid not null references public.staff (id) on delete restrict,
  cancelled_at     timestamptz,
  cancelled_by     uuid references public.staff (id) on delete set null,
  cancelled_reason text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.stock_entries is
  'Receiving document header: goods coming into a warehouse. Lifecycle draft -> closed -> (cancelled). Closing materializes stock and movements (done by the receiving RPC in a later issue).';
comment on column public.stock_entries.id is 'Primary key.';
comment on column public.stock_entries.entry_number is 'Human-facing sequential number (e.g. ING-000001); assigned by the receiving RPC. Unique.';
comment on column public.stock_entries.reference is 'Optional external reference, e.g. a supplier invoice.';
comment on column public.stock_entries.warehouse_id is 'Destination warehouse. RESTRICT: a warehouse with entries cannot be deleted.';
comment on column public.stock_entries.status is 'draft (editable), closed (stock applied), or cancelled.';
comment on column public.stock_entries.dim_number is 'Optional import-declaration number.';
comment on column public.stock_entries.dim_document_url is 'Optional URL of the stored import-declaration document.';
comment on column public.stock_entries.entry_date is 'Business date of the entry.';
comment on column public.stock_entries.total_items is 'Cached line count; maintained by the receiving RPC.';
comment on column public.stock_entries.total_units is 'Cached total base units received; maintained by the receiving RPC.';
comment on column public.stock_entries.total_boxes is 'Cached total boxes received; maintained by the receiving RPC.';
comment on column public.stock_entries.notes is 'Free-form notes.';
comment on column public.stock_entries.created_by is 'Staff member who created the entry. RESTRICT to preserve authorship.';
comment on column public.stock_entries.cancelled_at is 'When the entry was cancelled; null while active.';
comment on column public.stock_entries.cancelled_by is 'Staff member who cancelled it; SET NULL if that staff row is removed.';
comment on column public.stock_entries.cancelled_reason is 'Why it was cancelled.';
comment on column public.stock_entries.created_at is 'When the entry was created.';
comment on column public.stock_entries.updated_at is 'Last modification; maintained by trigger.';

create index stock_entries_warehouse_id_idx on public.stock_entries (warehouse_id);
create index stock_entries_status_idx on public.stock_entries (status);

-- ---------------------------------------------------------------------------
-- Stock entry items — receiving lines
-- ---------------------------------------------------------------------------

create table public.stock_entry_items (
  id             uuid primary key default gen_random_uuid(),
  stock_entry_id uuid not null references public.stock_entries (id) on delete cascade,
  product_id     uuid not null references public.products (id) on delete restrict,
  unit_id        uuid not null references public.measurement_units (id) on delete restrict,
  quantity       numeric(16, 2) not null check (quantity > 0),
  units_per_box  numeric(14, 2) check (units_per_box > 0),
  location_id    uuid references public.warehouse_locations (id) on delete set null,
  unit_cost      numeric(16, 4) not null default 0 check (unit_cost >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.stock_entry_items is
  'One received product line. Each closed line becomes a stock lot (warehouse_stock) tracked FIFO by its id. Cost is in the store base currency.';
comment on column public.stock_entry_items.id is 'Primary key; also the FIFO lot identifier once stock is materialized.';
comment on column public.stock_entry_items.stock_entry_id is 'FK to stock_entries; CASCADE with the header.';
comment on column public.stock_entry_items.product_id is 'Received product. RESTRICT to keep receiving history consistent.';
comment on column public.stock_entry_items.unit_id is 'Unit the quantity is expressed in. RESTRICT so a unit in use cannot be deleted.';
comment on column public.stock_entry_items.quantity is 'Quantity received in the chosen unit; must be > 0.';
comment on column public.stock_entry_items.units_per_box is 'Base units per received unit (conversion factor); must be > 0 when present.';
comment on column public.stock_entry_items.location_id is 'Optional destination location inside the warehouse; SET NULL if the location is removed.';
comment on column public.stock_entry_items.unit_cost is 'Per-unit cost in the store base currency; must be >= 0.';
comment on column public.stock_entry_items.created_at is 'When the line was created.';
comment on column public.stock_entry_items.updated_at is 'Last modification; maintained by trigger.';

create index stock_entry_items_stock_entry_id_idx on public.stock_entry_items (stock_entry_id);
create index stock_entry_items_product_id_idx on public.stock_entry_items (product_id);

-- ---------------------------------------------------------------------------
-- Warehouse stock — live quantity per FIFO lot / location
-- ---------------------------------------------------------------------------

create table public.warehouse_stock (
  id                  uuid primary key default gen_random_uuid(),
  warehouse_id        uuid not null references public.warehouses (id) on delete restrict,
  product_id          uuid not null references public.products (id) on delete restrict,
  stock_entry_item_id uuid references public.stock_entry_items (id) on delete set null,
  location_id         uuid references public.warehouse_locations (id) on delete set null,
  quantity            numeric(16, 2) not null default 0 check (quantity >= 0),
  min_stock           numeric(16, 2) not null default 0 check (min_stock >= 0),
  stock_type          text not null default 'retail' check (stock_type in ('retail', 'lot', 'wholesale')),
  last_count_date     timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.warehouse_stock is
  'Live stock, one row per FIFO lot: a (warehouse, product, source lot, location) slice with its remaining quantity. Exits consume oldest rows first (created_at, id).';
comment on column public.warehouse_stock.id is 'Primary key.';
comment on column public.warehouse_stock.warehouse_id is 'Holding warehouse. RESTRICT to protect stock history.';
comment on column public.warehouse_stock.product_id is 'Stocked product. RESTRICT to protect stock history.';
comment on column public.warehouse_stock.stock_entry_item_id is
  'Source receiving line (the lot origin); SET NULL if the line is removed. Drives FIFO ordering and costing.';
comment on column public.warehouse_stock.location_id is 'Optional position inside the warehouse; SET NULL if the location is removed.';
comment on column public.warehouse_stock.quantity is 'Remaining base units in this lot; must be >= 0.';
comment on column public.warehouse_stock.min_stock is 'Reorder threshold for alerts; must be >= 0.';
comment on column public.warehouse_stock.stock_type is 'retail, lot or wholesale bucket this lot belongs to.';
comment on column public.warehouse_stock.last_count_date is 'When this lot was last physically counted.';
comment on column public.warehouse_stock.created_at is 'When the lot entered stock; part of the FIFO sort key.';
comment on column public.warehouse_stock.updated_at is 'Last modification; maintained by trigger.';

create index warehouse_stock_product_id_idx on public.warehouse_stock (product_id);
create index warehouse_stock_warehouse_id_idx on public.warehouse_stock (warehouse_id);
-- FIFO exit support: oldest lot first within a (product, warehouse).
create index warehouse_stock_fifo_idx
  on public.warehouse_stock (product_id, warehouse_id, created_at, id);

-- ---------------------------------------------------------------------------
-- Inventory movements — append-only kardex ledger
-- ---------------------------------------------------------------------------

create table public.inventory_movements (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete restrict,
  warehouse_id   uuid not null references public.warehouses (id) on delete restrict,
  movement_type  text not null check (movement_type in (
                    'entry', 'exit', 'transfer_in', 'transfer_out',
                    'adjustment_plus', 'adjustment_minus', 'return', 'defective')),
  quantity       numeric(16, 2) not null check (quantity > 0),
  unit_name      text not null default 'unidad',
  reference_type text,
  reference_id   uuid,
  notes          text,
  created_by     uuid references public.staff (id) on delete set null,
  created_at     timestamptz not null default now()
);

comment on table public.inventory_movements is
  'Append-only kardex: one row per stock movement. Written only by inventory RPCs; never updated or deleted (enforced by RLS: insert + select, no update/delete policy).';
comment on column public.inventory_movements.id is 'Primary key.';
comment on column public.inventory_movements.product_id is 'Moved product. RESTRICT to protect the ledger.';
comment on column public.inventory_movements.warehouse_id is 'Warehouse the movement happened in. RESTRICT to protect the ledger.';
comment on column public.inventory_movements.movement_type is
  'entry, exit, transfer_in/out, adjustment_plus/minus, return or defective.';
comment on column public.inventory_movements.quantity is 'Base units moved; always positive (direction is in movement_type).';
comment on column public.inventory_movements.unit_name is 'Unit label snapshot at the time of the movement.';
comment on column public.inventory_movements.reference_type is 'Kind of source document, e.g. stock_entry, transfer, sale, defective.';
comment on column public.inventory_movements.reference_id is 'Id of the source document; no FK (polymorphic across domains).';
comment on column public.inventory_movements.notes is 'Optional free-form note, e.g. a relocation path.';
comment on column public.inventory_movements.created_by is 'Staff member who triggered it; SET NULL if that staff row is removed.';
comment on column public.inventory_movements.created_at is 'When the movement was recorded.';

create index inventory_movements_product_id_idx on public.inventory_movements (product_id);
create index inventory_movements_warehouse_id_idx on public.inventory_movements (warehouse_id);
create index inventory_movements_reference_idx on public.inventory_movements (reference_type, reference_id);

-- ---------------------------------------------------------------------------
-- Transfers — inter-warehouse moves (header)
-- ---------------------------------------------------------------------------

create table public.transfers (
  id                uuid primary key default gen_random_uuid(),
  transfer_number   text not null unique,
  from_warehouse_id uuid not null references public.warehouses (id) on delete restrict,
  to_warehouse_id   uuid not null references public.warehouses (id) on delete restrict,
  status            text not null default 'draft' check (status in ('draft', 'sent', 'closed', 'cancelled')),
  reason            text check (reason in ('restock', 'request', 'reorganization', 'return_to_main', 'other')),
  requested_by      uuid not null references public.staff (id) on delete restrict,
  requested_at      timestamptz not null default now(),
  sent_at           timestamptz,
  received_at       timestamptz,
  notes             text,
  created_by        uuid not null references public.staff (id) on delete restrict,
  cancelled_at      timestamptz,
  cancelled_by      uuid references public.staff (id) on delete set null,
  cancelled_reason  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (from_warehouse_id <> to_warehouse_id)
);

comment on table public.transfers is
  'Inter-warehouse transfer header. Lifecycle draft -> sent (stock in transit) -> closed (received); cancellable. Source stock moves into transfer_lots while in transit.';
comment on column public.transfers.id is 'Primary key.';
comment on column public.transfers.transfer_number is 'Human-facing sequential number (e.g. TRA-000001); assigned by the transfer RPC. Unique.';
comment on column public.transfers.from_warehouse_id is 'Origin warehouse. RESTRICT to protect transfer history.';
comment on column public.transfers.to_warehouse_id is 'Destination warehouse. RESTRICT to protect transfer history.';
comment on column public.transfers.status is 'draft (editable), sent (in transit), closed (received) or cancelled.';
comment on column public.transfers.reason is 'Why the transfer was raised.';
comment on column public.transfers.requested_by is 'Staff member who requested it. RESTRICT to preserve authorship.';
comment on column public.transfers.requested_at is 'When it was requested.';
comment on column public.transfers.sent_at is 'When stock was dispatched (draft -> sent); null until then.';
comment on column public.transfers.received_at is 'When stock was received (sent -> closed); null until then.';
comment on column public.transfers.notes is 'Free-form notes.';
comment on column public.transfers.created_by is 'Staff member who created the record. RESTRICT to preserve authorship.';
comment on column public.transfers.cancelled_at is 'When it was cancelled; null while active.';
comment on column public.transfers.cancelled_by is 'Staff member who cancelled it; SET NULL if that staff row is removed.';
comment on column public.transfers.cancelled_reason is 'Why it was cancelled.';
comment on column public.transfers.created_at is 'When the transfer was created.';
comment on column public.transfers.updated_at is 'Last modification; maintained by trigger.';
comment on constraint transfers_check on public.transfers is
  'A transfer cannot have the same origin and destination warehouse.';

create index transfers_from_warehouse_id_idx on public.transfers (from_warehouse_id);
create index transfers_to_warehouse_id_idx on public.transfers (to_warehouse_id);
create index transfers_status_idx on public.transfers (status);

-- ---------------------------------------------------------------------------
-- Transfer items — requested transfer lines
-- ---------------------------------------------------------------------------

create table public.transfer_items (
  id             uuid primary key default gen_random_uuid(),
  transfer_id    uuid not null references public.transfers (id) on delete cascade,
  product_id     uuid not null references public.products (id) on delete restrict,
  quantity       numeric(16, 2) not null check (quantity > 0),
  unit_name      text not null default 'unidad',
  to_location_id uuid references public.warehouse_locations (id) on delete set null,
  notes          text,
  created_at     timestamptz not null default now()
);

comment on table public.transfer_items is
  'Requested lines of a transfer: how much of each product to move. Actual FIFO lots moved are tracked in transfer_lots.';
comment on column public.transfer_items.id is 'Primary key.';
comment on column public.transfer_items.transfer_id is 'FK to transfers; CASCADE with the header.';
comment on column public.transfer_items.product_id is 'Product to move. RESTRICT to keep the request consistent.';
comment on column public.transfer_items.quantity is 'Requested base units; must be > 0.';
comment on column public.transfer_items.unit_name is 'Unit label snapshot for the request.';
comment on column public.transfer_items.to_location_id is 'Optional destination location at the target warehouse; SET NULL if removed.';
comment on column public.transfer_items.notes is 'Optional line note.';
comment on column public.transfer_items.created_at is 'When the line was created.';

create index transfer_items_transfer_id_idx on public.transfer_items (transfer_id);
create index transfer_items_product_id_idx on public.transfer_items (product_id);

-- ---------------------------------------------------------------------------
-- Transfer lots — FIFO lots currently in transit (D9: RLS enforced below)
-- ---------------------------------------------------------------------------

create table public.transfer_lots (
  id                  uuid primary key default gen_random_uuid(),
  transfer_id         uuid not null references public.transfers (id) on delete cascade,
  product_id          uuid not null references public.products (id) on delete restrict,
  stock_entry_item_id uuid references public.stock_entry_items (id) on delete set null,
  stock_type          text check (stock_type in ('retail', 'lot', 'wholesale')),
  quantity            numeric(16, 2) not null check (quantity > 0),
  created_at          timestamptz not null default now()
);

comment on table public.transfer_lots is
  'FIFO lots dispatched but not yet received (status sent). Preserves each lot origin and type so stock is never duplicated: it has left the source and not yet entered the destination.';
comment on column public.transfer_lots.id is 'Primary key.';
comment on column public.transfer_lots.transfer_id is 'FK to transfers; CASCADE with the header.';
comment on column public.transfer_lots.product_id is 'Product in transit. RESTRICT to keep the in-transit record consistent.';
comment on column public.transfer_lots.stock_entry_item_id is 'Source FIFO lot; SET NULL if the line is removed.';
comment on column public.transfer_lots.stock_type is 'retail, lot or wholesale bucket carried from the source lot.';
comment on column public.transfer_lots.quantity is 'Base units in transit for this lot; must be > 0.';
comment on column public.transfer_lots.created_at is 'When the lot was dispatched.';

create index transfer_lots_transfer_id_idx on public.transfer_lots (transfer_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger warehouses_set_updated_at
  before update on public.warehouses
  for each row execute function public.set_updated_at();

create trigger warehouse_locations_set_updated_at
  before update on public.warehouse_locations
  for each row execute function public.set_updated_at();

create trigger stock_entries_set_updated_at
  before update on public.stock_entries
  for each row execute function public.set_updated_at();

create trigger stock_entry_items_set_updated_at
  before update on public.stock_entry_items
  for each row execute function public.set_updated_at();

create trigger warehouse_stock_set_updated_at
  before update on public.warehouse_stock
  for each row execute function public.set_updated_at();

create trigger transfers_set_updated_at
  before update on public.transfers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — deny by default, staff-only
-- transfer_lots is explicitly covered (D9). The kardex is append-only:
-- insert + select for staff, no update/delete policy (so both are denied).
-- ---------------------------------------------------------------------------

alter table public.warehouses          enable row level security;
alter table public.warehouse_locations enable row level security;
alter table public.stock_entries       enable row level security;
alter table public.stock_entry_items   enable row level security;
alter table public.warehouse_stock     enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.transfers           enable row level security;
alter table public.transfer_items      enable row level security;
alter table public.transfer_lots       enable row level security;

-- warehouses
create policy warehouses_select on public.warehouses
  for select to authenticated
  using (public.is_active_staff());
create policy warehouses_write on public.warehouses
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- warehouse_locations
create policy warehouse_locations_select on public.warehouse_locations
  for select to authenticated
  using (public.is_active_staff());
create policy warehouse_locations_write on public.warehouse_locations
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- stock_entries
create policy stock_entries_select on public.stock_entries
  for select to authenticated
  using (public.is_active_staff());
create policy stock_entries_write on public.stock_entries
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- stock_entry_items
create policy stock_entry_items_select on public.stock_entry_items
  for select to authenticated
  using (public.is_active_staff());
create policy stock_entry_items_write on public.stock_entry_items
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- warehouse_stock
create policy warehouse_stock_select on public.warehouse_stock
  for select to authenticated
  using (public.is_active_staff());
create policy warehouse_stock_write on public.warehouse_stock
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- inventory_movements — append-only kardex: staff may read and insert, never mutate.
create policy inventory_movements_select on public.inventory_movements
  for select to authenticated
  using (public.is_active_staff());
create policy inventory_movements_insert on public.inventory_movements
  for insert to authenticated
  with check (public.is_active_staff());

-- transfers
create policy transfers_select on public.transfers
  for select to authenticated
  using (public.is_active_staff());
create policy transfers_write on public.transfers
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- transfer_items
create policy transfer_items_select on public.transfer_items
  for select to authenticated
  using (public.is_active_staff());
create policy transfer_items_write on public.transfer_items
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- transfer_lots (D9)
create policy transfer_lots_select on public.transfer_lots
  for select to authenticated
  using (public.is_active_staff());
create policy transfer_lots_write on public.transfer_lots
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- ---------------------------------------------------------------------------
-- Grants — RLS is the gate; anon has no access to inventory tables.
-- The kardex grants select + insert only (append-only).
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on
  public.warehouses,
  public.warehouse_locations,
  public.stock_entries,
  public.stock_entry_items,
  public.warehouse_stock,
  public.transfers,
  public.transfer_items,
  public.transfer_lots
  to authenticated;

grant select, insert on public.inventory_movements to authenticated;

revoke all on
  public.warehouses,
  public.warehouse_locations,
  public.stock_entries,
  public.stock_entry_items,
  public.warehouse_stock,
  public.inventory_movements,
  public.transfers,
  public.transfer_items,
  public.transfer_lots
  from anon;
