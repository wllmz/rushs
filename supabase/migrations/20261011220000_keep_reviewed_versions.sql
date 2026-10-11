-- A version reviewed once stays part of the review history, even if a reviewer sets it back to pending
-- (undoing a wrong click): deletion now depends on whether it was ever reviewed, not on its current status.

create or replace function public.delete_version(p_asset_id uuid, p_number integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_path text;
  v_reviewed_at timestamptz;
begin
  -- Same lock as add_version and delete_asset: the count below cannot change under us
  select project_id into v_project_id
  from public.assets
  where id = p_asset_id
  for update;

  select storage_path, reviewed_at into v_path, v_reviewed_at
  from public.versions
  where asset_id = p_asset_id and number = p_number and uploaded_by = (select auth.uid());

  -- A missing version and someone else's answer the same, so ids cannot be probed
  if v_path is null or not private.is_project_editor(v_project_id) then
    raise exception 'only the uploader can delete this version' using hint = 'not_uploader';
  end if;

  if v_reviewed_at is not null then
    raise exception 'a reviewed version is kept' using hint = 'reviewed';
  end if;

  if (select count(*) from public.versions where asset_id = p_asset_id) = 1 then
    raise exception 'an asset keeps at least one version' using hint = 'last_version';
  end if;

  delete from public.versions where asset_id = p_asset_id and number = p_number;

  return v_path;
end;
$$;

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

  if exists (select 1 from public.versions where asset_id = p_asset_id and reviewed_at is not null) then
    raise exception 'an asset with a reviewed version is kept' using hint = 'reviewed';
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
