-- Close NEW intake without changing any existing application or review access.
-- This also covers old browser tabs and direct REST/RPC submissions.
begin;
create or replace function public.reject_closed_officer_intake()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception using errcode = 'P0001',
    message = 'Officer applications are closed. This round closed on September 25.';
end;
$$;
revoke all on function public.reject_closed_officer_intake() from public;
drop trigger if exists officer_intake_closed on public.applications;
create trigger officer_intake_closed
  before insert on public.applications
  for each row execute function public.reject_closed_officer_intake();
commit;
-- Reopening requires an explicit database change:
-- drop trigger officer_intake_closed on public.applications;
