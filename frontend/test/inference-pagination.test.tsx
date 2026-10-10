// @vitest-environment jsdom
import { act, useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, afterEach, expect, test, vi } from "vite-plus/test";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { useInfiniteCatalog } from "@/shared/api/infinite-catalog";
import { catalogViewport } from "./support/catalog-viewport";
import { click, mount } from "./support/dom";
beforeEach(catalogViewport);
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
const server = vi.fn(async (page: number) => ({
  items: Array.from({ length: 24 }, (_, index) => page * 24 + index + 1),
  page,
  size: 24,
  totalItems: 72,
  hasNext: page < 2,
}));
function Harness() {
  const [filter, setFilter] = useState("all");
  const query = useInfiniteCatalog({
    queryKey: ["org", 1, "catalog", "infinite", filter],
    queryFn: server,
    retry: false,
  });
  return (
    <div>
      <button onClick={() => setFilter("other")}>Filter</button>
      <CatalogListPanel
        itemCount={query.data?.items.length ?? 0}
        hasNext={query.hasNextPage}
        isLoading={query.isLoading}
        isBusy={query.isFetching}
        loadingLabel="Loading"
        errorMessage={query.error?.message ?? null}
        onLoadMore={() => query.fetchNextPage()}
        onRetry={() => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())}
        emptyState={{ title: "Empty", description: "No matches" }}
      >
        {query.data?.items.map((id) => (
          <article key={id}>Inference {id}</article>
        ))}
      </CatalogListPanel>
    </div>
  );
}
test("fetches backend pages, virtualizes rows, and resets the query for a filter", async () => {
  server.mockClear();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { host } = await mount(<Harness />, { queryClient: qc });
  await flush();
  expect(server.mock.calls.map(([page]) => page)).toEqual([0]);
  expect(host.querySelectorAll("article").length).toBeGreaterThan(0);
  expect(host.querySelectorAll("article").length).toBeLessThan(24);
  expect(host.querySelector("footer")).toBeNull();
  await click("Load more", host);
  await flush();
  expect(server.mock.calls.map(([page]) => page)).toEqual([0, 1]);
  expect(
    qc.getQueryData<{ pages: unknown[] }>(["org", 1, "catalog", "infinite", "all"])?.pages,
  ).toHaveLength(2);
  await click("Filter", host);
  await flush();
  expect(server.mock.calls.at(-1)?.[0]).toBe(0);
  qc.clear();
});
test("keeps loaded rows after a next-page failure and retries that page", async () => {
  server.mockClear();
  server.mockImplementationOnce(async () => ({
    items: [1],
    page: 0,
    size: 24,
    totalItems: 2,
    hasNext: true,
  }));
  server.mockRejectedValueOnce(new Error("Next page failed"));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { host } = await mount(<Harness />, { queryClient: qc });
  await flush();
  await flush();
  expect(host.textContent).toContain("Inference 1");
  expect(host.textContent).toContain("Next page failed");
  await click("Retry", host);
  await flush();
  expect(server.mock.calls.map(([page]) => page)).toEqual([0, 1, 1]);
  qc.clear();
});
