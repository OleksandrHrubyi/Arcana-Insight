-- Daily reflection journal entries (RP-01/RP-02).
-- One entry per user per local calendar day. Unlike the AI cache tables this table
-- is read/written DIRECTLY by the client over PostgREST (no edge function), so it
-- needs the full set of own-row CRUD policies.

create table if not exists public.journal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  entry_date  date not null,
  mood        text not null default '',
  prompt_key  text not null default '',
  body        text not null default '',
  sky         jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint journal_entries_user_date_uniq unique (user_id, entry_date),
  -- mood is a client-validated key (length-checked, not an enum) so the mood set
  -- can evolve without a migration
  constraint journal_entries_mood_len   check (char_length(mood) <= 24),
  constraint journal_entries_prompt_len check (char_length(prompt_key) <= 64),
  constraint journal_entries_body_len   check (char_length(body) <= 4000)
);

alter table public.journal_entries enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'journal_entries'
      and policyname = 'journal_entries_select_own'
  ) then
    create policy journal_entries_select_own
      on public.journal_entries
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'journal_entries'
      and policyname = 'journal_entries_insert_own'
  ) then
    create policy journal_entries_insert_own
      on public.journal_entries
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'journal_entries'
      and policyname = 'journal_entries_update_own'
  ) then
    create policy journal_entries_update_own
      on public.journal_entries
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'journal_entries'
      and policyname = 'journal_entries_delete_own'
  ) then
    create policy journal_entries_delete_own
      on public.journal_entries
      for delete
      using (auth.uid() = user_id);
  end if;
end
$$;

create or replace function public.touch_journal_entries_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_journal_entries_updated_at on public.journal_entries;
create trigger trg_journal_entries_updated_at
  before update on public.journal_entries
  for each row execute function public.touch_journal_entries_updated_at();
