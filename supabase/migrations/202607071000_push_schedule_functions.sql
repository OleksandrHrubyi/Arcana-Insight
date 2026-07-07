-- Push scheduling DB functions (LR-27 / docs/release-audit/PUSH_TIMING_PGCRON.md).
-- These two functions were created via the Supabase dashboard and lived only there;
-- committed for reproducibility. Definitions dumped verbatim from prod on 2026-07-07
-- (pg_get_functiondef) — CREATE OR REPLACE is a no-op when applied to prod.
--
-- compute_next_send_at: next occurrence of HH:MM in the device's IANA tz, as timestamptz.
-- push_mark_sent: stamps last_sent_at and rolls next_send_at +1 local day for sent tokens
-- (called by the push-worker edge fn after each batch; makes frequent polling idempotent).

CREATE OR REPLACE FUNCTION public.compute_next_send_at(p_hour integer, p_minute integer, p_tz text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
AS $function$
declare
  local_now timestamp;
  candidate_local timestamp;
  h int;
  m int;
  z text;
begin
  h := greatest(0, least(23, coalesce(p_hour, 8)));
  m := greatest(0, least(59, coalesce(p_minute, 0)));
  z := coalesce(nullif(p_tz, ''), 'UTC');

  local_now := now() at time zone z;
  candidate_local := date_trunc('day', local_now) + make_interval(hours => h, mins => m);

  if candidate_local <= local_now then
    candidate_local := candidate_local + interval '1 day';
  end if;

  return timezone(z, candidate_local); -- -> timestamptz
end;
$function$;

CREATE OR REPLACE FUNCTION public.push_mark_sent(p_tokens text[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
  updated int;
begin
  update public.push_devices d
  set
    last_sent_at = now(),
    next_send_at = public.compute_next_send_at(
      coalesce(d.notify_hour, 8),
      coalesce(d.notify_minute, 0),
      coalesce(nullif(d.tz,''), 'UTC')
    )
  where d.token = any(p_tokens);

  get diagnostics updated = row_count;
  return updated;
end;
$function$;
