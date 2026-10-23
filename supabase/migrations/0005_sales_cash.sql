-- 0005_sales_cash.sql
-- M3 Sales & Cash (POS): clients, cash registers/sessions, sales + items + payments,
-- credit payments, cash movements, quotations + items, returns + items.
--
-- Consolidates the old scattered sales/cash migrations (legacy 0004 + 0013-0020 + 0048).
-- Deferred on purpose to later vertical slices so each migration applies clean:
--   * multi-currency columns (currency, exchange_rate, *_base) + frozen-rate logic -> 0007 (#32)
--   * register_return full validation + partial/full cap (D5)               -> 0008 (#33)
--   * clients.web_customer_id link to the public storefront                 -> 0006 (#31)
--
-- Everything here runs in the store base currency. Every write RPC is
-- SECURITY DEFINER, asserts staff, and pins search_path. The single stock-exit
-- path `_emit_sale_exit` locks FIFO lots `for update` (D2) so no sale path
-- (direct / order / credit / quotation conversion) can oversell.

-- ---------------------------------------------------------------------------
-- Document number sequences
-- ---------------------------------------------------------------------------
create sequence if not exists public.seq_sale;
create sequence if not exists public.seq_return;
create sequence if not exists public.seq_quotation;
create sequence if not exists public.seq_cash_register;

comment on sequence public.seq_sale is 'Backs human-readable sale numbers (VTA-########).';
comment on sequence public.seq_return is 'Backs human-readable return numbers (DEV-########).';
comment on sequence public.seq_quotation is 'Backs human-readable quotation numbers (COT-########).';
comment on sequence public.seq_cash_register is 'Backs human-readable cash register codes (CAJA-####).';

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  client_type text not null default 'retail' check (client_type in ('retail', 'wholesale')),
  full_name text,
  business_name text,
  nit text,
  ci text,
  phone text,
  email text,
  address text,
  city text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.clients is 'Customers (retail and wholesale). Pricing tier follows client_type at sale time.';
comment on column public.clients.client_type is 'retail | wholesale — selects the default price tier for this client.';
comment on column public.clients.nit is 'Tax id (NIT) for invoicing; optional for retail walk-ins.';
comment on column public.clients.ci is 'National id (CI) for retail customers; optional.';

-- ---------------------------------------------------------------------------
-- cash_registers
-- ---------------------------------------------------------------------------
create table public.cash_registers (
  id uuid primary key default gen_random_uuid(),
  register_number text not null unique,
  name text not null,
  warehouse_id uuid not null references public.warehouses (id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.cash_registers is 'Physical POS registers; each is bound to one warehouse.';
comment on column public.cash_registers.register_number is 'Human-readable code (CAJA-####) from seq_cash_register.';

-- ---------------------------------------------------------------------------
-- cash_sessions
-- ---------------------------------------------------------------------------
create table public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  register_id uuid not null references public.cash_registers (id) on delete restrict,
  opened_by uuid not null references public.staff (id) on delete restrict,
  closed_by uuid references public.staff (id) on delete set null,
  opening_amount numeric(16, 2) not null default 0 check (opening_amount >= 0),
  total_sales numeric(16, 2) not null default 0,
  total_cash_sales numeric(16, 2) not null default 0,
  total_qr_sales numeric(16, 2) not null default 0,
  total_expenses numeric(16, 2) not null default 0,
  expected_amount numeric(16, 2) not null default 0,
  actual_amount numeric(16, 2),
  difference numeric(16, 2),
  status text not null default 'open' check (status in ('open', 'closed')),
  closing_notes text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.cash_sessions is 'Cash drawer sessions: one open session per register drives POS tender and the close-out reconciliation.';
comment on column public.cash_sessions.expected_amount is 'opening_amount + cash in - cash out, computed as movements post.';
comment on column public.cash_sessions.difference is 'actual_amount - expected_amount, set at close.';

-- ---------------------------------------------------------------------------
-- quotations (created before sales; the converted_sale_id FK is added later to
-- break the sales <-> quotations cycle)
-- ---------------------------------------------------------------------------
create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_number text not null unique,
  client_id uuid references public.clients (id) on delete set null,
  client_name text,
  client_phone text,
  subtotal numeric(16, 2) not null default 0 check (subtotal >= 0),
  discount_amount numeric(16, 2) not null default 0 check (discount_amount >= 0),
  tax_rate numeric(6, 4) not null default 0 check (tax_rate >= 0),
  total numeric(16, 2) not null default 0 check (total >= 0),
  terms_conditions text,
  valid_until date,
  status text not null default 'draft' check (
    status in ('draft', 'sent', 'accepted', 'converted', 'expired', 'cancelled')
  ),
  converted_sale_id uuid,
  created_by uuid not null references public.staff (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.quotations is 'Price quotes that can convert into a sale. client_id optional so one-off prospects can be quoted by name/phone.';
comment on column public.quotations.converted_sale_id is 'Set when the quote converts; FK added after sales exists (cyclic dependency).';

-- ---------------------------------------------------------------------------
-- sales
-- ---------------------------------------------------------------------------
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_number text not null unique,
  client_id uuid references public.clients (id) on delete set null,
  warehouse_id uuid not null references public.warehouses (id) on delete restrict,
  cash_session_id uuid references public.cash_sessions (id) on delete set null,
  quotation_id uuid references public.quotations (id) on delete set null,
  sale_mode text not null default 'direct' check (sale_mode in ('direct', 'order', 'credit')),
  sale_type text not null default 'retail' check (sale_type in ('retail', 'wholesale')),
  subtotal numeric(16, 2) not null default 0 check (subtotal >= 0),
  discount_amount numeric(16, 2) not null default 0 check (discount_amount >= 0),
  discount_percent numeric(6, 4) not null default 0 check (discount_percent >= 0),
  tax_rate numeric(6, 4) not null default 0 check (tax_rate >= 0),
  tax_amount numeric(16, 2) not null default 0 check (tax_amount >= 0),
  total numeric(16, 2) not null default 0 check (total >= 0),
  payment_method text not null default 'cash' check (payment_method in ('cash', 'qr', 'credit')),
  amount_paid numeric(16, 2) not null default 0 check (amount_paid >= 0),
  amount_pending numeric(16, 2) not null default 0 check (amount_pending >= 0),
  change_amount numeric(16, 2) not null default 0 check (change_amount >= 0),
  status text not null default 'completed' check (
    status in ('draft', 'pending_payment', 'completed', 'cancelled', 'refunded')
  ),
  shipping_date date,
  delivery_notes text,
  advance_amount numeric(16, 2) not null default 0 check (advance_amount >= 0),
  balance_due numeric(16, 2) not null default 0 check (balance_due >= 0),
  credit_due_date date,
  credit_status text check (credit_status in ('pending', 'partial', 'paid')),
  cancellation_reason text,
  cancelled_at timestamptz,
  cancelled_by uuid references public.staff (id) on delete set null,
  notes text,
  sold_by uuid not null references public.staff (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.sales is 'Sales across three modes: direct (immediate), order (deferred delivery), credit (deferred payment). FIFO stock exit happens via _emit_sale_exit.';
comment on column public.sales.sale_mode is 'direct | order | credit — drives when stock leaves and when payment is due.';
comment on column public.sales.amount_pending is 'Outstanding balance for credit sales; mirrored by balance_due for orders.';

-- Close the cycle: a quote points to the sale it became.
alter table public.quotations
  add constraint quotations_converted_sale_id_fkey
  foreign key (converted_sale_id) references public.sales (id) on delete set null;

-- ---------------------------------------------------------------------------
-- sale_items
-- ---------------------------------------------------------------------------
create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  product_unit_id uuid references public.product_units (id) on delete set null,
  warehouse_id uuid not null references public.warehouses (id) on delete restrict,
  quantity numeric(16, 4) not null check (quantity > 0),
  unit_name text not null,
  conversion_factor numeric(16, 4) not null default 1 check (conversion_factor > 0),
  unit_price numeric(16, 4) not null check (unit_price > 0),
  price_type text,
  price_source text,
  discount_amount numeric(16, 2) not null default 0 check (discount_amount >= 0),
  subtotal numeric(16, 2) not null default 0 check (subtotal >= 0),
  source_lot_id uuid references public.stock_entry_items (id) on delete set null,
  tier_label text,
  tier_min_quantity numeric(16, 4),
  created_at timestamptz not null default now()
);

comment on table public.sale_items is 'Line items. quantity is in the chosen selling unit; conversion_factor maps it to the product base unit for stock exit.';
comment on column public.sale_items.source_lot_id is 'First FIFO lot consumed for this line, set by _emit_sale_exit for cost traceability.';

-- ---------------------------------------------------------------------------
-- sale_payments
-- ---------------------------------------------------------------------------
create table public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  payment_method text not null check (payment_method in ('cash', 'qr', 'credit')),
  amount numeric(16, 2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

comment on table public.sale_payments is 'Split-tender payments for a sale; sum should match sales.amount_paid.';

-- ---------------------------------------------------------------------------
-- credit_payments
-- ---------------------------------------------------------------------------
create table public.credit_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  amount numeric(16, 2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash', 'qr')),
  received_by uuid not null references public.staff (id) on delete restrict,
  cash_session_id uuid references public.cash_sessions (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.credit_payments is 'Installments paid against a credit sale; each reduces sales.amount_pending and posts a cash movement.';

-- ---------------------------------------------------------------------------
-- cash_movements
-- ---------------------------------------------------------------------------
create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.cash_sessions (id) on delete cascade,
  movement_type text not null check (
    movement_type in (
      'sale_cash',
      'sale_qr',
      'credit_payment',
      'expense',
      'withdrawal',
      'deposit',
      'refund_cash'
    )
  ),
  amount numeric(16, 2) not null check (amount > 0),
  description text,
  expense_category text,
  reference_type text,
  reference_id uuid,
  created_by uuid not null references public.staff (id) on delete restrict,
  created_at timestamptz not null default now()
);

comment on table public.cash_movements is 'Append-only ledger of every drawer in/out within a session; drives the close-out expected_amount.';
comment on column public.cash_movements.movement_type is 'Signed by convention: sale_cash/credit_payment/deposit add cash; expense/withdrawal/refund_cash remove it; sale_qr is non-cash.';

-- ---------------------------------------------------------------------------
-- quotation_items
-- ---------------------------------------------------------------------------
create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  product_unit_id uuid references public.product_units (id) on delete set null,
  warehouse_id uuid references public.warehouses (id) on delete set null,
  quantity numeric(16, 4) not null check (quantity > 0),
  unit_name text not null,
  conversion_factor numeric(16, 4) not null default 1 check (conversion_factor > 0),
  unit_price numeric(16, 4) not null check (unit_price > 0),
  price_type text,
  discount_amount numeric(16, 2) not null default 0 check (discount_amount >= 0),
  subtotal numeric(16, 2) not null default 0 check (subtotal >= 0),
  source_lot_id uuid references public.stock_entry_items (id) on delete set null,
  tier_label text,
  tier_min_quantity numeric(16, 4),
  created_at timestamptz not null default now()
);

comment on table public.quotation_items is 'Quote line items; copied into sale_items on conversion. No stock is held by a quote.';

-- ---------------------------------------------------------------------------
-- returns
-- ---------------------------------------------------------------------------
create table public.returns (
  id uuid primary key default gen_random_uuid(),
  return_number text not null unique,
  sale_id uuid not null references public.sales (id) on delete restrict,
  client_id uuid references public.clients (id) on delete set null,
  warehouse_id uuid not null references public.warehouses (id) on delete restrict,
  total_amount numeric(16, 2) not null default 0 check (total_amount >= 0),
  resolution_type text not null check (resolution_type in ('refund_cash', 'refund_qr', 'exchange')),
  reason text not null,
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'completed')
  ),
  processed_by uuid references public.staff (id) on delete set null,
  approved_by uuid references public.staff (id) on delete set null,
  cash_session_id uuid references public.cash_sessions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.returns is 'Customer returns against a completed sale. Full cap/validation of returned quantities lands in 0008 (#33).';

-- ---------------------------------------------------------------------------
-- return_items
-- ---------------------------------------------------------------------------
create table public.return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.returns (id) on delete cascade,
  sale_item_id uuid references public.sale_items (id) on delete set null,
  product_id uuid not null references public.products (id) on delete restrict,
  product_unit_id uuid references public.product_units (id) on delete set null,
  quantity numeric(16, 4) not null check (quantity > 0),
  unit_name text not null,
  unit_price numeric(16, 4) not null check (unit_price > 0),
  subtotal numeric(16, 2) not null default 0 check (subtotal >= 0),
  restock boolean not null default true,
  condition text not null default 'good' check (condition in ('good', 'damaged', 'defective')),
  source_lot_item_id uuid references public.stock_entry_items (id) on delete set null,
  location_id uuid references public.warehouse_locations (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.return_items is 'Returned lines. restock=true + condition=good re-enters stock at location_id; damaged/defective are written off.';

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger clients_set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
create trigger cash_registers_set_updated_at before update on public.cash_registers
  for each row execute function public.set_updated_at();
create trigger cash_sessions_set_updated_at before update on public.cash_sessions
  for each row execute function public.set_updated_at();
create trigger quotations_set_updated_at before update on public.quotations
  for each row execute function public.set_updated_at();
create trigger sales_set_updated_at before update on public.sales
  for each row execute function public.set_updated_at();
create trigger returns_set_updated_at before update on public.returns
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Indexes for the common access paths
-- ---------------------------------------------------------------------------
create index clients_client_type_idx on public.clients (client_type) where is_active;
create index cash_sessions_register_open_idx on public.cash_sessions (register_id) where status = 'open';
create index sales_client_idx on public.sales (client_id);
create index sales_cash_session_idx on public.sales (cash_session_id);
create index sales_status_idx on public.sales (status);
create index sales_created_at_idx on public.sales (created_at);
create index sale_items_sale_idx on public.sale_items (sale_id);
create index sale_items_product_idx on public.sale_items (product_id);
create index sale_payments_sale_idx on public.sale_payments (sale_id);
create index credit_payments_sale_idx on public.credit_payments (sale_id);
create index cash_movements_session_idx on public.cash_movements (session_id);
create index quotations_client_idx on public.quotations (client_id);
create index quotation_items_quotation_idx on public.quotation_items (quotation_id);
create index returns_sale_idx on public.returns (sale_id);
create index return_items_return_idx on public.return_items (return_id);

-- ---------------------------------------------------------------------------
-- Row level security: deny by default, staff-only. Ledger tables
-- (sale_payments, credit_payments, cash_movements) are insert+select only.
-- ---------------------------------------------------------------------------
alter table public.clients enable row level security;
alter table public.cash_registers enable row level security;
alter table public.cash_sessions enable row level security;
alter table public.quotations enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_payments enable row level security;
alter table public.credit_payments enable row level security;
alter table public.cash_movements enable row level security;
alter table public.quotation_items enable row level security;
alter table public.returns enable row level security;
alter table public.return_items enable row level security;

create policy clients_select on public.clients for select to authenticated using (public.is_active_staff());
create policy clients_write on public.clients for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());

create policy cash_registers_select on public.cash_registers for select to authenticated using (public.is_active_staff());
create policy cash_registers_write on public.cash_registers for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());

create policy cash_sessions_select on public.cash_sessions for select to authenticated using (public.is_active_staff());
create policy cash_sessions_write on public.cash_sessions for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());

create policy quotations_select on public.quotations for select to authenticated using (public.is_active_staff());
create policy quotations_write on public.quotations for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());

create policy sales_select on public.sales for select to authenticated using (public.is_active_staff());
create policy sales_write on public.sales for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());

create policy sale_items_select on public.sale_items for select to authenticated using (public.is_active_staff());
create policy sale_items_write on public.sale_items for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());

create policy sale_payments_select on public.sale_payments for select to authenticated using (public.is_active_staff());
create policy sale_payments_insert on public.sale_payments for insert to authenticated with check (public.is_active_staff());

create policy credit_payments_select on public.credit_payments for select to authenticated using (public.is_active_staff());
create policy credit_payments_insert on public.credit_payments for insert to authenticated with check (public.is_active_staff());

create policy cash_movements_select on public.cash_movements for select to authenticated using (public.is_active_staff());
create policy cash_movements_insert on public.cash_movements for insert to authenticated with check (public.is_active_staff());

create policy quotation_items_select on public.quotation_items for select to authenticated using (public.is_active_staff());
create policy quotation_items_write on public.quotation_items for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());

