-- Migration 0001 — Foundation (phase 0)
-- Implements ADR 0001: staff / roles / staff_roles, the authorization helpers
-- (is_active_staff, assert_staff, has_role) and deny-by-default RLS.
-- Supabase Auth (auth.users) owns credentials; public only models who is staff
-- and what they can do. gen_random_uuid() is core in PostgreSQL 13+ (no pgcrypto).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.roles (
  id    uuid primary key default gen_random_uuid(),
  key   text not null unique,
  label text not null
);

comment on table public.roles is
  'Catalog of operational roles (e.g. admin, cashier). Drives authorization.';
comment on column public.roles.id is 'Primary key.';
comment on column public.roles.key is
  'Stable machine key used in code/policies, e.g. ''admin'', ''cashier''.';
comment on column public.roles.label is 'Human-readable name shown in the UI.';

create table public.staff (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.staff is
  'Back-office operator. One row per internal user; id matches the Supabase Auth user (auth.users owns the credentials).';
comment on column public.staff.id is 'Primary key; same uuid as auth.users.id.';
comment on column public.staff.full_name is 'Display name shown in the admin UI.';
comment on column public.staff.is_active is
  'If false, the account is disabled without deleting its history.';
comment on column public.staff.created_at is 'When the staff record was created.';

create table public.staff_roles (
  staff_id   uuid not null references public.staff (id) on delete cascade,
  role_id    uuid not null references public.roles (id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (staff_id, role_id)
);

comment on table public.staff_roles is
  'Bridge table: which roles each staff member holds (many-to-many).';
comment on column public.staff_roles.staff_id is
  'FK to staff.id; part of the composite primary key.';
comment on column public.staff_roles.role_id is
  'FK to roles.id; part of the composite primary key.';
comment on column public.staff_roles.granted_at is
  'When the role was granted to the staff member.';

-- ---------------------------------------------------------------------------
-- Reference data (idempotent)
-- ---------------------------------------------------------------------------

insert into public.roles (key, label) values
  ('admin',     'Administrador'),
  ('cashier',   'Cajero'),
  ('warehouse', 'Almacén')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Authorization helpers (SECURITY DEFINER, fixed search_path)
-- ---------------------------------------------------------------------------

-- Boolean gate for use inside RLS policies.
create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.staff
    where id = auth.uid() and is_active
  );
$$;

comment on function public.is_active_staff() is
  'True if the current auth user is an active staff member. Use in RLS policies.';

-- Raising guard for use inside RPC / SECURITY DEFINER functions.
create or replace function public.assert_staff()
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_active_staff() then
    raise exception 'forbidden: active staff required'
      using errcode = '42501';
  end if;
end;
$$;

comment on function public.assert_staff() is
  'Raises 42501 unless the current auth user is active staff. Use in RPCs.';

-- True if the current active staff member holds the given role.
create or replace function public.has_role(role_key text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.staff_roles sr
    join public.staff s on s.id = sr.staff_id and s.is_active
    join public.roles r on r.id = sr.role_id
    where sr.staff_id = auth.uid() and r.key = role_key
  );
$$;

comment on function public.has_role(text) is
  'True if the current active staff member holds the role identified by key.';

-- ---------------------------------------------------------------------------
-- Row Level Security — deny by default, read for staff, writes for admins
-- ---------------------------------------------------------------------------

alter table public.roles       enable row level security;
alter table public.staff       enable row level security;
alter table public.staff_roles enable row level security;

-- roles
create policy roles_select on public.roles
  for select to authenticated
  using (public.is_active_staff());
create policy roles_write on public.roles
  for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

-- staff
create policy staff_select on public.staff
  for select to authenticated
  using (public.is_active_staff());
create policy staff_write on public.staff
  for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

-- staff_roles
create policy staff_roles_select on public.staff_roles
  for select to authenticated
  using (public.is_active_staff());
create policy staff_roles_write on public.staff_roles
  for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

-- ---------------------------------------------------------------------------
-- Grants — RLS is the gate; anon has no access to foundation tables
-- ---------------------------------------------------------------------------

grant select, insert, update, delete
  on public.roles, public.staff, public.staff_roles
  to authenticated;

grant execute on function public.is_active_staff()     to authenticated;
grant execute on function public.assert_staff()        to authenticated;
grant execute on function public.has_role(text)        to authenticated;
