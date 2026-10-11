-- Rushes: an asset (a shot, a cut) and its successive versions.
-- Files live in the private "rushes" bucket under {project_id}/{asset_id}/{file}.

create type public.asset_kind as enum ('video', 'image');

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  kind public.asset_kind not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.versions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets (id) on delete cascade,
  number integer not null check (number > 0),
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (asset_id, number)
);

create index assets_project_id_idx on public.assets (project_id);
create index versions_asset_id_idx on public.versions (asset_id);

alter table public.assets enable row level security;
alter table public.versions enable row level security;

revoke insert, update, delete, truncate on public.assets, public.versions from anon, authenticated;
revoke all on public.assets, public.versions from anon;

create function private.is_project_editor(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = (select auth.uid()) and role = 'editor'
  );
$$;

-- The first folder of a storage path is the project id; anything else resolves to no project
create function private.project_id_from_path(p_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return split_part(p_name, '/', 1)::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

revoke all on function private.is_project_editor(uuid) from public, anon;
revoke all on function private.project_id_from_path(text) from public, anon;
grant execute on function private.is_project_editor(uuid) to authenticated;
grant execute on function private.project_id_from_path(text) to authenticated;

create policy "Members can read the assets of their projects"
  on public.assets for select
  to authenticated
  using (private.is_project_member(project_id));

create policy "Members can read the versions of their assets"
  on public.versions for select
  to authenticated
  using (
    exists (
      select 1 from public.assets
      where assets.id = versions.asset_id and private.is_project_member(assets.project_id)
    )
  );

-- Storage: a private bucket, 50 MB per file (the free plan limit), video and image only
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rushes',
  'rushes',
  false,
  52428800,
  array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']
);

create policy "Members can read the rushes of their projects"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'rushes' and private.is_project_member(private.project_id_from_path(name)));

-- Only editors upload; no update or delete policy, so an uploaded version is never replaced
create policy "Editors can upload rushes to their projects"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'rushes' and private.is_project_editor(private.project_id_from_path(name)));

-- Registers an uploaded file as a new asset and its first version.
-- Size and type are read from what Storage recorded, never from the client.
create function public.register_asset(
  p_project_id uuid,
  p_asset_id uuid,
  p_title text,
  p_storage_path text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_metadata jsonb;
  v_mime text;
  v_kind public.asset_kind;
begin
  if not private.is_project_editor(p_project_id) then
    raise exception 'only editors can upload' using hint = 'not_editor';
  end if;

  if split_part(p_storage_path, '/', 1) <> p_project_id::text
    or split_part(p_storage_path, '/', 2) <> p_asset_id::text then
    raise exception 'the file is not stored under this asset' using hint = 'invalid_path';
  end if;

  select metadata into v_metadata
  from storage.objects
  where bucket_id = 'rushes' and name = p_storage_path and owner_id = v_user_id::text;

  if v_metadata is null then
    raise exception 'no uploaded file at this path' using hint = 'upload_missing';
  end if;

  v_mime := v_metadata ->> 'mimetype';
  v_kind := case
    when v_mime like 'video/%' then 'video'::public.asset_kind
    when v_mime like 'image/%' then 'image'::public.asset_kind
  end;
  if v_kind is null then
    raise exception 'unsupported file type' using hint = 'invalid_type';
  end if;

  insert into public.assets (id, project_id, title, kind, created_by)
  values (p_asset_id, p_project_id, btrim(p_title), v_kind, v_user_id);

  insert into public.versions (asset_id, number, storage_path, mime_type, size_bytes, uploaded_by)
  values (p_asset_id, 1, p_storage_path, v_mime, (v_metadata ->> 'size')::bigint, v_user_id);

  return p_asset_id;
end;
$$;

revoke all on function public.register_asset(uuid, uuid, text, text) from public, anon;
grant execute on function public.register_asset(uuid, uuid, text, text) to authenticated;
