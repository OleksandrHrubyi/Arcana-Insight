do $$
declare
  column_data_type text;
  column_udt_name text;
  has_general boolean;
  has_spirit boolean;
  has_energy boolean;
  constraint_name text;
begin
  select data_type, udt_name
    into column_data_type, column_udt_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'horoscopes'
    and column_name = 'theme';

  if column_udt_name is null then
    raise notice 'public.horoscopes.theme not found; skipping theme migration';
    return;
  end if;

  if column_data_type = 'USER-DEFINED' then
    select exists (
      select 1
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
      where t.typname = column_udt_name
        and e.enumlabel = 'general'
    ) into has_general;

    select exists (
      select 1
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
      where t.typname = column_udt_name
        and e.enumlabel = 'spirit'
    ) into has_spirit;

    select exists (
      select 1
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
      where t.typname = column_udt_name
        and e.enumlabel = 'energy'
    ) into has_energy;

    if has_general and not has_energy then
      execute format(
        'alter type %I rename value %L to %L',
        column_udt_name,
        'general',
        'energy'
      );
    end if;

    if has_spirit and not has_energy then
      execute format(
        'alter type %I rename value %L to %L',
        column_udt_name,
        'spirit',
        'energy'
      );
    end if;
  else
    for constraint_name in
      select c.conname
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'horoscopes'
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ilike '%theme%'
        and (
          pg_get_constraintdef(c.oid) ilike '%general%'
          or pg_get_constraintdef(c.oid) ilike '%spirit%'
          or pg_get_constraintdef(c.oid) ilike '%energy%'
        )
    loop
      execute format('alter table public.horoscopes drop constraint %I', constraint_name);
    end loop;

    update public.horoscopes
      set theme = 'energy'
    where theme = 'general';

    update public.horoscopes
      set theme = 'energy'
    where theme = 'spirit';

    if not exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'horoscopes'
        and c.conname = 'horoscopes_theme_check'
    ) then
      alter table public.horoscopes
        add constraint horoscopes_theme_check
        check (theme in ('love', 'career', 'energy'));
    end if;

    -- Only safe in the text/check-constraint branch: when theme is an enum that
    -- has already had 'general'/'spirit' renamed to 'energy', casting those
    -- literals throws "invalid input value for enum". The enum branch above
    -- already renames the values, so no row-level update is needed there.
    update public.horoscopes
      set theme = 'energy'
    where theme = 'general';

    update public.horoscopes
      set theme = 'energy'
    where theme = 'spirit';
  end if;
end
$$;
