-- Fix 42702 in ritual_award_points: the RETURNS TABLE out-params (points_balance,
-- lifetime_points) collided with the table columns in the UPDATE, raising
-- "column reference is ambiguous". Alias the UPDATE target and qualify every
-- column reference so the column (not the out-param variable) is used.
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

  update public.ritual_points_balance as bal
  set
    points_balance = case
      when p_points < 0 then greatest(0, bal.points_balance + p_points)
      else bal.points_balance + p_points
    end,
    lifetime_points = case
      when p_points > 0 then bal.lifetime_points + p_points
      else bal.lifetime_points
    end,
    updated_at = now()
  where bal.user_id = p_user_id
  returning bal.points_balance, bal.lifetime_points
  into v_balance, v_lifetime;

  return query select true, v_balance, v_lifetime;
end;
$$;

grant execute on function public.ritual_award_points(uuid, text, integer, text, text, date, jsonb) to service_role;
