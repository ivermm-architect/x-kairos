-- 0010_stock_entries_lifecycle.sql
-- Receiving (ingresos) lifecycle + import cost (#52). The 0004 schema shipped
-- the stock_entries / stock_entry_items / warehouse_stock / inventory_movements
-- TABLES only and deferred the RPCs to this feature issue. This migration adds
-- the operable state machine and the nationalized import cost.
--
-- Consolidates the legacy receiving flow (legacy 0008 inventory_flow + 0010
-- entry_lifecycle + 0039 import_cost + 0049 set_initial_cost + 0056
-- correct_stock_entry) into one clean migration, adapted to the rebuild:
--   * actor guard is public.assert_staff() on every write (D7); no anon grant
--     (the legacy version granted these RPCs to anon — an anon-reachable hole).
--   * document numbers use public._doc_number('ING', nextval(seq)) (0005).
--   * import cost is nationalized to the store base currency with public.fn_rate
--     (0007); every lot therefore carries a base-currency cost even when the
--     purchase was invoiced in USD/ARS.
--
-- State machine (stock_entries.status):
--   draft     -> editable; can be registered (materializes stock) or discarded.
--   closed    -> read-only; stock applied; can be voided (reverses stock if the
--                lot is still intact) or corrected (atomic void + re-register).
--   cancelled -> terminal.
--
-- Line payload (p_lines jsonb array), one object per received product:
--   { product_id, unit_id, unit_name, factor, quantity, location_id, unit_cost }
--   quantity   = amount in the chosen presentation unit.
--   factor     = base units per presentation unit (units_per_box); base = quantity * factor.
--   unit_cost  = per-presentation-unit cost in p_cost_currency (optional, >= 0).

-- Receiving document counter (ING-00000001).
create sequence if not exists public.seq_stock_entry;

-- ---------------------------------------------------------------------------
-- Import-cost columns (nationalized to base). 0004 left cost in base only and
-- flagged currency freezing for a later migration; this is that migration for
-- receiving: capture the purchase currency + frozen rate on the header and the
-- base-currency unit cost per line.
-- ---------------------------------------------------------------------------

alter table public.stock_entries
  add column if not exists cost_currency      text         not null default 'BOB',
  add column if not exists cost_exchange_rate numeric(18, 6);

alter table public.stock_entry_items
  add column if not exists unit_cost_base numeric(16, 4) not null default 0 check (unit_cost_base >= 0);

comment on column public.stock_entries.cost_currency is
  'Currency the line unit_cost values were entered in; nationalized to base via cost_exchange_rate.';
comment on column public.stock_entries.cost_exchange_rate is
  'Frozen base-per-unit rate (public.fn_rate) applied to this entry''s costs at closing; null until a cost is captured.';
comment on column public.stock_entry_items.unit_cost_base is
  'Per-base-unit cost in the store base currency: round(unit_cost * cost_exchange_rate / factor, 4). Drives products.cost, margin and stock valuation.';

-- ---------------------------------------------------------------------------
-- _emit_stock_entry — internal: materialize an entry's stock.
-- One warehouse_stock lot per item (base = quantity * coalesce(units_per_box,1)),
-- one 'entry' kardex movement, and refresh products.cost with the nationalized
-- unit cost when one was captured. Called when an entry reaches 'closed'.
-- ---------------------------------------------------------------------------
create function public._emit_stock_entry(p_entry_id uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_wh   uuid;
  v_item record;
  v_base numeric(16, 2);
begin
  select warehouse_id into v_wh from public.stock_entries where id = p_entry_id;

  for v_item in
    select id, product_id, quantity, unit_name, units_per_box, location_id, unit_cost_base
    from public.stock_entry_items where stock_entry_id = p_entry_id
  loop
    v_base := v_item.quantity * coalesce(v_item.units_per_box, 1);

    insert into public.warehouse_stock (
      warehouse_id, product_id, stock_entry_item_id, quantity, location_id, stock_type
    )
    values (v_wh, v_item.product_id, v_item.id, v_base, v_item.location_id, 'retail');

    insert into public.inventory_movements (
      product_id, warehouse_id, movement_type, quantity, unit_name,
      reference_type, reference_id, created_by
    )
    values (
      v_item.product_id, v_wh, 'entry', v_base, coalesce(v_item.unit_name, 'unidad'),
      'stock_entry', p_entry_id, p_user
    );

    -- Latest nationalized cost -> product (feeds margin + stock valuation).
    if coalesce(v_item.unit_cost_base, 0) > 0 then
      update public.products set cost = v_item.unit_cost_base, updated_at = now()
      where id = v_item.product_id;
    end if;
  end loop;
end;
$$;

comment on function public._emit_stock_entry is
  'Internal: materialize a stock entry''s lots + entry kardex movements and refresh products.cost. Invoked when an entry becomes closed.';

-- ---------------------------------------------------------------------------
-- register_stock_entry — create a receiving document (header + lines). When
-- p_status is 'closed' the stock is materialized immediately; 'draft' only
-- stores the document. Returns the generated entry_number.
-- ---------------------------------------------------------------------------
create function public.register_stock_entry(
  p_warehouse_id     uuid,
  p_reference        text,
  p_dim_number       text,
  p_notes            text,
  p_status           text,
  p_created_by       uuid,
  p_lines            jsonb,
  p_entry_date       date default current_date,
  p_dim_document_url text default null,
  p_cost_currency    text default 'BOB'
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entry_id     uuid;
  v_entry_number text;
  v_line         jsonb;
  v_item_id      uuid;
  v_total_units  numeric(16, 2) := 0;
  v_base         numeric(16, 2);
  v_ccy          text;
  v_rate         numeric(18, 6);
  v_factor       numeric(14, 2);
  v_ucost        numeric(16, 4);
  v_ucost_base   numeric(16, 4);
begin
  perform public.assert_staff();

  if p_status not in ('draft', 'closed') then
    raise exception 'Estado invalido: %', p_status using errcode = 'check_violation';
  end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'El ingreso no tiene lineas' using errcode = 'check_violation';
  end if;

  v_ccy  := coalesce(p_cost_currency, 'BOB');
  v_rate := public.fn_rate(v_ccy);
  v_entry_number := public._doc_number('ING', nextval('public.seq_stock_entry'));

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_total_units := v_total_units
      + (v_line->>'quantity')::numeric * coalesce((v_line->>'factor')::numeric, 1);
  end loop;

  insert into public.stock_entries (
    entry_number, warehouse_id, reference, dim_number, dim_document_url,
    entry_date, notes, status, total_items, total_units, created_by,
    cost_currency, cost_exchange_rate
  )
  values (
    v_entry_number, p_warehouse_id, p_reference, p_dim_number, p_dim_document_url,
    coalesce(p_entry_date, current_date), p_notes, p_status,
    jsonb_array_length(p_lines), v_total_units, p_created_by, v_ccy, v_rate
  )
  returning id into v_entry_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_factor     := coalesce((v_line->>'factor')::numeric, 1);
    v_ucost      := coalesce((v_line->>'unit_cost')::numeric, 0);
    v_ucost_base := round(v_ucost * v_rate / nullif(v_factor, 0), 4);

    insert into public.stock_entry_items (
      stock_entry_id, product_id, unit_id, quantity, unit_name, units_per_box,
      location_id, unit_cost, unit_cost_base
    )
    values (
      v_entry_id,
      (v_line->>'product_id')::uuid,
      (v_line->>'unit_id')::uuid,
      (v_line->>'quantity')::numeric,
      coalesce(v_line->>'unit_name', 'unidad'),
      case when v_factor > 1 then v_factor else null end,
      nullif(v_line->>'location_id', '')::uuid,
      v_ucost, v_ucost_base
    )
    returning id into v_item_id;

    if p_status = 'closed' then
      v_base := (v_line->>'quantity')::numeric * v_factor;

      insert into public.warehouse_stock (
        warehouse_id, product_id, stock_entry_item_id, quantity, location_id, stock_type
      )
      values (
        p_warehouse_id, (v_line->>'product_id')::uuid, v_item_id, v_base,
        nullif(v_line->>'location_id', '')::uuid, 'retail'
      );

      insert into public.inventory_movements (
        product_id, warehouse_id, movement_type, quantity, unit_name,
        reference_type, reference_id, created_by
      )
      values (
        (v_line->>'product_id')::uuid, p_warehouse_id, 'entry', v_base, 'unidad',
        'stock_entry', v_entry_id, p_created_by
      );

      if v_ucost_base > 0 then
        update public.products set cost = v_ucost_base, updated_at = now()
        where id = (v_line->>'product_id')::uuid;
      end if;
    end if;
  end loop;

  return v_entry_number;
end;
$$;

comment on function public.register_stock_entry is
  'Create a receiving document (header + lines). Closed entries materialize one FIFO lot + entry movement per line and refresh products.cost with the nationalized unit cost; drafts only store the document (#52).';

-- ---------------------------------------------------------------------------
-- update_stock_entry — edit a draft (header + full line replacement). When
-- p_status is 'closed' the edited entry is materialized. Only drafts may be
-- edited. Returns the entry_number.
-- ---------------------------------------------------------------------------
create function public.update_stock_entry(
  p_entry_id         uuid,
  p_warehouse_id     uuid,
  p_reference        text,
  p_dim_number       text,
  p_notes            text,
  p_status           text,
  p_entry_date       date,
  p_dim_document_url text,
  p_lines            jsonb,
  p_cost_currency    text default 'BOB'
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status      text;
  v_number      text;
  v_creator     uuid;
  v_line        jsonb;
  v_total_units numeric(16, 2) := 0;
  v_ccy         text;
  v_rate        numeric(18, 6);
  v_factor      numeric(14, 2);
  v_ucost       numeric(16, 4);
  v_ucost_base  numeric(16, 4);
begin
  perform public.assert_staff();

  if p_status not in ('draft', 'closed') then
    raise exception 'Estado invalido: %', p_status using errcode = 'check_violation';
  end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'El ingreso no tiene lineas' using errcode = 'check_violation';
  end if;

  select status, entry_number, created_by into v_status, v_number, v_creator
  from public.stock_entries where id = p_entry_id for update;
  if v_status is null then
    raise exception 'El ingreso no existe' using errcode = 'no_data_found';
  end if;
  if v_status <> 'draft' then
    raise exception 'Solo se puede editar un borrador (estado actual: %)', v_status
      using errcode = 'check_violation';
  end if;

  v_ccy  := coalesce(p_cost_currency, 'BOB');
  v_rate := public.fn_rate(v_ccy);

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_total_units := v_total_units
      + (v_line->>'quantity')::numeric * coalesce((v_line->>'factor')::numeric, 1);
  end loop;

  update public.stock_entries set
    warehouse_id       = p_warehouse_id,
    reference          = p_reference,
    dim_number         = p_dim_number,
    dim_document_url   = coalesce(p_dim_document_url, dim_document_url),
    notes              = p_notes,
    entry_date         = coalesce(p_entry_date, entry_date),
    status             = p_status,
    total_items        = jsonb_array_length(p_lines),
    total_units        = v_total_units,
    cost_currency      = v_ccy,
    cost_exchange_rate = v_rate,
    updated_at         = now()
  where id = p_entry_id;

  -- Full line replacement (the draft is being re-stated).
  delete from public.stock_entry_items where stock_entry_id = p_entry_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_factor     := coalesce((v_line->>'factor')::numeric, 1);
    v_ucost      := coalesce((v_line->>'unit_cost')::numeric, 0);
    v_ucost_base := round(v_ucost * v_rate / nullif(v_factor, 0), 4);

    insert into public.stock_entry_items (
      stock_entry_id, product_id, unit_id, quantity, unit_name, units_per_box,
      location_id, unit_cost, unit_cost_base
    )
    values (
      p_entry_id,
      (v_line->>'product_id')::uuid,
      (v_line->>'unit_id')::uuid,
      (v_line->>'quantity')::numeric,
      coalesce(v_line->>'unit_name', 'unidad'),
      case when v_factor > 1 then v_factor else null end,
      nullif(v_line->>'location_id', '')::uuid,
      v_ucost, v_ucost_base
    );
  end loop;

  if p_status = 'closed' then
    perform public._emit_stock_entry(p_entry_id, v_creator);
  end if;

  return v_number;
end;
$$;

comment on function public.update_stock_entry is
  'Edit a draft receiving document (header + full line replacement); materializes stock when saved as closed. Rejects non-draft entries (#52).';

-- ---------------------------------------------------------------------------
-- approve_stock_entry — register an existing draft (draft -> closed),
-- materializing its stock.
-- ---------------------------------------------------------------------------
create function public.approve_stock_entry(p_entry_id uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  perform public.assert_staff();

  select status into v_status from public.stock_entries where id = p_entry_id for update;
  if v_status is null then
    raise exception 'El ingreso no existe' using errcode = 'no_data_found';
  end if;
  if v_status <> 'draft' then
    raise exception 'Solo se registra un borrador (estado actual: %)', v_status
      using errcode = 'check_violation';
  end if;

  perform public._emit_stock_entry(p_entry_id, p_user);

  update public.stock_entries set status = 'closed', updated_at = now()
  where id = p_entry_id;
end;
$$;

comment on function public.approve_stock_entry is
  'Register a draft receiving document (draft -> closed), materializing its stock (#52).';

-- ---------------------------------------------------------------------------
-- cancel_stock_entry — discard a draft (draft -> cancelled). No stock to touch.
-- ---------------------------------------------------------------------------
create function public.cancel_stock_entry(p_entry_id uuid, p_user uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  perform public.assert_staff();

  select status into v_status from public.stock_entries where id = p_entry_id for update;
  if v_status is null then
    raise exception 'El ingreso no existe' using errcode = 'no_data_found';
  end if;
  if v_status <> 'draft' then
    raise exception 'Solo se descarta un borrador (estado actual: %)', v_status
      using errcode = 'check_violation';
  end if;

  update public.stock_entries set
    status           = 'cancelled',
    cancelled_at     = now(),
    cancelled_by     = p_user,
    cancelled_reason = nullif(p_reason, ''),
    updated_at       = now()
  where id = p_entry_id;
end;
$$;

comment on function public.cancel_stock_entry is
  'Discard a draft receiving document (draft -> cancelled); no stock is affected (#52).';

-- ---------------------------------------------------------------------------
-- void_stock_entry — reverse a closed entry (closed -> cancelled). Fails if any
-- lot from the entry was already moved or sold (the lot must still hold exactly
-- the received quantity), protecting ledger integrity.
-- ---------------------------------------------------------------------------
create function public.void_stock_entry(p_entry_id uuid, p_user uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_wh     uuid;
  v_item   record;
  v_base   numeric(16, 2);
  v_have   numeric(16, 2);
begin
  perform public.assert_staff();

  select status, warehouse_id into v_status, v_wh
  from public.stock_entries where id = p_entry_id for update;
  if v_status is null then
    raise exception 'El ingreso no existe' using errcode = 'no_data_found';
  end if;
  if v_status <> 'closed' then
    raise exception 'Solo se anula un ingreso registrado (estado actual: %)', v_status
      using errcode = 'check_violation';
  end if;

  for v_item in
    select id, product_id, quantity, units_per_box
    from public.stock_entry_items where stock_entry_id = p_entry_id
  loop
    v_base := v_item.quantity * coalesce(v_item.units_per_box, 1);

    select quantity into v_have
    from public.warehouse_stock
    where warehouse_id = v_wh and stock_entry_item_id = v_item.id
    for update;

    if v_have is null or v_have <> v_base then
      raise exception 'No se puede anular: el lote de un producto ya fue movido o vendido'
        using errcode = 'check_violation';
    end if;

    delete from public.warehouse_stock
    where warehouse_id = v_wh and stock_entry_item_id = v_item.id;

    insert into public.inventory_movements (
      product_id, warehouse_id, movement_type, quantity, unit_name,
      reference_type, reference_id, created_by
    )
    values (
      v_item.product_id, v_wh, 'adjustment_minus', v_base, 'unidad',
      'stock_entry_void', p_entry_id, p_user
    );
  end loop;

  update public.stock_entries set
    status           = 'cancelled',
    cancelled_at     = now(),
    cancelled_by     = p_user,
    cancelled_reason = nullif(p_reason, ''),
    updated_at       = now()
  where id = p_entry_id;
end;
$$;

comment on function public.void_stock_entry is
  'Reverse a closed receiving document (closed -> cancelled), removing its lots and writing adjustment_minus movements. Fails if any lot was already moved or sold (#52).';

-- ---------------------------------------------------------------------------
-- correct_stock_entry — atomically void a closed entry and re-register a
-- corrected one in a single transaction. If the re-register fails, the void is
-- rolled back too (replaces the client-side void+register that could leave an
-- entry voided without a replacement). Inherits void_stock_entry's lot guard.
-- Returns the new entry_number.
-- ---------------------------------------------------------------------------
create function public.correct_stock_entry(
  p_correct_id       uuid,
  p_warehouse_id     uuid,
  p_reference        text,
  p_dim_number       text,
  p_notes            text,
  p_created_by       uuid,
  p_lines            jsonb,
  p_reason           text default 'Reemplazado por correccion',
  p_entry_date       date default current_date,
  p_dim_document_url text default null,
  p_cost_currency    text default 'BOB'
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_number text;
begin
  perform public.assert_staff();

  -- 1) Void the original (reverses its stock; aborts everything if a lot was
  --    already moved or sold — consumed stock cannot be corrected).
  perform public.void_stock_entry(p_correct_id, p_created_by, p_reason);

  -- 2) Register the corrected entry (closed, materializes stock). Same
  --    transaction: if this fails, the step-1 void is rolled back too.
  v_number := public.register_stock_entry(
    p_warehouse_id, p_reference, p_dim_number, p_notes, 'closed', p_created_by,
    p_lines, p_entry_date, p_dim_document_url, p_cost_currency
  );

  return v_number;
end;
$$;

comment on function public.correct_stock_entry is
  'Atomically void a closed receiving document and re-register a corrected one in one transaction (#52).';

-- ---------------------------------------------------------------------------
-- set_initial_cost — cost a product whose opening lots entered at 0. Costs the
-- opening lots STILL IN STOCK that are uncosted (fixes FIFO valuation without
-- rewriting the COGS of past sales) and refreshes products.cost. The cost is
-- received in its currency and nationalized to base via fn_rate.
-- ---------------------------------------------------------------------------
create function public.set_initial_cost(
  p_product_id uuid, p_cost numeric, p_user uuid, p_cost_currency text default 'BOB'
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ccy  text;
  v_rate numeric(18, 6);
  v_base numeric(16, 4);
begin
  perform public.assert_staff();

  if p_cost is null or p_cost < 0 then
    raise exception 'El costo debe ser un numero valido (>= 0)' using errcode = 'check_violation';
  end if;

  v_ccy  := coalesce(p_cost_currency, 'BOB');
  v_rate := public.fn_rate(v_ccy);       -- base units per 1 unit of the currency
  v_base := round(p_cost * v_rate, 4);   -- per-base-unit cost, nationalized

  -- (1) Opening lots still in stock and uncosted -> stamp the cost.
  update public.stock_entry_items sei
    set unit_cost = p_cost, unit_cost_base = v_base, updated_at = now()
  where sei.product_id = p_product_id
    and coalesce(sei.unit_cost_base, 0) = 0
    and exists (
      select 1 from public.warehouse_stock ws
      where ws.stock_entry_item_id = sei.id and ws.quantity > 0
    );

  -- (2) Latest product cost (base) -> margin + stock valuation.
  update public.products set cost = v_base, updated_at = now() where id = p_product_id;
end;
$$;

comment on function public.set_initial_cost is
  'Assign a base-nationalized cost to a product whose opening lots entered at 0: costs the uncosted opening lots still in stock and refreshes products.cost, without rewriting past COGS (#52).';

-- ---------------------------------------------------------------------------
-- Grants — staff-only (RLS on the underlying tables is the gate). Inventory is
-- never anon-reachable; unlike the legacy version these are NOT granted to anon.
-- ---------------------------------------------------------------------------

grant execute on function
  public.register_stock_entry(uuid, text, text, text, text, uuid, jsonb, date, text, text)
  to authenticated;
grant execute on function
  public.update_stock_entry(uuid, uuid, text, text, text, text, date, text, jsonb, text)
  to authenticated;
grant execute on function public.approve_stock_entry(uuid, uuid) to authenticated;
grant execute on function public.cancel_stock_entry(uuid, uuid, text) to authenticated;
grant execute on function public.void_stock_entry(uuid, uuid, text) to authenticated;
grant execute on function
  public.correct_stock_entry(uuid, uuid, text, text, text, uuid, jsonb, text, date, text, text)
  to authenticated;
grant execute on function public.set_initial_cost(uuid, numeric, uuid, text) to authenticated;

-- EXECUTE is granted to PUBLIC by default, so revoke it (not just anon): these
-- RPCs are reachable only by authenticated staff via the grants above.
revoke execute on function
  public.register_stock_entry(uuid, text, text, text, text, uuid, jsonb, date, text, text)
  from public, anon;
revoke execute on function
  public.update_stock_entry(uuid, uuid, text, text, text, text, date, text, jsonb, text)
  from public, anon;
revoke execute on function public.approve_stock_entry(uuid, uuid) from public, anon;
revoke execute on function public.cancel_stock_entry(uuid, uuid, text) from public, anon;
revoke execute on function public.void_stock_entry(uuid, uuid, text) from public, anon;
revoke execute on function
  public.correct_stock_entry(uuid, uuid, text, text, text, uuid, jsonb, text, date, text, text)
  from public, anon;
revoke execute on function public.set_initial_cost(uuid, numeric, uuid, text) from public, anon;

-- internal helper: never callable directly.
revoke execute on function public._emit_stock_entry(uuid, uuid) from public, anon;
