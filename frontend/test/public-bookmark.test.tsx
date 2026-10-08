// @vitest-environment jsdom
import { QueryClient } from "@tanstack/react-query";
import { Provider, createStore } from "jotai";
import { act, type PropsWithChildren } from "react";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { SessionFrameLayout } from "@/app/layouts/SessionFrameLayout";
import { publicPages } from "@/app/router/public-routes";
import { routes } from "@/app/router/routes";
import { PublicBookmarkPage } from "@/features/explore/pages/public-bookmark-page";
import { SchemaBookmarkCatalogItem } from "@/features/schemas/components/SchemaBookmarkCatalogItem";
import type { PublicBookmarkDto, SchemaBookmarkDto } from "@/shared/api/openapi.gen";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { locationDisplayAtom, type LocationDisplay } from "@/shared/ui/sidebar-preferences";
import { click, mount } from "./support/dom";

const toasts = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast: toasts }));

const session = vi.hoisted(() => ({ signedIn: false, canPublish: false }));
vi.mock("@/capabilities/workspace-context/session", async (original) => ({
  ...(await original<typeof import("@/capabilities/workspace-context/session")>()),
  useUser: () =>
    session.signedIn
      ? { data: { id: 9 }, error: null, isLoading: false }
      : { data: undefined, error: new Error("Unauthorized"), isLoading: false },
}));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useWorkspaceContext: (enabled = true) => ({
    data: enabled && session.signedIn ? { currentOrganization: { id: 3 } } : undefined,
    isLoading: false,
  }),
  useCurrentOrganizationId: () => 3,
  useCan: (permission: string) => permission === "canPublishBookmarks" && session.canPublish,
}));
vi.mock("@/app/layouts/AppShellLayout", () => ({
  AppShellFrame: ({ children }: PropsWithChildren) => (
    <div data-frame="app-shell">
      <nav aria-label="Sidebar" />
      {children}
    </div>
  ),
}));

const PUBLIC_ID = "8f6f3c0e-58a2-4c0b-9d0c-0d5c1f6e2a11";
const AT = "2026-10-01T10:00:00Z";

const bookmark = (overrides: Partial<SchemaBookmarkDto> = {}): SchemaBookmarkDto => ({
  id: 70,
  schemaId: 5,
  schemaName: "Risk",
  versionId: 9,
  version: 1,
  versionName: "v1",
  name: "production",
  description: null,
  publicationNote: null,
  visibility: "PRIVATE",
  publicId: null,
  exampleCount: 0,
  staleExampleCount: 0,
  createdAt: AT,
  updatedAt: AT,
  ...overrides,
});

const publicBookmark: PublicBookmarkDto = {
  publicId: PUBLIC_ID,
  name: "production",
  description: "Estimates cardiovascular risk.",
  publicationNote: null,
  version: 2,
  inputCount: 2,
  reportCount: 1,
  organizationName: "Acme Health",
  organizationLogoUrl: null,
  formSchema: {
    fields: [
      { kind: "number", label: "Age", mappedTo: "in0" },
      { kind: "text", label: "Notes", mappedTo: "in1" },
    ],
    reports: [{ kind: "classifier", label: "Risk", id: "out0", mappedTo: "out0" }],
  },
  updatedAt: AT,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const notFound = () =>
  json({ status: 404, message: "Public bookmark not found", path: "/", timestamp: AT }, 404);
const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const settle = async () => {
  for (let turn = 0; turn < 4; turn += 1) await flush();
};
const newClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });

