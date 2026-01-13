-- Grants for Supabase anon/authenticated roles to access the boksite schema.
-- Run in Supabase SQL editor.

grant usage on schema boksite to anon, authenticated;
grant select on all tables in schema boksite to anon, authenticated;
grant insert, update, delete on boksite.bookings to anon, authenticated;
grant insert, update, delete on boksite.company_holidays to anon, authenticated;

-- If RLS is enabled, add open policies (uncomment as needed).
-- alter table boksite.bookings enable row level security;
-- alter table boksite.company_holidays enable row level security;
--
-- drop policy if exists "anon read bookings" on boksite.bookings;
-- create policy "anon read bookings" on boksite.bookings for select using (true);
-- drop policy if exists "anon insert bookings" on boksite.bookings;
-- create policy "anon insert bookings" on boksite.bookings for insert with check (true);
-- drop policy if exists "anon update bookings" on boksite.bookings;
-- create policy "anon update bookings" on boksite.bookings for update using (true) with check (true);
-- drop policy if exists "anon delete bookings" on boksite.bookings;
-- create policy "anon delete bookings" on boksite.bookings for delete using (true);
--
-- drop policy if exists "anon read holidays" on boksite.company_holidays;
-- create policy "anon read holidays" on boksite.company_holidays for select using (true);
-- drop policy if exists "anon insert holidays" on boksite.company_holidays;
-- create policy "anon insert holidays" on boksite.company_holidays for insert with check (true);
-- drop policy if exists "anon update holidays" on boksite.company_holidays;
-- create policy "anon update holidays" on boksite.company_holidays for update using (true) with check (true);
-- drop policy if exists "anon delete holidays" on boksite.company_holidays;
-- create policy "anon delete holidays" on boksite.company_holidays for delete using (true);
