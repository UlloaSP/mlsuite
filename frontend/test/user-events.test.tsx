// @vitest-environment jsdom

import { QueryClient } from "@tanstack/react-query";
import { act } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import {
  NOTIFICATIONS_QUERY_KEY,
  PENDING_INVITATIONS_QUERY_KEY,
} from "@/features/notifications/api/notification.queries";
import { useUserEvents } from "@/features/notifications/lib/use-user-events";
import { mount } from "./support/dom";

class FakeSocket extends EventTarget {
  static opened: FakeSocket[] = [];
  closed = false;
  readonly url: string;
  constructor(url: string) {
    super();
    this.url = url;
    FakeSocket.opened.push(this);
  }
  open() {
    this.dispatchEvent(new Event("open"));
  }
  receive(data: unknown) {
    this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(data) }));
  }
  drop() {
    this.dispatchEvent(new Event("close"));
  }
  close() {
    this.closed = true;
    this.dispatchEvent(new Event("close"));
  }
}

function Events() {
  useUserEvents(true);
  return null;
}

const refreshed = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.map(([filters]) => (filters as { queryKey: unknown }).queryKey);

beforeEach(() => {
  FakeSocket.opened = [];
  vi.useFakeTimers();
  vi.stubGlobal("WebSocket", FakeSocket);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("a pushed change reads the inbox, the badge and the pending invitations again", async () => {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  await mount(<Events />, { queryClient: client });
  const [socket] = FakeSocket.opened;

  expect(socket!.url).toMatch(/^wss?:\/\/.+\/api\/me\/events$/);
  act(() => socket!.receive({ type: "notifications.changed" }));

  expect(refreshed(invalidate)).toEqual([NOTIFICATIONS_QUERY_KEY, PENDING_INVITATIONS_QUERY_KEY]);
});

test("a lost connection comes back after a pause and reads what it missed", async () => {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const view = await mount(<Events />, { queryClient: client });

  act(() => FakeSocket.opened[0]!.drop());
  expect(FakeSocket.opened).toHaveLength(1);
  await act(async () => vi.advanceTimersByTimeAsync(1_000));
  expect(FakeSocket.opened).toHaveLength(2);
  act(() => FakeSocket.opened[1]!.open());

  expect(refreshed(invalidate)).toEqual([NOTIFICATIONS_QUERY_KEY, PENDING_INVITATIONS_QUERY_KEY]);

  // Leaving the shell closes the socket for good.
  await view.unmount();
  expect(FakeSocket.opened[1]!.closed).toBe(true);
  await act(async () => vi.advanceTimersByTimeAsync(60_000));
  expect(FakeSocket.opened).toHaveLength(2);
});
