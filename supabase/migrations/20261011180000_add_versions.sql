-- New versions of an asset. Any editor of the project can add one, not only the asset's uploader.

-- Registers an uploaded file as the next version of an asset.
-- Size and type are read from what Storage recorded, never from the client.
create function public.add_version(p_asset_id uuid, p_storage_path text)
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

  select coalesce(max(number), 0) + 1 into v_number
  from public.versions
  where asset_id = p_asset_id;

  insert into public.versions (asset_id, number, storage_path, mime_type, size_bytes, uploaded_by)
  values (p_asset_id, v_number, p_storage_path, v_mime, (v_metadata ->> 'size')::bigint, v_user_id);

  return v_number;
end;
$$;

revoke all on function public.add_version(uuid, text) from public, anon;
grant execute on function public.add_version(uuid, text) to authenticated;

-- Versions of one asset can belong to several editors: whoever deletes the asset must be able to
-- remove all its files. A file no version points to can go, by its owner or an editor of the project.
drop policy "Uploaders can delete their detached rushes" on storage.objects;

create policy "Owners and editors can delete detached rushes"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'rushes'
    and (
      owner_id = (select auth.uid())::text
      or private.is_project_editor(private.project_id_from_path(name))
    )
    and not private.is_referenced_rush(name)
  );
