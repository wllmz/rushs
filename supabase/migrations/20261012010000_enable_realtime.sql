-- Live updates: viewers of an asset or a project hear about new comments, new versions and status changes.
-- Realtime applies each subscriber's select policies, so nobody hears about rows they cannot read.
alter publication supabase_realtime add table public.comments, public.versions;
