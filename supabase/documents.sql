-- Calybrate Journey Map: shared documents (PDF uploads).
-- Run this once in Supabase -> SQL Editor -> New query -> Run, AFTER schema.sql.
-- The three built-in design PDFs ship with the site and need none of this; this is only for PDFs the teams upload later.
-- Comments on documents reuse the existing public.comments table (node_id = 'doc:<document id>:<page>'), so nothing else changes.

create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 200),
  description  text,
  path         text not null,
  size         bigint not null default 0,
  uploader     uuid not null references auth.users (id),
  team         text not null,
  display_name text not null,
  created_at   timestamptz not null default now()
);

alter table public.documents enable row level security;

drop policy if exists doc_read on public.documents;
create policy doc_read on public.documents for select to authenticated using (public.is_member());
drop policy if exists doc_insert on public.documents;
create policy doc_insert on public.documents for insert to authenticated
  with check (public.is_member() and uploader = auth.uid() and team = public.my_team());
drop policy if exists doc_delete on public.documents;
create policy doc_delete on public.documents for delete to authenticated using (uploader = auth.uid());

-- private bucket, PDFs only, 50 MB per file (the free plan limit)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists docs_read on storage.objects;
create policy docs_read on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.is_member());
drop policy if exists docs_insert on storage.objects;
create policy docs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.is_member());
drop policy if exists docs_delete on storage.objects;
create policy docs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and owner = auth.uid());

do $$
begin
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if found then
    begin alter publication supabase_realtime add table public.documents; exception when duplicate_object then null; end;
  end if;
end $$;
