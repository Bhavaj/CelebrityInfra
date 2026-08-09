-- Tracks whether a commission has actually been paid out to the agent, as
-- opposed to just accrued. Nullable timestamp: null = outstanding, a value
-- = when the admin marked it paid. The existing "admin comm" policy is
-- `for all` using is_admin(), so admin can already update this column
-- directly -- no new RPC/policy needed.
alter table public.commissions add column paid_at timestamptz;
