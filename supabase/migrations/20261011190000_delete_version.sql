-- The uploader of a version can delete it, as long as the asset keeps at least one version.
-- The row goes first (in the function), then the app removes the file through the Storage API.
-- Numbers are not shifted: deleting V2 of V1..V3 leaves V1 and V3. add_version takes max + 1,
-- so only deleting the latest version lets the next upload take its number again.

create function public.delete_version(p_asset_id uuid, p_number integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_path text;
begin
  -- Same lock as add_version and delete_asset: the count below cannot change under us
  select project_id into v_project_id
  from public.assets
  where id = p_asset_id
  for update;

  select storage_path into v_path
  from public.versions
  where asset_id = p_asset_id and number = p_number and uploaded_by = (select auth.uid());

  -- A missing version and someone else's answer the same, so ids cannot be probed
  if v_path is null or not private.is_project_editor(v_project_id) then
    raise exception 'only the uploader can delete this version' using hint = 'not_uploader';
  end if;

  if (select count(*) from public.versions where asset_id = p_asset_id) = 1 then
    raise exception 'an asset keeps at least one version' using hint = 'last_version';
  end if;

  delete from public.versions where asset_id = p_asset_id and number = p_number;

  return v_path;
end;
$$;

revoke all on function public.delete_version(uuid, integer) from public, anon;
grant execute on function public.delete_version(uuid, integer) to authenticated;
