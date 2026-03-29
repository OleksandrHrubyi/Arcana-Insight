-- Ritual rewards v1: consumable inventory usage

create or replace function public.ritual_consume_reward(
  p_user_id uuid,
  p_reward_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns table(
  ok boolean,
  reward_key text,
  quantity integer,
  expires_at timestamptz,
  error_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_reward_key text := lower(trim(coalesce(p_reward_key, '')));
  v_quantity integer := 0;
  v_expires timestamptz := null;
begin
  if p_user_id is null then
    return query
    select false, ''::text, 0, null::timestamptz, 'missing_user';
    return;
  end if;

  if v_reward_key = '' then
    return query
    select false, ''::text, 0, null::timestamptz, 'missing_reward_key';
    return;
  end if;

  if v_reward_key <> 'extra_tarot_spread' then
    return query
    select false, v_reward_key, 0, null::timestamptz, 'unsupported_reward';
    return;
  end if;

  update public.ritual_reward_inventory
  set
    quantity = greatest(0, quantity - 1),
    updated_at = v_now,
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'last_consumed_at', v_now,
        'consume_source', coalesce(p_metadata->>'source', 'app')
      )
  where user_id = p_user_id
    and reward_key = v_reward_key
    and quantity > 0
  returning public.ritual_reward_inventory.quantity, public.ritual_reward_inventory.expires_at
  into v_quantity, v_expires;

  if not found then
    return query
    select false, v_reward_key, 0, null::timestamptz, 'insufficient_inventory';
    return;
  end if;

  return query
  select true, v_reward_key, greatest(0, v_quantity), v_expires, ''::text;
end;
$$;

grant execute on function public.ritual_consume_reward(uuid, text, jsonb) to service_role;
