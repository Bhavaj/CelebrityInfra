-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor).
--
-- Uses the confirmed existing convention: admin access is gated by is_admin(),
-- not a profiles.role subquery. Existing "admin X" policies are `for all`,
-- which is permissive/additive with any other policy on the same table -- so a
-- narrower delete-only policy alongside an unrestricted `for all` policy would
-- be a no-op (Postgres OR's them together, and `for all` already covers delete).
-- To make the safe-delete rules real (not just a UI convention), each existing
-- `for all` admin policy is replaced with split select/insert/update policies
-- (identical behavior to before) plus a new, restricted delete-only policy.
-- This is DROP POLICY + CREATE POLICY only -- no data is touched.

-- 1. Leads table
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  preferred_date text,
  status text not null default 'new'
    check (status in ('new','site_visit','negotiating','booked','lost')),
  source text not null default 'homepage',
  notes text,
  converted_customer_id uuid references public.customers(id),
  created_at timestamptz not null default now()
);
alter table public.leads enable row level security;

create policy "anon insert leads" on public.leads
  for insert to anon
  with check (source = 'homepage' and status = 'new');

create policy "admin leads select" on public.leads
  for select to authenticated
  using (is_admin());

create policy "admin leads update" on public.leads
  for update to authenticated
  using (is_admin()) with check (is_admin());

create policy "admin delete leads" on public.leads
  for delete to authenticated
  using (is_admin());

-- 2. Archive columns
alter table public.projects add column archived boolean not null default false;
alter table public.agents   add column archived boolean not null default false;

-- 3. Projects: "read projects" already grants SELECT to all authenticated users,
-- so admin doesn't need its own select policy here. Replace "admin projects".
drop policy "admin projects" on public.projects;

create policy "admin projects insert" on public.projects
  for insert to authenticated
  with check (is_admin());

create policy "admin projects update" on public.projects
  for update to authenticated
  using (is_admin()) with check (is_admin());

create policy "admin delete empty projects" on public.projects
  for delete to authenticated
  using (
    is_admin()
    and not exists (select 1 from public.plots where plots.project_id = projects.id)
  );

-- 4. Plots: "read plots" already grants SELECT to all authenticated users.
drop policy "admin plots" on public.plots;

create policy "admin plots insert" on public.plots
  for insert to authenticated
  with check (is_admin());

create policy "admin plots update" on public.plots
  for update to authenticated
  using (is_admin()) with check (is_admin());

create policy "admin delete unsold plots no history" on public.plots
  for delete to authenticated
  using (
    is_admin()
    and status <> 'sold'
    and not exists (select 1 from public.transactions where transactions.plot_id = plots.id)
    and not exists (select 1 from public.commissions where commissions.plot_id = plots.id)
  );

-- 5. Agents: no generic "read agents" exists (only "agent self", scoped to one's
-- own record/downline), so admin needs its own select policy here too.
drop policy "admin agents" on public.agents;

create policy "admin agents select" on public.agents
  for select to authenticated
  using (is_admin());

create policy "admin agents insert" on public.agents
  for insert to authenticated
  with check (is_admin());

create policy "admin agents update" on public.agents
  for update to authenticated
  using (is_admin()) with check (is_admin());

create policy "admin delete leaf agents" on public.agents
  for delete to authenticated
  using (
    is_admin()
    and not exists (select 1 from public.agents a2 where a2.sponsor_id = agents.id)
    and not exists (select 1 from public.customers where customers.agent_id = agents.id)
    and not exists (select 1 from public.commissions where commissions.beneficiary_id = agents.id)
  );

-- 6. Customers: no generic "read customers" exists (only "agent customers",
-- scoped to one's own linked customers), so admin needs its own select policy too.
drop policy "admin customers" on public.customers;

create policy "admin customers select" on public.customers
  for select to authenticated
  using (is_admin());

create policy "admin customers insert" on public.customers
  for insert to authenticated
  with check (is_admin());

create policy "admin customers update" on public.customers
  for update to authenticated
  using (is_admin()) with check (is_admin());

create policy "admin delete unlinked customers" on public.customers
  for delete to authenticated
  using (
    is_admin()
    and not exists (select 1 from public.plots where plots.customer_id = customers.id)
    and not exists (select 1 from public.transactions where transactions.customer_id = customers.id)
  );
