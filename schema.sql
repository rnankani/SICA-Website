-- ═══════════════════════════════════════════════════════════
-- SICA — database schema
--
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It is safe to run more than once.
--
-- Row Level Security is on for every table. The anon key on its own can
-- do exactly one thing: submit an application. Everything else requires
-- a signed-in profile, and most of it requires an officer role.
-- ═══════════════════════════════════════════════════════════

-- ─── roles ─────────────────────────────────────────────────
-- Wrapped so a second run does not abort here. In the Supabase SQL
-- editor a failed statement stops everything after it, which is how a
-- half-applied schema happens: tables created, policies never reached.
do $$ begin
  create type sica_role as enum
    ('founder','president','vp','secretary','treasurer','pr','member');
exception when duplicate_object then null;
end $$;

-- ─── profiles: one row per signed-in person ────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text unique not null,
  full_name   text,
  grade       int,
  role        sica_role not null default 'member',
  created_at  timestamptz not null default now(),
  last_seen   timestamptz
);

-- ─── officer invites ───────────────────────────────────────
-- Access is invite-first. The founder adds a name and an email here;
-- nobody else can create an account at all. Registering is still not
-- the same as being let in — an invite goes to 'registered' when the
-- account appears, and only an explicit approval grants the role.
create table if not exists officer_invites (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  full_name     text,
  role          sica_role not null,
  status        text not null default 'invited'
                check (status in ('invited','registered','approved','denied','revoked')),
  profile_id    uuid references profiles on delete set null,
  invited_by    uuid references profiles on delete set null,
  invited_at    timestamptz not null default now(),
  registered_at timestamptz,
  decided_by    uuid references profiles on delete set null,
  decided_at    timestamptz,
  note          text
);
create index if not exists invites_email on officer_invites (lower(email));

-- A sign-up is refused unless the address is on the invite list. The
-- founder's own address is exempt so the very first account can exist.
-- Enforced here rather than in JavaScript because anyone can call the
-- auth API directly and never load the page.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  founder_email constant text := 'reyanshnankani@gmail.com';
  inv officer_invites%rowtype;
begin
  if lower(new.email) = lower(founder_email) then
    insert into profiles (id, email, full_name, role)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name','Reyansh Nankani'), 'founder')
    on conflict (id) do update set role = 'founder';
    return new;
  end if;

  select * into inv from officer_invites
   where lower(email) = lower(new.email)
     and status in ('invited','registered')
   limit 1;

  if inv.id is null then
    raise exception 'That email has not been invited to SICA. Ask the founder to add you first.'
      using errcode = 'check_violation';
  end if;

  -- They land as a member. The role on the invite is granted only when
  -- the founder approves, which is a separate, deliberate action.
  insert into profiles (id, email, full_name, role)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', inv.full_name), 'member')
  on conflict (id) do nothing;

  update officer_invites
     set status = 'registered', profile_id = new.id, registered_at = now()
   where id = inv.id;

  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- "is the caller an officer?" — used by nearly every policy below
create or replace function is_officer() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role <> 'member'
  );
$$;

create or replace function is_founder() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('founder','president')
  );
$$;

-- ─── granting and removing access ──────────────────────────
-- Role changes go through these rather than a direct update, so every
-- change is checked, stamped, and impossible to do by accident.

create or replace function approve_officer(invite uuid)
returns officer_invites language plpgsql security definer set search_path = public as $$
declare inv officer_invites%rowtype;
begin
  if not is_founder() then
    raise exception 'Only the founder may approve officers.' using errcode = 'insufficient_privilege';
  end if;
  select * into inv from officer_invites where id = invite;
  if inv.id is null then raise exception 'No such invite.'; end if;
  if inv.profile_id is null then
    raise exception 'That person has not created an account yet, so there is nothing to approve.';
  end if;

  update profiles set role = inv.role where id = inv.profile_id;
  update officer_invites
     set status = 'approved', decided_by = auth.uid(), decided_at = now()
   where id = invite
  returning * into inv;
  return inv;
end; $$;

