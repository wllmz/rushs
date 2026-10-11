import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { subscribeRefresh } from "./subscribe-refresh";

type Handler = () => void;

function fakeSupabase() {
  const handlers: Handler[] = [];
  const channel = {
    on: vi.fn((_type: string, _filter: unknown, handler: Handler) => {
      handlers.push(handler);
      return channel;
    }),
    subscribe: vi.fn(() => channel),
  };
  const client = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(async () => "ok"),
    realtime: { setAuth: vi.fn(async () => undefined) },
  };
  return { client: client as unknown as SupabaseClient<Database>, raw: client, channel, fire: () => handlers.forEach((h) => h()) };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("subscribeRefresh", () => {
  it("joins with the user's token, then listens to every change on the watched rows", async () => {
    const { client, raw, channel } = fakeSupabase();

    subscribeRefresh(client, "asset:a:v", [{ table: "comments", filter: "version_id=eq.v" }, { table: "versions" }], vi.fn());
    expect(raw.channel).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(channel.subscribe).toHaveBeenCalled());

    expect(raw.realtime.setAuth).toHaveBeenCalled();
    expect(raw.channel).toHaveBeenCalledWith("asset:a:v");
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "comments", filter: "version_id=eq.v" },
      expect.any(Function),
    );
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "versions", filter: undefined },
      expect.any(Function),
    );
    expect(channel.subscribe).toHaveBeenCalled();
  });

  it("refreshes once for a burst of changes", async () => {
    const { client, channel, fire } = fakeSupabase();
    const refresh = vi.fn();
    subscribeRefresh(client, "project:p", [{ table: "versions" }], refresh);
    await vi.waitFor(() => expect(channel.subscribe).toHaveBeenCalled());

    fire();
    fire();
    fire();
    vi.advanceTimersByTime(300);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("leaves the channel and drops a pending refresh on cleanup", async () => {
    const { client, raw, channel, fire } = fakeSupabase();
    const refresh = vi.fn();
    const cleanup = subscribeRefresh(client, "project:p", [{ table: "versions" }], refresh);
    await vi.waitFor(() => expect(channel.subscribe).toHaveBeenCalled());

    fire();
    cleanup();
    vi.advanceTimersByTime(300);

    expect(raw.removeChannel).toHaveBeenCalledWith(channel);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("never joins when the page is left before the token is ready", async () => {
    const { client, raw } = fakeSupabase();

    const cleanup = subscribeRefresh(client, "project:p", [{ table: "versions" }], vi.fn());
    cleanup();
    await Promise.resolve();
    await Promise.resolve();

    expect(raw.channel).not.toHaveBeenCalled();
    expect(raw.removeChannel).not.toHaveBeenCalled();
  });
});
