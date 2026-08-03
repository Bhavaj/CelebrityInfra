-- Applied directly to the live project via the Supabase MCP tool (tracked in
-- supabase_migrations.schema_migrations from here on, unlike 001-004 which
-- were hand-run in the SQL editor).
--
-- Replaces the old model where each agent had one fixed quota_percent and a
-- static split{} jsonb computed once at agent-creation time. The business
-- actually negotiates a commission % per agent PER PROJECT, and any upline
-- automatically earns the "gap" between their own rate and the rate they
-- gave the downline they sponsored -- cascading indefinitely up the sponsor
-- chain. Worked example: A=25% (project rate), sponsors B at 18% -> A earns
-- 7% on every one of B's sales. B sponsors C at 15% -> B earns 3% on C's
-- sales, and A *still* automatically earns their 7% on C's sales too (25 -
-- 18, not 25 - 15), because the override at each link is against the rate
-- one level below, not against the closer's rate directly.

-- 1. Per-project negotiated rate --------------------------------------------

create table public.agent_project_rates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  commission_pct numeric not null check (commission_pct >= 0 and commission_pct <= 100),
  created_at timestamptz not null default now(),
  unique (project_id, agent_id)
);
alter table public.agent_project_rates enable row level security;

create policy "admin agent_project_rates select" on public.agent_project_rates
  for select to authenticated
  using (is_admin());

create policy "agent views own project rate" on public.agent_project_rates
  for select to authenticated
  using (
    agent_id = (select profiles.agent_id from public.profiles where profiles.id = auth.uid())
  );

-- Inserts/updates go through set_agent_project_rate() below, not direct
-- table access, so no insert/update policy is needed for regular users.

-- effective_agent_rate: the project-specific negotiated rate if the admin
-- has set one, else the agent's default quota_percent.
create or replace function public.effective_agent_rate(p_agent_id uuid, p_project_id uuid)
returns numeric
language sql
stable
as $$
  select coalesce(
    (select commission_pct from public.agent_project_rates
      where agent_id = p_agent_id and project_id = p_project_id),
    (select quota_percent from public.agents where id = p_agent_id)
  );
$$;

create or replace function public.set_agent_project_rate(p_project_id uuid, p_agent_id uuid, p_pct numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Only admin can set commission rates';
  end if;
  if p_pct < 0 or p_pct > 100 then
    raise exception 'Commission percent must be between 0 and 100';
  end if;

  insert into public.agent_project_rates (project_id, agent_id, commission_pct)
  values (p_project_id, p_agent_id, p_pct)
  on conflict (project_id, agent_id)
    do update set commission_pct = excluded.commission_pct;
end;
$$;

-- 2. Gap-fill cascade at sale time -------------------------------------------

create or replace function public.record_sale(p_plot_id uuid, p_customer_id uuid, p_closer_id uuid, p_sale_date date)
returns void
language plpgsql
as $$
declare
  v_price numeric;
  v_project_id uuid;
  v_rate numeric;
  v_prev_rate numeric;
  v_cur_agent uuid;
  v_sponsor uuid;
  v_guard int := 0;
begin
  select price, project_id into v_price, v_project_id from public.plots where id = p_plot_id;

  update public.plots set status='sold', customer_id=p_customer_id,
    closed_by_agent_id=p_closer_id, sale_date=p_sale_date
    where id = p_plot_id;

  delete from public.commissions where plot_id = p_plot_id;

  -- Closer keeps their own effective rate as "Direct" commission.
  v_rate := public.effective_agent_rate(p_closer_id, v_project_id);
  insert into public.commissions(plot_id, beneficiary_id, closer_id, pct, amount, kind)
  values (p_plot_id, p_closer_id, p_closer_id, v_rate, round(v_price * v_rate / 100), 'Direct');

  -- Walk the sponsor chain upward; each link earns the gap between their own
  -- rate and the rate one level below them (not the original closer's rate),
  -- so the override keeps compounding correctly at every depth.
  v_prev_rate := v_rate;
  v_cur_agent := p_closer_id;

  loop
    v_guard := v_guard + 1;
    exit when v_guard > 50; -- safety cap against a corrupt sponsor cycle

    select sponsor_id into v_sponsor from public.agents where id = v_cur_agent;
    exit when v_sponsor is null;

    v_rate := public.effective_agent_rate(v_sponsor, v_project_id);

    if v_rate > v_prev_rate then
      insert into public.commissions(plot_id, beneficiary_id, closer_id, pct, amount, kind)
      values (p_plot_id, v_sponsor, p_closer_id, v_rate - v_prev_rate, round(v_price * (v_rate - v_prev_rate) / 100), 'Referral bonus');
    end if;

    v_prev_rate := v_rate;
    v_cur_agent := v_sponsor;
  end loop;
end;
$$;

-- 3. Drop the superseded static split column --------------------------------
-- No commissions have been recorded yet against the old split-based logic,
-- so this is safe to drop outright rather than keep as dead weight.
alter table public.agents drop column split;
