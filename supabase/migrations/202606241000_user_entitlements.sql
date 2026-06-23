-- Server-side premium state, synced from RevenueCat webhooks.
-- The RevenueCat app_user_id equals the Supabase auth user id (the app calls
-- Purchases.logIn({ appUserID: user.id })), so we can key directly on user_id.

create table if not exists public.user_entitlements (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  is_premium  boolean not null default false,
  product_id  text,
  store       text,
  expires_at  timestamptz,
  event_type  text,
  updated_at  timestamptz not null default now(),
  raw         jsonb
);

alter table public.user_entitlements enable row level security;

-- Users may read their own entitlement; only the service role (webhook /
-- edge functions) writes. No insert/update/delete policy => blocked for anon/auth.
drop policy if exists "read own entitlement" on public.user_entitlements;
create policy "read own entitlement" on public.user_entitlements
  for select using (auth.uid() = user_id);
