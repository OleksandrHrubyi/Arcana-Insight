-- Server-side cache for personal-horoscope readings.
-- The personal reading is deterministic for a given (user, date, sign, moon, locale)
-- tuple, so we cache it to avoid a full model call on every open. The Edge Function
-- accesses this table with the service role and degrades gracefully if it is absent,
-- so applying this migration is an optimization, not a hard dependency.

create table if not exists public.personal_horoscopes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  date        date not null,
  sign        text not null,
  moon_sign   text not null default '',
  locale      text not null default 'en',
  reading     jsonb not null,
  has_astro   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One cached reading per (user, date, sign, moon, locale). moon_sign defaults to ''
-- (never null) so the unique key is stable when the moon sign is unknown.
create unique index if not exists personal_horoscopes_unique_idx
  on public.personal_horoscopes (user_id, date, sign, moon_sign, locale);

-- Lookup by user + date is the common read path.
create index if not exists personal_horoscopes_user_date_idx
  on public.personal_horoscopes (user_id, date);

-- RLS: the Edge Function uses the service role (which bypasses RLS), but enable it
-- so the table is never directly readable/writable by clients with the anon key.
alter table public.personal_horoscopes enable row level security;

-- Allow a user to read their own cached readings (defensive; clients normally go
-- through the Edge Function, not PostgREST).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'personal_horoscopes'
      and policyname = 'personal_horoscopes_select_own'
  ) then
    create policy personal_horoscopes_select_own
      on public.personal_horoscopes
      for select
      using (auth.uid() = user_id);
  end if;
end
$$;

-- Keep updated_at fresh on upsert.
create or replace function public.touch_personal_horoscopes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_personal_horoscopes_updated_at on public.personal_horoscopes;
create trigger trg_personal_horoscopes_updated_at
  before update on public.personal_horoscopes
  for each row execute function public.touch_personal_horoscopes_updated_at();