type Fetch = (url: unknown, init?: RequestInit) => unknown;
let fetchMock: ReturnType<typeof vi.fn<Fetch>>;
beforeEach(() => {
  Object.assign(session, { signedIn: false, canPublish: false });
  toasts.error.mockClear();
  fetchMock = vi.fn<Fetch>();
  // The page also asks for the bookmark's examples and for the caller's remaining runs; these
  // bookmarks have no examples and every run left. Both have their own tests, so those requests
  // are answered here and never counted.
  vi.stubGlobal("fetch", (url: unknown, init?: RequestInit) => {
    if (String(url).endsWith("/examples")) return Promise.resolve(json([]));
    if (String(url).endsWith("/quota")) {
      return Promise.resolve(json({ limit: 50, remaining: 50, resetsAt: null }));
    }
    return fetchMock(url, init);
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

async function openActions() {
  const trigger = document.body.querySelector<HTMLButtonElement>(
    '[aria-label="Open actions for production"]',
  );
  if (!trigger) return null;
  // The menu opens from the keyboard in jsdom and renders in a portal on the body.
  await act(async () =>
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
  );
  return [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')];
}
const labels = (items: HTMLElement[] | null) => items?.map((item) => item.textContent) ?? null;
const calledPaths = () => fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname);

describe("bookmark visibility in the schema repository", () => {
  const row = (dto: SchemaBookmarkDto) =>
    mount(<SchemaBookmarkCatalogItem bookmark={dto} />, { route: "/", queryClient: newClient() });

  test("a member who may publish publishes a private bookmark after confirming", async () => {
    session.canPublish = true;
    fetchMock.mockResolvedValue(json(bookmark({ visibility: "PUBLIC", publicId: PUBLIC_ID })));
    const { host } = await row(bookmark());
    expect(host.textContent).toContain("Private");

    const items = await openActions();
    expect(labels(items)).toEqual(["Public examples", "Publish"]);
    await click(items![1]);
    expect(document.body.textContent).toContain("Anyone will find it in Explore");
    expect(fetchMock).not.toHaveBeenCalled();
    await click("Publish");
    await settle();

    expect(calledPaths()).toEqual(["/api/schema-bookmarks/70/publish"]);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
  });

  test("a refused publication shows the reason the API gave", async () => {
    session.canPublish = true;
    const reason =
      'This bookmark cannot be published. Model "huge" is 62.0 MB; public bookmarks can only run models up to 50 MB.';
    fetchMock.mockResolvedValue(
      json({ status: 409, message: reason, path: "/", timestamp: AT }, 409),
    );
    const { host } = await row(bookmark());

    const items = await openActions();
    await click(items!.find((item) => item.textContent === "Publish")!);
    await click("Publish");
    await settle();

    expect(toasts.error).toHaveBeenCalledExactlyOnceWith("production was not published", {
      description: reason,
    });
    expect(host.textContent).toContain("Private");
  });

  test("a public bookmark shows its state and link, and can be unpublished", async () => {
    session.canPublish = true;
    fetchMock.mockResolvedValue(json(bookmark({ publicId: PUBLIC_ID })));
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { host } = await row(bookmark({ visibility: "PUBLIC", publicId: PUBLIC_ID }));
    expect(host.textContent).toContain("Public");
    expect(host.textContent).not.toContain("Private");

    let items = await openActions();
    expect(labels(items)).toEqual([
      "Copy public link",
      "Open public page",
      "Public examples",
      "Unpublish",
    ]);
    await click(items![0]);
    await settle();
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/explore/${PUBLIC_ID}`);

    items = await openActions();
    await click(items![3]);
    await settle();
    expect(calledPaths()).toEqual(["/api/schema-bookmarks/70/unpublish"]);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
  });

  test("a member who may not publish sees the state but no way to change it", async () => {
    const privateRow = await row(bookmark());
    expect(privateRow.host.textContent).toContain("Private");
    expect(await openActions()).toBeNull();
    await privateRow.unmount();

    const publicRow = await row(bookmark({ visibility: "PUBLIC", publicId: PUBLIC_ID }));
    expect(publicRow.host.textContent).toContain("Public");
    expect(labels(await openActions())).toEqual(["Copy public link", "Open public page"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("public bookmark page", () => {
  const page = (queryClient = newClient()) =>
    mount(
      <Routes>
        <Route path="/explore/:publicId" element={<PublicBookmarkPage />} />
      </Routes>,
      { route: `/explore/${PUBLIC_ID}`, queryClient },
    );

  test("shows a loading state while the bookmark is requested", async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    const { host } = await page();
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      "Loading public bookmark…",
    );
    expect(host.textContent).not.toContain("not found");
  });

  test("heads the page like a workspace page and tells what the form asks for and gives back", async () => {
    fetchMock.mockResolvedValue(json(publicBookmark));
    const { host } = await page();
    await settle();

    expect(calledPaths()).toEqual([`/api/public/bookmarks/${PUBLIC_ID}`]);
    const header = host.querySelector("header")!;
    expect(header.querySelector("h1")?.textContent).toBe("production");
    expect(header.querySelector("p")?.textContent).toBe("Estimates cardiovascular risk.");
    // The standard page header at the page's own edge, not a centered column.
    expect(header.className).not.toContain("mx-auto");
    const facts = [...host.querySelectorAll("dl > div")].map((fact) => [
      fact.querySelector("dt")?.textContent,
      fact.querySelector("dd")?.textContent,
    ]);
    expect(facts).toEqual([
      ["Published by", "Acme Health"],
      ["Inputs", "2 inputs"],
      ["Reports", "1 report"],
      ["Updated", expect.stringContaining("2026")],
    ]);
  });

  test("lays the form out as inputs beside results, with its run action", async () => {
    fetchMock.mockResolvedValue(json(publicBookmark));
    const { host } = await page();
    await settle();

    expect(host.querySelector("mlf-kit-tabs")).toBeNull();
    const form = host.querySelector("mlf-form")!.shadowRoot!;
    expect(form.querySelector(".root.split")).not.toBeNull();
    const inputs = form.querySelector('[part="form-pane"]')!;
    expect(inputs.querySelector("h2")?.textContent).toBe("Inputs");
    expect(inputs.querySelectorAll("mlf-field-frame")).toHaveLength(2);
    expect(inputs.querySelectorAll("mlf-submit-button")).toHaveLength(1);
    expect(form.querySelector('[part="report-pane"] h2')?.textContent).toBe("Results");
  });

  test("a form without reports and with one input says so in the singular", async () => {
    fetchMock.mockResolvedValue(json({ ...publicBookmark, inputCount: 1, reportCount: 0 }));
    const { host } = await page();
    await settle();
    expect(host.querySelector("dl")?.textContent).toContain("1 input");
    expect(host.querySelector("dl")?.textContent).not.toContain("1 inputs");
    expect(host.querySelector("dl")?.textContent).toContain("0 reports");
  });

  test("says so when the form needs plugin fields a public page cannot load", async () => {
    fetchMock.mockResolvedValue(
      json({
        ...publicBookmark,
        formSchema: { fields: [{ kind: "body-map", label: "Pain", mappedTo: "in0" }], reports: [] },
      }),
    );
    const { host } = await page();
    await settle();
    expect(host.textContent).toContain("This form cannot be shown here");
    expect(host.querySelector("mlf-form")).toBeNull();
  });

  test("a private or unknown link is not found, without a retry", async () => {
    fetchMock.mockResolvedValue(notFound());
    const { host } = await page();
    await settle();
    expect(host.textContent).toContain("Bookmark not found");
    expect(host.querySelectorAll("button")).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  test("a failed request is an error that can be retried, not a missing bookmark", async () => {
    // The first request and its single automatic retry both fail.
    fetchMock
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(json(publicBookmark));
    const { host } = await page();
    await settle();
    expect(host.textContent).toContain("This bookmark could not be loaded");
    expect(host.textContent).not.toContain("Bookmark not found");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await click("Try again", host);
    await settle();
    expect(host.querySelector("h1")?.textContent).toBe("production");
  });
});

describe("public page frame", () => {
  const framed = () =>
    mount(
      <Routes>
        <Route element={<SessionFrameLayout />}>
          <Route path="/explore/:publicId" element={<p>Public content</p>} />
        </Route>
      </Routes>,
      { route: `/explore/${PUBLIC_ID}?tab=form` },
    );

  test("an anonymous visitor gets the slim header with a way to sign in and come back", async () => {
    const { host } = await framed();
    expect(host.textContent).toContain("Public content");
    expect(host.querySelector('[data-frame="app-shell"]')).toBeNull();
    expect(host.querySelector('nav[aria-label="Sidebar"]')).toBeNull();
    const signIn = [...host.querySelectorAll("a")].find((link) => link.textContent === "Sign in");
    expect(signIn?.getAttribute("href")).toBe(
      `/login?returnTo=${encodeURIComponent(`/explore/${PUBLIC_ID}?tab=form`)}`,
    );
  });

  test("a signed-in member gets the same content inside the app shell", async () => {
    session.signedIn = true;
    const { host } = await framed();
    expect(host.querySelector('[data-frame="app-shell"]')?.textContent).toContain("Public content");
    expect(host.querySelector('nav[aria-label="Sidebar"]')).not.toBeNull();
    expect(host.textContent).not.toContain("Sign in");
  });

  describe("the page's trail", () => {
    const DISPLAYS: LocationDisplay[] = [
      "breadcrumb-top",
      "breadcrumb-bottom",
      "rail-left",
      "rail-right",
      "off",
    ];
    const trailed = (display: LocationDisplay) => {
      const store = createStore();
      store.set(locationDisplayAtom, display);
      return mount(
        <Provider store={store}>
          <Routes>
            <Route element={<SessionFrameLayout />}>
              <Route
                path="/explore/:publicId"
                element={
                  <AppPageHeader
                    title="production"
                    breadcrumbScope="public"
                    breadcrumbs={[{ label: "production" }]}
                  />
                }
              />
            </Route>
          </Routes>
        </Provider>,
        { route: `/explore/${PUBLIC_ID}` },
      );
    };
    const trails = (host: HTMLElement) => [
      ...host.querySelectorAll('nav[aria-label="Breadcrumb"]'),
    ];
    // A wide screen with a pointer that hovers, where a rail would be drawn if it were chosen.
    beforeEach(() =>
      vi.stubGlobal(
        "matchMedia",
        vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
      ),
    );

    test.each(DISPLAYS)(
      "a visitor without a session gets it above the title with this device set to %s",
      async (display) => {
        const { host } = await trailed(display);

        expect(trails(host)).toHaveLength(1);
        const [trail] = trails(host);
        expect(trail.textContent).toBe("Exploreproduction");
        expect(trail.querySelector("a")?.getAttribute("href")).toBe("/explore");
        expect(trail.closest("main")).not.toBeNull();
        // Before the title in the document, and neither the bottom bar nor a rail.
        const title = host.querySelector("h1")!;
        expect(
          trail.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(host.querySelector("footer")).toBeNull();
        expect(host.querySelector("[data-location-rail]")).toBeNull();
      },
    );

    test.each(DISPLAYS.filter((display) => display !== "breadcrumb-top"))(
      "a signed-in member keeps the header free of it with this device set to %s",
      async (display) => {
        session.signedIn = true;
        const { host } = await trailed(display);

        // The shell, a stub here, is what draws the bottom bar and the rails.
        expect(host.querySelector('[data-frame="app-shell"] h1')?.textContent).toBe("production");
        expect(trails(host)).toHaveLength(0);
      },
    );
  });

  test("the explore route is registered outside the protected routes", () => {
    const root = routes[0].children ?? [];
    const publicBranch = root.find((route) => route.children === publicPages);
    expect(publicBranch).toBeDefined();
    expect(publicPages.map((route) => route.path)).toContain("explore/:publicId");
  });
});
