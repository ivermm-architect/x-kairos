-- Migration 0003 — Revoke default anon grants on catalog tables
-- Supabase ships default privileges on schema public that GRANT ALL to the
-- anon and authenticated roles. Migration 0002 only granted to authenticated,
-- but anon still inherited table privileges from those defaults.
--
-- Impact today is nil: RLS is enabled with no anon policy, so anon SELECT
-- returns zero rows and anon writes are rejected. This migration removes the
-- grant anyway for defense-in-depth: anon must have no standing privilege on
-- the catalog. Public read access is granted later, explicitly and scoped,
-- together with its RLS policy (see the catalog public-read issue), never via
-- inherited defaults.

revoke all on
  public.measurement_units,
  public.categories,
  public.brands,
  public.products,
  public.product_images,
  public.product_units,
  public.product_price_tiers
from anon;