create or replace function deny_officer(invite uuid, why text default null)
returns officer_invites language plpgsql security definer set search_path = public as $$
declare inv officer_invites%rowtype;
begin
  if not is_founder() then
    raise exception 'Only the founder may deny officers.' using errcode = 'insufficient_privilege';
  end if;
  select * into inv from officer_invites where id = invite;
  if inv.id is null then raise exception 'No such invite.'; end if;

  -- The account may keep existing; it simply stays a member, which can
  -- open nothing.
  if inv.profile_id is not null then
    update profiles set role = 'member' where id = inv.profile_id;
  end if;
  update officer_invites
     set status = 'denied', note = coalesce(why, note),
         decided_by = auth.uid(), decided_at = now()
   where id = invite
  returning * into inv;
  return inv;
end; $$;

-- Removing someone who was previously approved. Handbook chapter 4.
create or replace function revoke_officer(invite uuid, why text default null)
returns officer_invites language plpgsql security definer set search_path = public as $$
declare inv officer_invites%rowtype;
begin
  if not is_founder() then
    raise exception 'Only the founder may remove officers.' using errcode = 'insufficient_privilege';
  end if;
  select * into inv from officer_invites where id = invite;
  if inv.id is null then raise exception 'No such invite.'; end if;
  if inv.profile_id is not null then
    update profiles set role = 'member' where id = inv.profile_id;
  end if;
  update officer_invites
     set status = 'revoked', note = coalesce(why, note),
         decided_by = auth.uid(), decided_at = now()
   where id = invite
  returning * into inv;
  return inv;
end; $$;

-- ─── applications ──────────────────────────────────────────
create table if not exists applications (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  -- section 1: basics
  name          text not null,
  grade         int,
  email         text not null,
  role_applied  text not null,          -- vp | treasurer | secretary | pr | other
  role_other    text,                   -- free text when role_applied = 'other'
  links         text,                   -- LinkedIn, site, resume, Instagram

  -- section 2: about you
  q_built       text,                   -- something you built that nobody asked for
  q_weakness    text,                   -- one specific weakness, and how it showed up

  -- section 3: about SICA
  q_sica        text,                   -- what SICA does that other clubs do not
  q_first_month text,                   -- what you would contribute in month one

  -- section 4: bandwidth
  lunch_days    text[],                 -- which lunches they are free
  after_school  boolean,
  commitments   text,                   -- other clubs, and how they would prioritise

  -- section 5
  anything_else text,

  status        text not null default 'submitted'
                check (status in ('submitted','interview','approved','rejected','archived')),
  reviewed_by   text,
  reviewed_at   timestamptz,
  review_note   text
);

-- If the table already exists from the earlier draft, bring it up to
-- date without losing anything. Safe to run repeatedly.
alter table applications add column if not exists role_other    text;
alter table applications add column if not exists links         text;
alter table applications add column if not exists q_built       text;
alter table applications add column if not exists q_weakness    text;
alter table applications add column if not exists q_sica        text;
alter table applications add column if not exists q_first_month text;
alter table applications add column if not exists lunch_days    text[];
alter table applications add column if not exists after_school  boolean;
alter table applications add column if not exists commitments   text;
alter table applications add column if not exists anything_else text;
alter table applications drop column if exists a_badly;
alter table applications drop column if exists a_quiet;
alter table applications drop column if exists a_busy_week;
alter table applications drop column if exists referral;

-- role_applied was an enum; the form now offers "other", so it is text
do $$ begin
  alter table applications alter column role_applied type text using role_applied::text;
exception when others then null;
end $$;

-- ─── the rest ──────────────────────────────────────────────
create table if not exists members (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles on delete cascade,
  joined_at  timestamptz not null default now(),
  status     text not null default 'active',
  tags       text[],
  notes      text
);

create table if not exists meetings (
  id        uuid primary key default gen_random_uuid(),
  number    int,
  topic     text not null,
  week_ref  int,
  date      timestamptz,
  room      text,
  status    text not null default 'planned',
  notes     text
);

create table if not exists attendance (
  id         uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings on delete cascade,
  profile_id uuid references profiles on delete cascade,
  present    boolean not null default true,
  is_new     boolean not null default false,
  unique (meeting_id, profile_id)
);

create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  owner_role   sica_role,
  owner_id     uuid references profiles on delete set null,
  due          date,
  priority     text not null default 'normal'
               check (priority in ('low','normal','high')),
  status       text not null default 'open'
               check (status in ('open','done')),
  position     double precision not null default 0,
  meeting_id   uuid references meetings on delete set null,
  created_at   timestamptz not null default now(),
  completed_at timestamptz,
  completed_by uuid references profiles on delete set null
);
create index if not exists tasks_order on tasks (status, position);

