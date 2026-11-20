-- Run once in Supabase > SQL Editor
create table orgs (id uuid primary key default gen_random_uuid(), name text not null, daily_on boolean default true, weekly_on boolean default true, created_at timestamptz default now());
create table members (user_id uuid references auth.users on delete cascade, org_id uuid references orgs on delete cascade, role text not null default 'collector' check (role in ('owner','collector')), primary key (user_id, org_id));
create function my_org() returns uuid language sql stable security definer set search_path = public as $$ select org_id from members where user_id = auth.uid() limit 1 $$;

create table customers (id uuid primary key default gen_random_uuid(), org_id uuid not null default my_org() references orgs on delete cascade, name text not null, phone text not null, area text, village text, address text, loc text, id_note text, guarantor text, notes text, created_at timestamptz default now());
create table loans (id uuid primary key default gen_random_uuid(), org_id uuid not null default my_org() references orgs on delete cascade, customer_id uuid not null references customers on delete cascade, mode text not null check (mode in ('daily','weekly')), principal numeric not null, int_type text not null check (int_type in ('pct','amt')), int_val numeric not null default 0, total numeric not null, n int not null, inst numeric not null, start_date date not null, created_at timestamptz default now());
create table payments (id uuid primary key default gen_random_uuid(), org_id uuid not null default my_org() references orgs on delete cascade, loan_id uuid not null references loans on delete cascade, paid_on date not null default current_date, amount numeric not null check (amount > 0), by_user uuid default auth.uid(), created_at timestamptz default now());
create table plan_days (id uuid primary key default gen_random_uuid(), org_id uuid not null default my_org() references orgs on delete cascade, day date not null, loan_id uuid not null references loans on delete cascade, unique (day, loan_id));
create index on customers (org_id); create index on loans (customer_id); create index on payments (loan_id, paid_on);

alter table orgs enable row level security; alter table members enable row level security;
create policy "own org" on orgs for select using (id = my_org());
create policy "owner edits org" on orgs for update using (id = my_org() and exists (select 1 from members m where m.user_id = auth.uid() and m.org_id = orgs.id and m.role = 'owner'));
create policy "own members" on members for select using (org_id = my_org());
do $$ declare t text; begin foreach t in array array['customers','loans','payments','plan_days'] loop
  execute format('alter table %I enable row level security', t);
  execute format('create policy "org access" on %I for all using (org_id = my_org()) with check (org_id = my_org())', t);
end loop; end $$;

create function create_org(org_name text) returns uuid language plpgsql security definer set search_path = public as $$
declare o uuid; begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if exists (select 1 from members where user_id = auth.uid()) then raise exception 'already set up'; end if;
  insert into orgs (name) values (org_name) returning id into o;
  insert into members (user_id, org_id, role) values (auth.uid(), o, 'owner');
  return o; end $$;
revoke execute on function create_org(text) from public, anon;
grant execute on function create_org(text) to authenticated;
