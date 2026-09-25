-- Return inbox rows as JSON so PostgREST never performs a second table
-- privilege check while expanding a setof applications result.
begin;

create or replace function public.list_applications_json()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_application_leader() then
    raise exception 'Founder or President access required.' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb)
    into result
  from public.applications a;

  return result;
end;
$$;

revoke all on function public.list_applications_json() from public, anon, authenticated;
grant execute on function public.list_applications_json() to authenticated;

-- Remove the one synthetic RPC probe created during diagnosis.
delete from public.applications where email = 'rpc-probe@invalid.example';

commit;
