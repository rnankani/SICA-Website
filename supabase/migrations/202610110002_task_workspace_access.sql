-- Daily workspace rollout. Apply after the existing schema.sql task v2 tables.
-- No task/application records are deleted or reset.
begin;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.tasks, public.task_subtasks to authenticated;
grant select on public.task_activity, public.profiles, public.meetings to authenticated;
alter table public.tasks alter column status set default 'not_started';
alter table public.tasks alter column priority set default 'medium';

-- History belongs to the same transaction as the task mutation. The old
-- browser implementation could save a task and silently fail to save history.
create or replace function public.record_task_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare event_name text; event_detail text;
begin
  if tg_op = 'INSERT' then
    event_name := 'created'; event_detail := 'Task created';
  elsif new.archived_at is distinct from old.archived_at and new.archived_at is not null then
    event_name := 'archived'; event_detail := 'Task archived';
  elsif new.status = 'completed' and old.status <> 'completed' then
    event_name := 'completed'; event_detail := 'Task completed';
  elsif old.status = 'completed' and new.status <> 'completed' then
    event_name := 'reopened'; event_detail := 'Task reopened';
  else
    event_name := 'updated';
    select string_agg(replace(n.key, '_', ' '), ', ' order by n.key)
      into event_detail from jsonb_each(to_jsonb(new)) n
      where n.key <> 'updated_at' and n.value is distinct from to_jsonb(old)->n.key;
    if event_detail is null then return new; end if;
    event_detail := 'Changed: ' || event_detail;
  end if;
  insert into public.task_activity(task_id, user_id, action, detail)
    values (new.id, auth.uid(), event_name, event_detail);
  return new;
end;
$$;
revoke all on function public.record_task_activity() from public;
revoke insert, update, delete on public.task_activity from anon, authenticated;
drop trigger if exists task_activity_audit on public.tasks;
create trigger task_activity_audit after insert or update on public.tasks
  for each row execute function public.record_task_activity();
commit;
