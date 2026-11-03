// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { act } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { createAppQueryClient } from "@/app/providers/query-client";
import { createAppRouter } from "@/app/router/routes";
import { changeValue, mount, searchDelay } from "./support/dom";

const answer = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  // A visitor without a session; the public feed is empty.
  fetchMock = vi.fn(async (url: string) =>
    new URL(url).pathname === "/api/public/bookmarks"
      ? answer(200, { items: [], page: 0, size: 24, totalItems: 0, hasNext: false })
      : answer(401, { status: 401, message: "Unauthorized" }),
  );
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
});
afterEach(() => vi.unstubAllGlobals());

const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 50)));
const searches = () =>
  fetchMock.mock.calls
    .map(([url]) => new URL(String(url)))
    .filter((url) => url.pathname === "/api/public/bookmarks")
    .map((url) => url.searchParams.get("search"));

test("typing in a search page's field reaches the server once, after the pause, not per key", async () => {
  const client = createAppQueryClient(() => undefined);
  const router = createAppRouter(client, createMemoryHistory({ initialEntries: ["/explore"] }));
  const view = await mount(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  await settle();
  await act(async () => vi.dynamicImportSettled());
  await settle();
  const loaded = searches().length;

  const field = view.host.querySelector<HTMLInputElement>("input")!;
  for (const typed of ["c", "ch", "chu", "churn"]) await changeValue(field, typed);
  await searchDelay();
  await settle();

  expect(router.state.location.searchStr).toBe("?q=churn");
  expect(searches().slice(loaded)).toEqual(["churn"]);
});