create policy returns_select on public.returns for select to authenticated using (public.is_active_staff());
create policy returns_write on public.returns for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());

create policy return_items_select on public.return_items for select to authenticated using (public.is_active_staff());
create policy return_items_write on public.return_items for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());

-- ---------------------------------------------------------------------------
-- Grants (RLS still gates every row). anon gets nothing.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.cash_registers to authenticated;
grant select, insert, update, delete on public.cash_sessions to authenticated;
grant select, insert, update, delete on public.quotations to authenticated;
grant select, insert, update, delete on public.sales to authenticated;
grant select, insert, update, delete on public.sale_items to authenticated;
grant select, insert on public.sale_payments to authenticated;
grant select, insert on public.credit_payments to authenticated;
grant select, insert on public.cash_movements to authenticated;
grant select, insert, update, delete on public.quotation_items to authenticated;
grant select, insert, update, delete on public.returns to authenticated;
grant select, insert, update, delete on public.return_items to authenticated;
grant usage on sequence public.seq_sale to authenticated;
grant usage on sequence public.seq_return to authenticated;
grant usage on sequence public.seq_quotation to authenticated;
grant usage on sequence public.seq_cash_register to authenticated;

revoke all on public.clients from anon;
revoke all on public.cash_registers from anon;
revoke all on public.cash_sessions from anon;
revoke all on public.quotations from anon;
revoke all on public.sales from anon;
revoke all on public.sale_items from anon;
revoke all on public.sale_payments from anon;
revoke all on public.credit_payments from anon;
revoke all on public.cash_movements from anon;
revoke all on public.quotation_items from anon;
revoke all on public.returns from anon;
revoke all on public.return_items from anon;

