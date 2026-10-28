// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import {
  openPluginSandbox,
  type PluginSandbox,
} from "@/capabilities/prediction-runtime/sandbox/plugin-sandbox";
import { SANDBOX_CHANNEL } from "@/capabilities/prediction-runtime/sandbox/sandbox-protocol";

type Request = { id: number; method: string; params: { mode?: string; theme?: { mode: string } } };

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const opened: PluginSandbox[] = [];

afterEach(() => {
  for (const sandbox of opened.splice(0)) sandbox.destroy();
  document.documentElement.classList.remove("dark");
  document.body.innerHTML = "";
});

/** A frame whose document is played by the test: what the app asks it, and its answers. */
function openWithGuest(sizing: "fill" | "content" | "hidden" = "fill") {
  const container = document.body.appendChild(document.createElement("div"));
  const sandbox = openPluginSandbox({ container, title: "Form", sizing });
  opened.push(sandbox);
  const frame = container.querySelector("iframe") ?? document.querySelector("iframe")!;
  const guest = frame.contentWindow!;
  const requests: Request[] = [];
  vi.spyOn(guest, "postMessage").mockImplementation((data: unknown) => {
    const message = data as Request & { type: string };
    if (message.type === "request") requests.push(message);
  });
  const send = (message: Record<string, unknown>) =>
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { channel: SANDBOX_CHANNEL, ...message },
        source: guest,
      }),
    );
  return {
    sandbox,
    frame,
    requests,
    ready: () => send({ type: "event", name: "ready", payload: {} }),
    answer: (request: Request, result: unknown) =>
      send({ type: "response", id: request.id, result }),
    refuse: (request: Request) =>
      send({ type: "response", id: request.id, result: null, error: "boom" }),
  };
}

const view = { kind: "report", report: {}, plugins: [] } as never;

describe("plugin sandbox frame", () => {
  test("a drawn frame stays hidden until its document has the theme and the view", async () => {
    document.documentElement.classList.add("dark");
    const guest = openWithGuest();
    expect(guest.frame.style.visibility).toBe("hidden");

    const mounted = guest.sandbox.mount(view);
    guest.ready();
    await flush();
    const [mount] = guest.requests;
    expect(mount.method).toBe("mount");
    expect(mount.params.theme?.mode).toBe("dark");
    expect(guest.frame.style.visibility).toBe("hidden");

    guest.answer(mount, { rendered: true });
    await mounted;

    expect(guest.frame.style.visibility).toBe("");
    expect(guest.frame.style.colorScheme).toBe("dark");
  });

  test("a frame whose view could not be drawn is not shown", async () => {
    const guest = openWithGuest();
    const mounted = guest.sandbox.mount(view);
    guest.ready();
    await flush();

    guest.refuse(guest.requests[0]);

    await expect(mounted).rejects.toThrow("boom");
    expect(guest.frame.style.visibility).toBe("hidden");
  });

  test("on an appearance change the frame keeps its document's scheme until the document has the new one", async () => {
    const guest = openWithGuest("content");
    const mounted = guest.sandbox.mount(view);
    guest.ready();
    await flush();
    guest.answer(guest.requests[0], { rendered: true });
    await mounted;
    expect(guest.frame.style.colorScheme).toBe("light");

    document.documentElement.classList.add("dark");
    await flush();
    const theme = guest.requests.find((request) => request.method === "theme")!;
    expect(theme.params.mode).toBe("dark");
    expect(guest.frame.style.colorScheme).toBe("light");

    guest.answer(theme, null);
    await flush();
    expect(guest.frame.style.colorScheme).toBe("dark");
  });

  test("a frame that only answers requests is never shown", () => {
    const guest = openWithGuest("hidden");

    expect(guest.frame.style.visibility).toBe("");
    expect(guest.frame.className).toContain("opacity-0");
    expect(guest.frame.getAttribute("aria-hidden")).toBe("true");
  });
});
