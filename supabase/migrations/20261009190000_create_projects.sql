-- Projects and their members. The role lives on the membership:
-- the same person can edit one project and review another.

create type public.project_role as enum ('editor', 'reviewer');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.project_role not null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index project_members_user_id_idx on public.project_members (user_id);
create index projects_created_by_idx on public.projects (created_by);

alter table public.projects enable row level security;
alter table public.project_members enable row level security;

-- Membership checks live in a schema the API does not expose.
-- security definer lets the policies read project_members without recursing into its own RLS.
create schema if not exists private;

create function private.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = (select auth.uid())
  );
$$;

create function private.shares_project_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members mine
    join public.project_members theirs on theirs.project_id = mine.project_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user_id
  );
$$;

revoke all on function private.is_project_member(uuid) from public, anon;
revoke all on function private.shares_project_with(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_project_member(uuid) to authenticated;
grant execute on function private.shares_project_with(uuid) to authenticated;

create policy "Members can read their projects"
  on public.projects for select
  to authenticated
  using (private.is_project_member(id));

create policy "Members can read the members of their projects"
  on public.project_members for select
  to authenticated
  using (private.is_project_member(project_id));

-- Teammates see each other's name
create policy "Users can read the profiles of their teammates"
  on public.profiles for select
  to authenticated
  using (private.shares_project_with(id));

-- No insert, update or delete policy: writes only go through the functions below,
-- which keep the project and its first member consistent.

create function public.create_project(p_name text, p_role public.project_role)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_project_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into public.projects (name, created_by)
  values (btrim(p_name), v_user_id)
  returning id into v_project_id;

  insert into public.project_members (project_id, user_id, role)
  values (v_project_id, v_user_id, p_role);

  return v_project_id;
end;
$$;

-- Only the creator of a project adds members, by the email of an existing account
create function public.add_project_member(p_project_id uuid, p_email text, p_role public.project_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
begin
  if not exists (
    select 1 from public.projects
    where id = p_project_id and created_by = (select auth.uid())
  ) then
    raise exception 'only the project creator can add members' using errcode = '42501';
  end if;

  select id into v_member_id
  from auth.users
  where lower(email) = lower(btrim(p_email));

  if v_member_id is null then
    raise exception 'no account with this email' using errcode = 'P0002';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (p_project_id, v_member_id, p_role)
  on conflict (project_id, user_id) do update set role = excluded.role;
end;
$$;

revoke all on function public.create_project(text, public.project_role) from public, anon;
revoke all on function public.add_project_member(uuid, text, public.project_role) from public, anon;
grant execute on function public.create_project(text, public.project_role) to authenticated;
grant execute on function public.add_project_member(uuid, text, public.project_role) to authenticated;
