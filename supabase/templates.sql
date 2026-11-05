-- Calybrate Journey Map: page templates (a folder of html / css / js / images per redesigned page).
-- Run this once in Supabase -> SQL Editor -> New query -> Run, AFTER schema.sql. Only needed for the Templates area in shared mode.

create table if not exists public.templates (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 200),
  description  text,
  entry        text,
  files        jsonb not null default '[]'::jsonb,   -- [{ path, size, key }]
  uploader     uuid not null references auth.users (id),
  team         text not null,
  display_name text not null,
  created_at   timestamptz not null default now()
);

alter table public.templates enable row level security;

drop policy if exists tpl_read on public.templates;
create policy tpl_read on public.templates for select to authenticated using (public.is_member());
drop policy if exists tpl_insert on public.templates;
create policy tpl_insert on public.templates for insert to authenticated
  with check (public.is_member() and uploader = auth.uid() and team = public.my_team());
drop policy if exists tpl_update on public.templates;
create policy tpl_update on public.templates for update to authenticated using (public.is_member()) with check (public.is_member());
drop policy if exists tpl_delete on public.templates;
create policy tpl_delete on public.templates for delete to authenticated using (uploader = auth.uid());

-- private bucket for the files, 50 MB per file (the free plan limit), any file type
insert into storage.buckets (id, name, public, file_size_limit)
values ('templates', 'templates', false, 52428800)
on conflict (id) do nothing;

drop policy if exists tplf_read on storage.objects;
create policy tplf_read on storage.objects for select to authenticated using (bucket_id = 'templates' and public.is_member());
drop policy if exists tplf_insert on storage.objects;
create policy tplf_insert on storage.objects for insert to authenticated with check (bucket_id = 'templates' and public.is_member());
drop policy if exists tplf_delete on storage.objects;
create policy tplf_delete on storage.objects for delete to authenticated using (bucket_id = 'templates' and public.is_member());

do $$
begin
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if found then
    begin alter publication supabase_realtime add table public.templates; exception when duplicate_object then null; end;
  end if;
end $$;
