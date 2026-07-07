# TODO: move push trigger to Supabase pg_cron (fix late notifications)

Status: **✅ LIVE (2026-07-07).** Tracked as **LR-27** in `docs/launch-readiness-plan.md`.

## Rollout result (2026-07-07)
- Steps 1–3 done: `pg_cron`+`pg_net` enabled, new `ADMIN_PUSH_SECRET` generated
  (old value was lost → rotated; set in edge secrets + Vault `admin_push_secret`
  + GitHub secret), `push-worker-tick` scheduled `*/2`.
- **Verified live:** tick run at 19:00 UTC → HTTP **200** `{ok:true,due:0,sent:0}`
  (check real HTTP status in `net._http_response`, NOT `cron.job_run_details` —
  `succeeded` there only means the SQL ran; `net.http_post` is async).
- **Plot twist — the real root cause:** two legacy pg_cron jobs already existed
  (unknown to the repo/docs): `push-worker-every-minute` (`* * * * *`) and
  `daily-arcana-push` (`0 8 * * *` broadcast "Гороскоп дня вже готовий ✨",
  limit 5000). Both used Vault `push_secret`, which no longer matched the edge
  `ADMIN_PUSH_SECRET` → **401 every minute, silently, for weeks**. So the
  per-minute trigger existed but was dead, and delivery depended on the laggy
  GitHub Action — hence the "hours late" pushes.
- **Cleanup (done, owner-approved):** both legacy jobs unscheduled
  (`push-worker-every-minute` — replaced by `push-worker-tick`;
  `daily-arcana-push` — generic broadcast duplicating the per-device daily push)
  and stale Vault entries `push_secret` / `project_url` deleted. Final state:
  one cron job (`push-worker-tick`), one Vault secret (`admin_push_secret`).
- **Live device test PASSED (2026-07-07 19:12 UTC):** forced `next_send_at=now()`
  on the owner's device (the in-app picker has a 30-min step —
  `SettingsComponent.vue` `step = 30` — so a "+3 min" test isn't settable from UI);
  next tick sent it (`due:1, sent:1, marked_next:1`), push arrived on device,
  `next_send_at` correctly rolled to next-day 08:00 Kyiv. End-to-end chain
  (pg_cron → pg_net → push-worker → APNs → device → reschedule) verified.

Done in repo (2026-07-07):
- Step 4 (disable GH Actions schedule) — `schedule:` commented out in
  `.github/workflows/send-push-notifications.yml`, `workflow_dispatch` kept.
  **⚠️ Don't push to `main` until the pg_cron job (steps 1–3) is live**, or daily
  pushes stop entirely.
- The two DB functions (`compute_next_send_at`, `push_mark_sent`) are now committed
  as migration `supabase/migrations/202607071000_push_schedule_functions.sql`
  (dumped verbatim from prod — re-apply is a no-op). Closes the "live only in the
  dashboard" note below.

## The problem (diagnosed 2026-07-04)
Daily push arrives hours late (set 07:00 → arrives ~09:00). Root cause is **NOT**
timezone and **NOT** the app — verified:
- The client sends the correct local time + real IANA timezone (`Europe/Kiev`).
- The DB function `compute_next_send_at` converts correctly: 09:00 Kyiv → `06:00 UTC`
  in `push_devices.next_send_at` (confirmed on live rows). tz math is right.
- The delay is the **trigger cadence**: `push-worker` is fired by a **GitHub Actions
  scheduled workflow** (`.github/workflows/send-push-notifications.yml`). GitHub
  scheduled runs are best-effort and routinely lag 15–75 min (and were `*/30`).
  Already tightened to `*/10` (commit 891787b), but GitHub lag remains — not good
  enough for on-time delivery.

## The fix: trigger from Supabase pg_cron instead of GitHub Actions
pg_cron runs on the DB (no GitHub lag). A 2-minute poll fires each device within
~2 min of its `next_send_at`. `push-worker` already only sends devices whose
`next_send_at <= now` and advances them +1 day via `push_mark_sent`, so a frequent
poll causes **no double-sends** (idempotent).

### Step 1 — enable extensions (Supabase → SQL Editor, run once)
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
```

### Step 2 — put the push secret in Vault
Use the SAME value as the `ADMIN_PUSH_SECRET` edge-function secret / the GitHub
`secrets.ADMIN_PUSH_SECRET`. Replace `PUT_THE_SECRET_HERE`:
```sql
select vault.create_secret('PUT_THE_SECRET_HERE', 'admin_push_secret');
```
(To view/rotate later: `select * from vault.decrypted_secrets where name='admin_push_secret';`)

### Step 3 — schedule the worker every 2 minutes
```sql
select cron.schedule(
  'push-worker-tick',
  '*/2 * * * *',
  $$
    select net.http_post(
      url := 'https://rgqfkdhzllhmagrcasav.functions.supabase.co/push-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-push-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'admin_push_secret')
      ),
      body := '{}'::jsonb
    );
  $$
);
```

### Step 4 — disable the GitHub Actions schedule
In `.github/workflows/send-push-notifications.yml`, comment out the `schedule:`
block (keep `workflow_dispatch` for manual test runs). Push to `main`.
*(Leaving both on is safe — no double-send — but pg_cron alone is cleaner.)*

## Verify
```sql
-- job is scheduled
select jobid, schedule, active, jobname from cron.job where jobname = 'push-worker-tick';
-- recent runs succeeded
select status, return_message, start_time
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname='push-worker-tick')
order by start_time desc limit 10;
```
Then set a notify time ~3 min out on a device and confirm it arrives on time.

## Rollback
```sql
select cron.unschedule('push-worker-tick');
```
…and re-enable the GitHub `schedule:` block.

## Notes
- pg_cron runs in **UTC**; `*/2 * * * *` is a plain 2-min poll — per-device timing
  is entirely in `next_send_at`, so no tz handling needed in the cron itself.
- Consider dropping the `next_send_at.is.null` catch-all in `push-worker`
  `fetchDue()` later — a mis-initialized device would otherwise fire every tick.
- The two DB functions (`compute_next_send_at`, `push_mark_sent`) are correct but
  live only in the dashboard — worth committing them into a migration for
  reproducibility (they are quoted correct as of 2026-07-04).
