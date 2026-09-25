-- All application review transitions go through one founder-only function.
-- This avoids direct PATCH permission drift and validates every status.
begin;

create or replace function public.set_application_status(
  p_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  changed public.applications;
begin
  if not public.is_application_leader() then
    raise exception 'Founder or President access required.' using errcode = '42501';
  end if;

  if p_status not in ('submitted', 'interview', 'approved', 'rejected', 'archived') then
    raise exception 'Invalid application status.' using errcode = '22023';
  end if;

  update public.applications
     set status = p_status,
         review_note = p_note,
         reviewed_at = now(),
         reviewed_by = coalesce(auth.jwt() ->> 'email', auth.uid()::text)
   where id = p_id
   returning * into changed;

  if changed.id is null then
    raise exception 'Application not found.' using errcode = 'P0002';
  end if;

  return to_jsonb(changed);
end;
$$;

revoke all on function public.set_application_status(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.set_application_status(uuid, text, text)
  to authenticated;

commit;
