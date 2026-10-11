-- The uploader can delete an asset they put there by mistake.
-- Rows go first (in the function), then the app removes the files through the Storage API:
-- deleting storage.objects in SQL would leave the files themselves behind.

create function public.delete_asset(p_asset_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paths text[];
begin
  if not exists (
    select 1 from public.assets
    where id = p_asset_id and created_by = (select auth.uid())
  ) then
    raise exception 'only the uploader can delete this asset' using hint = 'not_uploader';
  end if;

  select coalesce(array_agg(storage_path), '{}') into v_paths
  from public.versions
  where asset_id = p_asset_id;

  -- versions follow through on delete cascade
  delete from public.assets where id = p_asset_id;

  return v_paths;
end;
$$;

revoke all on function public.delete_asset(uuid) from public, anon;
grant execute on function public.delete_asset(uuid) to authenticated;

-- A user only removes their own files, and only once no version points to them anymore:
-- nobody can break a live asset by calling Storage directly
create policy "Uploaders can delete their detached rushes"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'rushes'
    and owner_id = (select auth.uid())::text
    and not exists (select 1 from public.versions where versions.storage_path = objects.name)
  );
