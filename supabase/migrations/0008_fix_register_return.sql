-- 0008_fix_register_return.sql
-- Fix register_return (D5). The rebuilt 0005 version trusted the payload price,
-- never capped against prior returns, and always flipped the sale to 'refunded'
-- even for a partial return. This migration closes those gaps:
--   * Reject sales that are not 'completed' (or already 'partially_refunded').
--   * Require sale_item_id and price each line from the REAL sale_items.unit_price,
--     prorated by the sale's header discount/tax (total / subtotal).
--   * Cap: quantity already returned for a line + the new quantity may not exceed
--     the quantity sold on that line.
--   * Full return -> 'refunded'; partial -> 'partially_refunded'.
--
-- Consolidates the old scattered return fixes (legacy 0015 + 0034 prorate + 0038 cap).

-- A sale may now sit in a partial-refund state between returns.
alter table public.sales drop constraint if exists sales_status_check;
alter table public.sales add constraint sales_status_check
  check (status in ('draft', 'pending_payment', 'completed', 'cancelled', 'refunded', 'partially_refunded'));

comment on column public.sales.status is 'draft | pending_payment | completed | cancelled | refunded | partially_refunded.';

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
  v_si record;
  v_si_id uuid;
  v_lot uuid;
  v_qty numeric(16, 2);
  v_prev numeric(16, 2);
  v_ratio numeric(18, 6) := 1;
  v_line numeric(16, 2);
  v_total numeric(16, 2) := 0;
  v_sold_total numeric(16, 4);
  v_returned_total numeric(16, 4);
begin
  perform public.assert_staff();

  if p_resolution_type not in ('refund_cash', 'refund_qr', 'exchange') then
    raise exception 'Resolucion invalida: %', p_resolution_type using errcode = 'check_violation';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'La devolucion requiere un motivo' using errcode = 'check_violation';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La devolucion no tiene productos' using errcode = 'check_violation';
  end if;

  select * into v_sale from public.sales where id = p_sale_id for update;
  if v_sale.id is null or v_sale.status not in ('completed', 'partially_refunded') then
    raise exception 'Solo se devuelven ventas completadas' using errcode = 'check_violation';
  end if;

  -- Prorate the refund by the sale's header discount/tax (total vs subtotal).
  if coalesce(v_sale.subtotal, 0) > 0 then
    v_ratio := v_sale.total / v_sale.subtotal;
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

  for v_el in select * from jsonb_array_elements(p_items)
  loop
    v_si_id := nullif(v_el->>'sale_item_id', '')::uuid;
    v_qty := (v_el->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Cantidad invalida en la devolucion' using errcode = 'check_violation';
    end if;
    if v_si_id is null then
      raise exception 'Falta el item de venta (sale_item_id) para devolver' using errcode = 'check_violation';
    end if;

    -- The actually-sold line (real price + sold quantity), locked.
    select id, quantity, unit_price, product_id, product_unit_id, unit_name,
           conversion_factor, source_lot_id
      into v_si
    from public.sale_items where id = v_si_id and sale_id = p_sale_id for update;
    if v_si.id is null then
      raise exception 'El item no pertenece a esta venta' using errcode = 'check_violation';
    end if;

    -- Cap: already-returned for this line (across other returns) + new <= sold.
    select coalesce(sum(ri.quantity), 0) into v_prev
    from public.return_items ri
    join public.returns r on r.id = ri.return_id
    where ri.sale_item_id = v_si_id and r.id <> v_ret_id;
    if v_prev + v_qty > v_si.quantity then
      raise exception 'No se puede devolver % de "%": vendido %, ya devuelto %',
        v_qty, coalesce(v_si.unit_name, 'item'), v_si.quantity, v_prev
        using errcode = 'check_violation';
    end if;

    -- Amount from the REAL sale price, prorated by the sale discount/tax ratio.
    v_line := round(v_si.unit_price * v_qty * v_ratio, 2);
    v_total := v_total + v_line;

    -- Restock into the lot the line was sold from unless the payload overrides it.
    v_lot := coalesce(nullif(v_el->>'source_lot_item_id', '')::uuid, v_si.source_lot_id);

    insert into public.return_items (
      return_id, sale_item_id, product_id, product_unit_id, quantity, unit_name,
      unit_price, subtotal, restock, condition, source_lot_item_id, location_id, notes
    )
    values (
      v_ret_id, v_si_id, v_si.product_id, v_si.product_unit_id, v_qty,
      coalesce(v_si.unit_name, 'unidad'),
      v_si.unit_price, v_line,
      coalesce((v_el->>'restock')::boolean, true),
      coalesce(v_el->>'condition', 'good'),
      v_lot,
      nullif(v_el->>'location_id', '')::uuid,
      v_el->>'notes'
    );

    -- Good restockable items re-enter stock at the returning warehouse.
    if coalesce((v_el->>'restock')::boolean, true) and coalesce(v_el->>'condition', 'good') = 'good' then
      update public.warehouse_stock
        set quantity = quantity + (v_qty * coalesce(v_si.conversion_factor, 1))
      where id = (
        select ws.id from public.warehouse_stock ws
        where ws.warehouse_id = p_warehouse_id
          and ws.product_id = v_si.product_id
          and (v_lot is null or ws.stock_entry_item_id = v_lot)
        order by ws.created_at asc, ws.id asc
        limit 1
      );
      insert into public.inventory_movements (
        product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, created_by
      )
      values (
        v_si.product_id, p_warehouse_id, 'return',
        v_qty * coalesce(v_si.conversion_factor, 1), 'return', v_ret_id, auth.uid()
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

  -- D5: compare total returned units against total sold units for the sale.
  select coalesce(sum(quantity), 0) into v_sold_total
    from public.sale_items where sale_id = p_sale_id;
  select coalesce(sum(ri.quantity), 0) into v_returned_total
    from public.return_items ri
    join public.returns r on r.id = ri.return_id
    where r.sale_id = p_sale_id;

  update public.sales set
    status = case when v_returned_total >= v_sold_total then 'refunded' else 'partially_refunded' end
  where id = p_sale_id;

  return v_ret;
end;
$$;

comment on function public.register_return is 'Register a return against a completed (or partially refunded) sale: cap each line against prior returns, price from the real sale line prorated by the sale discount/tax, restock good items, refund via drawer (reconciled in base), and set the sale to refunded (full) or partially_refunded (D5).';

grant execute on function public.register_return(uuid, uuid, text, text, jsonb, uuid) to authenticated;
