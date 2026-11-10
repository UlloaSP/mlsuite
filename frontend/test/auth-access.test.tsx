// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { act } from "react";
import { QueryClient } from "@tanstack/react-query";
import { useLocation, useRouter } from "@tanstack/react-router";
import { AuthLandingPage } from "@/app/pages/AuthLandingPage";
import { greetingFor } from "@/app/pages/auth-landing/authLandingCopy";
import { useAuthAccess } from "@/app/pages/auth-landing/useAuthAccess";
import { WORKSPACE_CONTEXT_QUERY_KEY } from "@/capabilities/workspace-context/workspace-context";
import { click, mount } from "./support/dom";

let host: HTMLDivElement;
let router: ReturnType<typeof useRouter>;
let queryClient: QueryClient;

/** The workspace the shell needs, answered when the test releases it. */
const workspace = vi.hoisted(() => ({ release: () => undefined as void, requests: 0 }));
const answerWorkspace = () =>
  new Promise<Response>((resolve) => {
    workspace.requests += 1;
    workspace.release = () =>
      resolve(
        new Response(JSON.stringify({ currentOrganization: { id: 3 }, permissions: {} }), {
          headers: { "content-type": "application/json" },
        }),
      );
  });

function AccessProbe() {
  router = useRouter();
  const location = useLocation();
  const access = useAuthAccess("/review");
  return (
    <div data-phase={access.phase} data-path={location.pathname}>
      <button type="button" onClick={() => access.succeed(null)}>
        succeed
      </button>
    </div>
  );
}

const probe = () => host.querySelector<HTMLElement>("[data-phase]")!;
const advance = (ms: number) =>
  act(async () => {
    vi.advanceTimersByTime(ms);
  });
const mountProbe = async () => {
  workspace.requests = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.includes("/api/workspace/context/current")
        ? answerWorkspace()
        : new Response("{}", { status: 404 }),
    ),
  );
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  ({ host } = await mount(<AccessProbe />, { route: "/", queryClient }));
};
/** Signs in, with the shell's workspace already answered, as a fast server would. */
const succeedPrepared = async () => {
  await click("succeed", host);
  await act(async () => workspace.release());
};

describe("auth access sequence", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await mountProbe();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test("tears the pass, reveals the overlay, then opens the destination after about two seconds", async () => {
    expect(probe().dataset.phase).toBe("0");
    await succeedPrepared();
    expect(probe().dataset.phase).toBe("1");
    await advance(449);
    expect(probe().dataset.phase).toBe("1");
    await advance(1);
    expect(probe().dataset.phase).toBe("2");
    expect(probe().dataset.path).toBe("/");

    await advance(1399);
    expect(probe().dataset.path).toBe("/");
    await advance(1);
    expect(probe().dataset.path).toBe("/review");
  });

  test("readies the destination and the shell's workspace while the welcome plays", async () => {
    const preload = vi.spyOn(router, "preloadRoute");
    await click("succeed", host);

    expect(preload).toHaveBeenCalledWith(expect.objectContaining({ to: "/review" }));
    expect(workspace.requests).toBe(1);
  });

  test("holds the welcome until the shell's workspace has arrived, so it hands over to the app", async () => {
    await click("succeed", host);
    await advance(450 + 1400 + 500);
    expect(probe().dataset.path).toBe("/");

    await act(async () => workspace.release());

    expect(probe().dataset.path).toBe("/review");
    expect(queryClient.getQueryData(WORKSPACE_CONTEXT_QUERY_KEY)).toBeDefined();
  });
});

describe("auth access sequence without motion", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }));
    await mountProbe();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test("shows the welcome at once and leaves it up long enough to read", async () => {
    await succeedPrepared();
    expect(probe().dataset.phase).toBe("2");

    await advance(699);
    expect(probe().dataset.path).toBe("/");
    await advance(1);
    expect(probe().dataset.path).toBe("/review");
  });
});

