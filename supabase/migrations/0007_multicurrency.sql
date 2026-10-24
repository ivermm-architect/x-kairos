-- 0007_multicurrency.sql
-- Multicurrency: freeze the exchange rate and store base-currency amounts on
-- every channel so cash reconciliation is always done in one currency (D4/D6).
--
-- Consolidates the old scattered currency migrations (legacy 0035 + 0037 + 0043 + 0050).
-- Design decision: one base currency (BOB) drives all reconciliation. Documents
-- may be denominated in a foreign currency; each row freezes the rate used and
-- stores its base-currency equivalent (`*_base`). The drawer runs in base only.
--
-- Mechanism:
--   * currencies + exchange_rates hold the catalog and the dated rates.
--   * fn_rate(currency) returns base-per-unit (1 for the base), reading the most
--     recent effective rate; fn_to_base(amount, currency) = round(amount*rate, 2).
--   * BEFORE INSERT OR UPDATE triggers on sales / returns / cash_movements fill
--     exchange_rate and the *_base columns from the row's currency + total, so
--     the invariant holds no matter which RPC (or manual insert) writes the row.
--   * The sale/return/cash RPCs are updated to set the document currency and to
--     reconcile the drawer in base; void_sale now reverses in base (D6).

-- ---------------------------------------------------------------------------
-- currencies: catalog + base flag
-- ---------------------------------------------------------------------------
create table public.currencies (
  code text primary key check (char_length(code) = 3),
  name text not null,
  symbol text not null,
  is_base boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.currencies is 'Currency catalog. Exactly one row is the base (is_base) that all reconciliation resolves to.';
comment on column public.currencies.is_base is 'The single base currency; fn_rate returns 1 for it. Enforced unique by currencies_one_base_idx.';

create unique index currencies_one_base_idx on public.currencies (is_base) where is_base;

insert into public.currencies (code, name, symbol, is_base, sort_order) values
  ('BOB', 'Boliviano', 'Bs', true, 1),
  ('USD', 'Dolar Americano', 'US$', false, 2),
  ('ARS', 'Peso Argentino', '$', false, 3)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- exchange_rates: dated foreign -> base rates
-- ---------------------------------------------------------------------------
create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  from_currency text not null references public.currencies (code),
  to_currency text not null references public.currencies (code),
  rate numeric(18, 6) not null check (rate > 0),
  effective_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (from_currency, to_currency, effective_date)
);

comment on table public.exchange_rates is 'Dated conversion rates: `rate` base units per 1 unit of from_currency. fn_rate picks the latest effective_date <= the document date.';

-- Seed indicative rates to base (BOB). Maintainer updates these as needed.
insert into public.exchange_rates (from_currency, to_currency, rate) values
  ('USD', 'BOB', 6.960000),
  ('ARS', 'BOB', 0.007000)
on conflict (from_currency, to_currency, effective_date) do nothing;

alter table public.currencies enable row level security;
alter table public.exchange_rates enable row level security;

-- Currencies/rates are reference data: readable by any authenticated user and by
-- the public storefront; only admins write them.
create policy currencies_read on public.currencies for select to authenticated using (true);
create policy currencies_admin on public.currencies for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));
create policy exchange_rates_read on public.exchange_rates for select to authenticated using (true);
create policy exchange_rates_admin on public.exchange_rates for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

grant select on public.currencies to anon, authenticated;
grant insert, update, delete on public.currencies to authenticated;
grant select on public.exchange_rates to anon, authenticated;
grant insert, update, delete on public.exchange_rates to authenticated;

-- ---------------------------------------------------------------------------
-- Conversion helpers
-- ---------------------------------------------------------------------------
create function public.fn_rate(p_currency text, p_date date default current_date)
returns numeric
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_base text;
  v_rate numeric;
