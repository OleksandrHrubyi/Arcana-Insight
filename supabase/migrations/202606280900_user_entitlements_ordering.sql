-- Make user_entitlements writes monotonic + idempotent so an out-of-order or
-- replayed RevenueCat event can't revoke a still-paying subscriber (QA #26/#27).
-- Previously the webhook did a blind last-writer-wins upsert on user_id, so a
-- retried/older EXPIRATION arriving after a RENEWAL flipped is_premium=false.

alter table public.user_entitlements
  add column if not exists event_timestamp_ms bigint not null default 0,
  add column if not exists last_event_id text;

-- Atomic conditional upsert: apply an event only when it is at least as new as the
-- last applied one (ordering) AND not the same event id (idempotency). Doing the
-- comparison in the DB avoids the read-then-write race a client-side check would
-- have. Returns true when the row was actually written.
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

-- Clients never call this; only the service-role webhook does.
revoke all on function public.apply_entitlement_event(
  uuid, boolean, text, text, timestamptz, text, text, bigint, jsonb
) from public, anon, authenticated;