-- ===========================================================================
-- RPCs. All are SECURITY DEFINER, assert staff, and pin search_path. They own
-- every mutation to the tables above so the app never writes them directly.
-- ===========================================================================

-- Format a zero-padded document number, e.g. _doc_number('VTA', 42) -> 'VTA-00000042'.
create function public._doc_number(p_prefix text, p_value bigint)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select p_prefix || '-' || lpad(p_value::text, 8, '0');
$$;

comment on function public._doc_number is 'Internal: zero-pad a sequence value into a human-readable document code.';

-- Single FIFO stock-exit path shared by every sale mode (D2). Consumes
-- warehouse_stock oldest-first WITH `for update` so concurrent sales cannot
-- oversell, stamps each line''s first source lot, and posts kardex exits.
create function public._emit_sale_exit(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item record;
  v_lot record;
  v_remaining numeric(16, 4);
  v_take numeric(16, 4);
  v_first_lot uuid;
  v_actor uuid := auth.uid();
begin
  for v_item in
    select id, product_id, warehouse_id, quantity, conversion_factor
    from public.sale_items
    where sale_id = p_sale_id
  loop
    v_remaining := v_item.quantity * v_item.conversion_factor;
    v_first_lot := null;

    for v_lot in
      select id, quantity, stock_entry_item_id
      from public.warehouse_stock
      where warehouse_id = v_item.warehouse_id
        and product_id = v_item.product_id
        and quantity > 0
      order by created_at asc, id asc
      for update
    loop
      exit when v_remaining <= 0;
      v_take := least(v_lot.quantity, v_remaining);
      update public.warehouse_stock
        set quantity = quantity - v_take
      where id = v_lot.id;
      if v_first_lot is null then
        v_first_lot := v_lot.stock_entry_item_id;
      end if;
      v_remaining := v_remaining - v_take;
    end loop;

    if v_remaining > 0 then
      raise exception 'Stock insuficiente para el producto % en el almacen %',
        v_item.product_id, v_item.warehouse_id
        using errcode = 'check_violation';
    end if;

    update public.sale_items set source_lot_id = v_first_lot where id = v_item.id;

    insert into public.inventory_movements (
      product_id, warehouse_id, movement_type, quantity,
      reference_type, reference_id, created_by
    )
    values (
      v_item.product_id, v_item.warehouse_id, 'exit',
      v_item.quantity * v_item.conversion_factor,
      'sale', p_sale_id, v_actor
    );
  end loop;
end;
$$;

comment on function public._emit_sale_exit is 'Internal: FIFO stock exit with row locks (for update) so no sale path can oversell; raises when a line cannot be fully served.';

-- -------------------- cash lifecycle --------------------

create function public.create_cash_register(p_name text, p_warehouse_id uuid)
returns public.cash_registers
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.cash_registers;
begin
  perform public.assert_staff();
  insert into public.cash_registers (register_number, name, warehouse_id)
  values (public._doc_number('CAJA', nextval('public.seq_cash_register')), p_name, p_warehouse_id)
  returning * into v_row;
  return v_row;
end;
$$;

comment on function public.create_cash_register is 'Create a POS register bound to a warehouse, numbered from seq_cash_register.';

create function public.open_cash_session(p_register_id uuid, p_opening_amount numeric)
returns public.cash_sessions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.cash_sessions;
begin
  perform public.assert_staff();
  if exists (
    select 1 from public.cash_sessions
    where register_id = p_register_id and status = 'open'
  ) then
    raise exception 'La caja ya tiene una sesion abierta' using errcode = 'check_violation';
  end if;
  insert into public.cash_sessions (register_id, opened_by, opening_amount, expected_amount)
  values (p_register_id, auth.uid(), coalesce(p_opening_amount, 0), coalesce(p_opening_amount, 0))
  returning * into v_row;
  return v_row;
end;
$$;

comment on function public.open_cash_session is 'Open a drawer session for a register; rejects a second open session on the same register.';

-- Post a drawer movement and keep the session running totals in sync.
create function public.add_cash_movement(
  p_session_id uuid,
  p_movement_type text,
  p_amount numeric,
  p_description text default null,
  p_expense_category text default null,
  p_reference_type text default null,
  p_reference_id uuid default null
)
returns public.cash_movements
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.cash_movements;
  v_cash_delta numeric(16, 2) := 0;
begin
  perform public.assert_staff();
  insert into public.cash_movements (
    session_id, movement_type, amount, description,
    expense_category, reference_type, reference_id, created_by
  )
  values (
    p_session_id, p_movement_type, p_amount, p_description,
    p_expense_category, p_reference_type, p_reference_id, auth.uid()
  )
  returning * into v_row;

  -- Cash-affecting movements adjust the expected drawer amount.
  v_cash_delta := case p_movement_type
    when 'sale_cash' then p_amount
    when 'credit_payment' then p_amount
    when 'deposit' then p_amount
    when 'expense' then -p_amount
    when 'withdrawal' then -p_amount
    when 'refund_cash' then -p_amount
    else 0
  end;

  update public.cash_sessions
    set expected_amount = expected_amount + v_cash_delta,
        total_cash_sales = total_cash_sales + case when p_movement_type = 'sale_cash' then p_amount else 0 end,
        total_qr_sales = total_qr_sales + case when p_movement_type = 'sale_qr' then p_amount else 0 end,
        total_sales = total_sales + case when p_movement_type in ('sale_cash', 'sale_qr') then p_amount else 0 end,
        total_expenses = total_expenses + case when p_movement_type = 'expense' then p_amount else 0 end
  where id = p_session_id;

  return v_row;
end;
$$;

comment on function public.add_cash_movement is 'Append a drawer movement and roll the session running totals (expected_amount, totals).';

create function public.close_cash_session(
  p_session_id uuid,
  p_actual_amount numeric,
  p_notes text default null
)
returns public.cash_sessions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.cash_sessions;
begin
  perform public.assert_staff();
  update public.cash_sessions
    set status = 'closed',
        closed_by = auth.uid(),
        actual_amount = p_actual_amount,
        difference = p_actual_amount - expected_amount,
        closing_notes = p_notes,
        closed_at = now()
  where id = p_session_id and status = 'open'
  returning * into v_row;
  if v_row.id is null then
    raise exception 'Sesion de caja inexistente o ya cerrada' using errcode = 'check_violation';
  end if;
  return v_row;
end;
$$;

comment on function public.close_cash_session is 'Close a drawer session, recording actual_amount and the reconciliation difference.';

-- -------------------- sales --------------------

-- Internal: insert line items from a jsonb array and return their money subtotal.
-- Each element: {product_id, product_unit_id, warehouse_id, quantity, unit_name,
-- conversion_factor, unit_price, discount_amount, price_type, price_source,
-- tier_label, tier_min_quantity}.
create function public._insert_sale_items(p_sale_id uuid, p_warehouse_id uuid, p_items jsonb)
returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_el jsonb;
  v_line numeric(16, 2);
  v_subtotal numeric(16, 2) := 0;
begin
  for v_el in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_line := (v_el->>'quantity')::numeric * (v_el->>'unit_price')::numeric
      - coalesce((v_el->>'discount_amount')::numeric, 0);
    v_subtotal := v_subtotal + v_line;

    insert into public.sale_items (
      sale_id, product_id, product_unit_id, warehouse_id, quantity, unit_name,
      conversion_factor, unit_price, price_type, price_source, discount_amount,
      subtotal, tier_label, tier_min_quantity
    )
    values (
      p_sale_id,
      (v_el->>'product_id')::uuid,
      nullif(v_el->>'product_unit_id', '')::uuid,
      coalesce(nullif(v_el->>'warehouse_id', '')::uuid, p_warehouse_id),
      (v_el->>'quantity')::numeric,
      v_el->>'unit_name',
      coalesce((v_el->>'conversion_factor')::numeric, 1),
      (v_el->>'unit_price')::numeric,
      v_el->>'price_type',
      v_el->>'price_source',
      coalesce((v_el->>'discount_amount')::numeric, 0),
      v_line,
      v_el->>'tier_label',
      nullif(v_el->>'tier_min_quantity', '')::numeric
    );
  end loop;
  return v_subtotal;
end;
$$;

comment on function public._insert_sale_items is 'Internal: expand a jsonb line array into sale_items and return the summed subtotal.';

-- Register a sale in any mode. direct/credit release stock immediately (FIFO,
-- locked); order defers the stock exit to deliver_order. Cash/qr tender posts a
-- drawer movement when a cash_session is supplied.
create function public.register_sale(
  p_warehouse_id uuid,
  p_items jsonb,
  p_sale_mode text default 'direct',
  p_sale_type text default 'retail',
  p_payment_method text default 'cash',
  p_client_id uuid default null,
  p_cash_session_id uuid default null,
  p_discount_amount numeric default 0,
  p_tax_rate numeric default 0,
  p_amount_paid numeric default 0,
  p_advance_amount numeric default 0,
  p_credit_due_date date default null,
  p_shipping_date date default null,
  p_notes text default null
)
returns public.sales
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sale public.sales;
  v_sale_id uuid := gen_random_uuid();
  v_subtotal numeric(16, 2);
  v_tax numeric(16, 2);
  v_total numeric(16, 2);
  v_status text;
  v_pending numeric(16, 2) := 0;
  v_change numeric(16, 2) := 0;
  v_balance numeric(16, 2) := 0;
begin
  perform public.assert_staff();

  insert into public.sales (id, sale_number, warehouse_id, sold_by)
  values (v_sale_id, public._doc_number('VTA', nextval('public.seq_sale')), p_warehouse_id, auth.uid());

  v_subtotal := public._insert_sale_items(v_sale_id, p_warehouse_id, p_items);
  v_tax := round(greatest(v_subtotal - coalesce(p_discount_amount, 0), 0) * coalesce(p_tax_rate, 0), 2);
  v_total := greatest(v_subtotal - coalesce(p_discount_amount, 0), 0) + v_tax;

  if p_sale_mode = 'direct' then
    v_status := 'completed';
    v_change := greatest(coalesce(p_amount_paid, 0) - v_total, 0);
  elsif p_sale_mode = 'credit' then
    v_status := 'completed';
    v_pending := greatest(v_total - coalesce(p_advance_amount, 0), 0);
  elsif p_sale_mode = 'order' then
    v_status := 'pending_payment';
    v_balance := greatest(v_total - coalesce(p_advance_amount, 0), 0);
  else
    raise exception 'Modo de venta invalido: %', p_sale_mode using errcode = 'check_violation';
  end if;

  update public.sales set
    client_id = p_client_id,
    cash_session_id = p_cash_session_id,
    sale_mode = p_sale_mode,
    sale_type = p_sale_type,
    subtotal = v_subtotal,
    discount_amount = coalesce(p_discount_amount, 0),
    tax_rate = coalesce(p_tax_rate, 0),
    tax_amount = v_tax,
    total = v_total,
    payment_method = p_payment_method,
    amount_paid = case when p_sale_mode = 'direct' then least(coalesce(p_amount_paid, 0), v_total) else coalesce(p_advance_amount, 0) end,
    amount_pending = v_pending,
    change_amount = v_change,
    status = v_status,
    advance_amount = coalesce(p_advance_amount, 0),
    balance_due = v_balance,
    credit_due_date = p_credit_due_date,
    credit_status = case when p_sale_mode = 'credit' then (case when v_pending > 0 then 'pending' else 'paid' end) else null end,
    shipping_date = p_shipping_date,
    notes = p_notes
  where id = v_sale_id
  returning * into v_sale;

  -- Stock leaves now for direct and credit; orders wait for delivery.
  if p_sale_mode in ('direct', 'credit') then
    perform public._emit_sale_exit(v_sale_id);
  end if;

  -- Record immediate tender in the drawer.
  if p_cash_session_id is not null and p_payment_method in ('cash', 'qr') and v_sale.amount_paid > 0 then
    perform public.add_cash_movement(
      p_cash_session_id,
      case when p_payment_method = 'cash' then 'sale_cash' else 'sale_qr' end,
      v_sale.amount_paid, 'Venta ' || v_sale.sale_number, null, 'sale', v_sale_id
    );
    insert into public.sale_payments (sale_id, payment_method, amount)
    values (v_sale_id, p_payment_method, v_sale.amount_paid);
  end if;

  return v_sale;
end;
$$;

comment on function public.register_sale is 'Register a sale (direct/order/credit). Releases FIFO stock for direct/credit, defers it for orders, and posts drawer tender when a session is given.';

-- Deliver a pending order: release its stock (FIFO, locked) and complete it.
create function public.deliver_order(p_sale_id uuid)
returns public.sales
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sale public.sales;
begin
  perform public.assert_staff();
  select * into v_sale from public.sales where id = p_sale_id;
  if v_sale.id is null then
    raise exception 'Venta inexistente' using errcode = 'check_violation';
  end if;
  if v_sale.sale_mode <> 'order' or v_sale.status <> 'pending_payment' then
    raise exception 'Solo se entregan ordenes pendientes' using errcode = 'check_violation';
  end if;
  perform public._emit_sale_exit(p_sale_id);
  update public.sales
    set status = 'completed', shipping_date = coalesce(shipping_date, current_date)
  where id = p_sale_id
  returning * into v_sale;
  return v_sale;
end;
$$;

comment on function public.deliver_order is 'Release stock for a pending order and mark it completed.';

-- Record an installment against a credit sale; reduces the pending balance.
create function public.register_credit_payment(
  p_sale_id uuid,
  p_amount numeric,
  p_payment_method text default 'cash',
  p_cash_session_id uuid default null
)
returns public.sales
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sale public.sales;
begin
  perform public.assert_staff();
  select * into v_sale from public.sales where id = p_sale_id for update;
  if v_sale.id is null or v_sale.sale_mode <> 'credit' then
    raise exception 'Venta a credito inexistente' using errcode = 'check_violation';
  end if;
  if p_amount <= 0 or p_amount > v_sale.amount_pending then
    raise exception 'Monto de pago invalido' using errcode = 'check_violation';
  end if;

  insert into public.credit_payments (sale_id, client_id, amount, payment_method, received_by, cash_session_id)
  values (p_sale_id, v_sale.client_id, p_amount, p_payment_method, auth.uid(), p_cash_session_id);

  update public.sales set
    amount_paid = amount_paid + p_amount,
    amount_pending = amount_pending - p_amount,
    credit_status = case when amount_pending - p_amount <= 0 then 'paid' else 'partial' end
  where id = p_sale_id
  returning * into v_sale;

  if p_cash_session_id is not null then
    perform public.add_cash_movement(
      p_cash_session_id, 'credit_payment', p_amount,
      'Pago credito ' || v_sale.sale_number, null, 'sale', p_sale_id
    );
  end if;

  return v_sale;
end;
$$;

comment on function public.register_credit_payment is 'Apply an installment to a credit sale, updating the pending balance and posting a drawer movement.';

-- Reverse a completed sale: return its FIFO-exited stock and mark it cancelled.
create function public.void_sale(p_sale_id uuid, p_reason text)
returns public.sales
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sale public.sales;
  v_item record;
begin
  perform public.assert_staff();
  select * into v_sale from public.sales where id = p_sale_id for update;
  if v_sale.id is null then
    raise exception 'Venta inexistente' using errcode = 'check_violation';
  end if;
  if v_sale.status in ('cancelled', 'refunded') then
    raise exception 'La venta ya fue anulada' using errcode = 'check_violation';
  end if;

  -- Put stock back only if it had actually left (direct/credit, or a delivered order).
  if v_sale.sale_mode in ('direct', 'credit')
     or (v_sale.sale_mode = 'order' and v_sale.status = 'completed') then
    for v_item in
      select product_id, warehouse_id, quantity, conversion_factor, source_lot_id
      from public.sale_items where sale_id = p_sale_id
    loop
      update public.warehouse_stock
        set quantity = quantity + (v_item.quantity * v_item.conversion_factor)
      where id = (
        select ws.id from public.warehouse_stock ws
        where ws.warehouse_id = v_item.warehouse_id
          and ws.product_id = v_item.product_id
          and (v_item.source_lot_id is null or ws.stock_entry_item_id = v_item.source_lot_id)
        order by ws.created_at asc, ws.id asc
        limit 1
      );
      insert into public.inventory_movements (
        product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, created_by
      )
      values (
        v_item.product_id, v_item.warehouse_id, 'return',
        v_item.quantity * v_item.conversion_factor, 'sale_void', p_sale_id, auth.uid()
      );
    end loop;
  end if;

  update public.sales set
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_at = now(),
    cancelled_by = auth.uid()
  where id = p_sale_id
  returning * into v_sale;

  return v_sale;
end;
$$;

comment on function public.void_sale is 'Cancel a sale and return any stock that had left to its originating lot; posts compensating kardex entries.';

-- -------------------- quotations --------------------

create function public.create_quotation(
  p_items jsonb,
  p_client_id uuid default null,
  p_client_name text default null,
  p_client_phone text default null,
  p_discount_amount numeric default 0,
  p_tax_rate numeric default 0,
  p_valid_until date default null,
  p_terms_conditions text default null
)
returns public.quotations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_q public.quotations;
  v_q_id uuid := gen_random_uuid();
  v_el jsonb;
  v_line numeric(16, 2);
  v_subtotal numeric(16, 2) := 0;
begin
  perform public.assert_staff();
  insert into public.quotations (id, quotation_number, created_by)
  values (v_q_id, public._doc_number('COT', nextval('public.seq_quotation')), auth.uid());

  for v_el in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_line := (v_el->>'quantity')::numeric * (v_el->>'unit_price')::numeric
      - coalesce((v_el->>'discount_amount')::numeric, 0);
    v_subtotal := v_subtotal + v_line;
    insert into public.quotation_items (
      quotation_id, product_id, product_unit_id, warehouse_id, quantity, unit_name,
      conversion_factor, unit_price, price_type, discount_amount, subtotal,
      tier_label, tier_min_quantity
    )
    values (
      v_q_id,
      (v_el->>'product_id')::uuid,
      nullif(v_el->>'product_unit_id', '')::uuid,
      nullif(v_el->>'warehouse_id', '')::uuid,
      (v_el->>'quantity')::numeric,
      v_el->>'unit_name',
      coalesce((v_el->>'conversion_factor')::numeric, 1),
      (v_el->>'unit_price')::numeric,
      v_el->>'price_type',
      coalesce((v_el->>'discount_amount')::numeric, 0),
      v_line,
      v_el->>'tier_label',
      nullif(v_el->>'tier_min_quantity', '')::numeric
    );
  end loop;

  update public.quotations set
    client_id = p_client_id,
    client_name = p_client_name,
    client_phone = p_client_phone,
    subtotal = v_subtotal,
    discount_amount = coalesce(p_discount_amount, 0),
    tax_rate = coalesce(p_tax_rate, 0),
    total = greatest(v_subtotal - coalesce(p_discount_amount, 0), 0)
      + round(greatest(v_subtotal - coalesce(p_discount_amount, 0), 0) * coalesce(p_tax_rate, 0), 2),
    valid_until = p_valid_until,
    terms_conditions = p_terms_conditions
  where id = v_q_id
  returning * into v_q;

  return v_q;
end;
$$;

comment on function public.create_quotation is 'Create a quotation with line items; no stock is held. Converts later via convert_quotation_to_sale.';

-- Turn an open quotation into a direct sale, copying its lines verbatim.
create function public.convert_quotation_to_sale(
  p_quotation_id uuid,
  p_warehouse_id uuid,
  p_payment_method text default 'cash',
  p_cash_session_id uuid default null,
  p_amount_paid numeric default 0
)
returns public.sales
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_q public.quotations;
  v_items jsonb;
  v_sale public.sales;
begin
  perform public.assert_staff();
  select * into v_q from public.quotations where id = p_quotation_id for update;
  if v_q.id is null then
    raise exception 'Cotizacion inexistente' using errcode = 'check_violation';
  end if;
  if v_q.status = 'converted' then
    raise exception 'La cotizacion ya fue convertida' using errcode = 'check_violation';
  end if;

  select jsonb_agg(jsonb_build_object(
    'product_id', qi.product_id,
    'product_unit_id', qi.product_unit_id,
    'warehouse_id', p_warehouse_id,
    'quantity', qi.quantity,
    'unit_name', qi.unit_name,
    'conversion_factor', qi.conversion_factor,
    'unit_price', qi.unit_price,
    'discount_amount', qi.discount_amount,
    'price_type', qi.price_type,
    'tier_label', qi.tier_label,
    'tier_min_quantity', qi.tier_min_quantity
  ))
  into v_items
  from public.quotation_items qi
  where qi.quotation_id = p_quotation_id;

  v_sale := public.register_sale(
    p_warehouse_id := p_warehouse_id,
    p_items := coalesce(v_items, '[]'::jsonb),
    p_sale_mode := 'direct',
    p_payment_method := p_payment_method,
    p_client_id := v_q.client_id,
    p_cash_session_id := p_cash_session_id,
    p_discount_amount := v_q.discount_amount,
    p_tax_rate := v_q.tax_rate,
    p_amount_paid := p_amount_paid
  );

  update public.sales set quotation_id = p_quotation_id where id = v_sale.id;
  update public.quotations set status = 'converted', converted_sale_id = v_sale.id where id = p_quotation_id;

  return v_sale;
end;
$$;

comment on function public.convert_quotation_to_sale is 'Convert an open quotation into a direct sale (copying lines), link both, and mark the quote converted.';

-- -------------------- returns --------------------

-- Register a return against a completed sale. Good restockable items re-enter
-- stock; cash/qr refunds post a drawer movement. Full partial/full cap
-- validation against already-returned quantities lands in 0008 (#33).
create function public.register_return(
  p_sale_id uuid,
  p_warehouse_id uuid,
  p_resolution_type text,
  p_reason text,
  p_items jsonb,
  p_cash_session_id uuid default null
)
returns public.returns
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sale public.sales;
  v_ret public.returns;
  v_ret_id uuid := gen_random_uuid();
  v_el jsonb;
  v_line numeric(16, 2);
  v_total numeric(16, 2) := 0;
begin
  perform public.assert_staff();
  select * into v_sale from public.sales where id = p_sale_id;
  if v_sale.id is null or v_sale.status <> 'completed' then
    raise exception 'Solo se devuelven ventas completadas' using errcode = 'check_violation';
  end if;

  insert into public.returns (
    id, return_number, sale_id, client_id, warehouse_id, resolution_type, reason,
    status, processed_by, cash_session_id
  )
  values (
    v_ret_id, public._doc_number('DEV', nextval('public.seq_return')), p_sale_id,
    v_sale.client_id, p_warehouse_id, p_resolution_type, p_reason,
    'completed', auth.uid(), p_cash_session_id
  );

  for v_el in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_line := (v_el->>'quantity')::numeric * (v_el->>'unit_price')::numeric;
    v_total := v_total + v_line;

    insert into public.return_items (
      return_id, sale_item_id, product_id, product_unit_id, quantity, unit_name,
      unit_price, subtotal, restock, condition, source_lot_item_id, location_id, notes
    )
    values (
      v_ret_id,
      nullif(v_el->>'sale_item_id', '')::uuid,
      (v_el->>'product_id')::uuid,
      nullif(v_el->>'product_unit_id', '')::uuid,
      (v_el->>'quantity')::numeric,
      v_el->>'unit_name',
      (v_el->>'unit_price')::numeric,
      v_line,
      coalesce((v_el->>'restock')::boolean, true),
      coalesce(v_el->>'condition', 'good'),
      nullif(v_el->>'source_lot_item_id', '')::uuid,
      nullif(v_el->>'location_id', '')::uuid,
      v_el->>'notes'
    );

    -- Good restockable items go back into stock at the returning warehouse.
    if coalesce((v_el->>'restock')::boolean, true) and coalesce(v_el->>'condition', 'good') = 'good' then
      update public.warehouse_stock
        set quantity = quantity + (v_el->>'quantity')::numeric
      where id = (
        select ws.id from public.warehouse_stock ws
        where ws.warehouse_id = p_warehouse_id
          and ws.product_id = (v_el->>'product_id')::uuid
          and (nullif(v_el->>'source_lot_item_id', '')::uuid is null
               or ws.stock_entry_item_id = nullif(v_el->>'source_lot_item_id', '')::uuid)
        order by ws.created_at asc, ws.id asc
        limit 1
      );
      insert into public.inventory_movements (
        product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, created_by
      )
      values (
        (v_el->>'product_id')::uuid, p_warehouse_id, 'return',
        (v_el->>'quantity')::numeric, 'return', v_ret_id, auth.uid()
      );
    end if;
  end loop;

  update public.returns set total_amount = v_total where id = v_ret_id returning * into v_ret;

  -- Refund tender leaves the drawer.
  if p_cash_session_id is not null and p_resolution_type in ('refund_cash', 'refund_qr') then
    perform public.add_cash_movement(
      p_cash_session_id, 'refund_cash', v_total,
      'Devolucion ' || v_ret.return_number, null, 'return', v_ret_id
    );
  end if;

  update public.sales set status = 'refunded' where id = p_sale_id;

  return v_ret;
end;
$$;

comment on function public.register_return is 'Register a return against a completed sale: restock good items, refund via drawer, mark the sale refunded. Quantity-cap validation deferred to 0008 (#33).';

-- RPC grants: callable by authenticated staff (each asserts staff internally).
grant execute on function public.create_cash_register(text, uuid) to authenticated;
grant execute on function public.open_cash_session(uuid, numeric) to authenticated;
grant execute on function public.add_cash_movement(uuid, text, numeric, text, text, text, uuid) to authenticated;
grant execute on function public.close_cash_session(uuid, numeric, text) to authenticated;
grant execute on function public.register_sale(uuid, jsonb, text, text, text, uuid, uuid, numeric, numeric, numeric, numeric, date, date, text) to authenticated;
grant execute on function public.deliver_order(uuid) to authenticated;
grant execute on function public.register_credit_payment(uuid, numeric, text, uuid) to authenticated;
grant execute on function public.void_sale(uuid, text) to authenticated;
grant execute on function public.create_quotation(jsonb, uuid, text, text, numeric, numeric, date, text) to authenticated;
grant execute on function public.convert_quotation_to_sale(uuid, uuid, text, uuid, numeric) to authenticated;
grant execute on function public.register_return(uuid, uuid, text, text, jsonb, uuid) to authenticated;

-- Internal SECURITY DEFINER helpers mutate as owner without their own staff
-- guard (they only run inside the RPCs above). Postgres grants EXECUTE to
-- PUBLIC by default, so revoke it: nobody may call them directly.
revoke all on function public._insert_sale_items(uuid, uuid, jsonb) from public;
revoke all on function public._insert_sale_items(uuid, uuid, jsonb) from anon;
revoke all on function public._emit_sale_exit(uuid) from public;
revoke all on function public._emit_sale_exit(uuid) from anon;