begin
  select code into v_base from public.currencies where is_base limit 1;
  v_base := coalesce(v_base, 'BOB');
  if p_currency is null or p_currency = v_base then
    return 1;
  end if;
  select rate into v_rate
  from public.exchange_rates
  where from_currency = p_currency and to_currency = v_base and effective_date <= p_date
  order by effective_date desc
  limit 1;
  if v_rate is null or v_rate <= 0 then
    raise exception 'No hay tipo de cambio vigente para % -> % al %', p_currency, v_base, p_date
      using errcode = 'P0001';
  end if;
  return v_rate;
end;
$$;

comment on function public.fn_rate is 'Base-currency units per 1 unit of p_currency at p_date (1 for the base). Raises if no dated rate exists.';

create function public.fn_to_base(p_amount numeric, p_currency text, p_date date default current_date)
returns numeric
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select round(coalesce(p_amount, 0) * public.fn_rate(p_currency, p_date), 2);
$$;

comment on function public.fn_to_base is 'Convert p_amount in p_currency to the base currency, rounded to 2 decimals.';

grant execute on function public.fn_rate(text, date) to anon, authenticated;
grant execute on function public.fn_to_base(numeric, text, date) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Currency columns. Documents carry their denomination currency + frozen rate;
-- *_base columns hold the base-currency equivalent for reconciliation.
-- ---------------------------------------------------------------------------
alter table public.sales
  add column currency text not null default 'BOB' references public.currencies (code),
  add column exchange_rate numeric(18, 6),
  add column subtotal_base numeric(16, 2),
  add column total_base numeric(16, 2);

alter table public.sale_payments
  add column currency text not null default 'BOB' references public.currencies (code);

alter table public.cash_movements
  add column currency text not null default 'BOB' references public.currencies (code),
  add column exchange_rate numeric(18, 6),
  add column amount_base numeric(16, 2);

alter table public.quotations
  add column currency text not null default 'BOB' references public.currencies (code),
  add column exchange_rate numeric(18, 6);

alter table public.quotation_items
  add column source_currency text references public.currencies (code),
  add column source_rate numeric(18, 6);

alter table public.returns
  add column currency text not null default 'BOB' references public.currencies (code),
  add column exchange_rate numeric(18, 6),
  add column total_base numeric(16, 2);

alter table public.web_orders
  add column currency text not null default 'BOB' references public.currencies (code),
  add column exchange_rate numeric(18, 6),
  add column total_base numeric(16, 2);

alter table public.web_order_items
  add column unit_price_base numeric(16, 2);

comment on column public.sales.exchange_rate is 'Rate frozen at sale time; base = nominal * exchange_rate.';
comment on column public.sales.total_base is 'sales.total expressed in the base currency; drives cash reconciliation.';
comment on column public.cash_movements.amount_base is 'Movement amount in the base currency; the drawer reconciles on this column only.';
comment on column public.web_order_items.unit_price_base is 'Catalog (base-currency) unit price; unit_price is the order-currency figure shown to the customer.';

-- ---------------------------------------------------------------------------
-- Base-fill triggers. BEFORE INSERT OR UPDATE so the invariant survives the
-- RPCs that insert a header row first and populate totals in a later UPDATE.
-- Rate is (re)resolved whenever the currency changes, otherwise reused.
-- ---------------------------------------------------------------------------
create function public.trg_sales_set_base()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.currency := coalesce(new.currency, 'BOB');
  if tg_op = 'UPDATE' and new.currency is distinct from old.currency then
    new.exchange_rate := public.fn_rate(new.currency);
  end if;
  new.exchange_rate := coalesce(new.exchange_rate, public.fn_rate(new.currency));
  new.subtotal_base := round(coalesce(new.subtotal, 0) * new.exchange_rate, 2);
  new.total_base := round(coalesce(new.total, 0) * new.exchange_rate, 2);
  return new;
end;
$$;

comment on function public.trg_sales_set_base is 'Internal: freeze sales.exchange_rate and recompute subtotal_base/total_base on every write.';

create trigger sales_set_base before insert or update on public.sales
  for each row execute function public.trg_sales_set_base();

create function public.trg_returns_set_base()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.currency := coalesce(new.currency, 'BOB');
  new.exchange_rate := coalesce(
    new.exchange_rate,
    (select exchange_rate from public.sales where id = new.sale_id),
    public.fn_rate(new.currency)
  );
  new.total_base := round(coalesce(new.total_amount, 0) * new.exchange_rate, 2);
  return new;
