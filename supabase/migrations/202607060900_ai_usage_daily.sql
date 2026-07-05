-- Per-user daily ceiling for the AI endpoints (tarot-reading, personal-horoscope,
-- compatibility). This is NOT the paywall (premium.ts is): it caps the blast
-- radius of fail-open premium checks and runaway/scripted clients so one user can
-- never drive unbounded OpenAI spend. Counting is done atomically in the DB so two
-- concurrent requests cannot slip past the limit together.
create table if not exists public.ai_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  endpoint text not null,
  calls integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day, endpoint)
);

alter table public.ai_usage_daily enable row level security;
-- No policies: read/write happens only through the service-role edge functions.

-- Atomically consume one unit of today's quota. Returns the new call count when
-- allowed, or -1 when the limit is already reached (the row is left untouched so
-- retries don't inflate the counter).
create or replace function public.increment_ai_usage(p_user_id uuid, p_endpoint text, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_calls integer;
begin
  if p_limit is null or p_limit < 1 then
    return -1;
  end if;

  insert into public.ai_usage_daily (user_id, day, endpoint, calls)
  values (p_user_id, (now() at time zone 'utc')::date, p_endpoint, 1)
  on conflict (user_id, day, endpoint)
  do update set calls = ai_usage_daily.calls + 1, updated_at = now()
  where ai_usage_daily.calls < p_limit
  returning calls into new_calls;

  if new_calls is null then
    return -1;
  end if;
  return new_calls;
end;
$$;

-- Give the unit back when the AI provider failed after the quota was consumed
-- (same principle as the tarot free-grant refund: a failure must not burn the
-- user's allowance).
create or replace function public.refund_ai_usage(p_user_id uuid, p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ai_usage_daily
  set calls = greatest(calls - 1, 0), updated_at = now()
  where user_id = p_user_id
    and day = (now() at time zone 'utc')::date
    and endpoint = p_endpoint;
$$;

revoke execute on function public.increment_ai_usage(uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.refund_ai_usage(uuid, text) from public, anon, authenticated;
grant execute on function public.increment_ai_usage(uuid, text, integer) to service_role;
grant execute on function public.refund_ai_usage(uuid, text) to service_role;
