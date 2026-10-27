/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { z } from "zod";
import { describe, expect, test, vi } from "vite-plus/test";
import { createSandboxChannel } from "@/capabilities/prediction-runtime/sandbox/sandbox-channel";
import { SANDBOX_CHANNEL } from "@/capabilities/prediction-runtime/sandbox/sandbox-protocol";
import { linkedWindows } from "./support/loopback-sandbox";

const methods = {
  double: { params: z.object({ value: z.number() }), result: z.object({ value: z.number() }) },
} as const;
const events = { ping: z.object({ at: z.number() }) } as const;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** An app channel and a sandbox channel that only hear each other. */
const pair = (handler = vi.fn(async ({ value }: { value: number }) => ({ value: value * 2 }))) => {
  const windows = linkedWindows();
  const onEvent = vi.fn();
  const app = createSandboxChannel({
    listener: windows.app,
    peer: () => windows.sandbox,
    serves: {},
    handlers: {},
    calls: methods,
    hears: events,
    onEvent,
  });
  const sandbox = createSandboxChannel<typeof methods, Record<never, never>, Record<never, never>, typeof events>({
    listener: windows.sandbox,
    peer: () => windows.app,
    serves: methods,
    handlers: { double: handler },
    calls: {},
    hears: {},
  });
  return { app, sandbox, windows, handler, onEvent };
};

/** Delivers a message to `target` as if `source` had posted it. */
const deliver = (target: Window, source: unknown, data: unknown) =>
  target.dispatchEvent(Object.assign(new Event("message"), { data, source }));

describe("plugin sandbox channel", () => {
  test("answers a request and hears an event, each validated", async () => {
    const { app, sandbox, onEvent } = pair();

    await expect(app.request("double", { value: 21 })).resolves.toEqual({ value: 42 });
    sandbox.emit("ping", { at: 1 });
    await flush();

    expect(onEvent).toHaveBeenCalledWith({ name: "ping", payload: { at: 1 } });
  });

  test("ignores messages from any window but its peer, before reading them", async () => {
    const { windows, handler, onEvent } = pair();
    const stranger = {};
    const data = vi.fn();
    const message = new Proxy(
      { channel: SANDBOX_CHANNEL, type: "request", id: 1, method: "double", params: { value: 1 } },
      { get: (target, key) => (data(), Reflect.get(target, key)) },
    );

    deliver(windows.sandbox, stranger, message);
    deliver(windows.app, stranger, {
      channel: SANDBOX_CHANNEL,
      type: "event",
      name: "ping",
      payload: { at: 1 },
    });
    await flush();

    expect(data).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
    expect(onEvent).not.toHaveBeenCalled();
  });

  test("drops malformed messages and events with an invalid payload", async () => {
    const { windows, handler, onEvent } = pair();
    const post = vi.spyOn(windows.app, "postMessage");

    for (const data of [
      "double",
      null,
      { channel: "other", type: "request", id: 1, method: "double", params: {} },
      { channel: SANDBOX_CHANNEL, type: "request", id: "1", method: "double", params: {} },
      { channel: SANDBOX_CHANNEL, type: "shout", id: 1 },
    ]) {
      deliver(windows.sandbox, windows.app, data);
    }
    deliver(windows.app, windows.sandbox, {
      channel: SANDBOX_CHANNEL,
      type: "event",
      name: "ping",
      payload: { at: "now" },
    });
    await flush();

    expect(handler).not.toHaveBeenCalled();
    expect(onEvent).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  test("refuses unknown methods, inherited names and invalid parameters", async () => {
    const { app, handler } = pair();
    const request = app.request as (method: string, params: unknown) => Promise<unknown>;

    await expect(request("triple", { value: 1 })).rejects.toThrow('Unknown method "triple".');
    await expect(request("constructor", {})).rejects.toThrow('Unknown method "constructor".');
    await expect(request("double", { value: "1" })).rejects.toThrow('Invalid "double" request.');
    expect(handler).not.toHaveBeenCalled();
  });

  test("ignores unknown events and answers to requests it never made", async () => {
    const { windows, onEvent } = pair();

    deliver(windows.app, windows.sandbox, {
      channel: SANDBOX_CHANNEL,
      type: "event",
      name: "toString",
      payload: {},
    });
    deliver(windows.app, windows.sandbox, {
      channel: SANDBOX_CHANNEL,
      type: "response",
      id: 99,
      result: { value: 1 },
    });
    await flush();

    expect(onEvent).not.toHaveBeenCalled();
  });

  test("fails a request whose answer does not match its result, or that failed", async () => {
    const wrong = pair(vi.fn(async () => ({ value: "forty-two" }) as never));
    await expect(wrong.app.request("double", { value: 1 })).rejects.toThrow(
      'Invalid "double" answer from the plugin sandbox.',
    );

    const failing = pair(
      vi.fn(async () => {
        throw new Error("plugin threw");
      }),
    );
    await expect(failing.app.request("double", { value: 1 })).rejects.toThrow("plugin threw");
  });

  test("closing rejects what is pending and stops listening", async () => {
    const { app, windows, onEvent } = pair(vi.fn(() => new Promise<never>(() => {})));
    const pending = expect(app.request("double", { value: 1 })).rejects.toThrow("closed for the test");

    app.close("closed for the test");
    deliver(windows.app, windows.sandbox, {
      channel: SANDBOX_CHANNEL,
      type: "event",
      name: "ping",
      payload: { at: 1 },
    });
    await flush();

    await pending;
    await expect(app.request("double", { value: 1 })).rejects.toThrow("closed");
    expect(onEvent).not.toHaveBeenCalled();
  });
});
