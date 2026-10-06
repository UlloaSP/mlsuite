// @vitest-environment jsdom
import { QueryClient } from "@tanstack/react-query";
import { act } from "react";
import { createMemoryRouter, Route, RouterProvider, Routes, type RouteObject } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { useNavigationItems } from "@/app/components/use-navigation-items";
import { protectedPages } from "@/app/router/protected-routes";
import { AdminPublicBookmarksPage } from "@/features/admin/pages/admin-public-bookmarks-page";
import type { ModeratedBookmarkDto } from "@/shared/api/openapi.gen";
import { changeValue, click, mount } from "./support/dom";

const session = vi.hoisted(() => ({ role: "SUPERADMIN" }));
vi.mock("@/capabilities/workspace-context/session", () => ({
  useUser: () => ({ data: { id: 1, systemRole: session.role }, error: null, isLoading: false }),
  useCurrentUserIsSuperadmin: () => session.role === "SUPERADMIN",
}));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useWorkspaceContext: () => ({
    data: { currentOrganization: { id: 3 }, permissions: { canViewModels: true } },
  }),
}));

const AT = "2026-10-01T10:00:00Z";
const ROUTE = "/admin/public-bookmarks";
const LIST_PATH = "/api/admin/public-bookmarks";

const bookmark = (overrides: Partial<ModeratedBookmarkDto>): ModeratedBookmarkDto => ({
  id: 70,
  name: "production",
  schemaName: "Cardio risk",
  schemaArchived: false,
  organizationName: "Acme Health",
  version: 2,
  versionName: "Baseline",
  publicId: "acme-public-id",
  updatedAt: AT,
  ...overrides,
});
const acme = bookmark({});
const globex = bookmark({
  id: 81,
  name: "live",
  schemaName: "Churn",
  organizationName: "Globex",
  version: 1,
  versionName: null,
  publicId: "globex-public-id",
});
const archived = bookmark({
  id: 92,
  name: "legacy",
  schemaName: "Retired",
  schemaArchived: true,
  organizationName: "Globex",
  publicId: "globex-archived-id",
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const failure = (status: number, message: string) =>
  json({ status, message, path: "/", timestamp: AT }, status);
const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const settle = async () => {
  for (let turn = 0; turn < 6; turn += 1) await flush();
};
/** The list holds its loading state for a moment once shown, so wait it out instead of guessing. */
const loaded = async (host: HTMLElement) => {
  for (let turn = 0; turn < 200 && host.querySelector('[role="status"]'); turn += 1) {
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
  }
};
const newClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });

/** What the instance holds as public; the stubbed API lists, searches and unpublishes it. */
let published: ModeratedBookmarkDto[];
let unpublishFailure: Response | null;
let fetchMock: ReturnType<typeof vi.fn>;

const requests = () =>
  fetchMock.mock.calls.map(([url, init]) => {
    const { pathname, searchParams } = new URL(String(url));
    return { method: (init as RequestInit | undefined)?.method ?? "GET", pathname, searchParams };
  });
const unpublishRequests = () => requests().filter((request) => request.method === "POST");

