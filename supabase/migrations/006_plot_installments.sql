-- Applied directly to the live project via the Supabase MCP tool.
--
-- Per-plot payment schedule so admin/agent/customer can all see "what's due
-- and when" -- customers pay via EMI/partial amounts over time (existing
-- transactions table already handles partial payments), this table just
-- defines the schedule those payments are measured against. Admin can add,
-- edit, or delete rows (including changing a due_date) at any time.

create table public.plot_installments (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.plots(id) on delete cascade,
  label text not null,
  amount numeric not null check (amount > 0),
  due_date date not null,
  created_at timestamptz not null default now()
);
alter table public.plot_installments enable row level security;

create policy "admin plot_installments select" on public.plot_installments
  for select to authenticated
  using (is_admin());

create policy "admin plot_installments insert" on public.plot_installments
  for insert to authenticated
  with check (is_admin());

create policy "admin plot_installments update" on public.plot_installments
  for update to authenticated
  using (is_admin()) with check (is_admin());

create policy "admin plot_installments delete" on public.plot_installments
  for delete to authenticated
  using (is_admin());

create policy "customer views own plot installments" on public.plot_installments
  for select to authenticated
  using (
    exists (
      select 1 from public.plots pl
      join public.profiles p on p.customer_id = pl.customer_id
      where pl.id = plot_installments.plot_id and p.id = auth.uid()
    )
  );

create policy "agent views closed plot installments" on public.plot_installments
  for select to authenticated
  using (
    exists (
      select 1 from public.plots pl
      join public.profiles p on p.agent_id = pl.closed_by_agent_id
      where pl.id = plot_installments.plot_id and p.id = auth.uid()
    )
  );
