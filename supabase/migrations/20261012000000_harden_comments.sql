-- Members write only what a comment says: id, author and date always come from the database,
-- so nobody can backdate a comment and reorder the review history.
revoke insert, references, trigger on public.comments from authenticated;
grant insert (version_id, body, timecode) on public.comments to authenticated;

-- Blank means blank: tabs and line breaks alone are not a comment either (the app trims the same way)
alter table public.comments
  drop constraint comments_body_check,
  add constraint comments_body_check check (char_length(btrim(body, E' \t\r\n')) between 1 and 2000);

-- Matches how comments are read: one version, oldest first
drop index public.comments_version_id_idx;
create index comments_version_id_created_at_idx on public.comments (version_id, created_at);
