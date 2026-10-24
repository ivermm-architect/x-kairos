-- 0011_transfers_lifecycle.sql
-- Inter-warehouse transfer lifecycle with in-transit stock (#53). The 0004
-- schema shipped the transfers / transfer_items / transfer_lots TABLES (incl.
-- the 4-state status and the D9 RLS on transfer_lots) and deferred the RPCs to
-- this feature issue. This migration adds the operable state machine.
--
-- Consolidates the legacy transfer flow (legacy 0008 execute_transfer + 0011
-- transfer_lifecycle + 0012 transfer_cancel_sent), adapted to the rebuild:
--   * assert_staff() guards every write (D7); no anon grant (the legacy RPCs
--     were granted to anon — an anon-reachable hole).
--   * document numbers use public._doc_number('TRA', nextval(seq)) (0005).
--   * the FIFO dispatch locks source lots WITH `for update` (D2) so concurrent
--     dispatches/sales cannot oversell the origin.
--
-- State machine (transfers.status):
--   draft     -> editable; no stock moved.
--   sent      -> dispatched: FIFO-consumed from the origin into transfer_lots
--                (stock "in transit": left the source, not yet at the destination).
--   closed    -> received: transfer_lots applied to the destination.
--   cancelled -> a discarded draft, or a sent transfer aborted back to origin.
--
-- Line payload (p_lines jsonb array), one object per product to move:
--   { product_id, unit_name, quantity, to_location_id, notes }

-- Transfer document counter (TRA-00000001).
create sequence if not exists public.seq_transfer;

-- ---------------------------------------------------------------------------
-- _transfer_send — internal: FIFO-consume the origin into transfer_lots and
-- write transfer_out movements; flip the transfer to 'sent'. Source lots are
-- locked (for update) so a concurrent dispatch/sale cannot oversell (D2).
-- ---------------------------------------------------------------------------
create function public._transfer_send(p_transfer_id uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_from      uuid;
  v_item      record;
  v_remaining numeric(16, 2);
  v_take      numeric(16, 2);
  v_lot       record;
begin
  select from_warehouse_id into v_from from public.transfers where id = p_transfer_id;

  for v_item in
    select product_id, quantity, unit_name
    from public.transfer_items where transfer_id = p_transfer_id
  loop
    v_remaining := v_item.quantity;

    for v_lot in
      select id, quantity, stock_entry_item_id, stock_type
      from public.warehouse_stock
      where warehouse_id = v_from and product_id = v_item.product_id and quantity > 0
      order by created_at asc, id asc
      for update
    loop
      exit when v_remaining <= 0;
      v_take := least(v_lot.quantity, v_remaining);

      update public.warehouse_stock set quantity = quantity - v_take where id = v_lot.id;

      insert into public.transfer_lots (
        transfer_id, product_id, stock_entry_item_id, stock_type, quantity
      )
      values (p_transfer_id, v_item.product_id, v_lot.stock_entry_item_id, v_lot.stock_type, v_take);

      v_remaining := v_remaining - v_take;
    end loop;

    if v_remaining > 0 then
      raise exception 'Stock insuficiente en el origen para un producto (faltan % unidades)', v_remaining
        using errcode = 'check_violation';
    end if;

    insert into public.inventory_movements (
      product_id, warehouse_id, movement_type, quantity, unit_name,
      reference_type, reference_id, created_by
    )
    values (
      v_item.product_id, v_from, 'transfer_out', v_item.quantity,
      coalesce(v_item.unit_name, 'unidad'), 'transfer', p_transfer_id, p_user
    );
  end loop;

  update public.transfers set status = 'sent', sent_at = now(), updated_at = now()
  where id = p_transfer_id;
end;
$$;

comment on function public._transfer_send is
  'Internal: FIFO-consume the origin (locked) into transfer_lots + transfer_out movements and flip the transfer to sent (#53).';

-- ---------------------------------------------------------------------------
-- _transfer_receive — internal: apply transfer_lots to the destination,
-- preserving each lot origin, and write transfer_in movements; flip to 'closed'.
-- ---------------------------------------------------------------------------
create function public._transfer_receive(p_transfer_id uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_to  uuid;
  v_lot record;
begin
  select to_warehouse_id into v_to from public.transfers where id = p_transfer_id;

  for v_lot in
    select product_id, stock_entry_item_id, stock_type, quantity
    from public.transfer_lots where transfer_id = p_transfer_id
  loop
    insert into public.warehouse_stock (
      warehouse_id, product_id, stock_entry_item_id, quantity, stock_type
    )
    values (
      v_to, v_lot.product_id, v_lot.stock_entry_item_id, v_lot.quantity,
      coalesce(v_lot.stock_type, 'retail')
    );

    insert into public.inventory_movements (
      product_id, warehouse_id, movement_type, quantity, unit_name,
      reference_type, reference_id, created_by
    )
    values (
      v_lot.product_id, v_to, 'transfer_in', v_lot.quantity, 'unidad',
      'transfer', p_transfer_id, p_user
    );
  end loop;

  update public.transfers set status = 'closed', received_at = now(), updated_at = now()
  where id = p_transfer_id;
end;
$$;

comment on function public._transfer_receive is
  'Internal: apply transfer_lots to the destination (preserving lot origin) + transfer_in movements and flip the transfer to closed (#53).';

-- ---------------------------------------------------------------------------
-- save_transfer — create or edit a draft and, per p_action, dispatch it or run
-- the full direct transfer. Only drafts may be edited. Returns transfer_number.
--   p_action: 'draft' (store only) | 'send' (draft -> sent) | 'direct' (send + receive)
-- ---------------------------------------------------------------------------
create function public.save_transfer(
  p_transfer_id uuid,
  p_from        uuid,
  p_to          uuid,
  p_reason      text,
  p_notes       text,
  p_user        uuid,
  p_lines       jsonb,
  p_action      text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id     uuid := p_transfer_id;
  v_number text;
  v_status text;
  v_line   jsonb;
begin
  perform public.assert_staff();

  if p_action not in ('draft', 'send', 'direct') then
    raise exception 'Accion invalida: %', p_action using errcode = 'check_violation';
  end if;
  if p_from = p_to then
    raise exception 'Origen y destino deben ser distintos' using errcode = 'check_violation';
  end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'El traslado no tiene lineas' using errcode = 'check_violation';
  end if;

  if v_id is null then
    v_number := public._doc_number('TRA', nextval('public.seq_transfer'));
    insert into public.transfers (
      transfer_number, from_warehouse_id, to_warehouse_id, status, reason,
      requested_by, notes, created_by
    )
    values (
      v_number, p_from, p_to, 'draft', nullif(p_reason, ''), p_user, p_notes, p_user
    )
    returning id into v_id;
  else
    select status, transfer_number into v_status, v_number
    from public.transfers where id = v_id for update;
    if v_status is null then
      raise exception 'El traslado no existe' using errcode = 'no_data_found';
    end if;
    if v_status <> 'draft' then
      raise exception 'Solo se puede editar un borrador (estado actual: %)', v_status
        using errcode = 'check_violation';
    end if;
    update public.transfers set
      from_warehouse_id = p_from,
      to_warehouse_id   = p_to,
      reason            = nullif(p_reason, ''),
      notes             = p_notes,
      updated_at        = now()
    where id = v_id;
    delete from public.transfer_items where transfer_id = v_id;
  end if;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    insert into public.transfer_items (
      transfer_id, product_id, quantity, unit_name, to_location_id, notes
    )
    values (
      v_id,
      (v_line->>'product_id')::uuid,
      (v_line->>'quantity')::numeric,
      coalesce(v_line->>'unit_name', 'unidad'),
      nullif(v_line->>'to_location_id', '')::uuid,
      v_line->>'notes'
    );
  end loop;

  if p_action = 'send' then
    perform public._transfer_send(v_id, p_user);
  elsif p_action = 'direct' then
    perform public._transfer_send(v_id, p_user);
    perform public._transfer_receive(v_id, p_user);
  end if;

  return v_number;
end;
$$;

comment on function public.save_transfer is
  'Create or edit a draft transfer and optionally dispatch (send) or run it end-to-end (direct). Rejects editing a non-draft (#53).';

-- ---------------------------------------------------------------------------
-- execute_transfer — one-shot direct transfer (create + send + receive) in one
-- transaction. Thin wrapper over save_transfer('direct'). Returns the number.
-- ---------------------------------------------------------------------------
create function public.execute_transfer(
  p_from   uuid,
  p_to     uuid,
  p_reason text,
  p_notes  text,
  p_user   uuid,
  p_lines  jsonb
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_staff();
  return public.save_transfer(null, p_from, p_to, p_reason, p_notes, p_user, p_lines, 'direct');
end;
$$;

comment on function public.execute_transfer is
  'One-shot direct inter-warehouse transfer (create + send + receive) in one transaction (#53).';

-- ---------------------------------------------------------------------------
-- send_transfer — dispatch a saved draft (draft -> sent).
-- ---------------------------------------------------------------------------
create function public.send_transfer(p_transfer_id uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  perform public.assert_staff();
  select status into v_status from public.transfers where id = p_transfer_id for update;
  if v_status is null then
    raise exception 'El traslado no existe' using errcode = 'no_data_found';
  end if;
  if v_status <> 'draft' then
    raise exception 'Solo se envia un borrador (estado actual: %)', v_status
      using errcode = 'check_violation';
  end if;
  perform public._transfer_send(p_transfer_id, p_user);
end;
$$;

comment on function public.send_transfer is
  'Dispatch a saved draft transfer (draft -> sent), moving stock into transit (#53).';

-- ---------------------------------------------------------------------------
-- receive_transfer — receive a sent transfer at the destination (sent -> closed).
-- ---------------------------------------------------------------------------
create function public.receive_transfer(p_transfer_id uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  perform public.assert_staff();
  select status into v_status from public.transfers where id = p_transfer_id for update;
  if v_status is null then
    raise exception 'El traslado no existe' using errcode = 'no_data_found';
  end if;
  if v_status <> 'sent' then
    raise exception 'Solo se recibe un traslado enviado (estado actual: %)', v_status
      using errcode = 'check_violation';
  end if;
  perform public._transfer_receive(p_transfer_id, p_user);
end;
$$;

comment on function public.receive_transfer is
  'Receive a sent transfer at the destination (sent -> closed), applying in-transit lots (#53).';

-- ---------------------------------------------------------------------------
-- cancel_transfer — discard a draft (draft -> cancelled). A sent transfer must
-- be received or aborted with cancel_sent_transfer instead.
-- ---------------------------------------------------------------------------
create function public.cancel_transfer(p_transfer_id uuid, p_user uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  perform public.assert_staff();
  select status into v_status from public.transfers where id = p_transfer_id for update;
  if v_status is null then
    raise exception 'El traslado no existe' using errcode = 'no_data_found';
  end if;
  if v_status <> 'draft' then
    raise exception 'Solo se descarta un borrador (estado actual: %). Un traslado enviado debe recibirse o cancelarse en transito.', v_status
      using errcode = 'check_violation';
  end if;
  update public.transfers set
    status           = 'cancelled',
    cancelled_at     = now(),
    cancelled_by     = p_user,
    cancelled_reason = nullif(p_reason, ''),
    updated_at       = now()
  where id = p_transfer_id;
end;
$$;

comment on function public.cancel_transfer is
  'Discard a draft transfer (draft -> cancelled); no stock is affected (#53).';

-- ---------------------------------------------------------------------------
-- cancel_sent_transfer — abort a sent transfer (sent -> cancelled): the
-- in-transit stock returns to the origin (reverse of the dispatch), a
-- transfer_in movement is logged, and transfer_lots are cleared. Stock is
-- never lost.
-- ---------------------------------------------------------------------------
create function public.cancel_sent_transfer(p_transfer_id uuid, p_user uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_from   uuid;
  v_lot    record;
begin
  perform public.assert_staff();

  select status, from_warehouse_id into v_status, v_from
  from public.transfers where id = p_transfer_id for update;
  if v_status is null then
    raise exception 'El traslado no existe' using errcode = 'no_data_found';
  end if;
  if v_status <> 'sent' then
    raise exception 'Solo se cancela en transito un traslado enviado (estado actual: %)', v_status
      using errcode = 'check_violation';
  end if;

  for v_lot in
    select product_id, stock_entry_item_id, stock_type, quantity
    from public.transfer_lots where transfer_id = p_transfer_id
  loop
    -- Return to origin: add to the matching lot or create a new row.
    update public.warehouse_stock
      set quantity = quantity + v_lot.quantity, updated_at = now()
    where warehouse_id = v_from
      and product_id = v_lot.product_id
      and stock_entry_item_id is not distinct from v_lot.stock_entry_item_id
      and stock_type is not distinct from coalesce(v_lot.stock_type, 'retail');

    if not found then
      insert into public.warehouse_stock (
        warehouse_id, product_id, stock_entry_item_id, quantity, stock_type
      )
      values (
        v_from, v_lot.product_id, v_lot.stock_entry_item_id, v_lot.quantity,
        coalesce(v_lot.stock_type, 'retail')
      );
    end if;

    insert into public.inventory_movements (
      product_id, warehouse_id, movement_type, quantity, unit_name,
      reference_type, reference_id, created_by
    )
    values (
      v_lot.product_id, v_from, 'transfer_in', v_lot.quantity, 'unidad',
      'transfer_cancel', p_transfer_id, p_user
    );
  end loop;

  -- No stock remains in transit for this transfer.
  delete from public.transfer_lots where transfer_id = p_transfer_id;

  update public.transfers set
    status           = 'cancelled',
    cancelled_at     = now(),
    cancelled_by     = p_user,
    cancelled_reason = nullif(p_reason, ''),
    updated_at       = now()
  where id = p_transfer_id;
end;
$$;

comment on function public.cancel_sent_transfer is
  'Abort a sent transfer (sent -> cancelled): returns the in-transit stock to the origin, logs it, and clears transfer_lots (#53).';

-- ---------------------------------------------------------------------------
-- Grants — staff-only (RLS on the underlying tables is the gate); never anon.
-- ---------------------------------------------------------------------------

grant execute on function public.save_transfer(uuid, uuid, uuid, text, text, uuid, jsonb, text) to authenticated;
grant execute on function public.execute_transfer(uuid, uuid, text, text, uuid, jsonb) to authenticated;
grant execute on function public.send_transfer(uuid, uuid) to authenticated;
grant execute on function public.receive_transfer(uuid, uuid) to authenticated;
grant execute on function public.cancel_transfer(uuid, uuid, text) to authenticated;
grant execute on function public.cancel_sent_transfer(uuid, uuid, text) to authenticated;

-- EXECUTE is granted to PUBLIC by default, so revoke it (not just anon): these
-- RPCs are reachable only by authenticated staff via the grants above.
revoke execute on function public.save_transfer(uuid, uuid, uuid, text, text, uuid, jsonb, text) from public, anon;
revoke execute on function public.execute_transfer(uuid, uuid, text, text, uuid, jsonb) from public, anon;
revoke execute on function public.send_transfer(uuid, uuid) from public, anon;
revoke execute on function public.receive_transfer(uuid, uuid) from public, anon;
revoke execute on function public.cancel_transfer(uuid, uuid, text) from public, anon;
revoke execute on function public.cancel_sent_transfer(uuid, uuid, text) from public, anon;

-- internal helpers: never callable directly. Supabase's default privileges grant
-- EXECUTE to authenticated on every new public function, so revoke it here too
-- (not just public, anon) — these run SECURITY DEFINER without assert_staff().
revoke execute on function public._transfer_send(uuid, uuid) from public, anon, authenticated;
revoke execute on function public._transfer_receive(uuid, uuid) from public, anon, authenticated;
