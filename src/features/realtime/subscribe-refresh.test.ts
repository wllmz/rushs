import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { subscribeRefresh } from "./subscribe-refresh";

type Handler = () => void;
type StatusHandler = (status: string) => void;

function fakeSupabase() {
  const handlers: Handler[] = [];
  let onStatus: StatusHandler = () => {};
  const channel = {
    on: vi.fn((_type: string, _filter: unknown, handler: Handler) => {
      handlers.push(handler);
      return channel;
    }),
    subscribe: vi.fn((callback: StatusHandler) => {
      onStatus = callback;
      return channel;
    }),
  };
  const client = {
    channel: vi.fn<(topic: string) => typeof channel>(() => channel),
    removeChannel: vi.fn(async () => "ok"),
    realtime: { setAuth: vi.fn(async () => undefined) },
  };
  return {
    client: client as unknown as SupabaseClient<Database>,
    raw: client,
    channel,
    fire: () => handlers.forEach((h) => h()),
    status: (status: string) => onStatus(status),
  };
}

const versions = [{ table: "versions", event: "INSERT" }] as const;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("subscribeRefresh", () => {
  it("joins with the user's token, then listens to the watched inserts and updates only", async () => {
    const { client, raw, channel } = fakeSupabase();

    subscribeRefresh(
      client,
      "asset:a:v",
      [
        { table: "comments", event: "INSERT", filter: "version_id=eq.v" },
        { table: "versions", event: "UPDATE" },
      ],
      vi.fn(),
    );
    expect(raw.channel).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(channel.subscribe).toHaveBeenCalled());

    expect(raw.realtime.setAuth).toHaveBeenCalled();
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "comments", filter: "version_id=eq.v" },
      expect.any(Function),
    );
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "versions", filter: undefined },
      expect.any(Function),
    );
  });

  it("gives every subscription its own topic, so a quick come-back never reuses a closing channel", async () => {
    const { client, raw, channel } = fakeSupabase();

    subscribeRefresh(client, "project:p", [...versions], vi.fn());
    subscribeRefresh(client, "project:p", [...versions], vi.fn());
    await vi.waitFor(() => expect(channel.subscribe).toHaveBeenCalledTimes(2));

    const [first, second] = raw.channel.mock.calls.map(([topic]) => topic);
    expect(first).toMatch(/^project:p:/);
    expect(second).toMatch(/^project:p:/);
    expect(first).not.toBe(second);
  });

  it("refreshes once for a burst of changes", async () => {
    const { client, channel, fire } = fakeSupabase();
    const refresh = vi.fn();
    subscribeRefresh(client, "project:p", [...versions], refresh);
    await vi.waitFor(() => expect(channel.subscribe).toHaveBeenCalled());

    fire();
    fire();
    fire();
    vi.advanceTimersByTime(300);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("catches up with a refresh after a rejoin, not after the first join", async () => {
    const { client, channel, status } = fakeSupabase();
    const refresh = vi.fn();
    subscribeRefresh(client, "project:p", [...versions], refresh);
    await vi.waitFor(() => expect(channel.subscribe).toHaveBeenCalled());

    status("SUBSCRIBED");
    vi.advanceTimersByTime(300);
    expect(refresh).not.toHaveBeenCalled();

    status("SUBSCRIBED");
    vi.advanceTimersByTime(300);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("reports a channel that cannot join", async () => {
    const { client, channel, status } = fakeSupabase();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    subscribeRefresh(client, "project:p", [...versions], vi.fn());
    await vi.waitFor(() => expect(channel.subscribe).toHaveBeenCalled());

    status("CHANNEL_ERROR");

    expect(log).toHaveBeenCalledWith("Live updates unavailable on project:p: CHANNEL_ERROR");
    log.mockRestore();
  });

  it("leaves the channel and drops a pending refresh on cleanup", async () => {
    const { client, raw, channel, fire } = fakeSupabase();
    const refresh = vi.fn();
    const cleanup = subscribeRefresh(client, "project:p", [...versions], refresh);
    await vi.waitFor(() => expect(channel.subscribe).toHaveBeenCalled());

    fire();
    cleanup();
    vi.advanceTimersByTime(300);

    expect(raw.removeChannel).toHaveBeenCalledWith(channel);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("never joins when the page is left before the token is ready", async () => {
    const { client, raw } = fakeSupabase();

    const cleanup = subscribeRefresh(client, "project:p", [...versions], vi.fn());
    cleanup();
    await Promise.resolve();
    await Promise.resolve();

    expect(raw.channel).not.toHaveBeenCalled();
    expect(raw.removeChannel).not.toHaveBeenCalled();
  });
});
