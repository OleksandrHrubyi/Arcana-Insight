-- RevenueCat can keep sending events (RENEWAL/EXPIRATION/…) for an app_user_id
-- whose auth.users row no longer exists — e.g. a deleted account whose sandbox or
-- store subscription keeps auto-renewing every few minutes. The blind INSERT in
-- apply_entitlement_event then violates user_entitlements_user_id_fkey (→ FK 23503),
-- the webhook returns 500, and RevenueCat retries the same event forever (a log/
-- alert storm). Premium itself is unaffected — entitlement is verified live against
-- the RevenueCat REST API; user_entitlements is only a cache.
--
-- Guard the RPC: if the target user does not exist, treat the event as a clean
-- no-op (return false) instead of hitting the FK. Makes the violation structurally
-- impossible. Everything else (ordering/idempotency) is unchanged.

create or replace function public.apply_entitlement_event(
  p_user_id     uuid,
  p_is_premium  boolean,
  p_product_id  text,
  p_store       text,
  p_expires_at  timestamptz,
  p_event_type  text,
  p_event_id    text,
  p_event_ts_ms bigint,
  p_raw         jsonb
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rows_affected integer;
begin
  -- Unknown / deleted user → nothing to cache; skip instead of violating the FK.
  if not exists (select 1 from auth.users where id = p_user_id) then
    return false;
  end if;

  insert into public.user_entitlements as ue
    (user_id, is_premium, product_id, store, expires_at, event_type,
     last_event_id, event_timestamp_ms, updated_at, raw)
  values
    (p_user_id, p_is_premium, p_product_id, p_store, p_expires_at, p_event_type,
     p_event_id, coalesce(p_event_ts_ms, 0), now(), p_raw)
  on conflict (user_id) do update set
    is_premium         = excluded.is_premium,
    product_id         = excluded.product_id,
    store              = excluded.store,
    expires_at         = excluded.expires_at,
    event_type         = excluded.event_type,
    last_event_id      = excluded.last_event_id,
    event_timestamp_ms = excluded.event_timestamp_ms,
    updated_at         = now(),
    raw                = excluded.raw
  where excluded.event_timestamp_ms >= ue.event_timestamp_ms
    and excluded.last_event_id is distinct from ue.last_event_id;

  get diagnostics rows_affected = row_count;
  return rows_affected > 0;
end;
$$;

revoke all on function public.apply_entitlement_event(
  uuid, boolean, text, text, timestamptz, text, text, bigint, jsonb
) from public, anon, authenticated;