end;
$$;

comment on function public.trg_returns_set_base is 'Internal: inherit the original sale rate (or resolve it) and recompute returns.total_base on every write.';

create trigger returns_set_base before insert or update on public.returns
  for each row execute function public.trg_returns_set_base();

create function public.trg_cashmov_set_base()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.currency := coalesce(new.currency, 'BOB');
  new.exchange_rate := coalesce(new.exchange_rate, public.fn_rate(new.currency));
  new.amount_base := round(coalesce(new.amount, 0) * new.exchange_rate, 2);
  return new;
end;
$$;

comment on function public.trg_cashmov_set_base is 'Internal: freeze cash_movements.exchange_rate and recompute amount_base (the only column the drawer reconciles on).';

create trigger cashmov_set_base before insert on public.cash_movements
  for each row execute function public.trg_cashmov_set_base();

-- ===========================================================================
-- RPC updates. The drawer now reconciles strictly on amount_base, sales freeze
-- their currency, and void_sale reverses in base (D6).
-- ===========================================================================

-- add_cash_movement gains a currency and reconciles the session on amount_base
-- (filled by cashmov_set_base), so foreign-currency tender aggregates correctly.
drop function if exists public.add_cash_movement(uuid, text, numeric, text, text, text, uuid);

create function public.add_cash_movement(
  p_session_id uuid,
  p_movement_type text,
  p_amount numeric,
  p_description text default null,
  p_expense_category text default null,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_currency text default 'BOB'
)
returns public.cash_movements
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.cash_movements;
  v_base numeric(16, 2);
  v_cash_delta numeric(16, 2);
begin
  perform public.assert_staff();
  insert into public.cash_movements (
    session_id, movement_type, amount, currency, description,
    expense_category, reference_type, reference_id, created_by
  )
  values (
    p_session_id, p_movement_type, p_amount, coalesce(p_currency, 'BOB'), p_description,
    p_expense_category, p_reference_type, p_reference_id, auth.uid()
  )
  returning * into v_row;

  -- The trigger has populated amount_base; the drawer reconciles on base only.
  v_base := v_row.amount_base;
  v_cash_delta := case p_movement_type
    when 'sale_cash' then v_base
    when 'credit_payment' then v_base
    when 'deposit' then v_base
    when 'expense' then -v_base
    when 'withdrawal' then -v_base
    when 'refund_cash' then -v_base
    else 0
  end;

  update public.cash_sessions
    set expected_amount = expected_amount + v_cash_delta,
        total_cash_sales = total_cash_sales + case when p_movement_type = 'sale_cash' then v_base else 0 end,
        total_qr_sales = total_qr_sales + case when p_movement_type = 'sale_qr' then v_base else 0 end,
        total_sales = total_sales + case when p_movement_type in ('sale_cash', 'sale_qr') then v_base else 0 end,
        total_expenses = total_expenses + case when p_movement_type = 'expense' then v_base else 0 end
  where id = p_session_id;

  return v_row;
end;
$$;

comment on function public.add_cash_movement is 'Append a drawer movement (in any currency) and roll the session totals on the base-currency amount.';

grant execute on function public.add_cash_movement(uuid, text, numeric, text, text, text, uuid, text) to authenticated;

-- register_sale gains a document currency. The sales_set_base trigger freezes
-- the rate and base totals; tender is posted in that currency (reconciled in base).
drop function if exists public.register_sale(uuid, jsonb, text, text, text, uuid, uuid, numeric, numeric, numeric, numeric, date, date, text);

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
  p_notes text default null,
  p_currency text default 'BOB'
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

  insert into public.sales (id, sale_number, warehouse_id, sold_by, currency)
  values (v_sale_id, public._doc_number('VTA', nextval('public.seq_sale')), p_warehouse_id, auth.uid(), coalesce(p_currency, 'BOB'));

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

  if p_sale_mode in ('direct', 'credit') then
    perform public._emit_sale_exit(v_sale_id);
  end if;

  if p_cash_session_id is not null and p_payment_method in ('cash', 'qr') and v_sale.amount_paid > 0 then
    perform public.add_cash_movement(
      p_cash_session_id,
      case when p_payment_method = 'cash' then 'sale_cash' else 'sale_qr' end,
      v_sale.amount_paid, 'Venta ' || v_sale.sale_number, null, 'sale', v_sale_id, v_sale.currency
    );
    insert into public.sale_payments (sale_id, payment_method, amount, currency)
    values (v_sale_id, p_payment_method, v_sale.amount_paid, v_sale.currency);
  end if;

  return v_sale;
