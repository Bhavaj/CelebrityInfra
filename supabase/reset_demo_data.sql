-- One-time cleanup script. Run manually in the Supabase SQL editor
-- (Dashboard -> SQL Editor). NOT part of the numbered migrations/ history —
-- this doesn't change schema, it wipes demo data so testing can start clean.
--
-- Keeps only these two logins (and their profile, whatever role it is):
--   bhavajbankai@gmail.com
--   vijaygolden123@gmail.com
-- Everything else — every project, plot, customer, agent, lead, invite
-- code, payment, commission, and every other login/profile — is deleted.
--
-- THIS IS IRREVERSIBLE ONCE COMMITTED. Recommended: run it as a transaction
-- so you can eyeball the "remaining" counts at the end before deciding
-- whether to keep the changes.
--
--   1. Select everything from "begin;" down through the two verification
--      selects at the bottom, and run it.
--   2. Check the verification output: profiles/auth.users should show
--      exactly 2 rows, business tables should show 0.
--   3. If it looks right, run `commit;` on its own. If not, run `rollback;`
--      and nothing will have changed.

begin;

-- Deepest children first so this works regardless of each table's ON DELETE
-- setting — nothing here relies on cascade behavior.
delete from public.commissions;
delete from public.transactions;
delete from public.plot_installments;
delete from public.customer_project_agents;
delete from public.agent_project_rates;
delete from public.access_codes;
delete from public.leads;
delete from public.plots;
delete from public.customers;
delete from public.agents;
delete from public.projects;

-- Member-code numbering (AG01, CU01, ...) starts fresh next time an
-- agent/customer is created.
alter sequence public.agent_code_seq restart with 1;
alter sequence public.customer_code_seq restart with 1;

-- Every login except the two kept emails, and its profile.
delete from public.profiles
where id not in (
  select id from auth.users where email in ('bhavajbankai@gmail.com', 'vijaygolden123@gmail.com')
);

delete from auth.users
where email not in ('bhavajbankai@gmail.com', 'vijaygolden123@gmail.com');

-- ---- verify before committing ----
select email, id from auth.users order by email;              -- expect exactly the 2 kept emails
select id, role, agent_id, customer_id from public.profiles;  -- expect exactly 2 rows, matching the above
select
  (select count(*) from public.projects) as projects,
  (select count(*) from public.agents) as agents,
  (select count(*) from public.customers) as customers,
  (select count(*) from public.plots) as plots;                -- expect all 0

-- commit;   -- uncomment (or run separately) once the checks above look right
-- rollback; -- run this instead if anything looks wrong
