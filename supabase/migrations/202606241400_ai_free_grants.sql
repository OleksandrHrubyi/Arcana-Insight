-- One free AI generation per account per feature (e.g. the first tarot reading is
-- a full AI interpretation as a gift). tarot-reading consumes a grant by inserting
-- a row (ON CONFLICT DO NOTHING) for non-premium users; once a row exists, the
-- feature is premium-only.
create table if not exists public.ai_free_grants (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  used_at timestamptz not null default now(),
  primary key (user_id, feature)
);

alter table public.ai_free_grants enable row level security;

-- Users may read their own grants (write path is service-role only, from the edge fn).
drop policy if exists ai_free_grants_select_own on public.ai_free_grants;
create policy ai_free_grants_select_own
  on public.ai_free_grants
  for select
  to authenticated
  using (auth.uid() = user_id);
