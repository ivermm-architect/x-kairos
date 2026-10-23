-- Migration 0002 — Catalog (phase 1)
-- Consolidates the old scattered catalog migrations (0002 + 0040-0042) into one
-- clean domain: categories (tree), brands, products, their sellable units and
-- tiered prices. Depends only on 0001 for the authorization helpers
-- (is_active_staff, has_role); it does not touch the foundation tables.
--
-- Foundation (0001) shipped no shared updated_at trigger and no measurement
-- units, so both are introduced here as the catalog is their first consumer.
-- Multi-currency and public (anon) storefront reads are intentionally out of
-- scope — they land in later M1 issues. Everything here is staff-only.

-- ---------------------------------------------------------------------------
-- Shared utility — auto-maintain updated_at
-- ---------------------------------------------------------------------------

-- Trigger function reused by every table that tracks updated_at. Runs as
-- invoker (only mutates NEW), but we still pin search_path as a hardening habit.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'BEFORE UPDATE trigger: stamps updated_at = now() on the mutated row.';

-- ---------------------------------------------------------------------------
-- Reference — measurement units
-- ---------------------------------------------------------------------------

create table public.measurement_units (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  is_base    boolean not null default false,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.measurement_units is
  'Sellable units a product can be priced in (unit, box, pack, ...). Reference data; admin-maintained.';
comment on column public.measurement_units.id is 'Primary key.';
comment on column public.measurement_units.name is 'Unique unit name shown in the UI, e.g. ''unidad'', ''caja''.';
comment on column public.measurement_units.is_base is
  'Marks the atomic unit (conversion_factor 1) the others convert to.';
comment on column public.measurement_units.sort_order is 'Display order in pickers.';
comment on column public.measurement_units.is_active is 'If false, hidden from new product configuration.';
comment on column public.measurement_units.created_at is 'When the unit was created.';

-- ---------------------------------------------------------------------------
-- Categories (self-referencing tree)
-- ---------------------------------------------------------------------------

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  parent_id   uuid references public.categories (id) on delete restrict,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.categories is
  'Product categories as a tree; parent_id nests subcategories. Storefront navigation and filtering.';
comment on column public.categories.id is 'Primary key.';
comment on column public.categories.name is 'Display name; not globally unique (same name allowed under different parents).';
comment on column public.categories.slug is 'URL-safe unique identifier for storefront routes.';
comment on column public.categories.description is 'Optional long text for the category page.';
comment on column public.categories.parent_id is
  'Parent category; null for roots. RESTRICT: a category with children cannot be deleted (deactivate instead).';
comment on column public.categories.sort_order is 'Display order among siblings.';
comment on column public.categories.is_active is 'If false, hidden from navigation without losing history.';
comment on column public.categories.created_at is 'When the category was created.';
comment on column public.categories.updated_at is 'Last modification; maintained by trigger.';

create index categories_parent_id_idx on public.categories (parent_id);

-- ---------------------------------------------------------------------------
-- Brands
-- ---------------------------------------------------------------------------

create table public.brands (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.brands is 'Product brands/manufacturers. Optional product metadata and a storefront filter.';
comment on column public.brands.id is 'Primary key.';
comment on column public.brands.name is 'Unique brand name.';
comment on column public.brands.slug is 'URL-safe unique identifier for storefront routes.';
comment on column public.brands.is_active is 'If false, hidden from filters without losing history.';
comment on column public.brands.created_at is 'When the brand was created.';
comment on column public.brands.updated_at is 'Last modification; maintained by trigger.';

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  sku          text not null unique,
  barcode      text unique,
  name         text not null,
  slug         text not null unique,
  description  text,
  category_id  uuid not null references public.categories (id) on delete restrict,
  brand_id     uuid references public.brands (id) on delete set null,
  model        text,
  color        text,
  size         text,
  is_active    boolean not null default true,
  is_featured  boolean not null default false,
  is_web_visible boolean not null default false,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.products is
  'Catalog products. Pricing lives in product_units; stock and promotions are out of this domain.';
comment on column public.products.id is 'Primary key.';
comment on column public.products.sku is 'Internal stock-keeping unit; unique, human-entered.';
comment on column public.products.barcode is 'Optional scannable barcode/EAN; unique when present.';
comment on column public.products.name is 'Display name.';
comment on column public.products.slug is 'URL-safe unique identifier for storefront routes.';
comment on column public.products.description is 'Long marketing/spec text.';
comment on column public.products.category_id is
  'FK to categories; required. RESTRICT: cannot delete a category that still has products.';
comment on column public.products.brand_id is 'Optional FK to brands; SET NULL on brand deletion.';
comment on column public.products.model is 'Optional model/reference code.';
comment on column public.products.color is 'Optional color attribute.';
comment on column public.products.size is 'Optional size attribute.';
comment on column public.products.is_active is 'If false, hidden everywhere without losing history.';
comment on column public.products.is_featured is 'Highlights the product on the storefront home.';
comment on column public.products.is_web_visible is 'Gate for storefront exposure (consumed by the public-read policy in a later migration).';
comment on column public.products.notes is 'Internal back-office notes; never shown to customers.';
comment on column public.products.created_at is 'When the product was created.';
comment on column public.products.updated_at is 'Last modification; maintained by trigger.';

create index products_category_id_idx on public.products (category_id);
create index products_brand_id_idx on public.products (brand_id);

-- ---------------------------------------------------------------------------
-- Product images — ordered gallery, one row per image
-- ---------------------------------------------------------------------------

create table public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url        text not null,
  alt        text not null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.product_images is
  'Gallery images for a product; one row per image. Ordered by sort_order, with a single primary (cover).';
comment on column public.product_images.id is 'Primary key.';
comment on column public.product_images.product_id is 'FK to products; CASCADE so images vanish with the product.';
comment on column public.product_images.url is 'Public URL of the stored image.';
comment on column public.product_images.alt is
  'Alternative text for accessibility; required (never show an image without it).';
comment on column public.product_images.sort_order is 'Display order within the gallery.';
comment on column public.product_images.is_primary is 'Marks the cover image. At most one per product.';
comment on column public.product_images.created_at is 'When the image was added.';
comment on column public.product_images.updated_at is 'Last modification; maintained by trigger.';

create index product_images_product_id_idx on public.product_images (product_id);

-- At most one primary (cover) image per product.
create unique index product_images_one_primary_idx
  on public.product_images (product_id)
  where is_primary;

-- ---------------------------------------------------------------------------
-- Product units — a product priced in one or more measurement units
-- ---------------------------------------------------------------------------

create table public.product_units (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references public.products (id) on delete cascade,
  unit_id           uuid not null references public.measurement_units (id) on delete restrict,
  conversion_factor numeric(12, 3) not null default 1 check (conversion_factor > 0),
  retail_price      numeric(12, 2) check (retail_price >= 0),
  wholesale_price   numeric(12, 2) check (wholesale_price >= 0),
  is_default        boolean not null default false,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (product_id, unit_id)
);

comment on table public.product_units is
  'Each way a product can be sold: a (product, unit) pair with its conversion and base prices. Prices are in the store''s default currency (multi-currency is a later issue).';
comment on column public.product_units.id is 'Primary key.';
comment on column public.product_units.product_id is 'FK to products; CASCADE so units vanish with the product.';
comment on column public.product_units.unit_id is 'FK to measurement_units; RESTRICT so a unit in use cannot be deleted.';
comment on column public.product_units.conversion_factor is
  'How many base units this unit represents (e.g. a box of 12 = 12). Must be > 0.';
comment on column public.product_units.retail_price is 'Per-unit retail price; null while pending configuration.';
comment on column public.product_units.wholesale_price is 'Per-unit wholesale price; null if not offered.';
comment on column public.product_units.is_default is 'The unit preselected in POS/storefront. At most one per product.';
comment on column public.product_units.is_active is 'If false, this unit is not sellable.';
comment on column public.product_units.created_at is 'When the unit pricing was created.';
comment on column public.product_units.updated_at is 'Last modification; maintained by trigger.';

-- At most one default unit per product.
create unique index product_units_one_default_idx
  on public.product_units (product_id)
  where is_default;

-- ---------------------------------------------------------------------------
-- Tiered prices — quantity breaks on a product unit
-- ---------------------------------------------------------------------------

create table public.product_price_tiers (
  id              uuid primary key default gen_random_uuid(),
  product_unit_id uuid not null references public.product_units (id) on delete cascade,
  min_quantity    integer not null check (min_quantity >= 1),
  unit_price      numeric(12, 2) not null check (unit_price > 0),
  label           text,
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (product_unit_id, min_quantity)
);

comment on table public.product_price_tiers is
  'Quantity-break pricing for a product unit: buy >= min_quantity, pay unit_price.';
comment on column public.product_price_tiers.id is 'Primary key.';
comment on column public.product_price_tiers.product_unit_id is 'FK to product_units; CASCADE with the unit.';
comment on column public.product_price_tiers.min_quantity is 'Lowest quantity that unlocks this tier; >= 1.';
comment on column public.product_price_tiers.unit_price is 'Per-unit price at this tier; must be > 0.';
comment on column public.product_price_tiers.label is 'Optional display label, e.g. ''Mayorista''.';
comment on column public.product_price_tiers.is_active is 'If false, the tier is ignored.';
comment on column public.product_price_tiers.sort_order is 'Display order among tiers.';
comment on column public.product_price_tiers.created_at is 'When the tier was created.';
comment on column public.product_price_tiers.updated_at is 'Last modification; maintained by trigger.';

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create trigger brands_set_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger product_images_set_updated_at
  before update on public.product_images
  for each row execute function public.set_updated_at();

create trigger product_units_set_updated_at
  before update on public.product_units
  for each row execute function public.set_updated_at();

create trigger product_price_tiers_set_updated_at
  before update on public.product_price_tiers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Reference data (idempotent)
-- ---------------------------------------------------------------------------

insert into public.measurement_units (name, is_base, sort_order) values
  ('unidad',  true,  1),
  ('caja',    false, 2),
  ('paquete', false, 3),
  ('display', false, 4)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security — deny by default, staff-only
-- Public (anon) storefront reads are added in a later M1 migration.
-- ---------------------------------------------------------------------------

alter table public.measurement_units  enable row level security;
alter table public.categories         enable row level security;
alter table public.brands             enable row level security;
alter table public.products           enable row level security;
alter table public.product_images     enable row level security;
alter table public.product_units      enable row level security;
alter table public.product_price_tiers enable row level security;

-- measurement_units — reference data: read for staff, writes for admins only.
create policy measurement_units_select on public.measurement_units
  for select to authenticated
  using (public.is_active_staff());
create policy measurement_units_write on public.measurement_units
  for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

-- categories
create policy categories_select on public.categories
  for select to authenticated
  using (public.is_active_staff());
create policy categories_write on public.categories
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- brands
create policy brands_select on public.brands
  for select to authenticated
  using (public.is_active_staff());
create policy brands_write on public.brands
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- products
create policy products_select on public.products
  for select to authenticated
  using (public.is_active_staff());
create policy products_write on public.products
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- product_images
create policy product_images_select on public.product_images
  for select to authenticated
  using (public.is_active_staff());
create policy product_images_write on public.product_images
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- product_units
create policy product_units_select on public.product_units
  for select to authenticated
  using (public.is_active_staff());
create policy product_units_write on public.product_units
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- product_price_tiers
create policy product_price_tiers_select on public.product_price_tiers
  for select to authenticated
  using (public.is_active_staff());
create policy product_price_tiers_write on public.product_price_tiers
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- ---------------------------------------------------------------------------
-- Grants — RLS is the gate; anon has no access to catalog tables (yet)
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on
  public.measurement_units,
  public.categories,
  public.brands,
  public.products,
  public.product_images,
  public.product_units,
  public.product_price_tiers
  to authenticated;
