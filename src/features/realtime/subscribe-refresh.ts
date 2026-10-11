import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Binding = { table: "comments" | "versions"; filter?: string };

const DEBOUNCE_MS = 300;

// Re-renders the page from the server on any change to the watched rows. The server already knows how to
// build the page, so nothing is patched on the client; a burst of changes gives a single refresh.
// Realtime applies the subscriber's select policies: only rows the user can read trigger a refresh.
export function subscribeRefresh(
  supabase: SupabaseClient<Database>,
  name: string,
  bindings: Binding[],
  refresh: () => void,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(refresh, DEBOUNCE_MS);
  };

  let cancelled = false;
  let channel: ReturnType<typeof supabase.channel> | undefined;

  // On a fresh page load the session is still being restored: a channel joined right away would carry
  // the anonymous key, and RLS would silently filter every event out. setAuth() waits for the user's token.
  void supabase.realtime.setAuth().then(() => {
    if (cancelled) return;
    channel = supabase.channel(name);
    for (const { table, filter } of bindings) {
      channel.on("postgres_changes", { event: "*", schema: "public", table, filter }, schedule);
    }
    channel.subscribe();
  });

  return () => {
    cancelled = true;
    clearTimeout(timer);
    if (channel) void supabase.removeChannel(channel);
  };
}
