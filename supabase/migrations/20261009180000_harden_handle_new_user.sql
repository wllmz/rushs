-- The sign up metadata comes from the client and can bypass the app's validation:
-- the trigger must never make the sign up fail, whatever full_name holds or if the email is null.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'Utilisateur'
      ),
      80
    )
  );
  return new;
end;
$$;

-- Only the trigger runs it: no role exposed through the API may call it
revoke execute on function public.handle_new_user() from public, anon, authenticated;
