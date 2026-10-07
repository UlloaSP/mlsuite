// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type PropsWithChildren } from "react";
import { createMemoryRouter, Route, RouterProvider, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { SidebarNavigation } from "@/app/components/SidebarNavigation";
import { SidebarProvider } from "@/app/components/app-sidebar/SidebarContext";
import { Navbar } from "@/app/components/navbar/Navbar";
import { PublicFrame } from "@/app/layouts/PublicFrame";
import { routes } from "@/app/router/routes";
import { ExplorePage } from "@/features/explore/pages/explore-page";
import { PublicBookmarkPage } from "@/features/explore/pages/public-bookmark-page";
import type {
  PageDtoPublicBookmarkSummaryDto,
  PublicBookmarkDto,
  PublicBookmarkSummaryDto,
} from "@/shared/api/openapi.gen";
import { changeValue, click, mount } from "./support/dom";

const session = vi.hoisted(() => ({
  signedIn: false,
  permissions: {} as Record<string, boolean>,
}));
vi.mock("@/capabilities/workspace-context/session", async (original) => ({
  ...(await original<typeof import("@/capabilities/workspace-context/session")>()),
  useUser: () =>
    session.signedIn
      ? {
          data: { id: 9, fullName: "Ada", email: "ada@acme.test", systemRole: "USER" },
          error: null,
          isLoading: false,
        }
      : { data: undefined, error: new Error("Unauthorized"), isLoading: false },
  useLogout: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useWorkspaceContext: (enabled = true) => ({
    data:
      enabled && session.signedIn
        ? {
            currentOrganization: { id: 3, name: "Ada Personal", slug: "ada" },
            organizations: [{ id: 3, name: "Ada Personal", slug: "ada" }],
            permissions: session.permissions,
          }
        : undefined,
    isLoading: false,
  }),
}));
vi.mock("@/features/workspace/api/workspace.queries", () => ({
  usePendingInvitations: () => ({ data: [] }),
}));
vi.mock("@/features/workspace/api/workspace.mutations", () => ({
  useSelectOrganization: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/app/layouts/AppShellLayout", () => ({
  AppShellFrame: ({ children }: PropsWithChildren) => <div data-frame="app-shell">{children}</div>,
}));
vi.mock("@/app/pages/AuthLandingPage", () => ({
  AuthLandingPage: () => <main data-page="auth" />,
}));

const AT = "2026-10-01T10:00:00Z";
const CARDIO: PublicBookmarkSummaryDto = {
  publicId: "8f6f3c0e-58a2-4c0b-9d0c-0d5c1f6e2a11",
  name: "production",
  schemaDescription: "Estimates cardiovascular risk.",
  inputCount: 16,
  reportCount: 2,
  organizationName: "Acme Health",
  updatedAt: AT,
};
const CHURN: PublicBookmarkSummaryDto = {
  publicId: "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed",
  name: "beta",
  schemaDescription: null,
  inputCount: 1,
  reportCount: 1,
  organizationName: "Bob Other Personal",
  updatedAt: AT,
};

const feed = (...items: PublicBookmarkSummaryDto[]): PageDtoPublicBookmarkSummaryDto => ({
  items,
  page: 0,
  size: 24,
  totalItems: items.length,
  hasNext: false,
});
const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const settle = async () => {
  for (let turn = 0; turn < 4; turn += 1) await flush();
};
const newClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });
const calledUrls = () =>
  fetchMock.mock.calls.map(([url]) => {
    const { pathname, search } = new URL(String(url));
    return `${pathname}${search}`;
  });
