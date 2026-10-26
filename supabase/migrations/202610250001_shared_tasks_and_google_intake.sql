-- Shared task assignees and retirement of the custom public interest form.
-- Preserves every task, signup, application, document and user.
begin;
alter table public.tasks add column if not exists assignee_roles public.sica_role[] not null default '{}';
alter table public.tasks drop constraint if exists tasks_assignee_roles_check;
alter table public.tasks add constraint tasks_assignee_roles_check check (
  cardinality(assignee_roles)<=6 and array_position(assignee_roles,null) is null
  and not ('member'::public.sica_role=any(assignee_roles))
);
create or replace function public.enforce_task_permissions()
returns trigger language plpgsql security definer set search_path=public as $$
declare my_role sica_role;
begin
  if auth.uid() is null then return new; end if;
  select role into my_role from profiles where id=auth.uid();
  if my_role in ('founder','president') then return new; end if;
  if tg_op='INSERT' then
    if (new.owner_role is distinct from my_role and new.owner_id is distinct from auth.uid())
       or (new.owner_id is not null and new.owner_id is distinct from auth.uid())
       or (new.owner_role is not null and new.owner_role is distinct from my_role)
       or cardinality(new.assignee_roles)>0 then
      raise exception 'You may only create tasks assigned to yourself.' using errcode='insufficient_privilege';
    end if;
  else
    if new.owner_role is distinct from old.owner_role or new.owner_id is distinct from old.owner_id
       or new.assignee_roles is distinct from old.assignee_roles or new.created_by is distinct from old.created_by then
      raise exception 'You may not reassign this task.' using errcode='insufficient_privilege';
    end if;
    if new.archived_at is distinct from old.archived_at then
      raise exception 'Only the Founder or President may archive tasks.' using errcode='insufficient_privilege';
    end if;
  end if;
  return new;
end; $$;
drop policy if exists "task visibility" on public.tasks;
create policy "task visibility" on public.tasks for select using (
  is_officer() and (owner_id=auth.uid() or created_by=auth.uid()
    or owner_role=(select role from profiles where id=auth.uid())
    or (select role from profiles where id=auth.uid())=any(assignee_roles)
    or exists(select 1 from profiles where id=auth.uid() and role in ('founder','president')))
);
drop policy if exists "task updates" on public.tasks;
create policy "task updates" on public.tasks for update using (
  is_officer() and (owner_id=auth.uid() or created_by=auth.uid()
    or owner_role=(select role from profiles where id=auth.uid())
    or (select role from profiles where id=auth.uid())=any(assignee_roles)
    or exists(select 1 from profiles where id=auth.uid() and role in ('founder','president')))
) with check (is_officer());
-- Cached old forms must not silently keep using the retired intake.
create or replace function public.submit_interest(payload jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  raise exception 'Please use the official Google Interest Form. Return to joinsica.page and choose Interest Form.';
end; $$;
revoke all on function public.submit_interest(jsonb) from public;
grant execute on function public.submit_interest(jsonb) to anon,authenticated;
-- Explicit invitation grants: do not depend on project default privileges.
grant select,insert,update,delete on public.officer_invites to authenticated;
revoke all on public.officer_invites from anon;
grant select,update on public.email_outbox to authenticated;
revoke all on function public.approve_officer(uuid),public.deny_officer(uuid,text),public.revoke_officer(uuid,text) from public,anon;
grant execute on function public.approve_officer(uuid),public.deny_officer(uuid,text),public.revoke_officer(uuid,text) to authenticated;
-- Self-profile editing must never be a route to promoting your own role.
revoke insert,update,delete on public.profiles from authenticated,anon;
grant update(full_name,grade,last_seen) on public.profiles to authenticated;
notify pgrst,'reload schema';
commit;
