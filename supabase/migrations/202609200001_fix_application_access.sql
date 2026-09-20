-- Make the application inbox authoritative across every device.
-- Frontend deployments do not apply schema.sql, so run this migration
-- against the linked Supabase project (or paste it into SQL Editor once).
begin;

create or replace function public.is_founder() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('founder','president')
  );
$$;

alter table public.applications enable row level security;

drop policy if exists "anyone may apply" on public.applications;
drop policy if exists "officers read apps" on public.applications;
drop policy if exists "officers review apps" on public.applications;
drop policy if exists "leaders read apps" on public.applications;
drop policy if exists "leaders review apps" on public.applications;
drop policy if exists "leaders delete apps" on public.applications;

create policy "anyone may apply"
  on public.applications for insert
  to anon, authenticated
  with check (true);

create policy "leaders read apps"
  on public.applications for select
  to authenticated
  using (public.is_founder());

create policy "leaders review apps"
  on public.applications for update
  to authenticated
  using (public.is_founder())
  with check (public.is_founder());

create policy "leaders delete apps"
  on public.applications for delete
  to authenticated
  using (public.is_founder());

grant usage on schema public to anon, authenticated;
grant insert on table public.applications to anon, authenticated;
grant select, update, delete on table public.applications to authenticated;
revoke select, update, delete on table public.applications from anon;

commit;
