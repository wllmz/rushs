-- Writes on projects only ever go through the functions: the table grants say so too,
-- instead of relying on the absence of policies alone.
revoke insert, update, delete, truncate on public.projects, public.project_members from anon, authenticated;
revoke all on public.projects, public.project_members from anon;

-- add_project_member:
-- - only resolves confirmed, non-deleted accounts, so a sign up with someone else's email gains nothing
-- - no longer changes the role of an existing member silently: it says so
-- - errors carry a hint the app maps to a message, rather than generic SQL states
create or replace function public.add_project_member(p_project_id uuid, p_email text, p_role public.project_role)
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
    raise exception 'only the project creator can add members' using hint = 'not_creator';
  end if;

  select id into v_member_id
  from auth.users
  where lower(email) = lower(btrim(p_email))
    and email_confirmed_at is not null
    and deleted_at is null
  order by created_at
  limit 1;

  if v_member_id is null then
    raise exception 'no account with this email' using hint = 'no_account';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (p_project_id, v_member_id, p_role)
  on conflict (project_id, user_id) do nothing;

  if not found then
    raise exception 'already a member of this project' using hint = 'already_member';
  end if;
end;
$$;
