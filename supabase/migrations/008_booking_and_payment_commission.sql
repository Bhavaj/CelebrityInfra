-- Replaces the all-or-nothing "record_sale" model with a two-step flow:
-- book_plot() just assigns a plot to a customer + agent (status='booked',
-- no commission yet) and record_payment() logs a payment AND accrues
-- commission on that payment increment only (same rate + sponsor gap-fill
-- cascade as before, scaled to the amount actually received). A plot
-- auto-flips to 'sold' once cumulative payments reach the full price;
-- admin can still mark it sold manually for a cash-in-full deal.
--
-- Also replaces customers.agent_id ("referred by", one agent globally) with
-- customer_project_agents: a customer can have a different (or the same)
-- agent per project, admin-assignable, used as the default when booking a
-- plot for that customer in that project.

-- 1. Per-project customer -> agent assignment ------------------------------

create table public.customer_project_agents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, project_id)
);
alter table public.customer_project_agents enable row level security;

create policy "admin customer_project_agents all" on public.customer_project_agents
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy "agent views own project-customer assignments" on public.customer_project_agents
  for select to authenticated
  using (
    agent_id = (select profiles.agent_id from public.profiles where profiles.id = auth.uid())
  );

-- 2. Drop the old single global "referred by" column ------------------------

drop policy "agent customers" on public.customers;
drop policy "admin delete leaf agents" on public.agents;
drop policy "customer views own agent" on public.agents;
alter table public.customers drop column agent_id;

create policy "agent customers" on public.customers
  for select to authenticated
  using (
    exists (
      select 1 from public.customer_project_agents cpa
      where cpa.customer_id = customers.id
        and cpa.agent_id = (select profiles.agent_id from public.profiles where profiles.id = auth.uid())
    )
  );

create policy "admin delete leaf agents" on public.agents
  for delete to authenticated
  using (
    is_admin()
    and not exists (select 1 from public.agents a2 where a2.sponsor_id = agents.id)
    and not exists (select 1 from public.customer_project_agents cpa where cpa.agent_id = agents.id)
    and not exists (select 1 from public.commissions where commissions.beneficiary_id = agents.id)
  );

create policy "customer views own agent" on public.agents
  for select to authenticated
  using (
    exists (
      select 1 from public.customer_project_agents cpa
      join public.profiles p on p.customer_id = cpa.customer_id
      where cpa.agent_id = agents.id and p.id = auth.uid()
    )
  );

-- 3. Track which transaction a commission row came from --------------------
-- Nullable + on delete cascade so if a payment is ever removed, the
-- commission it generated goes with it instead of being left orphaned.

alter table public.commissions add column transaction_id uuid references public.transactions(id) on delete cascade;

-- 4. Booking (assignment only, no commission) -------------------------------

drop function public.record_sale(uuid, uuid, uuid, date);

create or replace function public.book_plot(p_plot_id uuid, p_customer_id uuid, p_agent_id uuid, p_booking_date date)
returns void
language plpgsql
as $$
begin
  update public.plots
    set status = 'booked', customer_id = p_customer_id, closed_by_agent_id = p_agent_id, sale_date = p_booking_date
    where id = p_plot_id and status = 'available';

  if not found then
    raise exception 'This plot is not available to book.';
  end if;
end;
$$;

-- 5. Record a payment + accrue commission on that increment -----------------

create or replace function public.record_payment(p_plot_id uuid, p_amount numeric, p_date date, p_type text)
returns void
language plpgsql
as $$
declare
  v_customer_id uuid;
  v_project_id uuid;
  v_price numeric;
  v_closer_id uuid;
  v_tx_id uuid;
  v_rate numeric;
  v_prev_rate numeric;
  v_cur_agent uuid;
  v_sponsor uuid;
  v_guard int := 0;
  v_paid_total numeric;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than 0';
  end if;

  select customer_id, project_id, price, closed_by_agent_id
    into v_customer_id, v_project_id, v_price, v_closer_id
    from public.plots where id = p_plot_id;

  if v_customer_id is null or v_closer_id is null then
    raise exception 'This plot has not been booked to a customer/agent yet.';
  end if;

  insert into public.transactions (plot_id, customer_id, amount, date, type)
  values (p_plot_id, v_customer_id, p_amount, p_date, p_type)
  returning id into v_tx_id;

  v_rate := public.effective_agent_rate(v_closer_id, v_project_id);
  insert into public.commissions(plot_id, beneficiary_id, closer_id, pct, amount, kind, transaction_id)
  values (p_plot_id, v_closer_id, v_closer_id, v_rate, round(p_amount * v_rate / 100), 'Direct', v_tx_id);

  v_prev_rate := v_rate;
  v_cur_agent := v_closer_id;

  loop
    v_guard := v_guard + 1;
    exit when v_guard > 50; -- safety cap against a corrupt sponsor cycle

    select sponsor_id into v_sponsor from public.agents where id = v_cur_agent;
    exit when v_sponsor is null;

    v_rate := public.effective_agent_rate(v_sponsor, v_project_id);

    if v_rate > v_prev_rate then
      insert into public.commissions(plot_id, beneficiary_id, closer_id, pct, amount, kind, transaction_id)
      values (p_plot_id, v_sponsor, v_closer_id, v_rate - v_prev_rate, round(p_amount * (v_rate - v_prev_rate) / 100), 'Referral bonus', v_tx_id);
    end if;

    v_prev_rate := v_rate;
    v_cur_agent := v_sponsor;
  end loop;

  select coalesce(sum(amount), 0) into v_paid_total from public.transactions where plot_id = p_plot_id;
  if v_paid_total >= v_price then
    update public.plots set status = 'sold' where id = p_plot_id and status = 'booked';
  end if;
end;
$$;
