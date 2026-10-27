/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type * as PluginSandboxModule from "@/capabilities/prediction-runtime/sandbox/plugin-sandbox";
import type { PluginSandbox } from "@/capabilities/prediction-runtime/sandbox/plugin-sandbox";
import { createSandboxChannel } from "@/capabilities/prediction-runtime/sandbox/sandbox-channel";
import { startPluginSandbox } from "@/capabilities/prediction-runtime/sandbox/sandbox-guest";
import {
  appEvents,
  appMethods,
  sandboxMethods,
} from "@/capabilities/prediction-runtime/sandbox/sandbox-protocol";
import { readAppTheme } from "@/capabilities/prediction-runtime/sandbox/sandbox-theme";

/**
 * Two windows that only talk to each other: what one posts arrives on the other, from it, after
 * a structured clone, as postMessage between an app and its frame does.
 */
export const linkedWindows = () => {
  const make = () => Object.assign(new EventTarget(), { postMessage: (_data: unknown) => {} });
  const first = make();
  const second = make();
  // What is posted to a window arrives on it, from the only other window there is.
  const deliver = (target: typeof first, sender: typeof first) => {
    target.postMessage = (data: unknown) => {
      const copy = structuredClone(data);
      queueMicrotask(() =>
        target.dispatchEvent(Object.assign(new Event("message"), { data: copy, source: sender })),
      );
    };
  };
  deliver(first, second);
  deliver(second, first);
  const asWindow = (window: typeof first) => window as unknown as Window;
  return { app: asWindow(first), sandbox: asWindow(second) };
};

/**
 * `openPluginSandbox` for jsdom, which runs no iframe: the real sandbox document code, in a div
 * where the frame would be, over the real channel between two linked windows. Plugin code runs
 * in the test's realm, but sees only what the protocol carries.
 */
export const openLoopbackSandbox: typeof PluginSandboxModule.openPluginSandbox = ({
  container,
  sizing,
  handlers = {},
  onEvent,
}) => {
  const windows = linkedWindows();
  const root = document.createElement("div");
  root.dataset.pluginSandbox = sizing;
  if (sizing !== "hidden") container.append(root);
  let markReady = () => {};
  const ready = new Promise<void>((resolve) => (markReady = resolve));
  const channel = createSandboxChannel({
    listener: windows.app,
    peer: () => windows.sandbox,
    serves: appMethods,
    handlers,
    calls: sandboxMethods,
    hears: appEvents,
    onEvent: (event) => {
      if (event.name === "ready") markReady();
      else if (event.name !== "resize") onEvent?.(event);
    },
  });
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  // Reports' explanation requests are routed through the protocol; the test's fetch stays its own.
  startPluginSandbox(root, { listener: windows.sandbox, parent: windows.app, scope: {} as never });
  const request: PluginSandbox["request"] = async (method, params) => {
    await ready;
    return channel.request(method, params);
  };
  return {
    mount: (view) =>
      request("mount", {
        view,
        theme: readAppTheme(),
        sizing: sizing === "hidden" ? "content" : sizing,
      }),
    request,
    setSizing: () => {},
    destroy: () => {
      channel.close();
      root.remove();
    },
  };
};

/** The plugin sandbox module for `vi.mock`, its frame replaced by the loopback. */
export const loopbackSandboxModule = () => ({ openPluginSandbox: openLoopbackSandbox });
