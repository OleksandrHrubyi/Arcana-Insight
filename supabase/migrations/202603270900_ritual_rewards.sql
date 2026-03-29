-- Ritual rewards MVP schema

create table if not exists public.ritual_activity_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  activity text not null check (activity in ('daily_card', 'horoscope', 'tarot')),
  event_date date not null,
  source text not null default 'app',
  created_at timestamptz not null default now(),
  unique (user_id, activity, event_date)
);

create index if not exists ritual_activity_events_user_date_idx
  on public.ritual_activity_events (user_id, event_date desc);

create table if not exists public.ritual_points_balance (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points_balance integer not null default 0 check (points_balance >= 0),
  lifetime_points integer not null default 0 check (lifetime_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ritual_points_ledger (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('activity', 'full_day_bonus', 'reward_claim', 'manual_adjustment')),
  points integer not null,
  uniq_key text,
  activity text check (activity in ('daily_card', 'horoscope', 'tarot') or activity is null),
  event_date date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, uniq_key)
);

create index if not exists ritual_points_ledger_user_created_idx
  on public.ritual_points_ledger (user_id, created_at desc);

create index if not exists ritual_points_ledger_user_event_date_idx
  on public.ritual_points_ledger (user_id, event_date desc);

create table if not exists public.ritual_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  last_full_day date,
  updated_at timestamptz not null default now()
);

create table if not exists public.ritual_reward_catalog (
  key text primary key,
  title_en text not null,
  title_uk text not null,
  description_en text not null default '',
  description_uk text not null default '',
  cost_points integer not null check (cost_points > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ritual_reward_claims (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_key text not null references public.ritual_reward_catalog(key) on update cascade,
  cost_points integer not null check (cost_points > 0),
  status text not null default 'issued' check (status in ('issued', 'fulfilled', 'canceled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  fulfilled_at timestamptz
);

create index if not exists ritual_reward_claims_user_created_idx
  on public.ritual_reward_claims (user_id, created_at desc);

create or replace view public.ritual_full_days as
select
  user_id,
  event_date,
  count(distinct activity)::integer as completed_count
from public.ritual_activity_events
group by user_id, event_date
having count(distinct activity) = 3;

create or replace function public.ritual_apply_points(p_user_id uuid, p_delta integer)
returns table(points_balance integer, lifetime_points integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer := 0;
  v_lifetime integer := 0;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  insert into public.ritual_points_balance (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  update public.ritual_points_balance
  set
    points_balance = case
      when p_delta < 0 then greatest(0, points_balance + p_delta)
      else points_balance + p_delta
    end,
    lifetime_points = case
      when p_delta > 0 then lifetime_points + p_delta
      else lifetime_points
    end,
    updated_at = now()
  where user_id = p_user_id
  returning public.ritual_points_balance.points_balance, public.ritual_points_balance.lifetime_points
  into v_balance, v_lifetime;

  return query
  select v_balance, v_lifetime;
end;
$$;

create or replace function public.ritual_claim_reward(
  p_user_id uuid,
  p_reward_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns table(
  ok boolean,
  claim_id bigint,
  points_balance integer,
  lifetime_points integer,
  error_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost integer;
  v_claim_id bigint;
  v_balance integer := 0;
  v_lifetime integer := 0;
begin
  if p_user_id is null then
    return query
    select false, null::bigint, 0, 0, 'missing_user';
    return;
  end if;

  select cost_points
  into v_cost
  from public.ritual_reward_catalog
  where key = p_reward_key
    and is_active = true
  limit 1;

  if v_cost is null then
    return query
    select false, null::bigint, 0, 0, 'reward_not_found';
    return;
  end if;

  insert into public.ritual_points_balance (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  update public.ritual_points_balance
  set
    points_balance = points_balance - v_cost,
    updated_at = now()
  where user_id = p_user_id
    and points_balance >= v_cost
  returning public.ritual_points_balance.points_balance, public.ritual_points_balance.lifetime_points
  into v_balance, v_lifetime;

  if not found then
    select
      coalesce(points_balance, 0),
      coalesce(lifetime_points, 0)
    into v_balance, v_lifetime
    from public.ritual_points_balance
    where user_id = p_user_id;

    return query
    select false, null::bigint, v_balance, v_lifetime, 'insufficient_points';
    return;
  end if;

  insert into public.ritual_reward_claims (
    user_id,
    reward_key,
    cost_points,
    status,
    metadata
  )
  values (
    p_user_id,
    p_reward_key,
    v_cost,
    'issued',
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_claim_id;

  insert into public.ritual_points_ledger (
    user_id,
    reason,
    points,
    uniq_key,
    activity,
    event_date,
    metadata
  )
  values (
    p_user_id,
    'reward_claim',
    -v_cost,
    null,
    null,
    now()::date,
    jsonb_build_object('reward_key', p_reward_key, 'claim_id', v_claim_id)
      || coalesce(p_metadata, '{}'::jsonb)
  );

  return query
  select true, v_claim_id, v_balance, v_lifetime, ''::text;
end;
$$;

insert into public.ritual_reward_catalog (
  key,
  title_en,
  title_uk,
  description_en,
  description_uk,
  cost_points,
  sort_order,
  is_active
)
values
  (
    'premium_day_pass',
    'Premium Day Pass',
    'Преміум на день',
    'Unlock premium access for 24 hours.',
    'Відкриває преміум доступ на 24 години.',
    120,
    10,
    true
  ),
  (
    'tarot_spread_boost',
    'Tarot Spread Boost',
    'Буст розкладу Таро',
    'One advanced tarot spread without limits.',
    'Один розширений розклад Таро без обмежень.',
    90,
    20,
    true
  ),
  (
    'insight_pack',
    'Insight Pack',
    'Пакет інсайтів',
    'Extra personalized insight content.',
    'Додатковий персоналізований контент з інсайтами.',
    180,
    30,
    true
  )
on conflict (key) do update
set
  title_en = excluded.title_en,
  title_uk = excluded.title_uk,
  description_en = excluded.description_en,
  description_uk = excluded.description_uk,
  cost_points = excluded.cost_points,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

alter table public.ritual_activity_events enable row level security;
alter table public.ritual_points_balance enable row level security;
alter table public.ritual_points_ledger enable row level security;
alter table public.ritual_streaks enable row level security;
alter table public.ritual_reward_catalog enable row level security;
alter table public.ritual_reward_claims enable row level security;

drop policy if exists ritual_activity_events_select_own on public.ritual_activity_events;
create policy ritual_activity_events_select_own
  on public.ritual_activity_events
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists ritual_points_balance_select_own on public.ritual_points_balance;
create policy ritual_points_balance_select_own
  on public.ritual_points_balance
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists ritual_points_ledger_select_own on public.ritual_points_ledger;
create policy ritual_points_ledger_select_own
  on public.ritual_points_ledger
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists ritual_streaks_select_own on public.ritual_streaks;
create policy ritual_streaks_select_own
  on public.ritual_streaks
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists ritual_reward_catalog_select_all on public.ritual_reward_catalog;
create policy ritual_reward_catalog_select_all
  on public.ritual_reward_catalog
  for select
  to authenticated, anon
  using (is_active = true);

drop policy if exists ritual_reward_claims_select_own on public.ritual_reward_claims;
create policy ritual_reward_claims_select_own
  on public.ritual_reward_claims
  for select
  to authenticated
  using (auth.uid() = user_id);

grant execute on function public.ritual_apply_points(uuid, integer) to service_role;
grant execute on function public.ritual_claim_reward(uuid, text, jsonb) to service_role;
