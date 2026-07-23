-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor).
--
-- The customer portal now shows the buyer's assigned agent's name/phone
-- (Portals.jsx CustomerPortal). Existing "agents" policies only let an agent
-- see themselves/their downline plus admin-all -- a customer session has no
-- policy letting it read the agents row it's linked to. Additive, same
-- pattern as the other narrow select policies in 001/002.

create policy "customer views own agent" on public.agents
  for select to authenticated
  using (
    exists (
      select 1 from public.customers c
      join public.profiles p on p.customer_id = c.id
      where c.agent_id = agents.id and p.id = auth.uid()
    )
  );