const hrefs = (host: ParentNode, selector = "a") =>
  [...host.querySelectorAll(selector)].map((link) => link.getAttribute("href"));

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  Object.assign(session, { signedIn: false, permissions: {} });
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("public feed page", () => {
  function UrlProbe() {
    return <output data-testid="url">{useLocation().search}</output>;
  }
  const page = async (route = "/explore") => {
    const view = await mount(
      <PublicFrame>
        <Routes>
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/explore/:publicId" element={<PublicBookmarkPage />} />
        </Routes>
        <UrlProbe />
      </PublicFrame>,
      { route, queryClient: newClient() },
    );
    return view.host;
  };
  const cards = (host: ParentNode) => hrefs(host, "article a, a[aria-label^='Open ']");

  test("shows a loading state while the feed is requested", async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    const host = await page();
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      "Loading public bookmarks…",
    );
    expect(host.textContent).not.toContain("Nothing has been published yet");
  });

  test("lists published bookmarks as cards that link to their public pages", async () => {
    fetchMock.mockResolvedValue(json(feed(CARDIO, CHURN)));
    const host = await page();
    await settle();

    expect(calledUrls()).toEqual(["/api/public/bookmarks?page=0&search=&size=24&sort=updated"]);
    expect(host.querySelector("h1")?.textContent).toBe("Explore");
    expect(cards(host)).toEqual([`/explore/${CARDIO.publicId}`, `/explore/${CHURN.publicId}`]);
    const [cardio, churn] = [...host.querySelectorAll("a[aria-label^='Open ']")];
    expect(cardio.getAttribute("aria-label")).toBe("Open production by Acme Health");
    expect(cardio.querySelector("h2")?.textContent).toBe("production");
    expect(cardio.querySelector("p")?.textContent).toBe("Estimates cardiovascular risk.");
    const size = (card: Element) =>
      [...card.querySelectorAll("dl dd")].map((fact) => fact.textContent);
    expect(size(cardio)).toEqual(["16 inputs", "2 reports"]);
    expect(cardio.querySelector("footer")?.textContent).toContain("Acme Health");
    expect(cardio.querySelector("footer")?.textContent).toContain("Updated");
    // The publisher is the organization as it is named, personal or not; no description, no line.
    expect(churn.textContent).toContain("Bob Other Personal");
    expect(churn.querySelector("p")).toBeNull();
    expect(size(churn)).toEqual(["1 input", "1 report"]);
    expect(host.textContent).toContain("2 results");
  });

  test("a card names neither the schema nor the snapshot behind the bookmark", async () => {
    // An API that still sent them would not get them on screen.
    const stale = { ...CARDIO, schemaName: "Cardio risk", version: 2, versionName: "Baseline" };
    fetchMock.mockResolvedValue(json(feed(stale)));
    const host = await page();
    await settle();

    const [card] = [...host.querySelectorAll("a[aria-label^='Open ']")];
    for (const internal of ["Cardio risk", "Baseline", "v2"]) {
      expect(card.textContent).not.toContain(internal);
    }
    expect(host.querySelector("input")?.getAttribute("placeholder")).toBe(
      "Search by bookmark, description, or publisher",
    );
  });

  test("says that nothing has been published when the feed is empty", async () => {
    fetchMock.mockResolvedValue(json(feed()));
    const host = await page();
    await settle();
    expect(host.textContent).toContain("Nothing has been published yet");
    expect(host.textContent).not.toContain("No matching bookmarks");
    expect(cards(host)).toEqual([]);
  });

  test("a failed request is an error that can be retried, not an empty feed", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(json(feed(CARDIO)));
    const host = await page();
    await settle();
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    expect(host.textContent).not.toContain("Nothing has been published yet");

    await click("Retry", host);
    await settle();
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(cards(host)).toEqual([`/explore/${CARDIO.publicId}`]);
  });

  test("search and sort live in the URL and are answered by the API", async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(json(new URL(url).searchParams.get("search") ? feed(CHURN) : feed(CARDIO))),
    );
    const host = await page("/explore?sort=name");
    await settle();
    expect(calledUrls()).toEqual(["/api/public/bookmarks?page=0&search=&size=24&sort=name"]);

    await changeValue(host.querySelector<HTMLInputElement>("input")!, "churn");
    await settle();
    expect(host.querySelector('[data-testid="url"]')?.textContent).toBe("?sort=name&q=churn");
    expect(calledUrls().at(-1)).toBe("/api/public/bookmarks?page=0&search=churn&size=24&sort=name");
    expect(cards(host)).toEqual([`/explore/${CHURN.publicId}`]);
    expect(host.textContent).toContain("1 result");
  });

  test("a search without matches says so instead of claiming nothing was published", async () => {
    fetchMock.mockResolvedValue(json(feed()));
    const host = await page("/explore?q=zzz");
    await settle();
    expect(host.textContent).toContain("No matching bookmarks");
    expect(host.textContent).not.toContain("Nothing has been published yet");
  });

  test("a bookmark page's trail leads back to the feed", async () => {
    const bookmark: PublicBookmarkDto = { ...CARDIO, version: 2, formSchema: { fields: [] } };
    fetchMock.mockResolvedValue(json(bookmark));
    const host = await page(`/explore/${CARDIO.publicId}`);
    await settle();

    const trail = host.querySelector('nav[aria-label="Breadcrumb"]')!;
    expect(trail.textContent).toBe("Exploreproduction");
    expect(hrefs(trail)).toEqual(["/explore"]);
    expect(trail.querySelector('[aria-current="page"]')?.textContent).toBe("production");
  });
});

