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

-- A new sign-up gets a member profile — and only if the address is
-- allowed. Enforcing this here rather than in JavaScript matters: the
-- check in supabase-config.js is cosmetic, because anyone can call the
-- auth API directly and skip the page entirely.
--
-- Set ALLOWED_DOMAIN to '' to let any address sign up.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  allowed_domain constant text := '@student.fuhsd.org';
  founder_email  constant text := 'reyanshnankani@gmail.com';
begin
  if allowed_domain <> ''
     and lower(new.email) <> lower(founder_email)
     and right(lower(new.email), length(allowed_domain)) <> allowed_domain then
    raise exception 'Only % addresses may create an account.', allowed_domain
      using errcode = 'check_violation';
  end if;

  insert into profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
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

-- ─── applications ──────────────────────────────────────────
create table if not exists applications (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  name          text not null,
  email         text not null,
  grade         int,
  role_applied  sica_role not null,
  a_badly       text,
  a_quiet       text,
  a_busy_week   text,
  referral      text,
  status        text not null default 'submitted'
                check (status in ('submitted','interview','approved','rejected','archived')),
  reviewed_by   text,
  reviewed_at   timestamptz,
  review_note   text
);

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
-- Row Level Security
-- ═══════════════════════════════════════════════════════════
alter table profiles      enable row level security;
alter table applications  enable row level security;
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
create policy "anyone may apply"     on applications for insert to anon, authenticated with check (true);
create policy "officers read apps"   on applications for select using (is_officer());
create policy "officers review apps" on applications for update using (is_officer()) with check (is_officer());

-- members, meetings, tasks
drop policy if exists "officers manage members"  on members;
drop policy if exists "read meetings"            on meetings;
drop policy if exists "officers manage meetings" on meetings;
drop policy if exists "officers manage tasks"    on tasks;
drop policy if exists "read own tasks"           on tasks;
create policy "officers manage members"  on members  for all    using (is_officer()) with check (is_officer());
create policy "read meetings"            on meetings for select using (is_officer());
create policy "officers manage meetings" on meetings for all    using (is_officer()) with check (is_officer());
create policy "officers manage tasks"    on tasks    for all    using (is_officer()) with check (is_officer());
create policy "read own tasks"           on tasks    for select using (owner_id = auth.uid() or is_officer());

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
create policy "read announcements"   on announcements for select using (is_officer());
create policy "officers post"        on announcements for all    using (is_officer()) with check (is_officer());
create policy "read documents"       on documents     for select using (is_officer());
create policy "officers manage docs" on documents     for all    using (is_officer()) with check (is_officer());

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