/** The API answers every sign-in or registration with this, once it is set. */
const answer = vi.hoisted(() => ({
  current: null as null | (() => Response),
  posts: 0,
}));
const refusal = (status: number, message: string) => () =>
  new Response(JSON.stringify({ status, message, path: "/api/auth/register" }), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("auth landing form", () => {
  let release: () => void = () => undefined;

  beforeEach(() => {
    answer.posts = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method !== "POST") return refusal(401, "Unauthorized")();
        answer.posts += 1;
        // The server answers only when the test lets it, so the waiting state can be seen.
        await new Promise<void>((resolve) => (release = resolve));
        return answer.current!();
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const fill = (values: Record<string, string>) => {
    for (const [name, value] of Object.entries(values)) {
      host.querySelector<HTMLInputElement>(`input[name="${name}"]`)!.value = value;
    }
  };
  const submitButton = () => host.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
  const openForm = async (route: string) => {
    ({ host } = await mount(null, {
      route,
      routes: { "/login": <AuthLandingPage /> },
      queryClient: new QueryClient({ defaultOptions: { mutations: { retry: false } } }),
    }));
  };
  const REGISTRATION = {
    fullName: "Ada Lovelace",
    username: "ada",
    email: "ada@acme.test",
    password: "correct-horse-battery",
  };

  test("a refused registration never plays the welcome and marks no field it is not about", async () => {
    answer.current = refusal(429, "Too many registrations from your network. Try again later.");
    await openForm("/login?mode=register");
    fill(REGISTRATION);

    await click(submitButton());
    // The mutation tells the form it is pending on the next tick; the server is still holding.
    await settle();
    expect(submitButton().textContent).toBe("Creating account…");
    expect(host.querySelector(".auth-pass")?.getAttribute("data-phase")).toBe("0");
    expect(host.textContent).not.toContain("✓");

    await act(async () => release());
    await settle();

    expect(host.querySelector('[role="alert"]')?.textContent).toBe(
      "Too many registrations from your network. Try again later.",
    );
    expect(host.textContent).not.toContain("created.");
    expect(host.textContent).not.toContain("OPENING WORKSPACE");
    expect(host.querySelectorAll('input[aria-invalid="true"]')).toHaveLength(0);
    expect(submitButton().textContent).toContain("Create account");
  });

  test("a taken handle marks the fields it is about", async () => {
    answer.current = refusal(409, "The handle 'ada' is already taken.");
    await openForm("/login?mode=register");
    fill(REGISTRATION);

    await click(submitButton());
    await act(async () => release());
    await settle();

    expect(host.querySelector('[role="alert"]')?.textContent).toBe(
      "The handle 'ada' is already taken.",
    );
    expect(host.querySelectorAll('input[aria-invalid="true"]').length).toBeGreaterThan(0);
  });

  test("a username typed as the sign-in email says why instead of doing nothing", async () => {
    await openForm("/login");
    fill({ email: "ada", password: "correct-horse-battery" });

    await click(submitButton());

    expect(answer.posts).toBe(0);
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("email address");
    expect(
      [...host.querySelectorAll('input[aria-invalid="true"]')].map(
        (node) => (node as HTMLInputElement).name,
      ),
    ).toEqual(["email"]);
    expect(host.querySelector("label")?.textContent).toBe("Email");
  });

  test("an accepted sign-in plays the welcome only after the server answered", async () => {
    answer.current = () =>
      new Response(JSON.stringify({ id: 1, fullName: "Ada", email: "ada@acme.test" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    await openForm("/login");
    fill({ email: "ada@acme.test", password: "correct-horse-battery" });

    await click(submitButton());
    expect(host.querySelector(".auth-pass")?.getAttribute("data-phase")).toBe("0");
    expect(host.textContent).not.toContain("Welcome to");

    await act(async () => release());
    await settle();

    expect(host.querySelector(".auth-pass")?.getAttribute("data-phase")).toBe("1");
    expect(submitButton().textContent).toBe("✓");
    expect(host.textContent).toContain("Welcome to");
  });
});

describe("auth pass greeting", () => {
  test.each([
    [0, "Hello,", "night owl."],
    [4, "Hello,", "night owl."],
    [5, "Good", "morning."],
    [12, "Good", "afternoon."],
    [19, "Good", "evening."],
    [22, "Hello,", "night owl."],
  ])("greets sign-in at %i:00 with %s %s", (hour, lead, emphasis) => {
    expect(greetingFor("login", new Date(2026, 8, 26, hour))).toEqual({ lead, emphasis });
  });

  test("welcomes new accounts regardless of the hour", () => {
    expect(greetingFor("register", new Date(2026, 8, 26, 23))).toEqual({
      lead: "Nice to",
      emphasis: "meet you.",
    });
  });
});