beforeEach(() => {
  session.role = "SUPERADMIN";
  published = [acme, globex, archived];
  unpublishFailure = null;
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const { pathname, searchParams } = new URL(String(url));
    if (init?.method === "POST") {
      if (unpublishFailure) return unpublishFailure;
      const id = Number(pathname.split("/").at(-2));
      published = published.filter((row) => row.id !== id);
      return json({ id, visibility: "PRIVATE" });
    }
    const term = (searchParams.get("search") ?? "").toLowerCase();
    const items = published.filter((row) =>
      [row.name, row.schemaName, row.organizationName].some((text) =>
        text.toLowerCase().includes(term),
      ),
    );
    return json({ items, page: 0, size: 8, totalItems: items.length, hasNext: false });
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const openPage = async ({ pending = false } = {}) => {
  const view = await mount(
    <Routes>
      <Route path={ROUTE} element={<AdminPublicBookmarksPage />} />
    </Routes>,
    { route: ROUTE, queryClient: newClient() },
  );
  await settle();
  if (!pending) await loaded(view.host);
  return view.host;
};
const rows = (host: HTMLElement) => [...host.querySelectorAll("article")];
const titles = (host: HTMLElement) => rows(host).map((row) => row.querySelector("h2")?.textContent);

async function chooseUnpublish(name: string) {
  const trigger = document.body.querySelector<HTMLButtonElement>(
    `[aria-label="Open actions for ${name}"]`,
  )!;
  // The menu opens from the keyboard in jsdom and renders in a portal on the body.
  await act(async () =>
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
  );
  const items = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  expect(items.map((item) => item.textContent)).toEqual(["Unpublish"]);
  await click(items[0]);
}
const dialog = () => document.body.querySelector<HTMLElement>('[role="dialog"]');

describe("public bookmark moderation page", () => {
  test("lists every public bookmark with what a moderator needs and a link to its public page", async () => {
    const host = await openPage();

    expect(requests()).toHaveLength(1);
    expect(requests()[0].pathname).toBe(LIST_PATH);
    expect(Object.fromEntries(requests()[0].searchParams)).toEqual({
      page: "0",
      search: "",
      size: "8",
      sort: "updated",
    });
    expect(titles(host)).toEqual(["production", "live", "legacy"]);
    expect(host.textContent).toContain("3 results");
    const [first, second] = rows(host);
    for (const fact of ["Acme Health", "Cardio risk", "Baseline · v2"]) {
      expect(first.textContent).toContain(fact);
    }
    for (const fact of ["Globex", "Churn", "v1"]) expect(second.textContent).toContain(fact);
    expect([...first.querySelectorAll("a")].map((link) => link.getAttribute("href"))).toEqual([
      "/explore/acme-public-id",
      "/explore/acme-public-id",
    ]);
    expect(first.textContent).not.toContain("Schema archived");
  });

  test("marks a bookmark whose schema is archived and offers no public page for it", async () => {
    const host = await openPage();
    const row = rows(host)[2];

    expect(row.textContent).toContain("Schema archived");
    expect(row.textContent).toContain("Public page not available");
    expect(row.querySelectorAll("a")).toHaveLength(0);
    expect(row.querySelector('[aria-label="Open actions for legacy"]')).not.toBeNull();
  });

  test("searches the instance and says when nothing matches", async () => {
    const host = await openPage();
    const search = host.querySelector<HTMLInputElement>(
      'input[placeholder="Search by bookmark, schema, or organization"]',
    )!;

    await changeValue(search, "globex");
    await settle();
    expect(requests().at(-1)?.searchParams.get("search")).toBe("globex");
    expect(titles(host)).toEqual(["live", "legacy"]);
    expect(host.textContent).toContain("2 results");

    await changeValue(search, "nothing like this");
    await settle();
    expect(rows(host)).toHaveLength(0);
    expect(host.textContent).toContain("No matching public bookmarks");
    expect(host.textContent).not.toContain("Nothing on this instance is published");
  });

  test("unpublishes after a confirmation naming the bookmark and its organization", async () => {
    const host = await openPage();

    await chooseUnpublish("production");
    expect(dialog()?.textContent).toContain("Unpublish production?");
    expect(dialog()?.textContent).toContain("production of Acme Health becomes private");
    expect(unpublishRequests()).toHaveLength(0);

    await click("Unpublish", dialog()!);
    await settle();

    expect(unpublishRequests().map((request) => request.pathname)).toEqual([
      `${LIST_PATH}/70/unpublish`,
    ]);
    expect(dialog()).toBeNull();
    expect(titles(host)).toEqual(["live", "legacy"]);
    expect(host.textContent).toContain("2 results");
  });

  test("cancelling the confirmation unpublishes nothing", async () => {
    const host = await openPage();

    await chooseUnpublish("live");
    await click("Cancel", dialog()!);

    expect(dialog()).toBeNull();
    expect(unpublishRequests()).toHaveLength(0);
    expect(titles(host)).toEqual(["production", "live", "legacy"]);
  });

  test("a failed unpublish stays in the confirmation with the reason", async () => {
    unpublishFailure = failure(404, "Schema bookmark not found");
    const host = await openPage();

    await chooseUnpublish("production");
    await click("Unpublish", dialog()!);
    await settle();

    expect(dialog()?.textContent).toContain("Schema bookmark not found");
    expect(titles(host)).toEqual(["production", "live", "legacy"]);
  });

  test("shows a loading state, not an empty list, while the bookmarks are requested", async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    const host = await openPage({ pending: true });

    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      "Loading public bookmarks…",
    );
    expect(host.textContent).not.toContain("No public bookmarks");
  });

  test("says so when nothing on the instance is public", async () => {
    published = [];
    const host = await openPage();

    expect(rows(host)).toHaveLength(0);
    expect(host.textContent).toContain("No public bookmarks");
    expect(host.textContent).toContain("Nothing on this instance is published");
    expect(host.textContent).toContain("0 results");
  });

  test("a failed request is an error that can be retried, not an empty list", async () => {
    fetchMock.mockResolvedValueOnce(failure(500, "Unexpected error"));
    const host = await openPage();

    expect(host.textContent).toContain("Unexpected error");
    expect(host.textContent).not.toContain("No public bookmarks");

    await click("Retry", host);
    await settle();
    await loaded(host);
    expect(titles(host)).toEqual(["production", "live", "legacy"]);
  });
});

describe("moderation access", () => {
  const guardOf = (path: string): RouteObject | undefined =>
    protectedPages.find((route) => route.children?.some((child) => child.path === path));
  const openRoute = async () => {
    const router = createMemoryRouter(protectedPages, { initialEntries: [ROUTE] });
    const { host } = await mount(<RouterProvider router={router} />, { queryClient: newClient() });
    // The page is a lazy route: wait for whichever page it resolves to, then for its list.
    for (let turn = 0; turn < 200 && !host.querySelector("h1"); turn += 1) await flush();
    await settle();
    await loaded(host);
    return host;
  };

  test("the route is registered with the other superadmin pages", () => {
    const guard = guardOf("admin/public-bookmarks");
    expect(guard).toBeDefined();
    expect(guard).toBe(guardOf("admin/users"));
  });

  test("a superadmin reaches the page through the route", async () => {
    const host = await openRoute();
    expect(host.querySelector("h1")?.textContent).toBe("Public bookmarks");
    expect(titles(host)).toEqual(["production", "live", "legacy"]);
  });

  test("the route is not found for a member who is not a superadmin, and asks for nothing", async () => {
    session.role = "USER";
    const host = await openRoute();

    expect(host.textContent).toContain("HTTP 404");
    expect(host.textContent).not.toContain("Public bookmarks");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("only superadmins get the navigation entry", async () => {
    function AdministrationProbe() {
      const { administration } = useNavigationItems();
      return <output>{administration.map((item) => `${item.label}→${item.to}`).join(" ")}</output>;
    }
    const entries = async () =>
      (await mount(<AdministrationProbe />, { route: "/home" })).host.textContent;

    expect(await entries()).toContain(`Moderation→${ROUTE}`);
    session.role = "USER";
    expect(await entries()).toBe("");
  });
});
