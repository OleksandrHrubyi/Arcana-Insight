# TODO: move push trigger to Supabase pg_cron (fix late notifications)

Status: **OPEN** — do when at a computer with Supabase dashboard access.

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
