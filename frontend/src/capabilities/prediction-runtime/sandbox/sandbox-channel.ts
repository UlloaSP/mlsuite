/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { z } from "zod";
import {
  SANDBOX_CHANNEL,
  envelopeSchema,
  type Envelope,
  type EventMap,
  type MethodMap,
  type ParamsOf,
  type ResultOf,
} from "./sandbox-protocol";

type Handlers<Serves extends MethodMap> = {
  [K in keyof Serves]?: (params: ParamsOf<Serves, K>) => Promise<ResultOf<Serves, K>>;
};

type HeardEvent<Hears extends EventMap> = {
  [K in keyof Hears]: { name: K; payload: z.infer<Hears[K]> };
}[keyof Hears];

type Options<Serves extends MethodMap, Calls extends MethodMap, Hears extends EventMap> = {
  /** The window this side listens on. */
  listener: Window;
  /** The only window messages are accepted from and sent to; null once it is gone. */
  peer: () => Window | null;
  serves: Serves;
  handlers: Handlers<Serves>;
  calls: Calls;
  hears: Hears;
  onEvent?: (event: HeardEvent<Hears>) => void;
};

export type SandboxChannel<Calls extends MethodMap, Tells extends EventMap> = {
  request<K extends keyof Calls & string>(
    method: K,
    params: ParamsOf<Calls, K>,
  ): Promise<ResultOf<Calls, K>>;
  emit<K extends keyof Tells & string>(name: K, payload: z.infer<Tells[K]>): void;
  close(reason?: string): void;
};

type Pending = {
  method: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const own = <T extends object>(map: T, key: string): T[keyof T] | undefined =>
  Object.hasOwn(map, key) ? map[key as keyof T] : undefined;

/**
 * One side of the typed message channel between the app and a plugin sandbox. Messages from any
 * window but the peer are ignored before they are read; the rest are validated: a malformed
 * message is dropped, a request for an unknown method or with invalid parameters is refused,
 * and an answer that does not match its method's result is a failure.
 */
export const createSandboxChannel = <
  Serves extends MethodMap,
  Calls extends MethodMap,
  Hears extends EventMap,
  Tells extends EventMap,
>(
  options: Options<Serves, Calls, Hears>,
): SandboxChannel<Calls, Tells> => {
  const { listener, peer, serves, handlers, calls, hears, onEvent } = options;
  const pending = new Map<number, Pending>();
  let nextId = 1;
  let closed = false;

  const post = (message: Envelope) => {
    const target = peer();
    if (!target) throw new Error("The plugin sandbox is gone.");
    // A sandbox has an opaque origin that cannot be named; each receiver checks event.source.
    target.postMessage(message, "*");
  };

  const respond = (id: number, result: unknown, error?: string) => {
    try {
      post({ channel: SANDBOX_CHANNEL, type: "response", id, result, error });
    } catch (failure) {
      if (error === undefined) respond(id, null, errorMessage(failure));
    }
  };

  const handleRequest = async (id: number, method: string, raw: unknown) => {
    const spec = own(serves, method);
    const handler = own(handlers, method) as ((params: unknown) => Promise<unknown>) | undefined;
    if (!spec || !handler) return respond(id, null, `Unknown method "${method}".`);
    const params = spec.params.safeParse(raw);
    if (!params.success) return respond(id, null, `Invalid "${method}" request.`);
    try {
      respond(id, (await handler(params.data)) ?? null);
    } catch (error) {
      respond(id, null, errorMessage(error));
    }
  };

  const handleResponse = (id: number, raw: unknown, error: string | undefined) => {
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    if (error !== undefined) return entry.reject(new Error(error));
    const result = own(calls, entry.method)!.result.safeParse(raw);
    if (result.success) entry.resolve(result.data);
    else entry.reject(new Error(`Invalid "${entry.method}" answer from the plugin sandbox.`));
  };

  const handleEvent = (name: string, raw: unknown) => {
    const payload = own(hears, name)?.safeParse(raw);
    if (payload?.success) onEvent?.({ name, payload: payload.data } as HeardEvent<Hears>);
  };

  const onMessage = (event: MessageEvent) => {
    if (closed || event.source === null || event.source !== peer()) return;
    const parsed = envelopeSchema.safeParse(event.data);
    if (!parsed.success) return;
    const message = parsed.data;
    if (message.type === "request") void handleRequest(message.id, message.method, message.params);
    else if (message.type === "response") handleResponse(message.id, message.result, message.error);
    else handleEvent(message.name, message.payload);
  };

  listener.addEventListener("message", onMessage);

  return {
    request(method, params) {
      if (closed) return Promise.reject(new Error("The plugin sandbox is closed."));
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { method, resolve: resolve as Pending["resolve"], reject });
        try {
          post({ channel: SANDBOX_CHANNEL, type: "request", id, method, params });
        } catch (error) {
          pending.delete(id);
          reject(new Error(errorMessage(error)));
        }
      });
    },
    emit(name, payload) {
      if (closed) return;
      post({ channel: SANDBOX_CHANNEL, type: "event", name, payload });
    },
    close(reason = "The plugin sandbox is closed.") {
      if (closed) return;
      closed = true;
      listener.removeEventListener("message", onMessage);
      for (const entry of pending.values()) entry.reject(new Error(reason));
      pending.clear();
    },
  };
};
