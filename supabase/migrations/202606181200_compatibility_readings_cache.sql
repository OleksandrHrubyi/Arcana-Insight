-- Deterministic cache for AI compatibility (synastry) readings.
-- The reading is fully determined by the two charts + relationship type + locale,
-- so we cache by a hash of those inputs (not per-user) to avoid regenerating the
-- same reading. The Edge Function accesses this with the service role and
-- degrades gracefully if the table is absent.

create table if not exists public.compatibility_readings (
  id                uuid primary key default gen_random_uuid(),
  pair_hash         text not null unique,
  relationship_type text not null default 'romantic',
  locale            text not null default 'en',
  reading           jsonb not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- RLS on: this table is only touched by the Edge Function (service role, which
-- bypasses RLS). No client policies — clients never read it directly.
alter table public.compatibility_readings enable row level security;

create or replace function public.touch_compatibility_readings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_compatibility_readings_updated_at on public.compatibility_readings;
create trigger trg_compatibility_readings_updated_at
  before update on public.compatibility_readings
  for each row execute function public.touch_compatibility_readings_updated_at();
