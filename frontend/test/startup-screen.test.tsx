// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { StartupGate, STARTUP_OPENING_MS } from "@/app/startup/StartupGate";
import { StartupScreen, STARTUP_STUCK_MS } from "@/app/startup/StartupScreen";
import { getStartupServices } from "@/app/startup/startupServices";
import { startupPhase } from "@/app/startup/startupStatus";
import { LOADING_REVEAL_DELAY_MS } from "@/shared/ui/useStableLoading";

const startup = vi.hoisted(() => ({ ready: false }));
vi.mock("@/app/startup/startup-query", () => ({
  useStartupReadinessQuery: () => ({ data: { ready: startup.ready, dependencies: [] } }),
  useStartupServicesQuery: () => ({ data: ["healthy", "waiting"] }),
}));

describe("startup phase", () => {
  test("opens once the API reports ready", () => {
    expect(startupPhase(true, ["exited"])).toBe("opening");
  });

  test("retries while any service is unhealthy, restarting or exited", () => {
    expect(startupPhase(false, ["healthy", "unhealthy"])).toBe("retrying");
    expect(startupPhase(false, ["restarting"])).toBe("retrying");
    expect(startupPhase(false, ["exited"])).toBe("retrying");
  });

  test("starts while services are still coming up", () => {
    expect(startupPhase(false, ["waiting", "checking", "completed"])).toBe("starting");
  });
});

describe("startup services source", () => {
  afterEach(() => vi.unstubAllGlobals());

  test("reads ordered states from the frontend server", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ services: [{ state: "healthy" }, { state: "exited" }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getStartupServices()).resolves.toEqual(["healthy", "exited"]);
    expect(fetchMock).toHaveBeenCalledWith("/startup/services", { signal: undefined });
  });

  test("resolves to null when ops-agent is unreachable or failing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 503 })),
    );
    await expect(getStartupServices()).resolves.toBeNull();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("offline"))),
    );
    await expect(getStartupServices()).resolves.toBeNull();
  });
});

describe("startup screen", () => {
  test("draws one arc per service and never shows service names", () => {
    const markup = renderToStaticMarkup(
      <StartupScreen ready={false} states={["healthy", "waiting", "exited"]} />,
    );

    expect(markup.match(/startup-ring-arc/g)).toHaveLength(3);
    expect(markup).toContain("Retrying");
    expect(markup).toContain("oklch(0.64 0.21 25)");
  });

  test("draws a neutral track before any state is known", () => {
    const markup = renderToStaticMarkup(<StartupScreen ready={false} states={[]} />);

    expect(markup.match(/startup-ring-arc/g)).toHaveLength(1);
    expect(markup).toContain("Starting");
  });
});

describe("startup gate", () => {
  let root: Root;
  let container: HTMLDivElement;
  const render = (element: React.ReactNode) => act(() => root.render(element));
  const text = () => container.textContent ?? "";

  beforeEach(() => {
    vi.useFakeTimers();
    startup.ready = false;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  test("renders the app immediately when services are already ready", () => {
    startup.ready = true;
    render(<StartupGate>App</StartupGate>);

    expect(text()).toBe("App");
  });

  test("holds Opening MLsuite. before handing over to the app", () => {
    render(<StartupGate>App</StartupGate>);
    act(() => vi.advanceTimersByTime(LOADING_REVEAL_DELAY_MS));
    expect(text()).toContain("Starting MLsuite.");

    startup.ready = true;
    render(<StartupGate>App</StartupGate>);
    expect(text()).toContain("Opening MLsuite.");

    act(() => vi.advanceTimersByTime(STARTUP_OPENING_MS));
    expect(text()).toBe("App");
  });

  test("suggests checking logs after a service keeps failing", () => {
    render(<StartupScreen ready={false} states={["exited"]} />);
    act(() => vi.advanceTimersByTime(STARTUP_STUCK_MS - 1));
    expect(text()).not.toContain("docker compose logs");

    act(() => vi.advanceTimersByTime(1));
    expect(text()).toContain("docker compose logs");
  });
});
