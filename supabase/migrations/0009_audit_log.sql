-- 0009_audit_log.sql
-- Server-side audit trail (D15). The legacy app rebuilt the "process" (who did
-- what, with the before/after diff) in the frontend; this persists it in the DB
-- via an after-DML trigger so the record is authoritative and tamper-resistant.
--
-- Consolidates the old audit migrations (legacy 0021 + 0022). Adapted to the
-- rebuild: the actor is public.staff (staff.id = auth.uid()), not legacy users.
--
-- Mechanism:
--   * audit_log holds one row per INSERT/UPDATE/DELETE on a watched table, with
--     the actor, action, entity, a human name, and the old->new changes (jsonb).
--   * audit_trigger() runs AFTER each row change. It resolves the actor from the
--     JWT, computes the diff (UPDATE only records columns that actually changed,
--     ignoring created_at/updated_at), and inserts the row. The whole body is
--     wrapped so auditing can never break the business operation.
--   * Writes come only through the SECURITY DEFINER trigger; the table grants no
--     direct INSERT/UPDATE/DELETE, so the trail is append-only from the app's side.

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.staff (id) on delete set null,
  actor_name text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  entity text not null,
  entity_id uuid,
  entity_name text,
  changes jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_log is 'Append-only audit trail: one row per watched-table DML, written server-side by audit_trigger (D15).';
comment on column public.audit_log.actor_id is 'Staff who performed the change (staff.id = auth.uid()); null for system/service-role writes.';
comment on column public.audit_log.action is 'INSERT | UPDATE | DELETE.';
comment on column public.audit_log.entity is 'Source table name (tg_table_name).';
comment on column public.audit_log.entity_name is 'Best-effort human label (name/full_name/number) of the changed row.';
comment on column public.audit_log.changes is 'Full row on INSERT/DELETE; on UPDATE only the columns that changed, each as {old, new}.';

create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_entity_idx on public.audit_log (entity);
create index audit_log_actor_idx on public.audit_log (actor_id);

alter table public.audit_log enable row level security;

-- Staff may read the trail; nobody writes it directly (the trigger is the only writer).
create policy audit_log_read on public.audit_log for select to authenticated
  using (public.is_active_staff());

grant select on public.audit_log to authenticated;
revoke all on public.audit_log from anon;

-- ---------------------------------------------------------------------------
-- Trigger function
-- ---------------------------------------------------------------------------
create function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_aname text;
  v_rec jsonb;
  v_old jsonb;
  v_new jsonb;
  v_changes jsonb;
  v_name text;
  v_id uuid;
begin
  -- Auditing must never break the business operation.
  begin
    select id, full_name into v_actor, v_aname from public.staff where id = auth.uid();

    if tg_op = 'INSERT' then
      v_new := to_jsonb(new);
      v_rec := v_new;
      v_changes := v_new;
    elsif tg_op = 'DELETE' then
      v_old := to_jsonb(old);
      v_rec := v_old;
      v_changes := v_old;
    else
      v_old := to_jsonb(old);
      v_new := to_jsonb(new);
      v_rec := v_new;
      select jsonb_object_agg(key, jsonb_build_object('old', v_old -> key, 'new', v_new -> key))
        into v_changes
      from jsonb_object_keys(v_new) as key
      where (v_new -> key) is distinct from (v_old -> key)
        and key not in ('updated_at', 'created_at');
      if v_changes is null then
        return new; -- nothing meaningful changed
      end if;
    end if;

    v_name := coalesce(
      v_rec ->> 'name', v_rec ->> 'full_name', v_rec ->> 'business_name',
      v_rec ->> 'sale_number', v_rec ->> 'transfer_number', v_rec ->> 'entry_number',
      v_rec ->> 'quotation_number', v_rec ->> 'return_number', v_rec ->> 'register_number',
      v_rec ->> 'sku'
    );

    begin
      v_id := (v_rec ->> 'id')::uuid;
    exception when others then
      v_id := null;
    end;

    insert into public.audit_log (actor_id, actor_name, action, entity, entity_id, entity_name, changes)
    values (v_actor, v_aname, tg_op, tg_table_name, v_id, v_name, v_changes);
  exception when others then
    null;
  end;

  return coalesce(new, old);
end;
$$;

comment on function public.audit_trigger is 'AFTER-DML trigger: persists the actor + old->new diff of a watched row into audit_log, swallowing any error so it never blocks the operation.';

-- ---------------------------------------------------------------------------
-- Attach to the key tables. Add table names here as new modules land.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'staff', 'products', 'product_units', 'clients', 'warehouses', 'warehouse_locations',
    'categories', 'brands', 'stock_entries', 'transfers', 'sales', 'returns',
    'quotations', 'cash_sessions', 'cash_registers'
  ]
  loop
    execute format('drop trigger if exists audit_%1$s on public.%1$s', t);
    execute format(
      'create trigger audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.audit_trigger()',
      t
    );
  end loop;
end $$;
