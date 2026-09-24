-- Make application intake and founder reads independent of fragile table
-- grants/policy combinations. The public can only submit and verify a UUID;
-- only the founder/president can read application contents.
begin;

create or replace function public.is_application_leader()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'reyanshnankani@gmail.com'
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('founder', 'president')
    );
$$;

create or replace function public.submit_application(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  application_id uuid;
  lunch_values text[];
begin
  if payload is null then
    raise exception 'Application data is required.' using errcode = '22023';
  end if;

  if coalesce(payload ->> 'name', '') = ''
     or coalesce(payload ->> 'email', '') = ''
     or coalesce(payload ->> 'role_applied', '') = '' then
    raise exception 'Name, email, and role are required.' using errcode = '22023';
  end if;

  begin
    application_id := coalesce(nullif(payload ->> 'id', '')::uuid, gen_random_uuid());
  exception when invalid_text_representation then
    raise exception 'Invalid application identifier.' using errcode = '22023';
  end;

  if jsonb_typeof(payload -> 'lunch_days') = 'array' then
    select array_agg(value) into lunch_values
    from jsonb_array_elements_text(payload -> 'lunch_days') as value;
  end if;

  insert into public.applications (
    id, name, grade, email, role_applied, role_other, links,
    q_built, q_weakness, q_sica, q_first_month,
    lunch_days, after_school, commitments, anything_else, status
  ) values (
    application_id,
    payload ->> 'name',
    nullif(payload ->> 'grade', '')::int,
    payload ->> 'email',
    payload ->> 'role_applied',
    nullif(payload ->> 'role_other', ''),
    nullif(payload ->> 'links', ''),
    nullif(payload ->> 'q_built', ''),
    nullif(payload ->> 'q_weakness', ''),
    nullif(payload ->> 'q_sica', ''),
    nullif(payload ->> 'q_first_month', ''),
    lunch_values,
    case when payload ? 'after_school' then (payload ->> 'after_school')::boolean else null end,
    nullif(payload ->> 'commitments', ''),
    nullif(payload ->> 'anything_else', ''),
    'submitted'
  )
  on conflict (id) do nothing;

  return application_id;
end;
$$;

create or replace function public.list_applications()
returns setof public.applications
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_application_leader() then
    raise exception 'Founder or President access required.' using errcode = '42501';
  end if;
  return query select a.* from public.applications a order by a.created_at desc;
end;
$$;

create or replace function public.application_submission_exists(p_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.applications where id = p_id);
$$;

-- Restricted to unmistakable invalid.example load-test rows. This allows
-- production delivery tests to clean up after themselves without granting
-- anonymous callers delete access to real applications.
create or replace function public.cleanup_application_load_test(p_batch text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if p_batch !~ '^[0-9]{8}-[a-f0-9]{8}$' then
    raise exception 'Invalid test batch.' using errcode = '22023';
  end if;
  delete from public.applications
  where name = 'SICA automated load test'
    and email like ('sica-loadtest+' || p_batch || '-%@invalid.example');
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

alter table public.applications enable row level security;
drop policy if exists "anyone may apply" on public.applications;
drop policy if exists "officers read apps" on public.applications;
drop policy if exists "officers review apps" on public.applications;
drop policy if exists "leaders read apps" on public.applications;
drop policy if exists "leaders review apps" on public.applications;
drop policy if exists "leaders delete apps" on public.applications;
create policy "anyone may apply" on public.applications
  for insert to anon, authenticated with check (true);
create policy "leaders read apps" on public.applications
  for select to authenticated using (public.is_application_leader());
create policy "leaders review apps" on public.applications
  for update to authenticated
  using (public.is_application_leader()) with check (public.is_application_leader());
create policy "leaders delete apps" on public.applications
  for delete to authenticated using (public.is_application_leader());
grant insert on table public.applications to anon, authenticated;
grant select, update, delete on table public.applications to authenticated;
revoke select, update, delete on table public.applications from anon;

revoke all on function public.is_application_leader() from public, anon, authenticated;
revoke all on function public.submit_application(jsonb) from public, anon, authenticated;
revoke all on function public.list_applications() from public, anon, authenticated;
revoke all on function public.application_submission_exists(uuid) from public, anon, authenticated;
revoke all on function public.cleanup_application_load_test(text) from public, anon, authenticated;

grant execute on function public.submit_application(jsonb) to anon, authenticated;
grant execute on function public.list_applications() to authenticated;
grant execute on function public.application_submission_exists(uuid) to anon, authenticated;
grant execute on function public.cleanup_application_load_test(text) to anon, authenticated;

commit;
