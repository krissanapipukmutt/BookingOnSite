-- Booking Onsite – Database Schema (Postgres/Supabase)
-- Create objects in schema `boksite` used by the app

-- Extensions
create schema if not exists boksite;
set search_path = boksite, public;
create extension if not exists pgcrypto;

-- ENUMS
do $$ begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'booking_status' and n.nspname = 'boksite'
  ) then
    create type boksite.booking_status as enum ('BOOKED','CANCELLED');
  end if;
end $$;

-- Lookup: Department Booking Strategies
create table if not exists boksite.department_booking_strategies (
  code text primary key,
  display_name text not null,
  description text
);

insert into boksite.department_booking_strategies (code, display_name, description)
values
  ('UNLIMITED','Unlimited','Departments with no capacity limit'),
  ('CAPACITY','Capacity Limited','Departments with numeric daily capacity'),
  ('ASSIGNED','Seat Assigned','Departments requiring specific seats')
on conflict (code) do nothing;

-- Offices
create table if not exists boksite.offices (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Departments
create table if not exists boksite.departments (
  id uuid primary key default gen_random_uuid(),
  office_id uuid null references boksite.offices(id) on delete set null,
  name text not null,
  booking_strategy text not null references boksite.department_booking_strategies(code),
  seat_capacity integer null check (seat_capacity is null or seat_capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (office_id, name)
);
create index if not exists idx_departments_office on boksite.departments(office_id);

-- Seats per Department
create table if not exists boksite.department_seats (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references boksite.departments(id) on delete cascade,
  seat_code text not null,
  created_at timestamptz not null default now(),
  unique (department_id, seat_code)
);
create index if not exists idx_seats_dept on boksite.department_seats(department_id);

-- Booking Purposes
create table if not exists boksite.booking_purposes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into boksite.booking_purposes (name, description, is_active)
select v.name, v.description, v.is_active
from (
  values
    ('Team Sync-Up','ประชุมทีม', true),
    ('Client Meeting','พบลูกค้า', true),
    ('Training Session','อบรม', true)
) as v(name, description, is_active)
where not exists (
  select 1 from boksite.booking_purposes bp where bp.name = v.name
);

-- Employee Profiles
create table if not exists boksite.employee_profiles (
  user_id uuid primary key,
  employee_code text not null unique,
  first_name text not null,
  last_name text not null,
  email text unique,
  department_id uuid null references boksite.departments(id) on delete set null,
  start_date date null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_employees_dept on boksite.employee_profiles(department_id);

-- Bookings
create table if not exists boksite.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_date date not null,
  department_id uuid not null references boksite.departments(id),
  seat_id uuid null references boksite.department_seats(id) on delete set null,
  purpose_id uuid null references boksite.booking_purposes(id) on delete set null,
  note text null,
  user_id uuid not null references boksite.employee_profiles(user_id),
  status boksite.booking_status not null default 'BOOKED',
  created_at timestamptz not null default now()
  -- Optional: prevent duplicate bookings per user per date
  -- , unique (user_id, booking_date)
);
create index if not exists idx_bookings_date on boksite.bookings(booking_date);
create index if not exists idx_bookings_user on boksite.bookings(user_id);
create index if not exists idx_bookings_dept on boksite.bookings(department_id);

-- Company Holidays
create table if not exists boksite.company_holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null,
  name text not null,
  office_id uuid null references boksite.offices(id) on delete set null,
  description text null,
  created_at timestamptz not null default now()
);
create index if not exists idx_holidays_date on boksite.company_holidays(holiday_date);

-- Reporting Views
create or replace view boksite.employee_booking_history as
select
  b.id as booking_id,
  b.booking_date,
  d.name as department_name,
  o.name as office_name,
  b.status,
  bp.name as purpose_name,
  s.seat_code,
  ep.employee_code,
  concat_ws(' ', ep.first_name, ep.last_name) as employee_name
from boksite.bookings b
left join boksite.departments d on d.id = b.department_id
left join boksite.offices o on o.id = d.office_id
left join boksite.booking_purposes bp on bp.id = b.purpose_id
left join boksite.department_seats s on s.id = b.seat_id
left join boksite.employee_profiles ep on ep.user_id = b.user_id
order by b.booking_date desc, b.created_at desc;

create or replace view boksite.booking_status_daily_summary as
select
  b.booking_date,
  coalesce(bp.name, '-') as purpose_name,
  b.status,
  count(*)::int as total
from boksite.bookings b
left join boksite.booking_purposes bp on bp.id = b.purpose_id
group by b.booking_date, coalesce(bp.name, '-'), b.status
order by b.booking_date desc, purpose_name, b.status;

create or replace view boksite.department_daily_capacity_usage as
select
  b.booking_date,
  d.name as department_name,
  o.name as office_name,
  count(*) filter (where b.status = 'BOOKED')::int as active_bookings,
  d.seat_capacity,
  case
    when d.seat_capacity is null then null
    else greatest(d.seat_capacity - count(*) filter (where b.status = 'BOOKED'), 0)
  end as remaining_capacity
from boksite.bookings b
join boksite.departments d on d.id = b.department_id
left join boksite.offices o on o.id = d.office_id
group by b.booking_date, d.name, o.name, d.seat_capacity
order by b.booking_date desc, department_name;

create or replace view boksite.department_monthly_attendance as
select
  d.id as department_id,
  d.name as department_name,
  o.name as office_name,
  (date_trunc('month', b.booking_date))::date as month_start,
  count(*) filter (where b.status = 'BOOKED')::int as total_bookings
from boksite.bookings b
join boksite.departments d on d.id = b.department_id
left join boksite.offices o on o.id = d.office_id
group by d.id, d.name, o.name, (date_trunc('month', b.booking_date))::date
order by month_start desc, department_name;

create or replace view boksite.employee_yearly_attendance as
select
  ep.user_id,
  ep.employee_code,
  ep.first_name,
  ep.last_name,
  extract(year from b.booking_date)::int as year,
  count(*) filter (where b.status = 'BOOKED')::int as total_booked_days
from boksite.employee_profiles ep
left join boksite.bookings b on b.user_id = ep.user_id
group by ep.user_id, ep.employee_code, ep.first_name, ep.last_name, extract(year from b.booking_date)
order by year desc, employee_code;

create or replace view boksite.office_holiday_overview as
select
  ch.holiday_date,
  coalesce(o.name, 'All Offices') as office_name,
  ch.name as holiday_name,
  ch.description
from boksite.company_holidays ch
left join boksite.offices o on o.id = ch.office_id
order by ch.holiday_date asc, office_name;

-- End of schema