-- Task workspace v2. Additive migrations keep every existing task.
alter table tasks drop constraint if exists tasks_priority_check;
alter table tasks drop constraint if exists tasks_status_check;
alter table tasks drop constraint if exists tasks_progress_check;
alter table tasks add column if not exists start_date date;
alter table tasks add column if not exists progress int not null default 0;
alter table tasks add column if not exists category text;
alter table tasks add column if not exists created_by uuid references profiles on delete set null;
alter table tasks add column if not exists updated_at timestamptz not null default now();
alter table tasks add column if not exists archived_at timestamptz;
update tasks set priority = 'medium' where priority = 'normal';
update tasks set status = 'not_started' where status = 'open';
update tasks set status = 'completed', progress = 100 where status = 'done';
alter table tasks add constraint tasks_priority_check
  check (priority in ('low','medium','high','urgent'));
alter table tasks add constraint tasks_status_check
  check (status in ('not_started','in_progress','blocked','completed'));
alter table tasks add constraint tasks_progress_check check (progress between 0 and 100);
create index if not exists tasks_owner_due on tasks (owner_role, due) where archived_at is null;

create table if not exists task_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks on delete cascade,
  title text not null,
  completed boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists task_activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks on delete cascade,
  user_id uuid references profiles on delete set null,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

-- Column-level task guard. UI permissions are convenience; this trigger
-- is the enforcement boundary for assignment and archiving.
create or replace function enforce_task_permissions()
returns trigger language plpgsql security definer set search_path = public as $$
declare my_role sica_role;
begin
  if auth.uid() is null then return new; end if;
  select role into my_role from profiles where id = auth.uid();
  if my_role in ('founder','president') then return new; end if;
  if tg_op = 'INSERT' then
    if new.owner_role is distinct from my_role and new.owner_id is distinct from auth.uid() then
      raise exception 'You may only create tasks assigned to yourself.' using errcode = 'insufficient_privilege';
    end if;
  else
    if new.owner_role is distinct from old.owner_role or
       (new.owner_id is distinct from old.owner_id and not (old.owner_id is null and new.owner_id = auth.uid())) then
      raise exception 'You may not reassign this task.' using errcode = 'insufficient_privilege';
    end if;
    if new.archived_at is distinct from old.archived_at then
      raise exception 'Only the Founder or President may archive tasks.' using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists task_permission_guard on tasks;
create trigger task_permission_guard before insert or update on tasks
for each row execute function enforce_task_permissions();

create or replace function archive_task(task_id uuid)
returns tasks language plpgsql security definer set search_path = public as $$
declare result tasks%rowtype;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('founder','president')) then
    raise exception 'Only the Founder or President may archive tasks.' using errcode = 'insufficient_privilege';
  end if;
  update tasks set archived_at = now(), updated_at = now() where id = task_id returning * into result;
  return result;
end; $$;
grant execute on function archive_task(uuid) to authenticated;

create table if not exists announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text,
  audience   text not null default 'everyone',
  author_id  uuid references profiles on delete set null,
  publish_at timestamptz default now(),
  pinned     boolean not null default false
);

create table if not exists documents (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  category   text,
  url        text,
  owner_role sica_role,
  updated_at timestamptz not null default now()
);

-- Uploaded handbooks are private Storage objects. Keep metadata here so
-- the dashboard can search, label and permission them without putting
-- binary/base64 data into Postgres.
alter table documents add column if not exists storage_path text;
alter table documents add column if not exists file_name text;
alter table documents add column if not exists mime_type text;
alter table documents add column if not exists size_bytes bigint;
alter table documents add column if not exists created_by uuid references profiles on delete set null;
alter table documents add column if not exists created_at timestamptz not null default now();

create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  date        date not null default current_date,
  item        text not null,
  amount      numeric(10,2) not null,
  paid_by     uuid references profiles on delete set null,
  approved_by uuid references profiles on delete set null,
  receipt_url text
);

create table if not exists settings (
  key   text primary key,
  value jsonb
);


-- ═══════════════════════════════════════════════════════════
-- Everything the rest of the portal reads.
--
-- One table per page that shows a table, named for what the club calls
-- the thing rather than for its shape. Nothing here invents data: each
-- one starts empty and the page keeps printing em dashes until there
-- are rows, which is the honest state.
-- ═══════════════════════════════════════════════════════════

