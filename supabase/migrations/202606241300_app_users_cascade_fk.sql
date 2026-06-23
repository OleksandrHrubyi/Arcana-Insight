-- app_users (the profile table: email, name, date_of_birth, city_of_birth — PII)
-- had NO foreign key to auth.users, so deleting an auth user left the profile row
-- orphaned. delete-account relied on an explicit best-effort delete that "continued
-- anyway" on failure → a transient error could leave a deleted account's PII behind
-- forever. Add ON DELETE CASCADE so removing the auth user atomically removes the
-- profile too (matching every other user-data table).
--
-- First clean any rows already orphaned by past deletions (a profile whose auth user
-- no longer exists is, by definition, a deleted account's lingering PII).
do $$
declare
  v_orphans integer;
begin
  select count(*) into v_orphans
  from public.app_users a
  where not exists (select 1 from auth.users u where u.id = a.id);
  raise notice 'app_users orphaned rows removed: %', v_orphans;
end $$;

delete from public.app_users a
where not exists (select 1 from auth.users u where u.id = a.id);

alter table public.app_users
  add constraint app_users_id_auth_fk
  foreign key (id) references auth.users(id) on delete cascade;
