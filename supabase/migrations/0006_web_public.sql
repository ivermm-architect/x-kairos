-- 0006_web_public.sql
-- M5 Web/Storefront: the public-facing order surface (web_customers, web_orders,
-- web_order_items) plus the clients <-> web_customers identity link, and the
-- storefront RPCs with their access holes closed.
--
-- Consolidates the old scattered web migrations (legacy 0005 + 0024-0033 + 0050-0052).
-- Deferred on purpose: multi-currency columns on web_orders/web_order_items and
-- public_currencies() -> 0007 (#32). Everything here is the store base currency.
--
-- SECURITY (D1 + D7): the legacy storefront granted the SECURITY DEFINER
-- functions convert_web_order_to_sale and update_web_order_status to `anon`
-- with no staff check, so anyone could invoice any order in any warehouse.
-- Here those two are staff-only (assert_staff + granted to authenticated only).
-- Only the genuinely public reads/writes (create_web_order, public_warehouses)
-- stay callable by anon, and they never touch staff-only logic.

-- ---------------------------------------------------------------------------
-- web_customers
-- ---------------------------------------------------------------------------
create table public.web_customers (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users (id) on delete set null,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  client_id uuid references public.clients (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.web_customers is 'Storefront accounts. auth_id ties to a Supabase Auth user; client_id unifies the account with its back-office clients row.';
comment on column public.web_customers.client_id is 'Back-office client this account resolves to; set on first order conversion.';

-- ---------------------------------------------------------------------------
-- web_orders
-- ---------------------------------------------------------------------------
create table public.web_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  web_customer_id uuid references public.web_customers (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  warehouse_id uuid references public.warehouses (id) on delete set null,
  subtotal numeric(16, 2) not null default 0 check (subtotal >= 0),
  total numeric(16, 2) not null default 0 check (total >= 0),
  status text not null default 'pending' check (
    status in ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')
  ),
  sale_id uuid references public.sales (id) on delete set null,
  contact_name text,
  contact_phone text,
  delivery_notes text,
  notes text,
  idempotency_key uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.web_orders is 'Storefront orders (guest or logged-in). Converts to a POS sale via convert_web_order_to_sale; sale_id links the two.';
comment on column public.web_orders.web_customer_id is 'Nullable to support guest checkout via contact_name/contact_phone.';
comment on column public.web_orders.idempotency_key is 'Dedupes retried submissions; unique when present so a double-tap cannot create two orders.';

create unique index web_orders_idempotency_idx
  on public.web_orders (idempotency_key)
  where idempotency_key is not null;

-- ---------------------------------------------------------------------------
-- web_order_items
-- ---------------------------------------------------------------------------
create table public.web_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.web_orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  product_unit_id uuid references public.product_units (id) on delete set null,
  quantity numeric(16, 2) not null check (quantity > 0),
  unit_name text not null default 'unidad',
  unit_price numeric(16, 2) not null check (unit_price >= 0),
  subtotal numeric(16, 2) not null default 0 check (subtotal >= 0),
  created_at timestamptz not null default now()
);

comment on table public.web_order_items is 'Order lines. unit_price is fetched server-side from the catalog, never trusted from the client.';

-- ---------------------------------------------------------------------------
-- clients <-> web_customers identity link (deferred from 0005)
-- ---------------------------------------------------------------------------
alter table public.clients
  add column web_customer_id uuid references public.web_customers (id) on delete set null;

comment on column public.clients.web_customer_id is 'Storefront account this client was created from or matched to; SET NULL if the account is removed.';

-- ---------------------------------------------------------------------------
-- updated_at triggers + indexes
-- ---------------------------------------------------------------------------
create trigger web_customers_set_updated_at before update on public.web_customers
  for each row execute function public.set_updated_at();
create trigger web_orders_set_updated_at before update on public.web_orders
  for each row execute function public.set_updated_at();

create index web_customers_auth_idx on public.web_customers (auth_id);
create index web_customers_client_idx on public.web_customers (client_id);
create index web_orders_customer_idx on public.web_orders (web_customer_id);
create index web_orders_status_idx on public.web_orders (status);
create index web_orders_sale_idx on public.web_orders (sale_id);
create index web_order_items_order_idx on public.web_order_items (order_id);
create index clients_web_customer_idx on public.clients (web_customer_id);

-- ---------------------------------------------------------------------------
-- Row level security. Staff manage everything; a logged-in web customer may
-- read only their own account and orders. All storefront writes go through the
-- SECURITY DEFINER RPCs below (which bypass RLS), so anon needs no table grant.
-- ---------------------------------------------------------------------------
alter table public.web_customers enable row level security;
alter table public.web_orders enable row level security;
alter table public.web_order_items enable row level security;

create policy web_customers_staff_all on public.web_customers
  for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
create policy web_customers_self_select on public.web_customers
  for select to authenticated using (auth_id = auth.uid());
create policy web_customers_self_update on public.web_customers
  for update to authenticated using (auth_id = auth.uid()) with check (auth_id = auth.uid());

create policy web_orders_staff_all on public.web_orders
  for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
create policy web_orders_owner_select on public.web_orders
  for select to authenticated using (
    web_customer_id in (select id from public.web_customers where auth_id = auth.uid())
  );

create policy web_order_items_staff_all on public.web_order_items
  for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
create policy web_order_items_owner_select on public.web_order_items
  for select to authenticated using (
    order_id in (
      select o.id from public.web_orders o
      where o.web_customer_id in (
        select id from public.web_customers where auth_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Grants. authenticated access is still gated by RLS; anon gets nothing on the
-- tables (the public storefront reaches them only via definer RPCs).
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.web_customers to authenticated;
grant select, insert, update, delete on public.web_orders to authenticated;
grant select, insert, update, delete on public.web_order_items to authenticated;

revoke all on public.web_customers from anon;
revoke all on public.web_orders from anon;
revoke all on public.web_order_items from anon;

-- ===========================================================================
-- Storefront RPCs.
-- Public (anon-callable): create_web_order, public_warehouses — they never run
-- staff-only logic and price everything server-side.
-- Staff-only (D1/D7): update_web_order_status, convert_web_order_to_sale — both
-- assert_staff and are granted to authenticated only.
-- ===========================================================================

create sequence if not exists public.seq_web_order;
comment on sequence public.seq_web_order is 'Backs human-readable web order numbers (WEB-YYYYMMDD-#####).';

-- Public: place a storefront order. Prices are read from the catalog, never
-- trusted from the client. Retrying with the same idempotency_key returns the
-- original order instead of creating a duplicate.
create function public.create_web_order(
  p_contact_name text,
  p_contact_phone text,
  p_delivery_notes text,
  p_lines jsonb,
  p_web_customer_id uuid default null,
  p_idempotency_key uuid default null
)
returns public.web_orders
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.web_orders;
  v_order_id uuid := gen_random_uuid();
  v_el jsonb;
  v_pu record;
  v_qty numeric(16, 2);
  v_line numeric(16, 2);
  v_subtotal numeric(16, 2) := 0;
begin
  if p_idempotency_key is not null then
    select * into v_order from public.web_orders where idempotency_key = p_idempotency_key;
    if v_order.id is not null then
      return v_order;
    end if;
  end if;

  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'El pedido no tiene lineas' using errcode = 'check_violation';
  end if;

  insert into public.web_orders (
    id, order_number, web_customer_id, contact_name, contact_phone,
    delivery_notes, idempotency_key
  )
  values (
    v_order_id,
    'WEB-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.seq_web_order')::text, 5, '0'),
    p_web_customer_id, p_contact_name, p_contact_phone, p_delivery_notes, p_idempotency_key
  );

  for v_el in select * from jsonb_array_elements(p_lines)
  loop
    v_qty := (v_el->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Cantidad invalida en el pedido' using errcode = 'check_violation';
    end if;

    select pu.product_id, pu.conversion_factor, coalesce(pu.retail_price, 0) as retail_price, mu.name as unit_name
      into v_pu
    from public.product_units pu
    join public.measurement_units mu on mu.id = pu.unit_id
    where pu.id = (v_el->>'product_unit_id')::uuid and pu.is_active;

    if v_pu.product_id is null then
      raise exception 'Unidad de producto inexistente o inactiva: %', v_el->>'product_unit_id'
        using errcode = 'check_violation';
    end if;

    v_line := v_pu.retail_price * v_qty;
    v_subtotal := v_subtotal + v_line;

    insert into public.web_order_items (
      order_id, product_id, product_unit_id, quantity, unit_name, unit_price, subtotal
    )
    values (
      v_order_id, v_pu.product_id, (v_el->>'product_unit_id')::uuid, v_qty,
      v_pu.unit_name, v_pu.retail_price, v_line
    );
  end loop;

  update public.web_orders set subtotal = v_subtotal, total = v_subtotal
  where id = v_order_id
  returning * into v_order;

  return v_order;
end;
$$;

comment on function public.create_web_order is 'Public: create a storefront order with server-priced lines; idempotency_key dedupes retries. No staff check.';

-- Public: active warehouses for the storefront address/pickup selector.
create function public.public_warehouses()
returns table (name text, address text, city text, phone text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select name, address, city, phone
  from public.warehouses
  where is_active
  order by is_default desc, name asc;
$$;

comment on function public.public_warehouses is 'Public: list active warehouses (name/address/city/phone) for the storefront.';

-- Staff-only (D7): advance a web order through its status lifecycle.
create function public.update_web_order_status(p_id uuid, p_status text)
returns public.web_orders
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.web_orders;
begin
  perform public.assert_staff();
  update public.web_orders set status = p_status where id = p_id returning * into v_order;
  if v_order.id is null then
    raise exception 'Pedido web inexistente' using errcode = 'check_violation';
  end if;
  return v_order;
end;
$$;

comment on function public.update_web_order_status is 'Staff-only: set a web order status (pending..delivered/cancelled).';

-- Staff-only (D1): invoice a web order as a POS sale. Resolves or creates the
-- client, routes stock through register_sale (locked FIFO), and links order<->sale.
create function public.convert_web_order_to_sale(
  p_id uuid,
  p_warehouse_id uuid,
  p_payment_method text default 'cash',
  p_cash_session_id uuid default null
)
returns public.sales
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.web_orders;
  v_client_id uuid;
  v_wc public.web_customers;
  v_items jsonb;
  v_sale public.sales;
begin
  perform public.assert_staff();

  select * into v_order from public.web_orders where id = p_id for update;
  if v_order.id is null then
    raise exception 'Pedido web inexistente' using errcode = 'check_violation';
  end if;
  if v_order.sale_id is not null then
    raise exception 'El pedido ya fue facturado' using errcode = 'check_violation';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'El pedido esta cancelado' using errcode = 'check_violation';
  end if;

  -- Resolve the back-office client: explicit link, then account link, then
  -- phone match, otherwise create a retail client from the order contact.
  v_client_id := v_order.client_id;

  if v_client_id is null and v_order.web_customer_id is not null then
    select * into v_wc from public.web_customers where id = v_order.web_customer_id;
    v_client_id := v_wc.client_id;
  end if;

  if v_client_id is null and coalesce(v_order.contact_phone, '') <> '' then
    select id into v_client_id from public.clients
    where phone = v_order.contact_phone and is_active
    order by created_at asc limit 1;
  end if;

  if v_client_id is null then
    insert into public.clients (client_type, full_name, phone, web_customer_id)
    values ('retail', v_order.contact_name, v_order.contact_phone, v_order.web_customer_id)
    returning id into v_client_id;
  end if;

  -- Keep the account <-> client link in sync.
  if v_order.web_customer_id is not null then
    update public.web_customers set client_id = v_client_id
    where id = v_order.web_customer_id and client_id is null;
  end if;

  select jsonb_agg(jsonb_build_object(
    'product_id', woi.product_id,
    'product_unit_id', woi.product_unit_id,
    'warehouse_id', p_warehouse_id,
    'quantity', woi.quantity,
    'unit_name', woi.unit_name,
    'conversion_factor', coalesce(pu.conversion_factor, 1),
    'unit_price', woi.unit_price
  ))
  into v_items
  from public.web_order_items woi
  left join public.product_units pu on pu.id = woi.product_unit_id
  where woi.order_id = p_id;

  v_sale := public.register_sale(
    p_warehouse_id := p_warehouse_id,
    p_items := coalesce(v_items, '[]'::jsonb),
    p_sale_mode := 'direct',
    p_payment_method := p_payment_method,
    p_client_id := v_client_id,
    p_cash_session_id := p_cash_session_id,
    p_amount_paid := v_order.total
  );

  update public.web_orders set
    sale_id = v_sale.id,
    warehouse_id = p_warehouse_id,
    client_id = v_client_id,
    status = 'confirmed'
  where id = p_id;

  return v_sale;
end;
$$;

comment on function public.convert_web_order_to_sale is 'Staff-only (D1): invoice a web order via register_sale, resolve/create the client, and link order to sale. Granted to authenticated only.';

-- RPC grants: public reads/writes to anon; the two staff mutators to authenticated only.
grant execute on function public.create_web_order(text, text, text, jsonb, uuid, uuid) to anon, authenticated;
grant execute on function public.public_warehouses() to anon, authenticated;
grant execute on function public.update_web_order_status(uuid, text) to authenticated;
grant execute on function public.convert_web_order_to_sale(uuid, uuid, text, uuid) to authenticated;

-- Defense in depth: never leave the staff mutators callable by anon/public.
revoke all on function public.update_web_order_status(uuid, text) from anon, public;
revoke all on function public.convert_web_order_to_sale(uuid, uuid, text, uuid) from anon, public;