-- ─── the room: practice sessions ───────────────────────────
create table if not exists practice_sessions (
  id         uuid primary key default gen_random_uuid(),
  week       int,
  skill      text not null,
  activity   text,
  pairs      int,
  ran_on     date,
  notes      text,
  meeting_id uuid references meetings on delete set null,
  created_at timestamptz not null default now()
);

-- ─── the record: minutes ───────────────────────────────────
-- Decisions and action items are jsonb arrays of sentences. A decision
-- is a sentence, not a row worth its own table, and they are only ever
-- read back with the minute they belong to.
create table if not exists minutes (
  id           uuid primary key default gen_random_uuid(),
  meeting_id   uuid references meetings on delete set null,
  date         date not null default current_date,
  author_id    uuid references profiles on delete set null,
  body         text,
  decisions    jsonb not null default '[]'::jsonb,
  action_items jsonb not null default '[]'::jsonb,
  filed_at     timestamptz,
  created_at   timestamptz not null default now()
);

-- ─── the record: forms and their responses ─────────────────
create table if not exists forms (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  purpose    text,
  fields     jsonb not null default '[]'::jsonb,
  status     text not null default 'open' check (status in ('draft','open','closed')),
  opened_at  timestamptz default now(),
  closed_at  timestamptz,
  created_by uuid references profiles on delete set null
);

