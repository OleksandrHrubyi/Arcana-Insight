-- Atomic point award for ritual-track.
--
-- Before: ritual-track inserted a dedupe row into ritual_points_ledger via REST,
-- then (in a SEPARATE call) ran ritual_apply_points to bump the balance. If the
-- function died between the two, the ledger row existed but the balance was never
-- updated — and because the next call sees the ledger row as a duplicate, the
-- points were lost forever (ledger and balance diverge).
--
-- This RPC does both in ONE transaction (a plpgsql function is atomic): insert the
-- ledger row (dedupe on user_id+uniq_key) and, only if it was newly inserted, apply
-- the delta to the balance. `awarded` tells the caller whether it was new.
create or replace function public.ritual_award_points(
  p_user_id uuid,
  p_reason text,
  p_points integer,
  p_uniq_key text,
  p_activity text default null,
  p_event_date date default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table(awarded boolean, points_balance integer, lifetime_points integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer := 0;
  v_lifetime integer := 0;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;
  if p_uniq_key is null or length(trim(p_uniq_key)) = 0 then
    raise exception 'p_uniq_key is required';
  end if;

  insert into public.ritual_points_ledger (
    user_id, reason, points, uniq_key, activity, event_date, metadata
  )
  values (
    p_user_id, p_reason, p_points, p_uniq_key, p_activity, p_event_date,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id, uniq_key) do nothing;

  -- Duplicate (already awarded): return the current balance unchanged.
  if not found then
    select coalesce(b.points_balance, 0), coalesce(b.lifetime_points, 0)
    into v_balance, v_lifetime
    from public.ritual_points_balance b
    where b.user_id = p_user_id;

    return query select false, coalesce(v_balance, 0), coalesce(v_lifetime, 0);
    return;
  end if;

  -- Newly inserted → apply the delta to the balance in the same transaction.
  insert into public.ritual_points_balance (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  update public.ritual_points_balance
  set
    points_balance = case
      when p_points < 0 then greatest(0, points_balance + p_points)
      else points_balance + p_points
    end,
    lifetime_points = case
      when p_points > 0 then lifetime_points + p_points
      else lifetime_points
    end,
    updated_at = now()
  where user_id = p_user_id
  returning public.ritual_points_balance.points_balance, public.ritual_points_balance.lifetime_points
  into v_balance, v_lifetime;

  return query select true, v_balance, v_lifetime;
end;
$$;

grant execute on function public.ritual_award_points(uuid, text, integer, text, text, date, jsonb) to service_role;
