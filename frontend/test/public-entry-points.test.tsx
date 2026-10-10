// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getDefaultStore } from "jotai";
import { act, type PropsWithChildren } from "react";
import { createMemoryRouter, Route, RouterProvider, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { AuthLandingPage } from "@/app/pages/AuthLandingPage";
import { routes } from "@/app/router/routes";
import { safeReturnTo } from "@/capabilities/workspace-context/session";
import {
  inferenceSessionsAtom,
  type SessionEntry,
} from "@/features/schemas/lib/inference-session-store";
import type { PublicBookmarkDto, PublicBookmarkSummaryDto } from "@/shared/api/openapi.gen";
import { click, mount } from "./support/dom";

/** The shell is a stub; it carries the real account menu, open, when a test asks for it. */
const shell = vi.hoisted(() => ({ accountMenu: false }));
vi.mock("@/app/layouts/AppShellLayout", async () => {
  const { DropdownMenu } = await import("radix-ui");
  const { AccountMenuContent } = await import("@/app/components/AccountMenuContent");
  return {
    AppShellFrame: ({ children }: PropsWithChildren) => (
      <div data-frame="app-shell">
        {shell.accountMenu ? (
          <DropdownMenu.Root open modal={false}>
            <DropdownMenu.Trigger>Account</DropdownMenu.Trigger>
            <AccountMenuContent align="start" className="" notificationCount={0} side="top" />
          </DropdownMenu.Root>
        ) : null}
        {children}
      </div>
    ),
  };
});
/** jsdom loads no documents, so the ones the app asks for are recorded instead. */
const documents = vi.hoisted(() => ({ opened: [] as string[] }));
vi.mock("@/capabilities/workspace-context/session-api", async (original) => ({
  ...(await original<typeof import("@/capabilities/workspace-context/session-api")>()),
  openDocument: (path: string) => void documents.opened.push(path),
}));

const PUBLIC_ID = "8f6f3c0e-58a2-4c0b-9d0c-0d5c1f6e2a11";
const FEED_URL = "/explore?sort=name";
const BOOKMARK_URL = `/explore/${PUBLIC_ID}`;
const SUMMARY: PublicBookmarkSummaryDto = {
  publicId: PUBLIC_ID,
  name: "production",
  description: "Estimates cardiovascular risk.",
  inputCount: 0,
  reportCount: 0,
  organizationName: "Acme Health",
  organizationLogoUrl: null,
  updatedAt: "2026-10-01T10:00:00Z",
};
const BOOKMARK: PublicBookmarkDto = {
  ...SUMMARY,
  publicationNote: null,
  version: 2,
  formSchema: { fields: [] },
};
const USER = { id: 9, fullName: "Ada Lovelace", email: "ada@acme.test", systemRole: "USER" };
const WORKSPACE = {
  currentOrganization: { id: 3, name: "Ada Lovelace Personal", slug: "ada" },
  organizations: [{ id: 3, name: "Ada Lovelace Personal", slug: "ada" }],
  permissions: {},
};

/** The API as the browser sees it: a session that starts with signing in or registering. */
const api = {
  signedIn: false,
  signOutFails: false,
  posts: [] as Array<{ path: string; body: unknown }>,
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
const respond = (url: string, init?: RequestInit) => {
  const { pathname } = new URL(url);
  if (pathname === "/api/logout") {
    api.posts.push({ path: pathname, body: null });
    if (api.signOutFails) return json({ status: 500, message: "Sign-out failed" }, 500);
    api.signedIn = false;
    return new Response(null, { status: 204 });
  }
  if (init?.method === "POST") {
    api.posts.push({ path: pathname, body: JSON.parse(init.body as string) });
    api.signedIn = true;
    return json(USER);
  }
  if (pathname === "/api/public/bookmarks") {
    return json({ items: [SUMMARY], page: 0, size: 24, totalItems: 1, hasNext: false });
  }
  if (pathname === `/api/public/bookmarks/${PUBLIC_ID}`) return json(BOOKMARK);
  if (pathname === `/api/public/bookmarks/${PUBLIC_ID}/examples/catalog`)
    return json({ items: [], page: 0, size: 24, totalItems: 0, hasNext: false });
  if (pathname === `/api/public/bookmarks/${PUBLIC_ID}/runs/catalog`)
    return json({ items: [], page: 0, size: 24, totalItems: 0, hasNext: false });
  if (pathname === `/api/public/bookmarks/${PUBLIC_ID}/quota`) {
    return json({ limit: 50, remaining: 50, resetsAt: null });
  }
  if (!api.signedIn) return json({ status: 401, message: "Unauthorized" }, 401);
  if (pathname === "/api/users/me") return json(USER);
  if (pathname === "/api/workspace/context/current") return json(WORKSPACE);
  return json({ status: 404, message: "Not found" }, 404);
};

const settle = async () => {
  for (let turn = 0; turn < 3; turn += 1) {
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    await act(async () => vi.dynamicImportSettled());
  }
};
const open = async (entry: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { host } = await mount(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  await settle();
  const url = () => `${router.state.location.pathname}${router.state.location.search}`;
  /** What the browser's back button does. */
  const back = async () => {
    await act(async () => router.navigate(-1));
    await settle();
  };
  return { host, url, back, client };
};
const link = (host: ParentNode, text: string) =>
  [...host.querySelectorAll("a")].find((node) => node.textContent?.trim() === text);
const follow = async (host: ParentNode, text: string) => {
  await click(link(host, text)!);
  await settle();
};
const input = (host: ParentNode, name: string) =>
  host.querySelector<HTMLInputElement>(`input[name="${name}"]`);
const authForm = (host: ParentNode) => ({
  fields: [...host.querySelectorAll<HTMLInputElement>("form input")].map((node) => node.name),
  submit: host.querySelector('button[type="submit"]')?.textContent?.replace(/\s*→$/, ""),
});
const signInHref = (returnTo: string) => `/login?returnTo=${encodeURIComponent(returnTo)}`;
const registerHref = (returnTo: string) => `${signInHref(returnTo)}&mode=register`;

/** Fills the form on screen and waits out the access animation that follows a success. */
const authenticate = async (host: ParentNode) => {
  for (const [name, value] of [
    ["fullName", USER.fullName],
    ["email", USER.email],
    ["password", "correct-horse-battery"],
  ]) {
    const field = input(host, name);
    if (field) field.value = value;
  }
  vi.useFakeTimers();
  await click(host.querySelector('button[type="submit"]')!);
  for (let second = 0; second < 6; second += 1) {
    await act(async () => vi.advanceTimersByTimeAsync(1000));
  }
  vi.useRealTimers();
  await settle();
};

beforeEach(() => {
  localStorage.clear();
  shell.accountMenu = false;
  documents.opened = [];
  Object.assign(api, { signedIn: false, signOutFails: false, posts: [] });
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => Promise.resolve(respond(String(url), init))),
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("public header", () => {
  test.each([FEED_URL, BOOKMARK_URL])(
    "an anonymous visitor on %s can sign in or create an account and come back",
    async (page) => {
      const { host } = await open(page);
      const actions = [...host.querySelectorAll('nav[aria-label="Account"] a')];

      expect(actions.map((action) => action.textContent)).toEqual(["Sign in", "Create account"]);
      expect(actions.map((action) => action.getAttribute("href"))).toEqual([
        signInHref(page),
        registerHref(page),
      ]);
      expect(host.querySelector("header a")?.getAttribute("href")).toBe("/explore");
    },
  );

  test.each([FEED_URL, BOOKMARK_URL])(
    "a signed-in member on %s is offered neither",
    async (page) => {
      api.signedIn = true;
      const { host } = await open(page);

      expect(host.querySelector('[data-frame="app-shell"] h1')).not.toBeNull();
      expect(link(host, "Sign in")).toBeUndefined();
      expect(link(host, "Create account")).toBeUndefined();
    },
  );
});

describe("feed intro", () => {
  const INTRO = "MLsuite turns trained models into forms anyone can open.";

  test("tells an anonymous visitor that an account lets them publish, and where to get one", async () => {
    const { host } = await open(FEED_URL);
    const intro = [...host.querySelectorAll("p")].find((p) => p.textContent?.startsWith(INTRO));

    expect(intro?.textContent).toBe(`${INTRO} Create an account to publish your own.`);
    expect(link(intro!, "Create an account")?.getAttribute("href")).toBe(registerHref(FEED_URL));
  });

  test("is not shown to a signed-in member", async () => {
    api.signedIn = true;
    const { host } = await open(FEED_URL);

    expect(host.querySelector("h1")?.textContent).toBe("Explore");
    expect(host.textContent).not.toContain(INTRO);
    expect(link(host, "Create an account")).toBeUndefined();
  });
});

describe("auth screen", () => {
  test("opens on sign-in unless the address names registration", async () => {
    const signIn = await open(signInHref("/explore"));
    expect(authForm(signIn.host)).toEqual({ fields: ["email", "password"], submit: "Sign in" });

    const register = await open(registerHref("/explore"));
    expect(authForm(register.host)).toEqual({
      fields: ["fullName", "email", "password"],
      submit: "Create account",
    });
  });

  test("the header's Create account opens the registration form", async () => {
    const { host, url } = await open(BOOKMARK_URL);
    await follow(host, "Create account");

    expect(url()).toBe(registerHref(BOOKMARK_URL));
    expect(authForm(host).submit).toBe("Create account");
  });

  test("switching form keeps the address in step and the page to return to", async () => {
    const { host, url } = await open(signInHref(BOOKMARK_URL));

    await click("Create an account", host);
    expect(url()).toBe(registerHref(BOOKMARK_URL));
    expect(authForm(host).submit).toBe("Create account");

    await click("Sign in", host);
    expect(url()).toBe(signInHref(BOOKMARK_URL));
    expect(authForm(host).submit).toBe("Sign in");
  });

  test.each([
    ["Sign in", FEED_URL, "Explore"],
    ["Sign in", BOOKMARK_URL, "production"],
    ["Create account", FEED_URL, "Explore"],
    ["Create account", BOOKMARK_URL, "production"],
  ])(
    "%s from %s can be left for that same page, by the screen's link or the browser's back",
    async (action, page, title) => {
      const { host, url, back } = await open(page);

      await follow(host, action);
      expect(link(host, "Explore without signing in")).toBeUndefined();
      await follow(host, "Back without signing in");
      expect(url()).toBe(page);
      expect(host.querySelector("h1")?.textContent).toBe(title);
      expect(host.querySelector('[data-frame="app-shell"]')).toBeNull();

      await follow(host, action);
      await back();
      expect(url()).toBe(page);
      expect(host.querySelector("h1")?.textContent).toBe(title);
      expect(api.posts).toEqual([]);
    },
  );

  test.each([
    ["a page that needs a session", signInHref("/models")],
    ["no page", "/login"],
    ["another site", signInHref("//example.com/explore")],
  ])("opened from %s, it leads to Explore without signing in", async (_from, entry) => {
    const { host, url } = await open(entry);
    expect(link(host, "Back without signing in")).toBeUndefined();
    await follow(host, "Explore without signing in");

    expect(url()).toBe("/explore");
    expect(host.querySelector("h1")?.textContent).toBe("Explore");
    expect(host.querySelector('[data-frame="app-shell"]')).toBeNull();
    expect(api.posts).toEqual([]);
  });
});

describe("coming back after authenticating", () => {
  test.each([
    ["Sign in", FEED_URL, "/api/auth/login", "Explore"],
    ["Sign in", BOOKMARK_URL, "/api/auth/login", "production"],
    ["Create account", FEED_URL, "/api/auth/register", "Explore"],
    ["Create account", BOOKMARK_URL, "/api/auth/register", "production"],
  ])("%s from %s returns to it inside the app shell", async (action, page, endpoint, title) => {
    const { host, url } = await open(page);
    await follow(host, action);
    await authenticate(host);

    expect(api.posts.map((post) => post.path)).toEqual([endpoint]);
    expect(url()).toBe(page);
    expect(host.querySelector('[data-frame="app-shell"] h1')?.textContent).toBe(title);
    expect(link(host, "Sign in")).toBeUndefined();
  });

  test("registering sends the new account's details", async () => {
    const { host } = await open(registerHref(FEED_URL));
    await authenticate(host);

    expect(api.posts).toEqual([
      {
        path: "/api/auth/register",
        body: { email: USER.email, password: "correct-horse-battery", fullName: USER.fullName },
      },
    ]);
  });

  test.each([
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "/\t/example.com",
    "/\n/example.com",
    "javascript:alert(1)",
    "explore",
  ])("the unsafe return path %j is replaced by the default destination", (returnTo) => {
    expect(safeReturnTo(returnTo, "/explore")).toBe("/explore");
  });

  test.each(["/explore", FEED_URL, BOOKMARK_URL, "/explore?q=a%2Fb"])(
    "the local return path %s is kept",
    (returnTo) => {
      expect(safeReturnTo(returnTo, "/explore")).toBe(returnTo);
    },
  );

  function Destination() {
    const { pathname, search } = useLocation();
    return <output>{`${pathname}${search}`}</output>;
  }

  test.each([
    ["/login"],
    ["/login?mode=register"],
    [signInHref("https://example.com")],
    [signInHref("//example.com")],
    [signInHref("/\t/example.com")],
    [registerHref("https://example.com")],
    [registerHref("//example.com")],
  ])("authenticating at %j, with no page to return to, opens Explore", async (entry) => {
    const { host } = await mount(
      <QueryClientProvider client={new QueryClient()}>
        <Routes>
          <Route path="/login" element={<AuthLandingPage />} />
          <Route path="*" element={<Destination />} />
        </Routes>
      </QueryClientProvider>,
      { route: entry },
    );
    await authenticate(host);

    expect(api.posts).toHaveLength(1);
    expect(host.querySelector("output")?.textContent).toBe("/explore");
  });

  test("a session that expired on a workspace page returns to that page", async () => {
    const { host, url } = await open("/profile?tab=security");
    expect(url()).toBe(signInHref("/profile?tab=security"));

    await authenticate(host);

    expect(api.posts.map((post) => post.path)).toEqual(["/api/auth/login"]);
    expect(url()).toBe("/profile?tab=security");
  });
});

describe("leaving the session", () => {
  const signOut = async () => {
    const item = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
      (node) => node.textContent?.trim() === "Sign out",
    );
    await click(item!);
    await settle();
  };

  test.each(["/settings", FEED_URL, BOOKMARK_URL])(
    "signing out on %s ends the session and loads Explore afresh",
    async (page) => {
      Object.assign(api, { signedIn: true });
      shell.accountMenu = true;
      const { host, url } = await open(page);
      expect(host.querySelector('[data-frame="app-shell"]')).not.toBeNull();

      await signOut();

      expect(api.posts.map((post) => post.path)).toEqual(["/api/logout"]);
      expect(documents.opened).toEqual(["/explore"]);
      // The app itself goes nowhere: in particular, not to the sign-in screen.
      expect(url()).toBe(page);
    },
  );

  test("a sign-out the API refused leaves the member where they were", async () => {
    Object.assign(api, { signedIn: true, signOutFails: true });
    shell.accountMenu = true;
    const { host, url } = await open("/settings");

    await signOut();

    expect(documents.opened).toEqual([]);
    expect(url()).toBe("/settings");
    expect(host.querySelector('[data-frame="app-shell"]')).not.toBeNull();
  });

  test("unsaved inferences are asked about in the app before signing out, never by the browser", async () => {
    const store = getDefaultStore();
    const run = { key: "run-1", state: "ready" } as SessionEntry;
    store.set(inferenceSessionsAtom, { "1:bookmark": [run] });
    try {
      Object.assign(api, { signedIn: true });
      shell.accountMenu = true;
      await open("/settings");

      await signOut();
      expect(document.body.textContent).toContain("1 unsaved inference is lost");
      expect(api.posts).toEqual([]);
      await click("Cancel");
      await settle();
      expect(api.posts).toEqual([]);
      expect(store.get(inferenceSessionsAtom)).toEqual({ "1:bookmark": [run] });

      await signOut();
      await click("Discard and sign out");
      await settle();
      // Nothing unsaved is left for the browser to warn about when the new document loads.
      expect(store.get(inferenceSessionsAtom)).toEqual({});
      expect(api.posts.map((post) => post.path)).toEqual(["/api/logout"]);
      expect(documents.opened).toEqual(["/explore"]);
    } finally {
      store.set(inferenceSessionsAtom, {});
    }
  });

  test("a session that ends on its own still asks to sign in and come back", async () => {
    api.signedIn = true;
    const { host, url, client } = await open("/settings");
    expect(host.querySelector('[data-frame="app-shell"]')).not.toBeNull();

    api.signedIn = false;
    await act(async () => client.invalidateQueries({ queryKey: ["user"] }));
    await settle();

    expect(documents.opened).toEqual([]);
    expect(url()).toBe(signInHref("/settings"));
    expect(input(host, "email")).not.toBeNull();
  });
});