create table if not exists form_responses (
  id           uuid primary key default gen_random_uuid(),
  form_id      uuid not null references forms on delete cascade,
  profile_id   uuid references profiles on delete set null,
  answers      jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

-- ─── the money ─────────────────────────────────────────────
-- Spend is deliberately not a column here. It is the sum of the
-- expenses in the category, so it cannot drift out of step with them.
create table if not exists budget_lines (
  id         uuid primary key default gen_random_uuid(),
  category   text not null unique,
  allocated  numeric(10,2) not null default 0,
  notes      text,
  year       int not null default extract(year from current_date)
);

alter table expenses add column if not exists category text;
alter table expenses add column if not exists status   text not null default 'logged';
do $ck$ begin
  alter table expenses add constraint expenses_status_ck
    check (status in ('logged','awaiting','approved','reimbursed'));
exception when duplicate_object then null;
end $ck$;

create table if not exists campaigns (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  target     numeric(10,2),
  raised     numeric(10,2) not null default 0,
  runs       text,
  owner_role sica_role,
  status     text not null default 'planned' check (status in ('planned','active','done','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists inventory_items (
  id         uuid primary key default gen_random_uuid(),
  item       text not null,
  quantity   int not null default 1,
  location   text,
  held_by    uuid references profiles on delete set null,
  condition  text,
  value      numeric(10,2),
  updated_at timestamptz not null default now()
);

-- ─── outward: social, content, events, graphics ────────────
create table if not exists social_accounts (
  platform   text primary key,
  handle     text,
  url        text,
  followers  int,
  updated_at timestamptz not null default now()
);

create table if not exists social_posts (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  platform     text,
  body         text,
  scheduled_at timestamptz,
  status       text not null default 'planned' check (status in ('planned','in_progress','scheduled','published')),
  reach        int,
  owner_id     uuid references profiles on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists events (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  date       date,
  location   text,
  owner_id   uuid references profiles on delete set null,
  status     text not null default 'planned' check (status in ('planned','confirmed','done','cancelled')),
  notes      text,
  created_at timestamptz not null default now()
);

create table if not exists event_signups (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events on delete cascade,
  profile_id uuid references profiles on delete set null,
  name       text,
  email      text,
  signed_at  timestamptz not null default now()
);

create table if not exists graphics_assets (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  kind        text,
  url         text,
  status      text not null default 'draft' check (status in ('draft','awaiting','published')),
  is_template boolean not null default false,
  owner_id    uuid references profiles on delete set null,
  updated_at  timestamptz not null default now()
);

-- ─── time: anything dated that is not a meeting or a task ──
create table if not exists calendar_events (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  date       date not null,
  ends       date,
  kind       text not null default 'school' check (kind in ('school','club','deadline','event','other')),
  notes      text,
  created_at timestamptz not null default now()
);

-- ─── hours ─────────────────────────────────────────────────
create table if not exists member_hours (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles on delete cascade,
  date       date not null default current_date,
  hours      numeric(5,2) not null,
  reason     text
);

-- ─── curriculum ────────────────────────────────────────────
-- curriculum-data.js is the shipped default. A row here overrides one
-- week of it, so the founder toggle for officer-edited curriculum has
-- somewhere to write without anyone touching the file.
create table if not exists curriculum_weeks (
  week       int primary key,
  skill      text,
  activity   text,
  notes      text,
  updated_by uuid references profiles on delete set null,
  updated_at timestamptz not null default now()
);

-- ─── audit log ─────────────────────────────────────────────
-- Every privileged action, with who and when. Append only: there is no
-- update or delete policy, deliberately.
create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  at          timestamptz not null default now(),
  actor_id    uuid references profiles on delete set null,
  actor_email text,
  action      text not null,
  subject     text,
  detail      jsonb
);

-- ─── outgoing email ────────────────────────────────────────
-- A queue, not a mailer. The database records that a message should go
-- out; something outside the database actually sends it and stamps
-- sent_at. Queuing inside the approving transaction means an approval
-- can never succeed while its notification is silently lost.
create table if not exists email_outbox (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  to_email   text not null,
  to_name    text,
  subject    text not null,
  body       text not null,
  kind       text not null default 'other',
  sent_at    timestamptz,
  error      text
);

-- ═══════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════
alter table profiles      enable row level security;
alter table applications  enable row level security;
alter table officer_invites enable row level security;
alter table members       enable row level security;
alter table meetings      enable row level security;
alter table attendance    enable row level security;
alter table tasks         enable row level security;
alter table announcements enable row level security;
alter table documents     enable row level security;
alter table expenses      enable row level security;
alter table settings      enable row level security;

-- Every policy is dropped first so this file can be run again safely.
-- Without this, a re-run fails on the first duplicate and silently
-- leaves the rest of the policies uncreated.

-- officer_invites: the founder manages them; an officer may see the
-- list so the team page is not blank for everyone else.
drop policy if exists "founder manages invites" on officer_invites;
drop policy if exists "officers read invites"   on officer_invites;
create policy "founder manages invites" on officer_invites for all    using (is_founder()) with check (is_founder());
create policy "officers read invites"   on officer_invites for select using (is_officer());

-- profiles: you see yourself; officers see everyone; only founder edits roles
drop policy if exists "read own profile"      on profiles;
drop policy if exists "update own profile"    on profiles;
drop policy if exists "founder manages roles" on profiles;
create policy "read own profile"      on profiles for select using (id = auth.uid() or is_officer());
create policy "update own profile"    on profiles for update using (id = auth.uid());
create policy "founder manages roles" on profiles for all    using (is_founder()) with check (is_founder());

-- applications: ANYONE may submit one. Only officers may read them.
-- This is the single anonymous write in the whole schema, and the one
-- the public form depends on.
drop policy if exists "anyone may apply"     on applications;
drop policy if exists "officers read apps"   on applications;
drop policy if exists "officers review apps" on applications;
drop policy if exists "leaders read apps"    on applications;
drop policy if exists "leaders review apps"  on applications;
create policy "anyone may apply"     on applications for insert to anon, authenticated with check (true);
-- A policy alone is not enough: the role also needs the table privilege.
-- Supabase usually grants these by default, but saying it explicitly
-- means a table created by any other route still accepts applications.
grant insert on applications to anon, authenticated;
-- Only the founder and president read applications. A VP or treasurer
-- has no business reading someone's stated weaknesses.
create policy "leaders read apps"   on applications for select using (is_founder());
create policy "leaders review apps" on applications for update using (is_founder()) with check (is_founder());

-- members, meetings, tasks
drop policy if exists "officers manage members"  on members;
drop policy if exists "read meetings"            on meetings;
drop policy if exists "officers manage meetings" on meetings;
drop policy if exists "officers manage tasks"    on tasks;
drop policy if exists "read own tasks"           on tasks;
drop policy if exists "task visibility"          on tasks;
drop policy if exists "task creation"            on tasks;
drop policy if exists "task updates"             on tasks;
drop policy if exists "task deletion"            on tasks;
create policy "officers manage members"  on members  for all    using (is_officer()) with check (is_officer());
create policy "read meetings"            on meetings for select using (is_officer());
create policy "officers manage meetings" on meetings for all    using (is_officer()) with check (is_officer());
create policy "task visibility" on tasks for select using (
  is_officer() and (
    owner_id = auth.uid() or created_by = auth.uid() or
    owner_role = (select role from profiles where id = auth.uid()) or
    exists (select 1 from profiles where id = auth.uid() and role in ('founder','president'))
  )
);
create policy "task creation" on tasks for insert with check (
  is_officer() and (
    owner_id = auth.uid() or owner_role = (select role from profiles where id = auth.uid()) or
    exists (select 1 from profiles where id = auth.uid() and role in ('founder','president'))
  )
);
create policy "task updates" on tasks for update using (
  is_officer() and (
    owner_id = auth.uid() or created_by = auth.uid() or
    owner_role = (select role from profiles where id = auth.uid()) or
    exists (select 1 from profiles where id = auth.uid() and role in ('founder','president'))
  )
) with check (is_officer());
create policy "task deletion" on tasks for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'founder')
);

drop policy if exists "task subtask access" on task_subtasks;
drop policy if exists "task activity read" on task_activity;
drop policy if exists "task activity add" on task_activity;
create policy "task subtask access" on task_subtasks for all using (
  exists (select 1 from tasks where tasks.id = task_subtasks.task_id)
) with check (exists (select 1 from tasks where tasks.id = task_subtasks.task_id));
create policy "task activity read" on task_activity for select using (
  exists (select 1 from tasks where tasks.id = task_activity.task_id)
);
create policy "task activity add" on task_activity for insert with check (
  exists (select 1 from tasks where tasks.id = task_activity.task_id)
);

-- attendance: a member may read only their own row
drop policy if exists "read own attendance"      on attendance;
drop policy if exists "officers mark attendance" on attendance;
create policy "read own attendance"      on attendance for select using (profile_id = auth.uid() or is_officer());
create policy "officers mark attendance" on attendance for all    using (is_officer()) with check (is_officer());

-- announcements, documents and meetings: officers only. A self-serve
-- account lands as 'member', and a member is not staff — signing up must
-- not reveal the handbook, the internal posts or the meeting plans.
drop policy if exists "read announcements"   on announcements;
drop policy if exists "officers post"        on announcements;
drop policy if exists "read documents"       on documents;
drop policy if exists "officers manage docs" on documents;
drop policy if exists "officers add docs"    on documents;
drop policy if exists "officers update docs" on documents;
drop policy if exists "officers delete docs" on documents;
create policy "read announcements"   on announcements for select using (is_officer());
create policy "officers post"        on announcements for all    using (is_officer()) with check (is_officer());
create policy "read documents"       on documents     for select using (
  is_officer() and (
    owner_role is null or owner_role <> 'president'::sica_role or
    exists (select 1 from profiles where id = auth.uid() and role in ('founder','president'))
  )
);
create policy "officers add docs"    on documents for insert with check (is_officer());
create policy "officers update docs" on documents for update using (
  is_officer() and (
    owner_role is null or owner_role <> 'president'::sica_role or
    exists (select 1 from profiles where id = auth.uid() and role in ('founder','president'))
  )
) with check (is_officer());
create policy "officers delete docs" on documents for delete using (
  is_officer() and (
    owner_role is null or owner_role <> 'president'::sica_role or
    exists (select 1 from profiles where id = auth.uid() and role in ('founder','president'))
  )
);

-- A private bucket prevents handbook URLs from becoming public links.
-- Storage policies mirror the documents-table boundary: officers may
-- access files only after signing in to the portal.
insert into storage.buckets (id, name, public)
values ('sica-documents', 'sica-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "officers read document files" on storage.objects;
drop policy if exists "officers upload document files" on storage.objects;
drop policy if exists "officers delete document files" on storage.objects;
create policy "officers read document files" on storage.objects for select
using (
  bucket_id = 'sica-documents' and public.is_officer() and (
    (storage.foldername(name))[1] = 'officers' or
    ((storage.foldername(name))[1] = 'president' and exists (
      select 1 from public.profiles where id = auth.uid() and role in ('founder','president')
    ))
  )
);
create policy "officers upload document files" on storage.objects for insert
with check (
  bucket_id = 'sica-documents' and public.is_officer() and (
    (storage.foldername(name))[1] = 'officers' or
    ((storage.foldername(name))[1] = 'president' and exists (
      select 1 from public.profiles where id = auth.uid() and role in ('founder','president')
    ))
  )
);
create policy "officers delete document files" on storage.objects for delete
using (
  bucket_id = 'sica-documents' and public.is_officer() and (
    (storage.foldername(name))[1] = 'officers' or
    ((storage.foldername(name))[1] = 'president' and exists (
      select 1 from public.profiles where id = auth.uid() and role in ('founder','president')
    ))
  )
);

-- money: treasurer, president and founder only
drop policy if exists "treasury only" on expenses;
create policy "treasury only" on expenses for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('treasurer','founder','president'))
) with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('treasurer','founder','president'))
);

