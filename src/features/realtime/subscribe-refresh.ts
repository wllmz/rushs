import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// Only inserts and updates: Realtime cannot check RLS on a deleted row and broadcasts DELETE events
// to every subscriber of the table, whatever their projects. A deletion shows up on the next refresh.
type Binding = { table: "comments" | "versions"; event: "INSERT" | "UPDATE"; filter?: string };

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
    // The browser client is a singleton that hands back a channel of the same topic while it is still
    // leaving: a unique topic per subscription keeps a quick come-back from landing on a closing channel
    channel = supabase.channel(`${name}:${crypto.randomUUID()}`);
    for (const { table, event, filter } of bindings) {
      channel.on("postgres_changes", { event, schema: "public", table, filter }, schedule);
    }
    let joined = false;
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        // A rejoin after a network loss: events sent meanwhile are gone, catch up with a refresh
        if (joined) schedule();
        joined = true;
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error(`Live updates unavailable on ${name}: ${status}`);
      }
    });
  });

  return () => {
    cancelled = true;
    clearTimeout(timer);
    if (channel) void supabase.removeChannel(channel);
  };
}
