/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createSandboxChannel, type SandboxChannel } from "./sandbox-channel";
import {
  appEvents,
  appMethods,
  sandboxMethods,
  type AppEvent,
  type AppMethods,
  type ParamsOf,
  type ResultOf,
  type SandboxMethods,
  type SandboxSizing,
  type SandboxView,
} from "./sandbox-protocol";
import { observeAppAppearance, readAppTheme } from "./sandbox-theme";

/** The sandbox document; nginx serves it with a CSP that keeps it opaque even opened directly. */
export const PLUGIN_SANDBOX_URL = `${import.meta.env.BASE_URL}plugin-sandbox.html`;

/**
 * The sandbox document gets an opaque origin: no `allow-same-origin`, so it cannot read the
 * app's cookies, storage or DOM, nor call the API as the user. Forms are allowed only so that
 * MLForm's submit event fires; the document's CSP sends a form nowhere.
 */
export const PLUGIN_SANDBOX_FLAGS = "allow-scripts allow-forms";

const READY_TIMEOUT_MS = 20_000;

type AppHandlers = {
  [K in keyof AppMethods]?: (params: ParamsOf<AppMethods, K>) => Promise<ResultOf<AppMethods, K>>;
};

type Options = {
  container: HTMLElement;
  /** The frame's accessible name. */
  title: string;
  /** How the frame is sized; `hidden` for a sandbox that only answers requests. */
  sizing: SandboxSizing | "hidden";
  className?: string;
  /** The requests this sandbox may make of the app; any other is refused. */
  handlers?: AppHandlers;
  onEvent?: (event: Exclude<AppEvent, { name: "ready" | "resize" }>) => void;
};

export type PluginSandbox = {
  /**
   * Draws the view in place of the one shown; resolves once it is drawn, with whether there was
   * anything to draw. The view then follows the app's appearance.
   */
  mount(view: SandboxView): Promise<{ rendered: boolean }>;
  /** Asks something of the sandbox once it has started. */
  request<K extends keyof SandboxMethods>(
    method: K,
    params: ParamsOf<SandboxMethods, K>,
  ): Promise<ResultOf<SandboxMethods, K>>;
  setSizing(sizing: SandboxSizing): void;
  destroy(): void;
};

const HIDDEN_FRAME = "pointer-events-none fixed top-0 left-0 size-0 border-0 opacity-0";

/**
 * Opens a plugin sandbox in a new iframe inside the container. The app stays the only party that
 * talks to the API: the sandbox receives schemas, plugin sources, data and the app's theme, and
 * gives back form values and drawn results.
 */
export const openPluginSandbox = ({
  container,
  title,
  sizing,
  className,
  handlers = {},
  onEvent,
}: Options): PluginSandbox => {
  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", PLUGIN_SANDBOX_FLAGS);
  frame.title = title;
  frame.className =
    sizing === "hidden" ? HIDDEN_FRAME : `block w-full border-0 bg-transparent ${className ?? ""}`;
  if (sizing === "hidden") {
    frame.tabIndex = -1;
    frame.setAttribute("aria-hidden", "true");
  }
  if (sizing === "content") frame.style.height = "0px";
  let currentSizing = sizing;
  let destroyed = false;
  let stopObserving: (() => void) | null = null;
  let sentTheme = "";
  let markReady = () => {};
  let failReady: (error: Error) => void = () => {};
  const ready = new Promise<void>((resolve, reject) => {
    markReady = resolve;
    failReady = reject;
  });
  ready.catch(() => {});
  const timer = setTimeout(
    () => failReady(new Error("The plugin sandbox did not start.")),
    READY_TIMEOUT_MS,
  );

  const channel: SandboxChannel<SandboxMethods, Record<never, never>> = createSandboxChannel({
    listener: window,
    peer: () => frame.contentWindow,
    serves: appMethods,
    handlers,
    calls: sandboxMethods,
    hears: appEvents,
    onEvent: (event) => {
      if (event.name === "ready") {
        clearTimeout(timer);
        markReady();
      } else if (event.name === "resize") {
        if (currentSizing === "content")
          frame.style.height = `${Math.ceil(event.payload.height)}px`;
      } else onEvent?.(event);
    },
  });

  const request: PluginSandbox["request"] = async (method, params) => {
    await ready;
    return channel.request(method, params);
  };

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    clearTimeout(timer);
    stopObserving?.();
    failReady(new Error("The plugin sandbox was closed."));
    channel.close("The plugin sandbox was closed.");
    frame.remove();
  };

  // The sandbox document loads once; a second load means plugin code navigated the frame away.
  let loads = 0;
  frame.addEventListener("load", () => {
    loads += 1;
    if (loads > 1) destroy();
  });
  frame.src = PLUGIN_SANDBOX_URL;
  container.append(frame);

  return {
    async mount(view) {
      await ready;
      const theme = readAppTheme();
      sentTheme = JSON.stringify(theme);
      stopObserving ??= observeAppAppearance(() => {
        const next = readAppTheme();
        if (JSON.stringify(next) === sentTheme) return;
        sentTheme = JSON.stringify(next);
        void channel.request("theme", next).catch(() => {});
      });
      return channel.request("mount", {
        view,
        theme,
        sizing: currentSizing === "hidden" ? "content" : currentSizing,
      });
    },
    request,
    setSizing(next) {
      if (currentSizing === next || currentSizing === "hidden") return;
      currentSizing = next;
      if (next === "fill") frame.style.removeProperty("height");
      void request("sizing", { sizing: next }).catch(() => {});
    },
    destroy,
  };
};