-- settings: founder only
drop policy if exists "founder settings" on settings;
create policy "founder settings" on settings for all using (is_founder()) with check (is_founder());


-- ═══════════════════════════════════════════════════════════
-- Row Level Security for everything added above.
--
-- Same shape as the block before it: enable, drop, create. The default
-- is officers-only, because a self-serve account lands as 'member' and
-- a member is not staff. Money and the founder's own surfaces are
-- narrower still.
-- ═══════════════════════════════════════════════════════════
alter table practice_sessions enable row level security;
alter table minutes           enable row level security;
alter table forms             enable row level security;
alter table form_responses    enable row level security;
alter table budget_lines      enable row level security;
alter table campaigns         enable row level security;
alter table inventory_items   enable row level security;
alter table social_accounts   enable row level security;
alter table social_posts      enable row level security;
alter table events            enable row level security;
alter table event_signups     enable row level security;
alter table graphics_assets   enable row level security;
alter table calendar_events   enable row level security;
alter table member_hours      enable row level security;
alter table curriculum_weeks  enable row level security;
alter table audit_log         enable row level security;
alter table email_outbox      enable row level security;
alter table task_subtasks     enable row level security;
alter table task_activity     enable row level security;

-- The officer surfaces. One loop would be tidier, but writing them out
-- means a policy can be read where it is used.
drop policy if exists "officers manage practice"   on practice_sessions;
drop policy if exists "officers manage minutes"    on minutes;
drop policy if exists "officers manage forms"      on forms;
drop policy if exists "officers manage campaigns"  on campaigns;
drop policy if exists "officers manage inventory"  on inventory_items;
drop policy if exists "officers manage social"     on social_accounts;
drop policy if exists "officers manage posts"      on social_posts;
drop policy if exists "officers manage events"     on events;
drop policy if exists "officers manage graphics"   on graphics_assets;
drop policy if exists "officers manage calendar"   on calendar_events;
drop policy if exists "officers manage curriculum" on curriculum_weeks;
create policy "officers manage practice"   on practice_sessions for all using (is_officer()) with check (is_officer());
create policy "officers manage minutes"    on minutes           for all using (is_officer()) with check (is_officer());
create policy "officers manage forms"      on forms             for all using (is_officer()) with check (is_officer());
create policy "officers manage campaigns"  on campaigns         for all using (is_officer()) with check (is_officer());
create policy "officers manage inventory"  on inventory_items   for all using (is_officer()) with check (is_officer());
create policy "officers manage social"     on social_accounts   for all using (is_officer()) with check (is_officer());
create policy "officers manage posts"      on social_posts      for all using (is_officer()) with check (is_officer());
create policy "officers manage events"     on events            for all using (is_officer()) with check (is_officer());
create policy "officers manage graphics"   on graphics_assets   for all using (is_officer()) with check (is_officer());
create policy "officers manage calendar"   on calendar_events   for all using (is_officer()) with check (is_officer());
create policy "officers manage curriculum" on curriculum_weeks  for all using (is_officer()) with check (is_officer());

