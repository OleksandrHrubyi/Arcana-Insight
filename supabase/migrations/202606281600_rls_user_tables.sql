-- Audit #5: version + enforce RLS on the three user-facing tables that had no
-- policy in supabase/migrations (drift — they existed only live / in SUPABASE_SCHEMA.md).
--
-- Access patterns verified against the client (src/services/supabaseNativeCore.js)
-- and edge functions:
--   push_devices   — APNs device tokens (sensitive). NEVER touched by the client;
--                    only register-device / push-worker / send-broadcast via
--                    SERVICE_ROLE. => lock down: RLS on, NO anon/authenticated
--                    policy. service_role bypasses RLS, so the functions keep working.
--   app_users      — profile PII (email, name, dob, city). Client reads/upserts ONLY
--                    its own row by id. => owner-scope on id = auth.uid().
--   tarot_readings — client reads/inserts/deletes ONLY its own rows by user_id.
--                    => owner-scope on user_id = auth.uid(). delete-account purges
--                    via service_role (bypasses RLS).
--
-- Idempotent: safe to re-run. Run the diagnostic in the launch plan FIRST to confirm
-- the live state, then apply with `supabase db push` and verify the app still
-- reads/saves readings + profile on a real device.

-- ── push_devices ─────────────────────────────────────────────────────────────
alter table if exists public.push_devices enable row level security;
-- intentionally no policies: locks all anon/authenticated access; edge functions
-- use service_role which is exempt from RLS.

-- ── app_users ────────────────────────────────────────────────────────────────
alter table if exists public.app_users enable row level security;

drop policy if exists app_users_select_own on public.app_users;
create policy app_users_select_own on public.app_users
  for select to authenticated using (id = auth.uid());

drop policy if exists app_users_insert_own on public.app_users;
create policy app_users_insert_own on public.app_users
  for insert to authenticated with check (id = auth.uid());

drop policy if exists app_users_update_own on public.app_users;
create policy app_users_update_own on public.app_users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ── tarot_readings ───────────────────────────────────────────────────────────
alter table if exists public.tarot_readings enable row level security;

drop policy if exists tarot_readings_select_own on public.tarot_readings;
create policy tarot_readings_select_own on public.tarot_readings
  for select to authenticated using (user_id = auth.uid());

drop policy if exists tarot_readings_insert_own on public.tarot_readings;
create policy tarot_readings_insert_own on public.tarot_readings
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists tarot_readings_update_own on public.tarot_readings;
create policy tarot_readings_update_own on public.tarot_readings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists tarot_readings_delete_own on public.tarot_readings;
create policy tarot_readings_delete_own on public.tarot_readings
  for delete to authenticated using (user_id = auth.uid());
