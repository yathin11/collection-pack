-- =============================================================
-- Collection Manager - Multi-Tenant Workspace & Approval Schema
-- Run once in Supabase > SQL Editor
-- =============================================================

-- 1. Profiles & Admin Approval System
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  name text,
  role text not null default 'owner' check (role in ('admin', 'owner', 'collector')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  workspace_id uuid,
  created_at timestamptz default now(),
  approved_at timestamptz
);

-- 2. Organizations / Workspaces
create table if not exists orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users on delete cascade,
  daily_on boolean default true,
  weekly_on boolean default true,
  currency text default 'INR',
  created_at timestamptz default now()
);

-- Link workspace_id FK
alter table profiles add constraint fk_profile_workspace foreign key (workspace_id) references orgs(id) on delete set null;

-- 3. Workspace Membership
create table if not exists members (
  user_id uuid references auth.users on delete cascade,
  org_id uuid references orgs on delete cascade,
  role text not null default 'owner' check (role in ('admin', 'owner', 'collector')),
  primary key (user_id, org_id)
);

-- Helper to check if caller is an approved admin
create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'approved'
  );
$$;

-- Helper to retrieve current user's workspace
create or replace function my_org() returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select workspace_id from profiles where id = auth.uid() and status = 'approved' limit 1),
    (select org_id from members where user_id = auth.uid() limit 1)
  );
$$;

-- 4. Business Core Tables
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default my_org() references orgs on delete cascade,
  name text not null,
  phone text not null,
  area text,
  village text,
  address text,
  loc text,
  id_note text,
  guarantor text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists loans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default my_org() references orgs on delete cascade,
  customer_id uuid not null references customers on delete cascade,
  mode text not null check (mode in ('daily', 'weekly')),
  principal numeric not null,
  int_type text not null check (int_type in ('pct', 'amt')),
  int_val numeric not null default 0,
  total numeric not null,
  n int not null,
  inst numeric not null,
  start_date date not null,
  created_at timestamptz default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default my_org() references orgs on delete cascade,
  loan_id uuid not null references loans on delete cascade,
  paid_on date not null default current_date,
  amount numeric not null check (amount > 0),
  by_user uuid default auth.uid(),
  notes text,
  created_at timestamptz default now()
);

create table if not exists plan_days (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default my_org() references orgs on delete cascade,
  day date not null,
  loan_id uuid not null references loans on delete cascade,
  unique (day, loan_id)
);

create index if not exists idx_customers_org on customers (org_id);
create index if not exists idx_loans_org on loans (org_id);
create index if not exists idx_loans_customer on loans (customer_id);
create index if not exists idx_payments_loan on payments (loan_id, paid_on);

-- 5. Row Level Security Policies
alter table profiles enable row level security;
alter table orgs enable row level security;
alter table members enable row level security;

-- Profiles: users can read their own profile; admins can read & update all
create policy "own profile" on profiles for select using (id = auth.uid() or is_admin());
create policy "user inserts profile" on profiles for insert with check (id = auth.uid());
create policy "admin updates profiles" on profiles for update using (is_admin() or id = auth.uid());

-- Orgs: members can view their org; admins can view all
create policy "org access" on orgs for select using (id = my_org() or is_admin());
create policy "org insert" on orgs for insert with check (auth.uid() is not null);
create policy "org update" on orgs for update using (id = my_org() or is_admin());

-- Members
create policy "member access" on members for all using (org_id = my_org() or is_admin());

-- Data tables
do $$ declare t text; begin
  foreach t in array array['customers', 'loans', 'payments', 'plan_days'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "%s_access" on %I for all using (org_id = my_org() or is_admin()) with check (org_id = my_org() or is_admin())', t, t);
  end loop;
end $$;
