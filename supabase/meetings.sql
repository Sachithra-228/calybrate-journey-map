-- Calybrate Journey Map: the "Meetings" tab.
--   Meetings : Sandbox records each meeting (date, title, what was discussed) and uploads files (PDF, Word, Excel, CSV, images, anything).
--              A meeting is shared with both teams or kept for Sandbox only. Liveroom sees the shared ones, can discuss them,
--              and cannot add, change or upload anything.
--   Tasks    : Sandbox adds tasks (with optional screenshots), Liveroom ticks one when it is done, Sandbox confirms it to close it.
-- Run this in Supabase -> SQL Editor -> New query -> Run, AFTER schema.sql. It is safe to run again: if you ran an older
-- version of this file, running it again upgrades the tables and rules.
-- Comments reuse public.comments (node_id = 'mt:<meeting id>' or 'tk:<task id>'), so they show up in the normal activity feed and alerts.

-- Meetings -------------------------------------------------------------------------------------------------
create table if not exists public.meetings (
  id           uuid primary key default gen_random_uuid(),
  meeting_date date not null,
  title        text not null check (char_length(title) between 1 and 200),
  notes        text check (notes is null or char_length(notes) <= 10000),
  visibility   text not null default 'both' check (visibility in ('both', 'sandbox')),
  created_by   uuid not null references auth.users (id),
  team         text not null,
  display_name text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.meetings add column if not exists visibility text not null default 'both';
do $$ begin
  alter table public.meetings add constraint meetings_visibility_check check (visibility in ('both', 'sandbox'));
exception when duplicate_object then null; end $$;

alter table public.meetings enable row level security;

drop policy if exists mt_read on public.meetings;
create policy mt_read on public.meetings for select to authenticated
  using (public.is_member() and (visibility = 'both' or public.my_team() = 'sandbox'));
drop policy if exists mt_insert on public.meetings;
create policy mt_insert on public.meetings for insert to authenticated
  with check (public.my_team() = 'sandbox' and created_by = auth.uid() and team = 'sandbox');
drop policy if exists mt_update on public.meetings;
create policy mt_update on public.meetings for update to authenticated using (public.my_team() = 'sandbox') with check (public.my_team() = 'sandbox');
drop policy if exists mt_delete on public.meetings;
create policy mt_delete on public.meetings for delete to authenticated using (public.my_team() = 'sandbox');

create table if not exists public.meeting_files (
  id           uuid primary key default gen_random_uuid(),
  meeting_id   uuid references public.meetings (id) on delete cascade,
  task_id      uuid,
  file_name    text not null check (char_length(file_name) between 1 and 300),
  mime         text,
  path         text not null,
  size         bigint not null default 0,
  uploader     uuid not null references auth.users (id),
  team         text not null,
  display_name text not null,
  created_at   timestamptz not null default now()
);
create index if not exists meeting_files_meeting_idx on public.meeting_files (meeting_id);

-- files can belong to a meeting or to a task (a screenshot)
alter table public.meeting_files add column if not exists task_id uuid;
alter table public.meeting_files alter column meeting_id drop not null;
create index if not exists meeting_files_task_idx on public.meeting_files (task_id);

alter table public.meeting_files enable row level security;

drop policy if exists mtf_read on public.meeting_files;
create policy mtf_read on public.meeting_files for select to authenticated
  using (public.is_member() and (
    public.my_team() = 'sandbox' or task_id is not null
    or exists (select 1 from public.meetings m where m.id = meeting_id and m.visibility = 'both')
  ));
drop policy if exists mtf_insert on public.meeting_files;
create policy mtf_insert on public.meeting_files for insert to authenticated
  with check (public.my_team() = 'sandbox' and uploader = auth.uid() and team = 'sandbox');
drop policy if exists mtf_delete on public.meeting_files;
create policy mtf_delete on public.meeting_files for delete to authenticated using (public.my_team() = 'sandbox');

-- private bucket, any file type, 50 MB per file (the free plan limit). Only Sandbox can add or remove files.
insert into storage.buckets (id, name, public, file_size_limit)
values ('meetings', 'meetings', false, 52428800)
on conflict (id) do nothing;

drop policy if exists mtb_read on storage.objects;
create policy mtb_read on storage.objects for select to authenticated
  using (bucket_id = 'meetings' and public.is_member() and (
    public.my_team() = 'sandbox' or split_part(name, '/', 1) = 'tasks'
    or exists (select 1 from public.meetings m where m.id::text = split_part(name, '/', 1) and m.visibility = 'both')
  ));
drop policy if exists mtb_insert on storage.objects;
create policy mtb_insert on storage.objects for insert to authenticated with check (bucket_id = 'meetings' and public.my_team() = 'sandbox');
drop policy if exists mtb_delete on storage.objects;
create policy mtb_delete on storage.objects for delete to authenticated using (bucket_id = 'meetings' and public.my_team() = 'sandbox');

-- Tasks ----------------------------------------------------------------------------------------------------
create table if not exists public.meeting_tasks (
  id                uuid primary key default gen_random_uuid(),
  seq               bigint generated always as identity,
  title             text not null check (char_length(title) between 1 and 300),
  notes             text check (notes is null or char_length(notes) <= 2000),
  priority          text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  due_date          date,
  status            text not null default 'open' check (status in ('open', 'done', 'confirmed')),
  created_by        uuid not null references auth.users (id),
  team              text not null,
  display_name      text not null,
  created_at        timestamptz not null default now(),
  done_by_name      text,
  done_at           timestamptz,
  confirmed_by_name text,
  confirmed_at      timestamptz,
  updated_at        timestamptz not null default now()
);

alter table public.meeting_tasks enable row level security;

drop policy if exists tk_read on public.meeting_tasks;
create policy tk_read on public.meeting_tasks for select to authenticated using (public.is_member());
drop policy if exists tk_insert on public.meeting_tasks;
create policy tk_insert on public.meeting_tasks for insert to authenticated
  with check (public.my_team() = 'sandbox' and created_by = auth.uid() and team = 'sandbox' and status = 'open');
drop policy if exists tk_update on public.meeting_tasks;
create policy tk_update on public.meeting_tasks for update to authenticated using (public.is_member()) with check (public.is_member());
drop policy if exists tk_delete on public.meeting_tasks;
create policy tk_delete on public.meeting_tasks for delete to authenticated using (public.my_team() = 'sandbox');

-- Who may change what:
--   Liveroom: only tick / untick (open <-> done). It can never edit the text or confirm.
--   Sandbox : edit the text, delete, confirm (done -> confirmed), reopen. It cannot mark a task done itself.
create or replace function public.meeting_tasks_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare t text := public.my_team();
begin
  if t is null then raise exception 'Only Sandbox and Liveroom accounts can change tasks'; end if;
  if t = 'liveroom' then
    if new.title is distinct from old.title or new.notes is distinct from old.notes or new.priority is distinct from old.priority
       or new.due_date is distinct from old.due_date or new.team is distinct from old.team or new.created_by is distinct from old.created_by then
      raise exception 'Liveroom can only tick or untick tasks';
    end if;
    if new.status is distinct from old.status and (old.status = 'confirmed' or new.status = 'confirmed') then
      raise exception 'Only Sandbox can confirm a task';
    end if;
  elsif t = 'sandbox' then
    if new.status = 'done' and old.status is distinct from 'done' then raise exception 'Only Liveroom can mark a task as done'; end if;
    if new.status = 'confirmed' and old.status is distinct from 'confirmed' and old.status <> 'done' then
      raise exception 'Liveroom must mark the task as done before it can be confirmed';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists meeting_tasks_guard on public.meeting_tasks;
create trigger meeting_tasks_guard before update on public.meeting_tasks for each row execute function public.meeting_tasks_guard();

-- live updates between the two teams
do $$
begin
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if found then
    begin alter publication supabase_realtime add table public.meetings; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.meeting_files; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.meeting_tasks; exception when duplicate_object then null; end;
  end if;
end $$;
