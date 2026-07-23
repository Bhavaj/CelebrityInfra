-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor).
--
-- Read-only, non-consuming lookup so the "Create account" flow can preview
-- who a code belongs to (e.g. "Claiming: Ravi Kumar, Agent") before the
-- person enters an email and verifies it. Does not touch access_codes'
-- status -- only claim_access_code (002) marks a code used.

create or replace function public.check_access_code(p_code text)
returns table (role text, label text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.access_codes%rowtype;
  v_label text;
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

  if v_row.role = 'agent' then
    select name into v_label from public.agents where id = v_row.agent_id;
  else
    select name into v_label from public.customers where id = v_row.customer_id;
  end if;

  return query select v_row.role, v_label;
end;
$$;

grant execute on function public.check_access_code(text) to anon, authenticated;
