-- Grants for Supabase anon/authenticated roles to access the boksite schema.
-- Run in Supabase SQL editor. This is intended for dev/demo environments.

grant usage on schema boksite to anon, authenticated;
grant select, insert, update, delete on all tables in schema boksite to anon, authenticated;
grant usage, select on all sequences in schema boksite to anon, authenticated;

-- Open RLS policies for all tables in boksite (dev/demo only).
do $$
declare
  tbl record;
  policy_exists int;
begin
  for tbl in
    select n.nspname as schemaname, c.relname as tablename
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'boksite' and c.relkind in ('r', 'p')
  loop
    execute format('alter table %I.%I enable row level security', tbl.schemaname, tbl.tablename);

    select count(*) into policy_exists
    from pg_policies
    where schemaname = tbl.schemaname and tablename = tbl.tablename and policyname = 'open_select';
    if policy_exists = 0 then
      execute format('create policy "open_select" on %I.%I for select using (true)', tbl.schemaname, tbl.tablename);
    end if;

    select count(*) into policy_exists
    from pg_policies
    where schemaname = tbl.schemaname and tablename = tbl.tablename and policyname = 'open_insert';
    if policy_exists = 0 then
      execute format('create policy "open_insert" on %I.%I for insert with check (true)', tbl.schemaname, tbl.tablename);
    end if;

    select count(*) into policy_exists
    from pg_policies
    where schemaname = tbl.schemaname and tablename = tbl.tablename and policyname = 'open_update';
    if policy_exists = 0 then
      execute format('create policy "open_update" on %I.%I for update using (true) with check (true)', tbl.schemaname, tbl.tablename);
    end if;

    select count(*) into policy_exists
    from pg_policies
    where schemaname = tbl.schemaname and tablename = tbl.tablename and policyname = 'open_delete';
    if policy_exists = 0 then
      execute format('create policy "open_delete" on %I.%I for delete using (true)', tbl.schemaname, tbl.tablename);
    end if;
  end loop;
end $$;
