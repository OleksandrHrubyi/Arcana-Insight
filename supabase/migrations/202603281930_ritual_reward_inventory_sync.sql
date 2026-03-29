-- Ritual rewards v1: reward inventory + guest inventory migration sync

create table if not exists public.ritual_reward_inventory (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_key text not null references public.ritual_reward_catalog(key) on update cascade,
  quantity integer not null default 0 check (quantity >= 0),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, reward_key)
);

create index if not exists ritual_reward_inventory_user_updated_idx
  on public.ritual_reward_inventory (user_id, updated_at desc);

create table if not exists public.ritual_reward_inventory_migrations (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  migration_key text not null,
  source text not null default 'app',
  payload jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, migration_key)
);

create index if not exists ritual_reward_inventory_migrations_user_created_idx
  on public.ritual_reward_inventory_migrations (user_id, created_at desc);

create or replace function public.ritual_apply_inventory_migration(
  p_user_id uuid,
  p_migration_key text,
  p_items jsonb default '[]'::jsonb,
  p_source text default 'app'
)
returns table(
  ok boolean,
  applied boolean,
  error_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_inserted integer := 0;
  v_item jsonb;
  v_reward_key text;
  v_qty integer;
  v_owned boolean;
  v_expires timestamptz;
begin
  if p_user_id is null then
    return query
    select false, false, 'missing_user';
    return;
  end if;

  if trim(coalesce(p_migration_key, '')) = '' then
    return query
    select false, false, 'missing_migration_key';
    return;
  end if;

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then
    return query
    select false, false, 'invalid_items';
    return;
  end if;

  insert into public.ritual_reward_inventory_migrations (
    user_id,
    migration_key,
    source,
    payload
  )
  values (
    p_user_id,
    trim(p_migration_key),
    left(coalesce(trim(p_source), 'app'), 64),
    coalesce(p_items, '[]'::jsonb)
  )
  on conflict (user_id, migration_key) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return query
    select true, false, ''::text;
    return;
  end if;

  for v_item in
    select value
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_reward_key := lower(trim(coalesce(v_item->>'rewardKey', '')));
    if v_reward_key not in (
      'extra_tarot_spread',
      'horoscope_love_unlock_24h',
      'horoscope_career_unlock_24h',
      'mystic_badge'
    ) then
      continue;
    end if;

    if v_reward_key = 'extra_tarot_spread' then
      begin
        v_qty := greatest(0, (v_item->>'quantity')::integer);
      exception when others then
        v_qty := 0;
      end;
      if v_qty <= 0 then
        continue;
      end if;

      insert into public.ritual_reward_inventory (
        user_id,
        reward_key,
        quantity,
        expires_at,
        metadata,
        updated_at
      )
      values (
        p_user_id,
        v_reward_key,
        v_qty,
        null,
        jsonb_build_object('source', p_source, 'migration_key', trim(p_migration_key)),
        v_now
      )
      on conflict (user_id, reward_key) do update
      set
        quantity = greatest(0, public.ritual_reward_inventory.quantity) + excluded.quantity,
        updated_at = v_now,
        metadata = coalesce(public.ritual_reward_inventory.metadata, '{}'::jsonb) || excluded.metadata;

    elsif v_reward_key in ('horoscope_love_unlock_24h', 'horoscope_career_unlock_24h') then
      begin
        v_expires := (v_item->>'expiresAt')::timestamptz;
      exception when others then
        v_expires := null;
      end;
      if v_expires is null or v_expires <= v_now then
        continue;
      end if;

      insert into public.ritual_reward_inventory (
        user_id,
        reward_key,
        quantity,
        expires_at,
        metadata,
        updated_at
      )
      values (
        p_user_id,
        v_reward_key,
        0,
        v_expires,
        jsonb_build_object('source', p_source, 'migration_key', trim(p_migration_key)),
        v_now
      )
      on conflict (user_id, reward_key) do update
      set
        expires_at = greatest(
          coalesce(public.ritual_reward_inventory.expires_at, v_now),
          excluded.expires_at
        ),
        updated_at = v_now,
        metadata = coalesce(public.ritual_reward_inventory.metadata, '{}'::jsonb) || excluded.metadata;

    elsif v_reward_key = 'mystic_badge' then
      begin
        v_owned := (v_item->>'owned')::boolean;
      exception when others then
        v_owned := false;
      end;
      begin
        v_qty := greatest(0, (v_item->>'quantity')::integer);
      exception when others then
        v_qty := 0;
      end;
      if not v_owned and v_qty <= 0 then
        continue;
      end if;

      insert into public.ritual_reward_inventory (
        user_id,
        reward_key,
        quantity,
        expires_at,
        metadata,
        updated_at
      )
      values (
        p_user_id,
        v_reward_key,
        1,
        null,
        jsonb_build_object('source', p_source, 'migration_key', trim(p_migration_key)),
        v_now
      )
      on conflict (user_id, reward_key) do update
      set
        quantity = greatest(public.ritual_reward_inventory.quantity, 1),
        updated_at = v_now,
        metadata = coalesce(public.ritual_reward_inventory.metadata, '{}'::jsonb) || excluded.metadata;
    end if;
  end loop;

  return query
  select true, true, ''::text;
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
  v_now timestamptz := now();
  v_existing_badge_qty integer := 0;
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

  if p_reward_key = 'mystic_badge' then
    select coalesce(quantity, 0)
    into v_existing_badge_qty
    from public.ritual_reward_inventory
    where user_id = p_user_id
      and reward_key = p_reward_key
    limit 1;

    if v_existing_badge_qty >= 1 then
      select
        coalesce(points_balance, 0),
        coalesce(lifetime_points, 0)
      into v_balance, v_lifetime
      from public.ritual_points_balance
      where user_id = p_user_id;

      return query
      select false, null::bigint, coalesce(v_balance, 0), coalesce(v_lifetime, 0), 'already_owned';
      return;
    end if;
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

  if p_reward_key = 'extra_tarot_spread' then
    insert into public.ritual_reward_inventory (
      user_id,
      reward_key,
      quantity,
      expires_at,
      metadata,
      updated_at
    )
    values (
      p_user_id,
      p_reward_key,
      1,
      null,
      jsonb_build_object('claim_id', v_claim_id, 'source', coalesce(p_metadata->>'source', 'app')),
      v_now
    )
    on conflict (user_id, reward_key) do update
    set
      quantity = greatest(0, public.ritual_reward_inventory.quantity) + 1,
      updated_at = v_now,
      metadata = coalesce(public.ritual_reward_inventory.metadata, '{}'::jsonb) || excluded.metadata;

  elsif p_reward_key in ('horoscope_love_unlock_24h', 'horoscope_career_unlock_24h') then
    insert into public.ritual_reward_inventory (
      user_id,
      reward_key,
      quantity,
      expires_at,
      metadata,
      updated_at
    )
    values (
      p_user_id,
      p_reward_key,
      0,
      v_now + interval '24 hours',
      jsonb_build_object('claim_id', v_claim_id, 'source', coalesce(p_metadata->>'source', 'app')),
      v_now
    )
    on conflict (user_id, reward_key) do update
    set
      expires_at = greatest(
        coalesce(public.ritual_reward_inventory.expires_at, v_now),
        v_now
      ) + interval '24 hours',
      updated_at = v_now,
      metadata = coalesce(public.ritual_reward_inventory.metadata, '{}'::jsonb) || excluded.metadata;

  elsif p_reward_key = 'mystic_badge' then
    insert into public.ritual_reward_inventory (
      user_id,
      reward_key,
      quantity,
      expires_at,
      metadata,
      updated_at
    )
    values (
      p_user_id,
      p_reward_key,
      1,
      null,
      jsonb_build_object('claim_id', v_claim_id, 'source', coalesce(p_metadata->>'source', 'app')),
      v_now
    )
    on conflict (user_id, reward_key) do update
    set
      quantity = greatest(public.ritual_reward_inventory.quantity, 1),
      updated_at = v_now,
      metadata = coalesce(public.ritual_reward_inventory.metadata, '{}'::jsonb) || excluded.metadata;
  end if;

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
    'extra_tarot_spread',
    'Extra Tarot Spread',
    'Додатковий розклад Таро',
    'Consume to start one premium-gated tarot spread.',
    'Використай, щоб запустити один преміальний розклад Таро.',
    60,
    10,
    true
  ),
  (
    'horoscope_love_unlock_24h',
    'Love Unlock 24h',
    'Love Unlock 24г',
    'Unlock Love horoscope theme for 24 hours.',
    'Відкриває тему Love у гороскопі на 24 години.',
    35,
    20,
    true
  ),
  (
    'horoscope_career_unlock_24h',
    'Career Unlock 24h',
    'Career Unlock 24г',
    'Unlock Career horoscope theme for 24 hours.',
    'Відкриває тему Career у гороскопі на 24 години.',
    35,
    30,
    true
  ),
  (
    'mystic_badge',
    'Mystic Badge',
    'Містичний бейдж',
    'A collectible ritual identity badge.',
    'Колекційний бейдж ритуальної ідентичності.',
    45,
    40,
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

update public.ritual_reward_catalog
set
  is_active = false,
  updated_at = now()
where key in ('premium_day_pass', 'tarot_spread_boost', 'insight_pack');

alter table public.ritual_reward_inventory enable row level security;
alter table public.ritual_reward_inventory_migrations enable row level security;

drop policy if exists ritual_reward_inventory_select_own on public.ritual_reward_inventory;
create policy ritual_reward_inventory_select_own
  on public.ritual_reward_inventory
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists ritual_reward_inventory_migrations_select_own on public.ritual_reward_inventory_migrations;
create policy ritual_reward_inventory_migrations_select_own
  on public.ritual_reward_inventory_migrations
  for select
  to authenticated
  using (auth.uid() = user_id);

grant execute on function public.ritual_apply_inventory_migration(uuid, text, jsonb, text) to service_role;
grant execute on function public.ritual_claim_reward(uuid, text, jsonb) to service_role;
