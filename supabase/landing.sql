-- Calybrate Journey Map: the "Landing page" tab (a checklist Sandbox writes, Liveroom ticks, Sandbox confirms, plus PDFs).
-- Run this once in Supabase -> SQL Editor -> New query -> Run, AFTER schema.sql.
-- Comments on an item reuse public.comments (node_id = 'lp:<item id>'), so they show up in the normal activity feed and alerts.

create table if not exists public.landing_items (
  id                uuid primary key default gen_random_uuid(),
  seq               bigint generated always as identity,
  title             text not null check (char_length(title) between 1 and 300),
  notes             text check (notes is null or char_length(notes) <= 2000),
  section           text not null default 'General',
  priority          text not null default 'medium' check (priority in ('high', 'medium', 'low')),
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

alter table public.landing_items enable row level security;

drop policy if exists lp_read on public.landing_items;
create policy lp_read on public.landing_items for select to authenticated using (public.is_member());
drop policy if exists lp_insert on public.landing_items;
create policy lp_insert on public.landing_items for insert to authenticated
  with check (public.my_team() = 'sandbox' and created_by = auth.uid() and team = 'sandbox' and status = 'open');
drop policy if exists lp_update on public.landing_items;
create policy lp_update on public.landing_items for update to authenticated using (public.is_member()) with check (public.is_member());
drop policy if exists lp_delete on public.landing_items;
create policy lp_delete on public.landing_items for delete to authenticated using (public.my_team() = 'sandbox');

-- Who may change what:
--   Liveroom: only tick / untick (open <-> done). It can never edit the text or confirm.
--   Sandbox : edit the text, delete, confirm (done -> confirmed), reopen. It cannot mark an item done itself.
create or replace function public.landing_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare t text := public.my_team();
begin
  if t is null then raise exception 'Only Sandbox and Liveroom accounts can change this list'; end if;
  if t = 'liveroom' then
    if new.title is distinct from old.title or new.notes is distinct from old.notes or new.section is distinct from old.section
       or new.priority is distinct from old.priority or new.team is distinct from old.team or new.created_by is distinct from old.created_by then
      raise exception 'Liveroom can only tick or untick items';
    end if;
    if new.status is distinct from old.status and (old.status = 'confirmed' or new.status = 'confirmed') then
      raise exception 'Only Sandbox can confirm an item';
    end if;
  elsif t = 'sandbox' then
    if new.status = 'done' and old.status is distinct from 'done' then raise exception 'Only Liveroom can mark an item as done'; end if;
    if new.status = 'confirmed' and old.status is distinct from 'confirmed' and old.status <> 'done' then
      raise exception 'Liveroom must mark the item as done before it can be confirmed';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists landing_guard on public.landing_items;
create trigger landing_guard before update on public.landing_items for each row execute function public.landing_guard();

-- PDFs for this tab ------------------------------------------------------------------------------------------
create table if not exists public.landing_files (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 200),
  path         text not null,
  size         bigint not null default 0,
  uploader     uuid not null references auth.users (id),
  team         text not null,
  display_name text not null,
  created_at   timestamptz not null default now()
);

alter table public.landing_files enable row level security;

drop policy if exists lpf_read on public.landing_files;
create policy lpf_read on public.landing_files for select to authenticated using (public.is_member());
drop policy if exists lpf_insert on public.landing_files;
create policy lpf_insert on public.landing_files for insert to authenticated
  with check (public.is_member() and uploader = auth.uid() and team = public.my_team());
drop policy if exists lpf_delete on public.landing_files;
create policy lpf_delete on public.landing_files for delete to authenticated using (uploader = auth.uid());

-- private bucket, PDFs only, 50 MB per file (the free plan limit)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('landing', 'landing', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists lpb_read on storage.objects;
create policy lpb_read on storage.objects for select to authenticated using (bucket_id = 'landing' and public.is_member());
drop policy if exists lpb_insert on storage.objects;
create policy lpb_insert on storage.objects for insert to authenticated with check (bucket_id = 'landing' and public.is_member());
drop policy if exists lpb_delete on storage.objects;
create policy lpb_delete on storage.objects for delete to authenticated using (bucket_id = 'landing' and owner = auth.uid());

do $$
begin
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if found then
    begin alter publication supabase_realtime add table public.landing_items; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.landing_files; exception when duplicate_object then null; end;
  end if;
end $$;
