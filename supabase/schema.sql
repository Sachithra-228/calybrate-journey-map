-- Calybrate Journey Map — shared backend for the Sandbox and Liveroom teams.
-- Run this whole file once in Supabase → SQL Editor → New query → Run.

-- ============ tables ============
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  team         text not null check (team in ('sandbox', 'liveroom')),
  display_name text not null
);

create table if not exists public.step_status (
  node_id    text primary key,
  status     text not null check (status in ('todo', 'doing', 'blocked', 'done')),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id           uuid primary key default gen_random_uuid(),
  node_id      text not null,
  path         text not null,
  caption      text,
  uploader     uuid not null references auth.users (id),
  team         text not null,
  display_name text not null,
  created_at   timestamptz not null default now()
);

create table if not exists public.comments (
  id            uuid primary key default gen_random_uuid(),
  node_id       text not null,
  attachment_id uuid references public.attachments (id) on delete cascade,
  author        uuid not null references auth.users (id),
  team          text not null,
  display_name  text not null,
  kind          text not null default 'comment' check (kind in ('comment', 'issue')),
  body          text not null check (char_length(body) between 1 and 4000),
  resolved      boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  node_id      text not null,
  type         text not null check (type in ('status', 'bulk', 'upload')),
  from_status  text,
  to_status    text,
  n            int,
  team         text not null,
  display_name text not null,
  created_at   timestamptz not null default now()
);

create index if not exists comments_node_idx on public.comments (node_id);
create index if not exists attachments_node_idx on public.attachments (node_id);

-- ============ access control (row level security) ============
-- Only people who have a row in public.profiles (Sandbox or Liveroom accounts you create) can read or write anything.
create or replace function public.is_member()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid()); $$;

create or replace function public.my_team()
returns text
language sql stable security definer set search_path = public
as $$ select team from public.profiles where id = auth.uid(); $$;

alter table public.profiles    enable row level security;
alter table public.step_status enable row level security;
alter table public.attachments enable row level security;
alter table public.comments    enable row level security;
alter table public.events      enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_member());

drop policy if exists status_read on public.step_status;
create policy status_read on public.step_status for select to authenticated using (public.is_member());
drop policy if exists status_write on public.step_status;
create policy status_write on public.step_status for insert to authenticated
  with check (public.is_member() and updated_by = auth.uid());
drop policy if exists status_update on public.step_status;
create policy status_update on public.step_status for update to authenticated
  using (public.is_member()) with check (public.is_member() and updated_by = auth.uid());

drop policy if exists att_read on public.attachments;
create policy att_read on public.attachments for select to authenticated using (public.is_member());
drop policy if exists att_insert on public.attachments;
create policy att_insert on public.attachments for insert to authenticated
  with check (public.is_member() and uploader = auth.uid() and team = public.my_team());
drop policy if exists att_delete on public.attachments;
create policy att_delete on public.attachments for delete to authenticated using (uploader = auth.uid());

drop policy if exists com_read on public.comments;
create policy com_read on public.comments for select to authenticated using (public.is_member());
drop policy if exists com_insert on public.comments;
create policy com_insert on public.comments for insert to authenticated
  with check (public.is_member() and author = auth.uid() and team = public.my_team());
drop policy if exists com_update on public.comments;
create policy com_update on public.comments for update to authenticated
  using (public.is_member()) with check (public.is_member());
drop policy if exists com_delete on public.comments;
create policy com_delete on public.comments for delete to authenticated using (author = auth.uid());

drop policy if exists ev_read on public.events;
create policy ev_read on public.events for select to authenticated using (public.is_member());
drop policy if exists ev_insert on public.events;
create policy ev_insert on public.events for insert to authenticated
  with check (public.is_member() and team = public.my_team());

-- Comments can only be edited in one way: marking an issue resolved / reopened.
revoke update on public.comments from authenticated;
grant update (resolved) on public.comments to authenticated;

-- ============ reference-image storage ============
insert into storage.buckets (id, name, public)
values ('references', 'references', false)
on conflict (id) do nothing;

drop policy if exists refs_read on storage.objects;
create policy refs_read on storage.objects for select to authenticated
  using (bucket_id = 'references' and public.is_member());
drop policy if exists refs_insert on storage.objects;
create policy refs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'references' and public.is_member());
drop policy if exists refs_delete on storage.objects;
create policy refs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'references' and owner = auth.uid());

-- ============ live updates ============
do $$
begin
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if found then
    begin alter publication supabase_realtime add table public.comments;    exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.attachments; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.step_status; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.events;      exception when duplicate_object then null; end;
  end if;
end $$;
