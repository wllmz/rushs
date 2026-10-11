-- 1. Editors may only delete the files of a deleted asset, never a file another editor is uploading.
-- delete_asset records the paths it detaches; the storage policy lets editors remove only those.

create table private.detached_rushes (
  name text primary key,
  detached_at timestamptz not null default now()
);

revoke all on private.detached_rushes from public, anon, authenticated;

create function private.is_detached_rush(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.detached_rushes where name = p_name);
$$;

revoke all on function private.is_detached_rush(text) from public, anon;
grant execute on function private.is_detached_rush(text) to authenticated;

drop policy "Owners and editors can delete detached rushes" on storage.objects;

-- The owner removes their own unreferenced file (an upload that failed to register, their version);
-- an editor removes the files of an asset deleted by someone else
create policy "Owners and editors can delete detached rushes"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'rushes'
    and not private.is_referenced_rush(name)
    and (
      owner_id = (select auth.uid())::text
      or (
        private.is_detached_rush(name)
        and private.is_project_editor(private.project_id_from_path(name))
      )
    )
  );

create or replace function public.delete_asset(p_asset_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_paths text[];
begin
  select project_id into v_project_id
  from public.assets
  where id = p_asset_id and created_by = (select auth.uid())
  for update;

  if v_project_id is null or not private.is_project_editor(v_project_id) then
    raise exception 'only the uploader can delete this asset' using hint = 'not_uploader';
  end if;

  select coalesce(array_agg(storage_path), '{}') into v_paths
  from public.versions
  where asset_id = p_asset_id;

  insert into private.detached_rushes (name)
  select unnest(v_paths)
  on conflict do nothing;

  -- versions follow through on delete cascade
  delete from public.assets where id = p_asset_id;

  return v_paths;
end;
$$;

-- 2. A version number is never given twice: deleting V3 then adding a version gives V4,
-- so a shared ?v=3 link never silently shows another file.

alter table public.assets add column last_version_number integer not null default 1;

update public.assets
set last_version_number = coalesce((select max(number) from public.versions where asset_id = assets.id), 1);

create or replace function public.add_version(p_asset_id uuid, p_storage_path text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_project_id uuid;
  v_kind public.asset_kind;
  v_metadata jsonb;
  v_mime text;
  v_number integer;
begin
  -- The lock serializes concurrent versions (and delete_asset): each one gets the next number
  select project_id, kind into v_project_id, v_kind
  from public.assets
  where id = p_asset_id
  for update;

  -- A missing asset and a foreign one answer the same, so ids cannot be probed
  if v_project_id is null or not private.is_project_editor(v_project_id) then
    raise exception 'only editors can add a version' using hint = 'not_editor';
  end if;

  if split_part(p_storage_path, '/', 1) <> v_project_id::text
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
  if split_part(v_mime, '/', 1) <> v_kind::text then
    raise exception 'a version keeps the kind of its asset' using hint = 'kind_mismatch';
  end if;

  update public.assets
  set last_version_number = last_version_number + 1
  where id = p_asset_id
  returning last_version_number into v_number;

  insert into public.versions (asset_id, number, storage_path, mime_type, size_bytes, uploaded_by)
  values (p_asset_id, v_number, p_storage_path, v_mime, (v_metadata ->> 'size')::bigint, v_user_id);

  return v_number;
end;
$$;
