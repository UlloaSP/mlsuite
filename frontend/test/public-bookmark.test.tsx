// @vitest-environment jsdom
import { QueryClient } from "@tanstack/react-query";
import { act, type PropsWithChildren } from "react";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { SessionFrameLayout } from "@/app/layouts/SessionFrameLayout";
import { publicPages } from "@/app/router/public-routes";
import { routes } from "@/app/router/routes";
import { PublicBookmarkPage } from "@/features/explore/pages/public-bookmark-page";
import { SchemaBookmarkCatalogItem } from "@/features/schemas/components/SchemaBookmarkCatalogItem";
import type { PublicBookmarkDto, SchemaBookmarkDto } from "@/shared/api/openapi.gen";
import { click, mount } from "./support/dom";

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
  schemaName: "Risk",
  schemaDescription: "Estimates cardiovascular risk.",
  version: 2,
  versionName: "Baseline",
  organizationName: "Acme Health",
  formSchema: {
    fields: [
      { kind: "number", label: "Age" },
      { kind: "text", label: "Notes" },
    ],
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
  fetchMock = vi.fn<Fetch>();
  // The page also asks for the bookmark's examples; these bookmarks have none. Examples have
  // their own tests, so that request is answered here and never counted.
  vi.stubGlobal("fetch", (url: unknown, init?: RequestInit) =>
    String(url).endsWith("/examples") ? Promise.resolve(json([])) : fetchMock(url, init),
  );
});
afterEach(() => vi.unstubAllGlobals());

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
    expect(document.body.textContent).toContain("Anyone with the link");
    expect(fetchMock).not.toHaveBeenCalled();
    await click("Publish");
    await settle();

    expect(calledPaths()).toEqual(["/api/schema-bookmarks/70/publish"]);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
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

  test("renders the metadata and a fillable form with nothing to run", async () => {
    fetchMock.mockResolvedValue(json(publicBookmark));
    const { host } = await page();
    await settle();

    expect(calledPaths()).toEqual([`/api/public/bookmarks/${PUBLIC_ID}`]);
    expect(host.querySelector("h1")?.textContent).toBe("production");
    for (const fact of ["Estimates cardiovascular risk.", "Acme Health", "Risk", "Baseline · v2"]) {
      expect(host.textContent).toContain(fact);
    }
    const form = host.querySelector("mlf-form");
    expect(form?.shadowRoot?.querySelectorAll("mlf-field-frame")).toHaveLength(2);
    // The submit row is the part the container class hides; no other run control exists.
    expect(form?.shadowRoot?.querySelectorAll('[part="actions"] mlf-submit-button')).toHaveLength(
      1,
    );
    expect(form?.parentElement?.className).toContain("[&_mlf-form::part(actions)]:hidden");
    expect(host.querySelectorAll("button")).toHaveLength(0);
  });

  test("says so when the form needs plugin fields a public page cannot load", async () => {
    fetchMock.mockResolvedValue(
      json({ ...publicBookmark, formSchema: { fields: [{ kind: "body-map", label: "Pain" }] } }),
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

  test("the explore route is registered outside the protected routes", () => {
    const root = routes[0].children ?? [];
    const publicBranch = root.find((route) => route.children === publicPages);
    expect(publicBranch).toBeDefined();
    expect(publicPages.map((route) => route.path)).toContain("explore/:publicId");
  });
});
