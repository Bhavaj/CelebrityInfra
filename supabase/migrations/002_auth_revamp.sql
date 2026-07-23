-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor).
--
-- Replaces email/password login with role-specific flows:
--   - Admin: Google or email OTP, linked manually via the existing
--     list_users/link_user path (unchanged, not a scam vector worth gating).
--   - Agent & Customer: admin-issued one-time invite code, claimed after
--     signing in with Google or email OTP (whichever they have). The code
--     is what prevents anyone from self-registering as an agent or
--     plot-buyer; phone-based binding may be added later if needed, but
--     isn't part of this pass (avoids SMS provider costs for now).
--   - Every agent/customer also gets a stable human-readable member_code
--     (AG01, CU01, ...) independent of however they're currently logged
--     in, so admin can look someone up and reissue their code if they
--     lose access to their Google/email login.

-- 1. Human-readable member codes ------------------------------------------------

create sequence public.agent_code_seq;
create sequence public.customer_code_seq;

alter table public.agents add column member_code text unique;
alter table public.customers add column member_code text unique;

create or replace function public.set_agent_member_code()
returns trigger language plpgsql as $$
begin
  if new.member_code is null then
    new.member_code := 'AG' || lpad(nextval('public.agent_code_seq')::text, 2, '0');
  end if;
  return new;
end;
$$;

create or replace function public.set_customer_member_code()
returns trigger language plpgsql as $$
begin
  if new.member_code is null then
    new.member_code := 'CU' || lpad(nextval('public.customer_code_seq')::text, 2, '0');
  end if;
  return new;
end;
$$;

create trigger agents_member_code before insert on public.agents
  for each row execute function public.set_agent_member_code();

create trigger customers_member_code before insert on public.customers
  for each row execute function public.set_customer_member_code();

-- Backfill existing rows (oldest first, so ids roughly line up with creation order).
do $$
declare r record;
begin
  for r in select id from public.agents where member_code is null order by created_at loop
    update public.agents set member_code = 'AG' || lpad(nextval('public.agent_code_seq')::text, 2, '0') where id = r.id;
  end loop;
  for r in select id from public.customers where member_code is null order by created_at loop
    update public.customers set member_code = 'CU' || lpad(nextval('public.customer_code_seq')::text, 2, '0') where id = r.id;
  end loop;
end $$;

alter table public.agents alter column member_code set not null;
alter table public.customers alter column member_code set not null;

-- 2. Invite codes ---------------------------------------------------------------

create table public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  role text not null check (role in ('agent', 'customer')),
  agent_id uuid references public.agents(id),
  customer_id uuid references public.customers(id),
  status text not null default 'active' check (status in ('active', 'used', 'revoked')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by uuid references auth.users(id),
  constraint access_codes_target check (
    (role = 'agent' and agent_id is not null and customer_id is null) or
    (role = 'customer' and customer_id is not null and agent_id is null)
  )
);
alter table public.access_codes enable row level security;

create policy "admin access_codes select" on public.access_codes
  for select to authenticated
  using (is_admin());

-- Inserts/updates go through the SECURITY DEFINER RPCs below, not direct table
-- access, so no insert/update policy is needed for regular authenticated users.

-- Generates a short, easy-to-read-aloud code: no 0/O/1/I confusion.
create or replace function public.generate_invite_code()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..8 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

create or replace function public.create_access_code(p_role text, p_target_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if not is_admin() then
    raise exception 'Only admin can issue access codes';
  end if;
  if p_role not in ('agent', 'customer') then
    raise exception 'Invalid role';
  end if;

  update public.access_codes set status = 'revoked'
  where status = 'active'
    and ((p_role = 'agent' and agent_id = p_target_id)
      or (p_role = 'customer' and customer_id = p_target_id));

  v_code := public.generate_invite_code();
  insert into public.access_codes (code, role, agent_id, customer_id, created_by)
  values (
    v_code, p_role,
    case when p_role = 'agent' then p_target_id end,
    case when p_role = 'customer' then p_target_id end,
    auth.uid()
  );
  return v_code;
end;
$$;

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
  delete from public.profiles
  where id <> auth.uid()
    and ((v_row.role = 'agent' and agent_id = v_row.agent_id)
      or (v_row.role = 'customer' and customer_id = v_row.customer_id));

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
