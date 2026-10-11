-- Comments on a version. Every member of the project reads and writes them, editors and reviewers alike.
-- A video comment can carry a timecode (seconds from the start). Comments are never edited nor deleted:
-- like statuses, they are the review history, so a commented version and its asset are kept.

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.versions (id) on delete cascade,
  author_id uuid default auth.uid() references public.profiles (id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  timecode numeric(10, 3) check (timecode >= 0),
  created_at timestamptz not null default now()
);

create index comments_version_id_idx on public.comments (version_id);

alter table public.comments enable row level security;

revoke all on public.comments from anon;
revoke update, delete, truncate on public.comments from authenticated;

-- security definer: reading the version and its asset must not depend on the caller's RLS
create function private.is_version_member(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.versions
    join public.assets on assets.id = versions.asset_id
    where versions.id = p_version_id and private.is_project_member(assets.project_id)
  );
$$;

-- A timecode only makes sense on a video
create function private.is_video_version(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.versions
    join public.assets on assets.id = versions.asset_id
    where versions.id = p_version_id and assets.kind = 'video'
  );
$$;

revoke all on function private.is_version_member(uuid) from public, anon;
revoke all on function private.is_video_version(uuid) from public, anon;
grant execute on function private.is_version_member(uuid) to authenticated;
grant execute on function private.is_video_version(uuid) to authenticated;

create policy "Members can read the comments of their projects"
  on public.comments for select
  to authenticated
  using (private.is_version_member(version_id));

create policy "Members can comment in their projects, as themselves"
  on public.comments for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and private.is_version_member(version_id)
    and (timecode is null or private.is_video_version(version_id))
  );

-- Deletion keeps the review history: a version reviewed once or commented is kept, and so is its asset

create or replace function public.delete_version(p_asset_id uuid, p_number integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_version_id uuid;
  v_path text;
  v_reviewed_at timestamptz;
begin
  -- Same lock as add_version and delete_asset: the count below cannot change under us
  select project_id into v_project_id
  from public.assets
  where id = p_asset_id
  for update;

  select id, storage_path, reviewed_at into v_version_id, v_path, v_reviewed_at
  from public.versions
  where asset_id = p_asset_id and number = p_number and uploaded_by = (select auth.uid())
  -- A comment being posted on it waits for us, then fails on the missing version instead of being cascaded away
  for update;

  -- A missing version and someone else's answer the same, so ids cannot be probed
  if v_path is null or not private.is_project_editor(v_project_id) then
    raise exception 'only the uploader can delete this version' using hint = 'not_uploader';
  end if;

  if v_reviewed_at is not null or exists (select 1 from public.comments where version_id = v_version_id) then
    raise exception 'a reviewed or commented version is kept' using hint = 'reviewed';
  end if;

  if (select count(*) from public.versions where asset_id = p_asset_id) = 1 then
    raise exception 'an asset keeps at least one version' using hint = 'last_version';
  end if;

  delete from public.versions where id = v_version_id;

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

  -- A comment being posted on one of them waits for us, then fails instead of being cascaded away
  perform 1 from public.versions where asset_id = p_asset_id for update;

  if exists (
    select 1 from public.versions
    where asset_id = p_asset_id
      and (reviewed_at is not null or exists (select 1 from public.comments where version_id = versions.id))
  ) then
    raise exception 'an asset with a reviewed or commented version is kept' using hint = 'reviewed';
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
