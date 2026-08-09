-- claim_access_code declares OUT parameters agent_id/customer_id via
-- `returns table (role text, agent_id uuid, customer_id uuid)`. PL/pgSQL
-- turns those into variables in scope for the whole function body, so the
-- unqualified `agent_id`/`customer_id` in the DELETE's WHERE clause were
-- ambiguous between that variable and the public.profiles column of the
-- same name -- PostgreSQL error 42702 "column reference is ambiguous" at
-- runtime, every time. This is what was silently failing account creation
-- and leaving people on "you don't have an account yet" after a valid code,
-- with no row ever written to profiles/access_codes (the whole function
-- runs as one statement, so the failure rolled everything back -- no code
-- was ever actually burned by a failed attempt).
create or replace function public.claim_access_code(p_code text)
returns table (role text, agent_id uuid, customer_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.access_codes%rowtype;
begin
  select * into v_row from public.access_codes where code = upper(p_code);

  if v_row.id is null then
    raise exception 'Invalid code';
  end if;
  if v_row.status = 'used' then
    raise exception 'This code has already been used';
  end if;
  if v_row.status = 'revoked' then
    raise exception 'This code is no longer valid';
  end if;

  -- Evict any stale profile already bound to this agent/customer, so an old
  -- Google/email login can no longer pull their data.
  delete from public.profiles p
  where p.id <> auth.uid()
    and ((v_row.role = 'agent' and p.agent_id = v_row.agent_id)
      or (v_row.role = 'customer' and p.customer_id = v_row.customer_id));

  insert into public.profiles (id, role, agent_id, customer_id)
  values (auth.uid(), v_row.role, v_row.agent_id, v_row.customer_id)
  on conflict (id) do update
    set role = excluded.role, agent_id = excluded.agent_id, customer_id = excluded.customer_id;

  update public.access_codes
    set status = 'used', used_at = now(), used_by = auth.uid()
    where id = v_row.id;

  return query select v_row.role, v_row.agent_id, v_row.customer_id;
end;
$$;
