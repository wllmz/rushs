-- Review status per version. Only a reviewer of the project changes it: an editor never approves their own work.
-- Once a version has been reviewed, it is part of the review history: neither it nor its asset can be deleted.

create type public.review_status as enum ('pending', 'changes_requested', 'approved');

alter table public.versions
  add column status public.review_status not null default 'pending',
  add column reviewed_by uuid references public.profiles (id) on delete set null,
  add column reviewed_at timestamptz;

create function private.is_project_reviewer(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = (select auth.uid()) and role = 'reviewer'
  );
$$;

revoke all on function private.is_project_reviewer(uuid) from public, anon;
grant execute on function private.is_project_reviewer(uuid) to authenticated;

create function public.set_version_status(p_asset_id uuid, p_number integer, p_status public.review_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
begin
  -- Same lock as delete_version and delete_asset: a version cannot be reviewed while it is being deleted
  select project_id into v_project_id
  from public.assets
  where id = p_asset_id
  for update;

  -- A missing asset and a foreign one answer the same, so ids cannot be probed
  if v_project_id is null or not private.is_project_reviewer(v_project_id) then
    raise exception 'only reviewers can change the status' using hint = 'not_reviewer';
  end if;

  update public.versions
  set status = p_status, reviewed_by = (select auth.uid()), reviewed_at = now()
  where asset_id = p_asset_id and number = p_number;

  if not found then
    raise exception 'no such version' using hint = 'version_missing';
  end if;
end;
$$;

revoke all on function public.set_version_status(uuid, integer, public.review_status) from public, anon;
grant execute on function public.set_version_status(uuid, integer, public.review_status) to authenticated;

create or replace function public.delete_version(p_asset_id uuid, p_number integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_path text;
  v_status public.review_status;
begin
  -- Same lock as add_version and delete_asset: the count below cannot change under us
  select project_id into v_project_id
  from public.assets
  where id = p_asset_id
  for update;

  select storage_path, status into v_path, v_status
  from public.versions
  where asset_id = p_asset_id and number = p_number and uploaded_by = (select auth.uid());

  -- A missing version and someone else's answer the same, so ids cannot be probed
  if v_path is null or not private.is_project_editor(v_project_id) then
    raise exception 'only the uploader can delete this version' using hint = 'not_uploader';
  end if;

  if v_status <> 'pending' then
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

  if exists (select 1 from public.versions where asset_id = p_asset_id and status <> 'pending') then
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