end;
$$;

comment on function public.register_sale is 'Register a sale in any mode and currency; the rate/base totals are frozen by trigger and tender reconciles in base.';

grant execute on function public.register_sale(uuid, jsonb, text, text, text, uuid, uuid, numeric, numeric, numeric, numeric, date, date, text, text) to authenticated;

-- register_credit_payment: installment posts to the drawer in the sale currency,
-- where add_cash_movement reconciles it to base.
create or replace function public.register_credit_payment(
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
      'Pago credito ' || v_sale.sale_number, null, 'sale', p_sale_id, v_sale.currency
    );
  end if;

  return v_sale;
end;
$$;

comment on function public.register_credit_payment is 'Apply an installment to a credit sale (sale currency) and post a drawer movement reconciled in base.';

-- void_sale (D6): besides returning FIFO stock, reverse the cash that actually
-- entered the drawer -- in base currency -- via a refund_cash movement.
create or replace function public.void_sale(p_sale_id uuid, p_reason text)
returns public.sales
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sale public.sales;
  v_item record;
  v_refund_base numeric(16, 2);
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

  -- Reverse the cash that entered the drawer, expressed in base currency so the
  -- session's expected_amount unwinds by the same base figure it was rolled by.
  if v_sale.cash_session_id is not null
     and v_sale.payment_method in ('cash', 'qr')
     and coalesce(v_sale.amount_paid, 0) > 0 then
    v_refund_base := round(v_sale.amount_paid * coalesce(v_sale.exchange_rate, 1), 2);
    perform public.add_cash_movement(
      v_sale.cash_session_id, 'refund_cash', v_refund_base,
      'Anulacion ' || v_sale.sale_number, null, 'sale', p_sale_id, 'BOB'
    );
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

comment on function public.void_sale is 'Cancel a sale, return FIFO stock to its lot, and reverse the drawer cash in base currency (D6).';

-- convert_quotation_to_sale: carry the quotation currency into the sale so the
-- invoice is denominated identically.
create or replace function public.convert_quotation_to_sale(
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
    p_amount_paid := p_amount_paid,
    p_currency := v_q.currency
  );

  update public.sales set quotation_id = p_quotation_id where id = v_sale.id;
  update public.quotations set status = 'converted', converted_sale_id = v_sale.id where id = p_quotation_id;

  return v_sale;
end;
$$;

comment on function public.convert_quotation_to_sale is 'Convert an open quotation into a direct sale in the quotation currency, link both, and mark the quote converted.';

