-- Interest validation and private per-officer sidebar preferences.
-- Self-contained upgrade; preserves all existing signups and documents.
begin;
create or replace function public.interest_sentence_count(input_text text)
returns integer language sql immutable set search_path=pg_catalog as $$
  select count(*)::integer from unnest(regexp_split_to_array(btrim(input_text), '[.!?]+([[:space:]]+|$)')) as parts(part)
  where btrim(part) <> '';
$$;

create table if not exists public.interest_signups (
  id uuid primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 100),
  grade int not null check (grade between 9 and 12),
  student_id text not null check (student_id ~ '^[0-9]{7}$'),
  email text not null unique check (email = lower(email) and email ~ '^[a-z0-9]([a-z0-9._%+-]{0,62}[a-z0-9])?@fuhsd\.org$'),
  interest text not null check (char_length(interest) <= 1000 and cardinality(regexp_split_to_array(btrim(interest), E'\\s+'))  >= 15 and public.interest_sentence_count(interest) between 2 and 3),
  question text check (char_length(question) <= 1500)
);
-- Preserve any historical rows without silently rewriting student emails.
-- NOT VALID still enforces the corrected domain on every new/updated row.
alter table public.interest_signups drop constraint if exists interest_signups_email_check;
alter table public.interest_signups add constraint interest_signups_email_check
  check (email = lower(email) and email ~ '^[a-z0-9]([a-z0-9._%+-]{0,62}[a-z0-9])?@fuhsd\.org$') not valid;
alter table public.interest_signups drop constraint if exists interest_signups_student_id_check;
alter table public.interest_signups add constraint interest_signups_student_id_check check (student_id ~ '^[0-9]{7}$') not valid;
alter table public.interest_signups drop constraint if exists interest_signups_interest_check;
alter table public.interest_signups add constraint interest_signups_interest_check check (
  char_length(interest) <= 1000 and cardinality(regexp_split_to_array(btrim(interest), E'\\s+')) >= 15
  and public.interest_sentence_count(interest) between 2 and 3
) not valid;
alter table public.interest_signups enable row level security;
revoke all on public.interest_signups from anon, authenticated;
grant select on public.interest_signups to authenticated;
drop policy if exists "leaders read interest signups" on public.interest_signups;
create policy "leaders read interest signups" on public.interest_signups for select to authenticated
using (exists (select 1 from public.profiles where id=auth.uid() and role in ('founder','president','vp')));
create or replace function public.submit_interest(payload jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_grade integer; v_name text; v_email text; v_student text; v_interest text; v_question text;
begin
  if payload is null or jsonb_typeof(payload)<>'object' then raise exception 'Please complete the interest form.'; end if;
  v_id := (payload->>'id')::uuid; v_grade := (payload->>'grade')::integer;
  v_name := btrim(payload->>'name'); v_email := lower(btrim(payload->>'email'));
  v_student := payload->>'student_id'; v_interest := btrim(payload->>'interest');
  v_question := nullif(btrim(payload->>'question'),'');
  if v_id is null or v_name is null or char_length(v_name) not between 1 and 100 or v_grade is null or v_grade not between 9 and 12 or v_student is null or v_student !~ '^[0-9]{7}$' then raise exception 'Provide your name, grade, and a student ID containing exactly 7 digits.'; end if;
  if v_email is null or v_email !~ '^[a-z0-9]([a-z0-9._%+-]{0,62}[a-z0-9])?@fuhsd\.org$' then raise exception 'Use your @fuhsd.org student email.'; end if;
  if v_interest is null or char_length(v_interest)>1000 or (cardinality(regexp_split_to_array(v_interest,E'\\s+')) < 15 or public.interest_sentence_count(v_interest) not between 2 and 3) then raise exception 'Write 2-3 detailed sentences with at least 15 words total.'; end if;
  if char_length(v_question)>1500 then raise exception 'Keep your question under 1500 characters.'; end if;
  -- Retries and repeat emails neither create duplicates nor overwrite details.
  insert into public.interest_signups(id,name,grade,student_id,email,interest,question)
  values(v_id,v_name,v_grade,v_student,v_email,v_interest,v_question) on conflict do nothing;
  if not exists (select 1 from public.interest_signups where email=v_email) then
    raise exception 'We could not confirm your signup. Refresh and try again.';
  end if;
  return true;
end;
$$;
revoke all on function public.submit_interest(jsonb) from public;
grant execute on function public.submit_interest(jsonb) to anon,authenticated;
alter table public.documents add column if not exists purpose text not null default '';
grant select,insert,update on public.documents to authenticated;
grant select,insert,delete on storage.objects to authenticated;
grant select,insert,update on public.settings to authenticated;
create table if not exists public.sidebar_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferences jsonb not null default '{}' check (jsonb_typeof(preferences)='object' and octet_length(preferences::text)<=10000)
);
alter table public.sidebar_preferences enable row level security;
revoke all on public.sidebar_preferences from anon, authenticated;
grant select,insert,update on public.sidebar_preferences to authenticated;
drop policy if exists "own sidebar preferences" on public.sidebar_preferences;
create policy "own sidebar preferences" on public.sidebar_preferences for all to authenticated
using (user_id=auth.uid() and public.is_officer()) with check (user_id=auth.uid() and public.is_officer());
commit;