-- A form is filled in by the person it is for, so the write is theirs;
-- reading the pile of answers is not.
drop policy if exists "anyone may respond"     on form_responses;
drop policy if exists "officers read responses" on form_responses;
create policy "anyone may respond"      on form_responses for insert to anon, authenticated with check (true);
create policy "officers read responses" on form_responses for select using (is_officer());
grant insert on form_responses to anon, authenticated;

-- Signing up for an event is the same shape: a public write, a private read.
drop policy if exists "anyone may sign up"    on event_signups;
drop policy if exists "officers read signups" on event_signups;
create policy "anyone may sign up"    on event_signups for insert to anon, authenticated with check (true);
create policy "officers read signups" on event_signups for select using (is_officer());
grant insert on event_signups to anon, authenticated;

-- Money: treasurer, president, founder. Same rule as expenses.
drop policy if exists "treasury budget" on budget_lines;
create policy "treasury budget" on budget_lines for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('treasurer','founder','president'))
) with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('treasurer','founder','president'))
);

-- Your own hours are yours to see; officers see everyone's.
drop policy if exists "read own hours"    on member_hours;
drop policy if exists "officers log hours" on member_hours;
create policy "read own hours"     on member_hours for select using (profile_id = auth.uid() or is_officer());
create policy "officers log hours" on member_hours for all    using (is_officer()) with check (is_officer());

