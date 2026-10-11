-- Rushes belong to the team: deleting an account keeps the assets it uploaded, without an author.
alter table public.assets
  alter column created_by drop not null,
  drop constraint assets_created_by_fkey,
  add constraint assets_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.versions
  alter column uploaded_by drop not null,
  drop constraint versions_uploaded_by_fkey,
  add constraint versions_uploaded_by_fkey
    foreign key (uploaded_by) references public.profiles (id) on delete set null;

-- security definer: a policy subquery runs under the caller's RLS, so a former member
-- would see no version and could delete files that live assets still point to
create function private.is_referenced_rush(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.versions where storage_path = p_name);
$$;

revoke all on function private.is_referenced_rush(text) from public, anon;
grant execute on function private.is_referenced_rush(text) to authenticated;

drop policy "Uploaders can delete their detached rushes" on storage.objects;

create policy "Uploaders can delete their detached rushes"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'rushes'
    and owner_id = (select auth.uid())::text
    and not private.is_referenced_rush(name)
  );

-- The uploader must still be an editor of the project, as for uploading.
-- The asset row is locked so no version can be added between listing the paths and deleting.
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

  -- versions follow through on delete cascade
  delete from public.assets where id = p_asset_id;

  return v_paths;
end;
$$;