describe("Explore navigation entry", () => {
  const guideItems = (host: ParentNode) =>
    [...host.querySelectorAll<HTMLElement>("[data-user-guide-item^='nav:']")].map((entry) => [
      entry.dataset.userGuideItem,
      entry.getAttribute("href"),
    ]);
  const inShell = (node: React.ReactNode) =>
    mount(
      <SidebarProvider open onOpenChange={() => undefined}>
        {node}
      </SidebarProvider>,
      { route: "/profile" },
    );

  test("a member with no workspace permission still has it in the sidebar", async () => {
    session.signedIn = true;
    const { host } = await inShell(<SidebarNavigation />);

    expect(guideItems(host)).toEqual([["nav:Explore", "/explore"]]);
    expect(host.querySelector('ul[aria-label="Public"]')).not.toBeNull();
    // A group with nothing the member may open is not drawn.
    expect(host.querySelector('ul[aria-label="Workspace"]')).toBeNull();
  });

  test.each(["top", "bottom"] as const)(
    "a member with no workspace permission still has it in the %s bar",
    async (position) => {
      session.signedIn = true;
      const { host } = await inShell(<Navbar position={position} />);
      const nav = host.querySelector('nav[aria-label="Main navigation"]')!;

      expect(guideItems(nav)).toEqual([["nav:Explore", "/explore"]]);
      expect(nav.querySelector("[aria-hidden='true'].bg-line")).toBeNull();
    },
  );

  const FIRST = ["nav:Explore", "nav:Predict", "nav:Models", "nav:Schemas", "nav:Inferences"];
  const shortcut = (scope: ParentNode, item: string) =>
    scope.querySelector(`[data-user-guide-item="${item}"]`)?.getAttribute("aria-keyshortcuts");

  test("it is the first entry of the sidebar, ahead of the organization's work", async () => {
    Object.assign(session, { signedIn: true, permissions: { canViewModels: true } });
    const { host } = await inShell(<SidebarNavigation />);

    expect(guideItems(host).map(([item]) => item)).toEqual(FIRST);
    expect(
      [...host.querySelectorAll("ul[aria-label]")].map((list) => list.getAttribute("aria-label")),
    ).toEqual(["Public", "Workspace"]);
    // The shortcut numbers follow the order on screen.
    expect(shortcut(host, "nav:Explore")).toBe("Alt+1");
    expect(shortcut(host, "nav:Predict")).toBe("Alt+2");
  });

  test.each(["top", "bottom"] as const)(
    "it is the first entry of the %s bar, ahead of the organization's work",
    async (position) => {
      Object.assign(session, { signedIn: true, permissions: { canViewModels: true } });
      const { host } = await inShell(<Navbar position={position} />);
      const nav = host.querySelector('nav[aria-label="Main navigation"]')!;

      expect(guideItems(nav).map(([item]) => item)).toEqual(FIRST);
      expect(shortcut(nav, "nav:Explore")).toBe("Alt+1");
    },
  );
});

describe("entry routing", () => {
  const open = async (entry: string) => {
    const router = createMemoryRouter(routes, { initialEntries: [entry] });
    const view = await mount(
      <QueryClientProvider client={newClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    await settle();
    await act(async () => vi.dynamicImportSettled());
    await settle();
    const { pathname, search } = router.state.location;
    return { host: view.host, url: `${pathname}${search}` };
  };

  beforeEach(() => fetchMock.mockResolvedValue(json(feed(CARDIO))));

  test("an anonymous visitor who opens / lands on the feed in the public frame", async () => {
    const { host, url } = await open("/");

    expect(url).toBe("/explore");
    expect(host.querySelector("h1")?.textContent).toBe("Explore");
    expect(host.querySelector('[data-frame="app-shell"]')).toBeNull();
    expect(hrefs(host, "header a")).toEqual([
      "/explore",
      "/login?returnTo=%2Fexplore",
      "/login?returnTo=%2Fexplore&mode=register",
    ]);
  });

  test("the sign-in screen has its own address", async () => {
    const { host, url } = await open("/login?returnTo=%2Fexplore");

    expect(url).toBe("/login?returnTo=%2Fexplore");
    expect(host.querySelector('[data-page="auth"]')).not.toBeNull();
  });

  test.each([
    ["/models?sort=name", "/login?returnTo=%2Fmodels%3Fsort%3Dname"],
    ["/invite/abc123", "/login?returnTo=%2Finvite%2Fabc123"],
  ])("an anonymous visitor who opens %s is sent to sign in and back", async (entry, expected) => {
    const { host, url } = await open(entry);

    expect(url).toBe(expected);
    expect(host.querySelector('[data-page="auth"]')).not.toBeNull();
  });

  test("a signed-in member who opens / goes to their home", async () => {
    session.signedIn = true;
    const { url } = await open("/");

    expect(url).not.toBe("/");
    expect(url).not.toBe("/login");
    expect(url).not.toBe("/explore");
  });

  test("a signed-in member opens the feed inside the app shell", async () => {
    session.signedIn = true;
    const { host, url } = await open("/explore");

    expect(url).toBe("/explore");
    expect(host.querySelector('[data-frame="app-shell"] h1')?.textContent).toBe("Explore");
    expect(host.textContent).not.toContain("Sign in");
  });
});