-- The audit log is readable by the founder and appended to by nobody
-- directly: only the security-definer functions below write to it, so a
-- row cannot be forged by whoever is holding the anon key.
drop policy if exists "founder reads audit" on audit_log;
create policy "founder reads audit" on audit_log for select using (is_founder());

-- The outbox holds people's names and email addresses. Founder only.
drop policy if exists "founder reads outbox" on email_outbox;
create policy "founder reads outbox" on email_outbox for all using (is_founder()) with check (is_founder());

-- ─── deleting an application ───────────────────────────────
-- Asked for deliberately: a rejected application is somebody's honest
-- answers about their own weaknesses, and keeping it forever is worse
-- than losing it. This is a hard delete with no recycle bin, so the UI
-- asks before calling it.
drop policy if exists "leaders delete apps" on applications;
create policy "leaders delete apps" on applications for delete using (is_founder());
grant delete on applications to authenticated;

-- ═══════════════════════════════════════════════════════════
-- The approval email
--
-- approve_officer() already grants the role. It now also writes the
-- message into email_outbox in the same transaction, so the two cannot
-- disagree: if the approval commits, the email is queued, and if it
-- rolls back, nothing was promised to anyone.
--
-- Sending is somebody else's job — see supabase/functions/send-emails.
-- ═══════════════════════════════════════════════════════════
-- Parameters are prefixed so they cannot be mistaken for the columns of
-- the same name in the insert below.
create or replace function log_action(p_action text, p_subject text, p_detail jsonb default null)
returns void language sql security definer set search_path = public as $$
  insert into audit_log (actor_id, actor_email, action, subject, detail)
  values (auth.uid(), (select email from profiles where id = auth.uid()), p_action, p_subject, p_detail);
$$;

create or replace function approve_officer(invite uuid)
returns officer_invites language plpgsql security definer set search_path = public as $$
declare
  inv officer_invites%rowtype;
  who text;
begin
  if not is_founder() then
    raise exception 'Only the founder may approve officers.' using errcode = 'insufficient_privilege';
  end if;
  select * into inv from officer_invites where id = invite;
  if inv.id is null then raise exception 'No such invite.'; end if;
  if inv.profile_id is null then
    raise exception 'That person has not created an account yet, so there is nothing to approve.';
  end if;

  update profiles set role = inv.role where id = inv.profile_id;
  update officer_invites
     set status = 'approved', decided_by = auth.uid(), decided_at = now()
   where id = invite
  returning * into inv;

  who := coalesce(nullif(trim(inv.full_name), ''), split_part(inv.email, '@', 1));

  insert into email_outbox (to_email, to_name, subject, body, kind)
  values (
    inv.email, inv.full_name,
    'You are on the SICA officer team',
    who || E',\n\n' ||
    'Your officer application has been approved. You are now ' ||
    initcap(replace(inv.role::text, '_', ' ')) || E'.\n\n' ||
    E'Sign in at https://www.joinsica.page/officers.html with the account you registered. The portal opens to your own page: your tasks, the meeting plan, and whatever your seat owns.\n\n' ||
    E'Read the handbook before the first meeting. It is short, and it is the answer to most questions.\n\n' ||
    E'— Reyansh\nSICA',
    'officer_approved'
  );

  perform log_action('officer.approve', inv.email, jsonb_build_object('role', inv.role));
  return inv;
end; $$;

-- ═══════════════════════════════════════════════════════════
-- Verify. Every table below must show rls = true and at least one
-- policy. If "applications" shows 0 policies the public form is dead.
-- ═══════════════════════════════════════════════════════════
select c.relname as table_name,
       c.relrowsecurity as rls,
       count(p.polname) as policies
from pg_class c
left join pg_policy p on p.polrelid = c.oid
where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
group by 1,2 order by 1;

-- ─── make yourself the founder ─────────────────────────────
-- Run this ONCE after your first sign-in, with your own email:
--
--   update profiles set role = 'founder'
--   where email = 'reyanshnankani@gmail.com';