-- register_return: stamp the return with the sale currency (the trigger inherits
-- the frozen rate and fills total_base); the refund leaves the drawer in that
-- currency, reconciled to base by add_cash_movement.
create or replace function public.register_return(
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
    status, processed_by, cash_session_id, currency
  )
  values (
    v_ret_id, public._doc_number('DEV', nextval('public.seq_return')), p_sale_id,
    v_sale.client_id, p_warehouse_id, p_resolution_type, p_reason,
    'completed', auth.uid(), p_cash_session_id, v_sale.currency
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

  -- Refund tender leaves the drawer in the return currency (reconciled to base).
  if p_cash_session_id is not null and p_resolution_type in ('refund_cash', 'refund_qr') then
    perform public.add_cash_movement(
      p_cash_session_id, 'refund_cash', v_total,
      'Devolucion ' || v_ret.return_number, null, 'return', v_ret_id, v_ret.currency
    );
  end if;

  update public.sales set status = 'refunded' where id = p_sale_id;

  return v_ret;
end;
$$;

comment on function public.register_return is 'Register a return in the sale currency: restock good items, refund via drawer (reconciled in base), mark the sale refunded. Quantity-cap validation deferred to 0008 (#33).';

grant execute on function public.register_credit_payment(uuid, numeric, text, uuid) to authenticated;
grant execute on function public.void_sale(uuid, text) to authenticated;
grant execute on function public.convert_quotation_to_sale(uuid, uuid, text, uuid, numeric) to authenticated;
grant execute on function public.register_return(uuid, uuid, text, text, jsonb, uuid) to authenticated;

-- ===========================================================================
-- Web channel. The storefront prices in a chosen currency: catalog prices are
-- base (BOB), so each line's base price is retail_price and the shown price is
-- retail_price / rate. The order freezes its rate + base totals (D4).
-- ===========================================================================
drop function if exists public.create_web_order(text, text, text, jsonb, uuid, uuid);

create function public.create_web_order(
  p_contact_name text,
  p_contact_phone text,
  p_delivery_notes text,
  p_lines jsonb,
  p_web_customer_id uuid default null,
  p_idempotency_key uuid default null,
  p_currency text default 'BOB'
)
returns public.web_orders
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.web_orders;
  v_order_id uuid := gen_random_uuid();
  v_currency text := coalesce(p_currency, 'BOB');
  v_rate numeric(18, 6);
  v_el jsonb;
  v_pu record;
  v_qty numeric(16, 2);
  v_unit numeric(16, 2);
  v_line numeric(16, 2);
  v_subtotal numeric(16, 2) := 0;
  v_subtotal_base numeric(16, 2) := 0;
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

  v_rate := public.fn_rate(v_currency);

  insert into public.web_orders (
    id, order_number, web_customer_id, contact_name, contact_phone,
    delivery_notes, idempotency_key, currency, exchange_rate
  )
  values (
    v_order_id,
    'WEB-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.seq_web_order')::text, 5, '0'),
    p_web_customer_id, p_contact_name, p_contact_phone, p_delivery_notes, p_idempotency_key,
    v_currency, v_rate
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

    -- retail_price is base (BOB); the customer-facing price is base / rate.
    v_unit := round(v_pu.retail_price / v_rate, 2);
    v_line := round(v_unit * v_qty, 2);
    v_subtotal := v_subtotal + v_line;
    v_subtotal_base := v_subtotal_base + round(v_pu.retail_price * v_qty, 2);

    insert into public.web_order_items (
      order_id, product_id, product_unit_id, quantity, unit_name, unit_price, subtotal, unit_price_base
    )
    values (
      v_order_id, v_pu.product_id, (v_el->>'product_unit_id')::uuid, v_qty,
      v_pu.unit_name, v_unit, v_line, v_pu.retail_price
    );
  end loop;

  update public.web_orders set
    subtotal = v_subtotal,
    total = v_subtotal,
    total_base = v_subtotal_base
  where id = v_order_id
  returning * into v_order;

  return v_order;
end;
$$;

comment on function public.create_web_order is 'Public: create a storefront order priced in p_currency (catalog base prices converted at the frozen rate); base totals kept for reconciliation (D4). No staff check.';

-- convert_web_order_to_sale: carry the order currency into the invoice so the
-- sale is denominated like the storefront order.
create or replace function public.convert_web_order_to_sale(
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
    p_amount_paid := v_order.total,
    p_currency := v_order.currency
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

comment on function public.convert_web_order_to_sale is 'Staff-only (D1): invoice a web order via register_sale in the order currency, resolve/create the client, and link order to sale. Granted to authenticated only.';

grant execute on function public.create_web_order(text, text, text, jsonb, uuid, uuid, text) to anon, authenticated;
grant execute on function public.convert_web_order_to_sale(uuid, uuid, text, uuid) to authenticated;

revoke all on function public.convert_web_order_to_sale(uuid, uuid, text, uuid) from anon, public;
