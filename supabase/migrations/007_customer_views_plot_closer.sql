-- Applied directly to the live project via the Supabase MCP tool.
--
-- CustomerPortal (Portals.jsx) now renders every plot a customer owns, each
-- with the specific agent who closed THAT sale (plots.closed_by_agent_id) --
-- not just their single customers.agent_id "primary" referrer. Since a
-- customer can buy multiple plots through different agents, the existing
-- "customer views own agent" policy (scoped to customers.agent_id only)
-- isn't enough; this adds the missing read for any closer tied to one of
-- their own plots.

create policy "customer views own plot closer agent" on public.agents
  for select to authenticated
  using (
    exists (
      select 1 from public.plots pl
      join public.profiles p on p.customer_id = pl.customer_id
      where pl.closed_by_agent_id = agents.id and p.id = auth.uid()
    )
  );
